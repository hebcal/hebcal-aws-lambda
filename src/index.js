var moment = require('moment-timezone');
var googleAnalytics = require('./hebcal-track');
var hebcal = require('./hebcal-app');

// Route the incoming request based on type (LaunchRequest, IntentRequest,
// etc.) The JSON body of the request is provided in the event parameter.
exports.handler = function (event, context) {
    console.log("MAIN event=" + JSON.stringify(event));
    try {
/*
        if (event.session.application && event.session.application.applicationId && event.session.application.applicationId !== "amzn1.echo-sdk-ams.app.24d6d476-8351-403f-9047-f08e42a9f623") {
             context.fail("Invalid Application ID=" + event.session.application.applicationId);
        }
*/
        if (event.session.new) {
            onSessionStarted({requestId: event.request.requestId}, event.session);
        }

        if (event.request.type === "LaunchRequest" || event.request.type === "IntentRequest") {
            loadUserAndGreetings(event.request, event.session, function() {
                if (event.request.type === "LaunchRequest") {
                    onLaunch(event.request, event.session, function(session, speechletResponse) {
                        var sessionAttributes = session && session.attributes ? session.attributes : {};
                        trackScreenview(session, "LaunchRequest");
                        context.succeed(buildResponse(sessionAttributes, speechletResponse));
                    });
                } else {
                    // event.request.type === "IntentRequest"
                    onIntent(event.request, event.session, function(session, speechletResponse) {
                        var sessionAttributes = session && session.attributes ? session.attributes : {};
                        trackIntent(event.request.intent, session);
                        context.succeed(buildResponse(sessionAttributes, speechletResponse));
                    });
                }
            });
        } else if (event.request.type === "SessionEndedRequest") {
            onSessionEnded(event.request, event.session);
            trackScreenview(session, "SessionEndedRequest");
            context.succeed();
        } else {
            context.fail("Unknown event.request.type");
        }
    } catch (e) {
        context.fail("Exception: " + e);
    }
};

function trackIntent(intent, session) {
    var intentName = intent.name;
    trackScreenview(session, intentName);
    if (typeof intent.slots === 'object') {
        var slots = intent.slots;
        for (var slot in slots) {
            var slotval = slots[slot].value;
            if (slotval && slotval.length) {
                trackEvent(session, intentName, slot + ' ' + slotval);
            }
        }
    }
}

function getTrackingOptions(session) {
    var location = getLocation(session);
    var options;
    if (location) {
        if (location.geoid) {
            options = {
                geoid: location.geoid
            };
        } else if (location.cc) {
            options = {
                geoid: location.cc
            };
        }
    }
    return options;
}

function trackScreenview(session, screenName) {
    var options = getTrackingOptions(session);
    googleAnalytics.screenview(session.user.userId, screenName, options);
}

function trackEvent(session, category, action, label) {
    var options = getTrackingOptions(session);
    googleAnalytics.event(session.user.userId, category, action, label, options);
}

function trackException(session, description) {
    var options = getTrackingOptions(session);
    googleAnalytics.exception(session.user.userId, description, options);
}

/**
 * Called when the session starts.
 */
function onSessionStarted(sessionStartedRequest, session) {
}

function loadUserAndGreetings(request, session, callback) {
    session.attributes = session.attributes || {};

    if (session.attributes.todayHebrewDateStr) {
        return callback();
    }

    hebcal.lookupUser(session.user.userId, function(user) {
        var args = ['-t'];
        if (user && user.ts) {
            session.attributes.returningUser = true;
            if (user.location) {
                var m = hebcal.getMomentForTodayHebrewDate(user.location);
                args = m.format('M D YYYY').split(' ');
                session.attributes.location = user.location;
            }
        }
        hebcal.invokeHebcal(args, getLocation(session), function(err, events) {
            if (err) {
                trackException(session, err);
                return callback();
            }
            session.attributes.todayHebrewDateStr = events[0].name;
            var arr = hebcal.getSpecialGreetings(events);
            if (arr.length) {
                session.attributes.specialGreeting = arr;
            }
            return callback();
        });
    });
}

/**
 * Called when the user launches the skill without specifying what they want.
 */
function onLaunch(launchRequest, session, callback) {
    // Dispatch to your skill's launch.
    getWelcomeResponse(session, callback, false);
}

/**
 * Called when the user specifies an intent for this skill.
 */
function onIntent(intentRequest, session, callback) {
    var intent = intentRequest.intent,
        intentName = intentRequest.intent.name;

    // Dispatch to your skill's intent handlers
    if (["GetHoliday", "GetHolidayDate", "GetHolidayNextYear"].indexOf(intentName) != -1) {
        if (intent.slots && intent.slots.Holiday && intent.slots.Holiday.value) {
            getHolidayResponse(intent, session, callback);
        } else {
            getWhichHolidayResponse(session, callback);
        }
    } else if ("GetParsha" === intentName) {
        getParshaResponse(intent, session, callback);
    } else if ("GetHebrewDate" === intentName) {
        getHebrewDateResponse(intent, session, callback);
    } else if ("GetCandles" === intentName) {
        getCandleLightingResponse(intent, session, callback);
    } else if ("GetOmer" === intentName) {
        getOmerResponse(intent, session, callback);
    } else if ("GetDafYomi" === intentName) {
        getDafYomiResponse(intent, session, callback);
    } else if ("AMAZON.CancelIntent" === intentName || "AMAZON.StopIntent" === intentName) {
        callback(session, buildSpeechletResponse("Goodbye", "Goodbye", null, true));
    } else if ("AMAZON.HelpIntent" === intentName) {
        getWelcomeResponse(session, callback, true);
    } else {
        callback(session, buildSpeechletResponse("Invalid intent", "Invalid intent " + intentName + ". Goodbye", null, true));
    }
}

/**
 * Called when the user ends the session.
 * Is not called when the skill returns shouldEndSession=true.
 */
function onSessionEnded(sessionEndedRequest, session) {
}

// --------------- Functions that control the skill's behavior -----------------------

function getLocation(session) {
    if (session && session.attributes && session.attributes.location) {
        return session.attributes.location;
    }
    return undefined;
}

function getNowForLocation(session) {
    var location = getLocation(session);
    if (location && location.tzid) {
        return moment.tz(location.tzid);
    } else {
        return moment();
    }
}

function getWelcomeResponse(session, callback, isHelpIntent) {
    var repromptText = "You can ask about holidays, the Torah portion, candle lighting times, or Hebrew dates.";
    var nag = ' What will it be?';
    var hebrewDateStr = session.attributes.todayHebrewDateStr;
    var speech = hebcal.hebrewDateSSML(hebrewDateStr, true);
    var cardText = '';
    var ssmlContent = '';
    if (!isHelpIntent) {
        cardText += 'Welcome to Hebcal. Today is the ' + hebrewDateStr + '. ';
        ssmlContent += 'Welcome to Hieb-Kal. Today is the ' + speech + '. ';
    }
    if (isHelpIntent || !session.attributes.returningUser) {
        cardText += repromptText;
        ssmlContent += repromptText;
    }
    var response = respond('Welcome to Hebcal', cardText + nag, ssmlContent + nag);
    response.shouldEndSession = false;
    response.reprompt.outputSpeech.text = repromptText;
    callback(session, response);
}

function getWhichHolidayResponse(session, callback) {
    var cardTitle = "What holiday?";
    var repromptText = "Which holiday would you like?";
    var speechOutput = "Sorry, Hieb-Kal didn't understand the holiday. " + repromptText;
    var shouldEndSession = false;
    session.attributes = session.attributes || {};
    session.attributes.prev = 'getWhichHolidayResponse';
    callback(session,
        buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

function getWhichZipCodeResponse(session, callback, prefixText) {
    var cardTitle = "What City or ZIP code?";
    var repromptText = "Which city or ZIP code for candle lighting times?";
    var speechOutput = prefixText ? (prefixText + repromptText) : repromptText;
    var shouldEndSession = false;
    session.attributes = session.attributes || {};
    session.attributes.prev = 'getWhichZipCodeResponse';
    callback(session,
        buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

function userSpecifiedLocation(intent, session) {
    if (intent.slots && intent.slots.CityName && intent.slots.CityName.value) {
        var location = hebcal.getCity(intent.slots.CityName.value);
        return location ? location : {
                cityName: intent.slots.CityName.value,
                cityNotFound: true
            };
    } else if (intent.slots &&
        intent.slots.ZipCode &&
        intent.slots.ZipCode.value &&
        intent.slots.ZipCode.value.length == 5) {
        return {
            zipCode: intent.slots.ZipCode.value
        };
    } else {
        return false;
    }
}

function getCandleLightingResponse(intent, session, callback) {
    var now = getNowForLocation(session),
        friday = hebcal.getUpcomingFriday(now),
        fridayMDY = friday.format('M D YYYY').split(' ');
    var location = userSpecifiedLocation(intent, session);
    var sessionLocation = getLocation(session);

    if (location && location.cityNotFound) {
        console.log("NOTFOUND: " + location.cityName);
        trackEvent(session, 'Error', 'cityNotFound', location.cityName);
        return getWhichZipCodeResponse(session, callback,
            "Sorry, we don't know where " + location.cityName + " is. ");
    }

    var hebcalEventsCallback = function(err, events) {
        if (err) {
            trackException(session, err);
            return callback(session, respond('Internal Error', err));
        }
        var found = events.filter(function(evt) {
            return evt.name === 'Candle lighting';
        });
        if (found.length) {
            var evt = found[0],
                dateText = evt.dt.format('dddd, MMMM Do YYYY'),
                timeText = evt.dt.format('h:mma'),
                whenSpeech,
                cardText = evt.name + ' is at ' + timeText + ' on ' + dateText + ' in ' + location.cityName;
            if (location.zipCode) {
                cardText += ' ' + location.zipCode;
            }
            cardText += '.';
            if (now.day() === 5) {
                whenSpeech = 'tonight';
            } else if (now.day() === 6) {
                whenSpeech = 'next Friday night';
            } else {
                whenSpeech = 'on Friday';
            }
            callback(session, respond(evt.name + ' ' + timeText,
                cardText,
                evt.name + ' ' + whenSpeech + ', in ' + location.cityName + ', is at ' + timeText + '.',
                true,
                session));
        } else {
            console.log("Found NO events with date=" + friday.format('YYYY-MM-DD'));
            trackException(session, intent.name);
            callback(session, respond('Internal Error - ' + intent.name,
                "Sorry, we could not get candle-lighting times for " + location.cityName));
        }
    };

    var myInvokeHebcal = function(location) {
        var args = hebcal.getCandleLightingArgs(location, fridayMDY);
        hebcal.invokeHebcal(args, location, hebcalEventsCallback);
    };

    session.attributes = session.attributes || {};

    if (location && location.latitude) {
        session.attributes.location = location;
        hebcal.saveUser(session.user.userId, location);
        myInvokeHebcal(location);
    } else if (location && location.zipCode) {
        console.log("Need to lookup zipCode " + location.zipCode);
        hebcal.lookupZipCode(location.zipCode, function(err, data) {
            if (err) {
                trackException(session, err);
                return callback(session, respond('Internal Error', err));
            } else if (!data) {
                console.log("NOTFOUND: " + location.zipCode);
                trackEvent(session, 'Error', 'zipNotFound', location.zipCode);
                return getWhichZipCodeResponse(session, callback,
                    'We could not find ZIP code ' + location.zipCode + '. ');
            }
            location = data;
            // save location in this session and persist in DynamoDB
            session.attributes.location = data;
            hebcal.saveUser(session.user.userId, data);
            myInvokeHebcal(location);
        });
    } else if (sessionLocation) {
        location = sessionLocation;
        myInvokeHebcal(location);
    } else {
        return getWhichZipCodeResponse(session, callback);
    }
}

function getParshaResponse(intent, session, callback) {
    var saturday = getNowForLocation(session).day(6),
        saturdayMDY = saturday.format('M D YYYY').split(' '),
        args = ['-s'].concat(saturdayMDY);
    hebcal.invokeHebcal(args, getLocation(session), function(err, events) {
        var re =  /^(Parashat|Pesach|Sukkot|Shavuot|Rosh Hashana|Yom Kippur|Simchat Torah|Shmini Atzeret)/;
        if (err) {
            trackException(session, err);
            return callback(session, respond('Internal Error', err));
        }
        var found = events.filter(function(evt) {
            return evt.name.search(re) != -1;
        });
        if (found.length) {
            var todayOrThisWeek = (getNowForLocation(session).day() === 6) ? 'Today' : 'This week';
            var prefixText = todayOrThisWeek + "'s Torah portion is ";
            var result = hebcal.getParashaOrHolidayName(found[0].name);
            var phoneme = hebcal.getPhonemeTag(result.ipa, result.name);
            var specialShabbat = events.filter(function(evt) {
                return evt.name.indexOf('Shabbat ') === 0;
            });
            var suffixText = '', suffixSsml = '';
            if (specialShabbat.length) {
                var suffixStart = ' Note the special reading for ';
                var result2 = hebcal.getParashaOrHolidayName(specialShabbat[0].name);
                var phoneme2 = hebcal.getPhonemeTag(result2.ipa, result2.name);
                suffixText = suffixStart + specialShabbat[0].name + '.';
                suffixSsml = suffixStart + phoneme2 + '.';
            }
            callback(session, respond(result.title,
                prefixText + result.name + '.' + suffixText,
                prefixText + phoneme + '.' + suffixSsml,
                true,
                session));
        } else {
            trackException(session, intent.name);
            callback(session, respond('Internal Error - ' + intent.name,
                "Sorry, we could find the weekly Torah portion."));
        }
    });
}

function getDateFromSlotOrNow(intent, session) {
    if (intent.slots && intent.slots.MyDate && intent.slots.MyDate.value) {
        return hebcal.parseAmazonDateFormat(intent.slots.MyDate.value);
    } else {
        return getNowForLocation(session);
    }
}

function getHebrewDateResponse(intent, session, callback) {
    var src = getDateFromSlotOrNow(intent, session),
        mdy = src.format('M D YYYY').split(' '),
        args = ['-d', '-h', '-x'].concat(mdy),
        srcDateSsml = hebcal.formatDateSsml(src),
        srcDateText = src.format('MMMM Do YYYY');
    hebcal.invokeHebcal(args, getLocation(session), function(err, events) {
        if (err) {
            trackException(session, err);
            return callback(session, respond('Internal Error', err));
        }
        if (events.length) {
            var evt = events[0],
                now = getNowForLocation(session),
                isOrWasThe = evt.dt.isSameOrAfter(now, 'day') ? ' is the ' : ' was the ',
                name = evt.name;
            var speech = hebcal.hebrewDateSSML(name);
            callback(session, respond(name,
                srcDateText + isOrWasThe + name + '.',
                srcDateSsml + isOrWasThe + speech,
                true,
                session));
        } else {
            trackException(session, intent.name);
            callback(session, respond('Internal Error - ' + intent.name,
                "Sorry, we could not convert " + srcDateText + " to Hebrew calendar.",
                "Sorry, we could not convert " + srcDateSsml + " to Hebrew calendar."));
        }
    });
}

function getDafYomiResponse(intent, session, callback) {
    var args = ['-F', '-h', '-x', '-t'];
    hebcal.invokeHebcal(args, getLocation(session), function(err, events) {
        var found = false;
        if (err) {
            trackException(session, err);
            return callback(session, respond('Internal Error', err));
        }
        events.forEach(function(evt) {
            if (evt.name.indexOf('Daf Yomi:') === 0) {
                var daf = evt.name.substr(10);
                var cardText = "Today's Daf Yomi is " + daf;
                found = true;
                return callback(session, respond(daf, cardText, null, true, session));
            }
        });
        if (!found) {
            trackException(session, intent.name);
            return callback(session, respond('Internal Error - ' + intent.name,
                "Sorry, we could fetch Daf Yomi. Please try again later."));
        }
    });
}

function getOmerResponse(intent, session, callback) {
    var args = ['-o', '-h', '-x', '--years', '2'];
    var location = getLocation(session);
    hebcal.invokeHebcal(args, location, function(err, events) {
        var now = getNowForLocation(session),
            targetDay = location ? hebcal.getMomentForTodayHebrewDate(location) : now;
        if (err) {
            trackException(session, err);
            return callback(session, respond('Internal Error', err));
        }
        var omerEvents = events.filter(function(evt) {
            return hebcal.reOmer.test(evt.name) && evt.dt.isSameOrAfter(targetDay, 'day');
        });
        console.log("Filtered " + events.length + " events to " + omerEvents.length + " future");
        if (omerEvents.length === 0) {
            return callback(session, respond('Interal Error', 'Cannot find Omer in event list.'));
        }
        var evt = omerEvents[0];
        if (evt.dt.isSame(targetDay, 'day')) {
            var matches = evt.name.match(re),
                num = matches[1],
                weeks = Math.floor(num / 7),
                days = num % 7,
                todayOrTonight = 'Today',
                speech = ' is the <say-as interpret-as="ordinal">' + num + '</say-as> day of the Omer';
            if (weeks) {
                speech += ', which is ' + weeks + ' weeks';
                if (days) {
                    speech += ' and ' + days + ' days';
                }
            }
            if (location) {
                var sunset = hebcal.getSunset(location);
                if (now.isAfter(sunset)) {
                    todayOrTonight = 'Tonight';
                }
            }
            return callback(session, respond(evt.name,
                todayOrTonight + ' is the ' + evt.name + '.',
                todayOrTonight + speech,
                true,
                session));
        } else {
            var observedDt = hebcal.dayEventObserved(evt),
                dateSsml = hebcal.formatDateSsml(observedDt),
                dateText = observedDt.format('dddd, MMMM Do YYYY');
            var prefix = 'The counting of the Omer begins at sundown on ';
            callback(session, respond('Counting of the Omer',
                prefix + dateText + '.',
                prefix + dateSsml,
                true,
                session));
        }
    });
}

function getHolidayResponse(intent, session, callback) {
    var args;
    var searchStr0 = intent.slots.Holiday.value.toLowerCase(),
        searchStr = hebcal.getHolidayAlias(searchStr0) || searchStr0;
    var titleYear;

    if (intent.name === "GetHoliday") {
        args = ['--years', '2'];
    } else if (intent.name === "GetHolidayDate") {
        if (intent.slots && intent.slots.MyYear && intent.slots.MyYear.value) {
            args = [intent.slots.MyYear.value];
            titleYear = intent.slots.MyYear.value;
        }
    } else if (intent.name === "GetHolidayNextYear") {
        var year = new Date().getFullYear() + 1,
            yearStr = year.toString();
        args = [yearStr];
        titleYear = yearStr;
    }

    hebcal.invokeHebcal(args, getLocation(session), function(err, events) {
        var now = getNowForLocation(session);
        if (err) {
            trackException(session, err);
            return callback(session, respond('Internal Error', err));
        }
        if (intent.name === "GetHoliday") {
            // events today or in the future
            var future = events.filter(function(evt) {
                return evt.dt.isSameOrAfter(now, 'day');
            });
            console.log("Filtered " + events.length + " events to " + future.length + " future");
            events = future;
        }
        var eventsFiltered = hebcal.filterEvents(events);
        console.log("Filtered to " + eventsFiltered.length + " first occurrences");
        /*
        console.log(JSON.stringify({events: eventsFiltered}));
        console.log("Searching for [" + searchStr + "] in " + eventsFiltered.length);
        if (eventsFiltered.length) {
            var evt = eventsFiltered[0],
                evt2 = eventsFiltered[eventsFiltered.length - 1];
            console.log("Event 0 is [" + evt.name + "] on " + evt.dt.format('YYYY-MM-DD'));
            console.log("Event " + (eventsFiltered.length - 1) + " is [" + evt2.name + "] on " + evt2.dt.format('YYYY-MM-DD'));
        }
        */
        var found = eventsFiltered.filter(function(evt) {
            if (searchStr === 'rosh chodesh') {
                return evt.name.indexOf('Rosh Chodesh ') === 0;
            } else {
                var h = hebcal.getHolidayBasename(evt.name);
                return h.toLowerCase() === searchStr;
            }
        });
        if (found.length) {
            var evt = found[0],
                holiday = hebcal.getHolidayBasename(evt.name);
            var ipa = hebcal.getHolidayIPA(holiday);
            var phoneme = hebcal.getPhonemeTag(ipa, holiday);
            var observedDt = hebcal.dayEventObserved(evt),
                observedWhen = hebcal.beginsWhen(evt.name);
            var dateSsml = hebcal.formatDateSsml(observedDt),
                dateText = observedDt.format('dddd, MMMM Do YYYY');
            var begins = observedDt.isSameOrAfter(now, 'day') ? 'begins' : 'began',
                isToday = observedDt.isSame(now, 'day'),
                beginsOn = ' ' + begins + ' ' + observedWhen + ' ';
            var title = holiday;
            if (titleYear) {
                title += ' ' + titleYear;
            }
            if (!isToday) {
                beginsOn += 'on ';
            }
            callback(session, respond(title,
                holiday + beginsOn + dateText + '.',
                phoneme + beginsOn + dateSsml,
                true,
                session));
        } else {
            callback(session, respond(intent.slots.Holiday.value,
                'Sorry, we could not find the date for ' + intent.slots.Holiday.value + '.'));
        }
    });
}

function respond(title, cardText, ssmlContent, addShabbatShalom, session) {
    var specialGreeting = session && session.attributes ? session.attributes.specialGreeting : undefined;
    var cardText2 = hebcal.strWithSpecialGreeting(cardText, false, addShabbatShalom, specialGreeting),
        ssmlContent2 = hebcal.strWithSpecialGreeting(ssmlContent, true, addShabbatShalom, specialGreeting);
    var outputSpeech = ssmlContent2 ? {
        type: 'SSML',
        ssml: '<speak>' + ssmlContent2 + '</speak>'
    } : {
        type: 'PlainText',
        text: cardText2
    };
    console.log("RESPONSE: " + cardText2);
    return {
        outputSpeech: outputSpeech,
        card: {
            type: "Simple",
            title: title,
            content: cardText2
        },
        reprompt: {
            outputSpeech: {
                type: "PlainText",
                text: null
            }
        },
        shouldEndSession: true
    };
}

// --------------- Helpers that build all of the responses -----------------------

function buildSpeechletResponse(title, output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: "PlainText",
            text: output
        },
        card: {
            type: "Simple",
            title: "Hebcal - " + title,
            content: "Hebcal - " + output
        },
        reprompt: {
            outputSpeech: {
                type: "PlainText",
                text: repromptText
            }
        },
        shouldEndSession: shouldEndSession
    };
}

function buildResponse(sessionAttributes, speechletResponse) {
    return {
        version: "1.0",
        sessionAttributes: sessionAttributes,
        response: speechletResponse
    };
}