var moment = require('moment-timezone');

var hebcal = require('./hebcal-app');

// Route the incoming request based on type (LaunchRequest, IntentRequest,
// etc.) The JSON body of the request is provided in the event parameter.
exports.handler = function (event, context) {
    console.log("MAIN event=" + JSON.stringify(event));
    try {
        if (event.session.application && event.session.application.applicationId && event.session.application.applicationId !== "amzn1.echo-sdk-ams.app.24d6d476-8351-403f-9047-f08e42a9f623") {
             context.fail("Invalid Application ID=" + event.session.application.applicationId);
        }

        if (event.session.new) {
            onSessionStarted({requestId: event.request.requestId}, event.session);
        }

        if (event.request.type === "LaunchRequest") {
            onLaunch(event.request,
                event.session,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === "IntentRequest") {
            onIntent(event.request,
                event.session,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === "SessionEndedRequest") {
            onSessionEnded(event.request, event.session);
            context.succeed();
        }
    } catch (e) {
        context.fail("Exception: " + e);
    }
};

/**
 * Called when the session starts.
 */
function onSessionStarted(sessionStartedRequest, session) {
}

/**
 * Called when the user launches the skill without specifying what they want.
 */
function onLaunch(launchRequest, session, callback) {
    // Dispatch to your skill's launch.
    getWelcomeResponse(callback, false);
}

/**
 * Called when the user specifies an intent for this skill.
 */
function onIntent(intentRequest, session, callback) {
    var intent = intentRequest.intent,
        intentName = intentRequest.intent.name;

    if (session && session.attributes) {
        console.log("sessionAttributes=" + JSON.stringify(session.attributes));
    }

    // Dispatch to your skill's intent handlers
    if (["GetHoliday", "GetHolidayDate", "GetHolidayNextYear"].indexOf(intentName) != -1) {
        if (intent.slots && intent.slots.Holiday && intent.slots.Holiday.value) {
            getHolidayResponse(intent, session, callback);
        } else {
            getWhichHolidayResponse(callback);
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
        callback({}, buildSpeechletResponse("Goodbye", "Goodbye", null, true));
    } else if ("AMAZON.HelpIntent" === intentName) {
        getWelcomeResponse(callback, true);
    } else {
        callback({}, buildSpeechletResponse("Invalid intent", "Invalid intent " + intentName + ". Goodbye", null, true));
    }
}

/**
 * Called when the user ends the session.
 * Is not called when the skill returns shouldEndSession=true.
 */
function onSessionEnded(sessionEndedRequest, session) {
    // Add cleanup logic here
}

// --------------- Functions that control the skill's behavior -----------------------

function getWelcomeResponse(callback, isHelpIntent) {
    var repromptText = "You can ask about holidays, the Torah portion, candle lighting times, or Hebrew dates.";
    var nag = ' What will it be?';
    var args = ['-t'];
    hebcal.invokeHebcal(args, function(err, events) {
        if (err) {
            return callback({}, respond('Internal Error', err));
        }
        var hebrewDateStr = events[0].name;
        var speech = hebcal.hebrewDateSSML(hebrewDateStr, true);
        var cardText = '';
        var ssmlContent = '';
        if (!isHelpIntent) {
            cardText += 'Welcome to Hebcal. Today is the ' + hebrewDateStr + '. ';
            ssmlContent += 'Welcome to Hieb-Kal. Today is the ' + speech + '. ';
        }
        var response = respond('Welcome to Hebcal',
            cardText + repromptText + nag,
            ssmlContent + repromptText + nag);
        response.shouldEndSession = false;
        response.reprompt.outputSpeech.text = repromptText;
        callback({}, response);
    });
}

function getWhichDateResponse(callback) {
    var cardTitle = "What date?";
    var repromptText = "Which date would you like me to convert?";
    var speechOutput = "Sorry, Hieb-Kal didn't understand the date. " + repromptText;
    var shouldEndSession = false;
    callback({prev:'getWhichDateResponse'},
        buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

function getWhichHolidayResponse(callback) {
    var cardTitle = "What holiday?";
    var repromptText = "Which holiday would you like?";
    var speechOutput = "Sorry, Hieb-Kal didn't understand the holiday. " + repromptText;
    var shouldEndSession = false;
    callback({prev:'getWhichHolidayResponse'},
        buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

function getWhichZipCodeResponse(callback, prefixText) {
    var cardTitle = "What City or ZIP code?";
    var repromptText = "Which city or ZIP code for candle lighting times?";
    var speechOutput = prefixText ? (prefixText + repromptText) : repromptText;
    var shouldEndSession = false;
    callback({prev:'getWhichZipCodeResponse'},
        buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

function userSpecifiedLocation(intent, session) {
    if (session && session.attributes && session.attributes.location) {
        return session.attributes.location;
    } else if (intent.slots && intent.slots.CityName && intent.slots.CityName.value) {
        var location = hebcal.usCities[intent.slots.CityName.value.toLowerCase()];
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
    var friday = moment().day('Friday'),
        fridayStr = friday.format('YYYY-MM-DD'),
        friYear = friday.format('YYYY');
    var location = userSpecifiedLocation(intent, session);
    var sessionAttributes = session && session.attributes ? session.attributes : {};

    if (location && location.cityNotFound) {
        return getWhichZipCodeResponse(callback,
            "Sorry, we don't know where " + location.cityName + " is. ");
    }

    var hebcalEventsCallback = function(err, events) {
        if (err) {
            return callback(sessionAttributes, respond('Internal Error', err));
        }
        var found = events.filter(function(evt) {
            return evt.name === 'Candle lighting' &&
                evt.dt.format('YYYY-MM-DD') === fridayStr;
        });
        if (found.length) {
            var evt = found[0],
                dateText = evt.dt.format('dddd, MMMM Do YYYY'),
                timeText = evt.dt.format('h:mma');
                cardText = evt.name + ' is at ' + timeText + ' on ' + dateText + ' in ' + location.cityName;
            if (location.zipCode) {
                cardText += ' ' + location.zipCode;
            }
            cardText += '.';
            callback(sessionAttributes, respond(evt.name + ' ' + timeText,
                cardText,
                evt.name + ' on Friday, in ' + location.cityName + ', is at ' + timeText + '.',
                true));
        } else {
            console.log("Found NO events with date=" + fridayStr);
            callback(sessionAttributes, respond('Internal Error - ' + intent.name,
                "Sorry, we could not get candle-lighting times for " + location.cityName));
        }
    };

    var myInvokeHebcal = function(location) {
        var args = hebcal.getCandleLightingArgs(location, friYear);
        hebcal.invokeHebcal(args, hebcalEventsCallback);
    };

    if (location && location.latitude) {
        console.log("Skipping SQLite lookup " + JSON.stringify(location));
        sessionAttributes.location = location;
        hebcal.saveUser(session.user.userId, location);
        myInvokeHebcal(location);
    } else if (location && location.zipCode) {
        console.log("Need to lookup zipCode " + location.zipCode);
        hebcal.lookupZipCode(location.zipCode, function(err, data) {
            if (err) {
                return callback(sessionAttributes, respond('Internal Error', err));
            } else if (!data) {
                return getWhichZipCodeResponse(callback,
                    'We could not find ZIP code ' + location.zipCode + '. ');
            }
            location = data;
            // save location in this session and persist in DynamoDB
            sessionAttributes.location = data;
            hebcal.saveUser(session.user.userId, data);
            myInvokeHebcal(location);
        });
    } else {
        hebcal.lookupUser(session.user.userId, function(data) {
            if (data) {
                location = data;
                sessionAttributes.location = data;
                myInvokeHebcal(location);
            } else {
                return getWhichZipCodeResponse(callback);
            }
        });
    }
}

function getParshaResponse(intent, session, callback) {
    var saturday = moment().day('Saturday'),
        satYear = saturday.format('YYYY');
    var args = ['-s', satYear];
    hebcal.invokeHebcal(args, function(err, events) {
        var re =  /^(Parashat|Pesach|Sukkot|Shavuot|Rosh Hashana|Yom Kippur|Simchat Torah|Shmini Atzeret)/;
        if (err) {
            return callback({}, respond('Internal Error', err));
        }
        var found = events.filter(function(evt) {
            return evt.dt.isSame(saturday, 'day') &&
                evt.name.search(re) != -1;
        });
        if (found.length) {
            var result = hebcal.getParashaOrHolidayName(found[0].name);
            var phoneme = '<phoneme alphabet="ipa" ph="' + result.ipa + '">' + result.name + '</phoneme>';
            callback({}, respond(result.title,
                "This week's Torah portion is " + result.name + '.',
                "This week's Torah portion is " + phoneme,
                true));
        }
    });
}

function getDateFromSlotOrNow(intent) {
    if (intent.slots && intent.slots.MyDate && intent.slots.MyDate.value) {
        return hebcal.parseAmazonDateFormat(intent.slots.MyDate.value);
    } else {
        return moment();
    }
}

function getHebrewDateResponse(intent, session, callback) {
    var src = getDateFromSlotOrNow(intent),
        args = ['-d', src.format('YYYY')],
        srcDateSsml = hebcal.formatDateSsml(src),
        srcDateText = src.format('MMMM Do YYYY');
    hebcal.invokeHebcal(args, function(err, events) {
        if (err) {
            return callback({}, respond('Internal Error', err));
        }
        var found = events.filter(function(evt) {
            return evt.dt.isSame(src, 'day');
        });
        if (found.length) {
            var evt = found[0],
                now = moment(),
                isOrWasThe = evt.dt.isSameOrAfter(now, 'day') ? ' is the ' : ' was the ',
                name = evt.name;
            var speech = hebcal.hebrewDateSSML(name);
            callback({}, respond(name,
                srcDateText + isOrWasThe + name + '.',
                srcDateSsml + isOrWasThe + speech,
                true));
        } else {
            callback({}, respond('Internal Error - ' + intent.name,
                "Sorry, we could not convert " + srcDateText + " to Hebrew calendar.",
                "Sorry, we could not convert " + srcDateSsml + " to Hebrew calendar."));
        }
    });
}

function getDafYomiResponse(intent, session, callback) {
    var args = ['-F', '-h', '-x', '-t'];
    hebcal.invokeHebcal(args, function(err, events) {
        var found = false;
        if (err) {
            return callback({}, respond('Internal Error', err));
        }
        events.forEach(function(evt) {
            if (evt.name.indexOf('Daf Yomi:') === 0) {
                var daf = evt.name.substr(10);
                found = true;
                return callback({}, respond(daf, "Today's Daf Yomi is " + daf));
            }
        });
        if (!found) {
            return callback({}, respond('Internal Error - ' + intent.name,
                "Sorry, we could fetch Daf Yomi. Please try again later."));
        }
    });
}

function getOmerResponse(intent, session, callback) {
    var args = ['-o', '--years', '2'];
    hebcal.invokeHebcal(args, function(err, events) {
        var now = moment();
        if (err) {
            return callback({}, respond('Internal Error', err));
        }
        var re = /^(\d+)\w+ day of the Omer$/;
        var omerEvents = events.filter(function(evt) {
            return re.test(evt.name) && evt.dt.isSameOrAfter(now, 'day');
        });
        console.log("Filtered " + events.length + " events to " + omerEvents.length + " future");
        if (omerEvents.length === 0) {
            return callback({}, respond('Interal Error', 'Cannot find Omer in event list.'));
        }
        var evt = omerEvents[0];
        if (evt.dt.isSame(now, 'day')) {
            var matches = evt.name.match(re),
                num = matches[1],
                weeks = Math.floor(num / 7),
                days = num % 7,
                speech = 'Today is the <say-as interpret-as="ordinal">' + num + '</say-as> day of the Omer';
            if (weeks) {
                speech += ', which is ' + weeks + ' weeks';
                if (days) {
                    speech += ' and ' + days + ' days';
                }
            }
            return callback({}, respond(evt.name,
                'Today is the ' + evt.name + '.',
                speech,
                true));
        } else {
            var observedDt = hebcal.dayEventObserved(evt),
                dateSsml = hebcal.formatDateSsml(observedDt),
                dateText = observedDt.format('dddd, MMMM Do YYYY');
            var prefix = 'The counting of the Omer begins at sundown on ';
            callback({}, respond('Counting of the Omer',
                prefix + dateText + '.',
                prefix + dateSsml,
                true));
        }
    });
}

function getHolidayResponse(intent, session, callback) {
    var args;
    var searchStr0 = intent.slots.Holiday.value.toLowerCase(),
        searchStr = hebcal.holidayAlias[searchStr0] || searchStr0;
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

    hebcal.invokeHebcal(args, function(err, events) {
        var now = moment();
        if (err) {
            return callback({}, respond('Internal Error', err));
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
            var ipa = hebcal.holiday2ipa[holiday];
            var phoneme = ipa ?
                '<phoneme alphabet="ipa" ph="' + ipa + '">' + holiday + '</phoneme>' :
                holiday;
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
            callback({}, respond(title,
                holiday + beginsOn + dateText + '.',
                phoneme + beginsOn + dateSsml,
                true));
        } else {
            callback({}, respond(intent.slots.Holiday.value,
                'Sorry, we could not find the date for ' + intent.slots.Holiday.value + '.'));
        }
    });
}

function respond(title, cardText, ssmlContent, addShabbatShalom) {
    var isTodayShabbat = addShabbatShalom ? moment().day() === 6 : false;
    var cardText2 = hebcal.strWithShabbatShalom(cardText, isTodayShabbat, false),
        ssmlContent2 = hebcal.strWithShabbatShalom(ssmlContent, isTodayShabbat, true);
    var outputSpeech = ssmlContent2 ? {
        type: 'SSML',
        ssml: '<speak>' + ssmlContent2 + '</speak>'
    } : {
        type: 'PlainText',
        text: cardText2
    };
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