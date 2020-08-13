const googleAnalytics = require('./hebcal-track');
const hebcal = require('./hebcal-app');

// Route the incoming request based on type (LaunchRequest, IntentRequest,
// etc.) The JSON body of the request is provided in the event parameter.
exports.handler = function (event, context) {
    console.log(`MAIN event=${JSON.stringify(event)}`);
    try {
/*
        if (event.session.application && event.session.application.applicationId && event.session.application.applicationId !== "amzn1.echo-sdk-ams.app.24d6d476-8351-403f-9047-f08e42a9f623") {
             context.fail("Invalid Application ID=" + event.session.application.applicationId);
        }
*/
        if (event.request.type === "LaunchRequest" || event.request.type === "IntentRequest") {
            loadUserAndGreetings(event.request, event.session, () => {
                if (event.request.type === "LaunchRequest") {
                    onLaunch(event.request, event.session, (session, speechletResponse) => {
                        const sessionAttributes = session && session.attributes ? session.attributes : {};
                        trackScreenview(session, "LaunchRequest");
                        context.succeed(buildResponse(sessionAttributes, speechletResponse));
                    });
                } else {
                    // event.request.type === "IntentRequest"
                    onIntent(event.request, event.session, (session, speechletResponse) => {
                        const sessionAttributes = session && session.attributes ? session.attributes : {};
                        trackIntent(event.request.intent, session);
                        context.succeed(buildResponse(sessionAttributes, speechletResponse));
                    });
                }
            });
        } else if (event.request.type === "SessionEndedRequest") {
            trackScreenview(event.session, "SessionEndedRequest");
            context.succeed();
        } else {
            context.fail("Unknown event.request.type");
        }
    } catch (e) {
        context.fail(`Exception: ${e}`);
    }
}

function trackIntent(intent, session) {
    const intentName = intent.name;
    trackScreenview(session, intentName);
    if (typeof intent.slots === 'object') {
        const slots = intent.slots;
        for (const slot in slots) {
            const slotval = slots[slot].value;
            if (slotval && slotval.length) {
                trackEvent(session, slot, slotval);
            }
        }
    }
}

function getTrackingOptions(session) {
    const location = getLocation(session);
    let options;
    if (location) {
        if (location.geoid) {
            options = {
                geoid: location.geoid
            };
        } else if (location.cc && location.cc.length && location.cc != 'US') {
            options = {
                geoid: location.cc
            };
        }
    }
    return options;
}

function trackScreenview(session, screenName) {
    const options = getTrackingOptions(session);
    googleAnalytics.screenview(session.user.userId, screenName, options);
}

function trackEvent(session, category, action, label) {
    const options = getTrackingOptions(session);
    googleAnalytics.event(session.user.userId, category, action, label, options);
}

function trackException(session, description) {
    const options = getTrackingOptions(session);
    googleAnalytics.exception(session.user.userId, description, options);
}

function loadUserAndGreetings(request, session, callback) {
    session.attributes = session.attributes || {};

    if (session.attributes.todayHebrewDateStr) {
        return callback();
    }

    hebcal.lookupUser(session.user.userId, user => {
        let args = ['-t'];
        if (user && user.ts) {
            session.attributes.returningUser = true;
            if (user.location) {
                const m = hebcal.getMomentForTodayHebrewDate(user.location);
                args = m.format('M D YYYY').split(' ');
                session.attributes.location = user.location;
            }
        }
        hebcal.invokeHebcal(args, getLocation(session), (err, events) => {
            if (err) {
                trackException(session, err);
                return callback();
            }
            session.attributes.todayHebrewDateStr = events[0].name;
            const arr = hebcal.getSpecialGreetings(events);
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
    const intent = intentRequest.intent;
    const intentName = intentRequest.intent.name;

    // Dispatch to your skill's intent handlers
    switch (intentName) {
        case "GetHoliday":
        case "GetHolidayDate":
        case "GetHolidayNextYear":
        case "HolidaySlotOnlyIntent":
            if (intent.slots && intent.slots.Holiday && intent.slots.Holiday.value && intent.slots.Holiday.value.length > 1) {
                const holidayName = intent.slots.Holiday.value.toLowerCase();
                if (holidayName === 'shabbat' || holidayName === 'shabbos') {
                    getCandleLightingResponse(intent, session, callback);
                } else {
                    getHolidayResponse(intent, session, callback);
                }
            } else {
                getWhichHolidayResponse(session, callback);
            }
            break;
        case "GetParsha":
            getParshaResponse(intent, session, callback);
            break;
        case "GetHebrewDate":
        case "MyDateSlotOnlyIntent":
            getHebrewDateResponse(intent, session, callback);
            break;
        case "GetCandles":
        case "SetLocation":
        case "CityNameSlotOnlyIntent":
        case "ZipCodeSlotOnlyIntent":
            getCandleLightingResponse(intent, session, callback);
            break;
        case "GetOmer":
            getOmerResponse(intent, session, callback);
            break;
        case "GetDafYomi":
            getDafYomiResponse(intent, session, callback);
            break;
        case "AMAZON.CancelIntent":
        case "AMAZON.StopIntent":
            callback(session, buildSpeechletResponse("Goodbye", "Goodbye", null, true));
            break;
        case "AMAZON.HelpIntent":
            getWelcomeResponse(session, callback, true);
            break;
        default:
            callback(session, buildSpeechletResponse("Invalid intent", `Invalid intent ${intentName}. Goodbye`, null, true));
            break;
    }
}

// --------------- Functions that control the skill's behavior -----------------------

function getLocation(session) {
    if (session && session.attributes && session.attributes.location) {
        return session.attributes.location;
    }
    return undefined;
}

function getNowForLocation(session) {
    const location = getLocation(session);
    return hebcal.getNowForLocation(location);
}

function todayOrTonight(now, location) {
    return hebcal.isAfterSunset(now, location) ? 'Tonight' : 'Today';
}

function getWelcomeResponse(session, callback, isHelpIntent) {
    const repromptText = "You can ask about holidays, the Torah portion, candle lighting times, or Hebrew dates.";
    const nag = ' What will it be?';
    const hebrewDateStr = session.attributes.todayHebrewDateStr;
    const speech = hebcal.hebrewDateSSML(hebrewDateStr, true);
    let cardText = '';
    let ssmlContent = '';
    if (!isHelpIntent) {
        cardText += `Welcome to Hebcal. Today is the ${hebrewDateStr}. `;
        ssmlContent += `Welcome to Hieb-Kal. Today is the ${speech}. `;
    }
    if (isHelpIntent || !session.attributes.returningUser) {
        cardText += repromptText;
        ssmlContent += repromptText;
    }
    const response = respond('Welcome to Hebcal', cardText + nag, ssmlContent + nag);
    response.shouldEndSession = false;
    response.reprompt.outputSpeech.text = repromptText;
    callback(session, response);
}

function getWhichHolidayResponse(session, callback) {
    const cardTitle = "What holiday?";
    const repromptText = "Which holiday would you like?";
    const speechOutput = `Sorry, Hieb-Kal didn't understand the holiday. ${repromptText}`;
    const shouldEndSession = false;
    session.attributes = session.attributes || {};
    session.attributes.prev = 'getWhichHolidayResponse';
    callback(session,
        buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

function getWhichZipCodeResponse(session, callback, prefixText) {
    const cardTitle = "What City or ZIP code?";
    const repromptText = "Which city or ZIP code for candle lighting times?";
    const speechOutput = prefixText ? (prefixText + repromptText) : repromptText;
    const shouldEndSession = false;
    session.attributes = session.attributes || {};
    session.attributes.prev = 'getWhichZipCodeResponse';
    callback(session,
        buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

function userSpecifiedLocation({slots}) {
    if (slots && slots.CityName && slots.CityName.value) {
        const location = hebcal.getCity(slots.CityName.value);
        return location ? location : {
                cityName: slots.CityName.value,
                cityNotFound: true
            };
    } else if (slots &&
        slots.ZipCode &&
        slots.ZipCode.value &&
        slots.ZipCode.value.length == 5) {
        return {
            zipCode: slots.ZipCode.value
        };
    } else {
        return false;
    }
}

function getCandleLightingResponse(intent, session, callback) {
    const now = getNowForLocation(session);
    const friday = hebcal.getUpcomingFriday(now);
    const fridayMDY = friday.format('M D YYYY').split(' ');
    let location = userSpecifiedLocation(intent);
    const sessionLocation = getLocation(session);

    if (location && location.cityNotFound) {
        console.log(`NOTFOUND: ${location.cityName}`);
        trackEvent(session, 'cityNotFound', location.cityName);
        return getWhichZipCodeResponse(session, callback,
            `Sorry, we don't know where ${location.cityName} is. `);
    }

    const hebcalEventsCallback = (err, events) => {
        if (err) {
            trackException(session, err);
            return callback(session, respond('Internal Error', err));
        }
        const found = events.filter(({name}) => {
            return name === 'Candle lighting';
        });
        if (found.length) {
            const evt = found[0];
            const dateText = evt.dt.format('dddd, MMMM Do YYYY');
            const timeText = evt.dt.format('h:mma');
            let whenSpeech;
            let cardText = `${evt.name} is at ${timeText} on ${dateText} in ${location.cityName}`;
            if (location.zipCode) {
                cardText += ` ${location.zipCode}`;
            }
            cardText += '.';
            if (now.day() === 5) {
                whenSpeech = 'tonight';
            } else if (now.day() === 6) {
                whenSpeech = 'next Friday night';
            } else {
                whenSpeech = 'on Friday';
            }
            callback(session, respond(`${evt.name} ${timeText}`,
                cardText,
                `${evt.name} ${whenSpeech}, in ${location.cityName}, is at ${timeText}.`,
                true,
                session));
        } else {
            console.log(`Found NO events with date=${friday.format('YYYY-MM-DD')}`);
            trackException(session, intent.name);
            callback(session, respond(`Internal Error - ${intent.name}`,
                `Sorry, we could not get candle-lighting times for ${location.cityName}`));
        }
    };

    const myInvokeHebcal = location => {
        const args = hebcal.getCandleLightingArgs(location, fridayMDY);
        hebcal.invokeHebcal(args, location, hebcalEventsCallback);
    };

    session.attributes = session.attributes || {};

    if (location && location.latitude) {
        session.attributes.location = location;
        hebcal.saveUser(session.user.userId, location);
        myInvokeHebcal(location);
    } else if (location && location.zipCode) {
        console.log(`Need to lookup zipCode ${location.zipCode}`);
        hebcal.lookupZipCode(location.zipCode, (err, data) => {
            if (err) {
                trackException(session, err);
                return callback(session, respond('Internal Error', err));
            } else if (!data) {
                console.log(`NOTFOUND: ${location.zipCode}`);
                trackEvent(session, 'zipNotFound', location.zipCode);
                return getWhichZipCodeResponse(session, callback,
                    `We could not find ZIP code ${location.zipCode}. `);
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

function getParshaResponse({name}, session, callback) {
    const saturday = getNowForLocation(session).day(6);
    const saturdayMDY = saturday.format('M D YYYY').split(' ');
    const location = getLocation(session);
    let args = ['-s'];
    if (location && location.cc && location.cc == 'IL') {
        args = args.concat('-i');
    }
    args = args.concat(saturdayMDY);
    hebcal.invokeHebcal(args, location, (err, events) => {
        const re =  /^(Parashat|Pesach|Sukkot|Shavuot|Rosh Hashana|Yom Kippur|Simchat Torah|Shmini Atzeret)/;
        if (err) {
            trackException(session, err);
            return callback(session, respond('Internal Error', err));
        }
        const found = events.filter(({name}) => {
            return name.search(re) != -1;
        });
        if (found.length) {
            const todayOrThisWeek = (getNowForLocation(session).day() === 6) ? 'Today' : 'This week';
            const prefixText = `${todayOrThisWeek}'s Torah portion is `;
            const result = hebcal.getParashaOrHolidayName(found[0].name);
            const phoneme = hebcal.getPhonemeTag(result.ipa, result.name);
            const specialShabbat = events.filter(({name}) => {
                return name.indexOf('Shabbat ') === 0;
            });
            let suffixText = '';
            let suffixSsml = '';
            if (specialShabbat.length) {
                const suffixStart = ' Note the special reading for ';
                const result2 = hebcal.getParashaOrHolidayName(specialShabbat[0].name);
                const phoneme2 = hebcal.getPhonemeTag(result2.ipa, result2.name);
                suffixText = `${suffixStart + specialShabbat[0].name}.`;
                suffixSsml = `${suffixStart + phoneme2}.`;
            }
            callback(session, respond(result.title,
                `${prefixText + result.name}.${suffixText}`,
                `${prefixText + phoneme}.${suffixSsml}`,
                true,
                session));
        } else {
            trackException(session, name);
            callback(session, respond(`Internal Error - ${name}`,
                "Sorry, we could find the weekly Torah portion."));
        }
    });
}

function getDateSlotValue({slots}) {
    return slots && slots.MyDate && slots.MyDate.value;
}

function getHebrewDateSrc(now, location, slotValue) {
    if (slotValue) {
        return hebcal.parseAmazonDateFormat(slotValue);
    } else if (location && location.latitude) {
        return hebcal.getMomentForTodayHebrewDate(location);
    } else {
        return now;
    }
}

function getHebrewDateResponse(intent, session, callback) {
    const location = getLocation(session);
    const now = hebcal.getNowForLocation(location);
    const slotValue = getDateSlotValue(intent);
    const src = getHebrewDateSrc(now, location, slotValue);
    const mdy = src.format('M D YYYY').split(' ');
    const args = ['-d', '-h', '-x'].concat(mdy);
    let srcDateSsml = hebcal.formatDateSsml(src);
    let srcDateText = src.format('MMMM Do YYYY');
    if (!slotValue) {
        srcDateSsml = todayOrTonight(now, location);
        if (hebcal.isAfterSunset(now, location)) {
            srcDateText = now.format('MMMM Do YYYY');
            srcDateText += ' (after sunset)';
        }
    }
    hebcal.invokeHebcal(args, location, (err, events) => {
        if (err) {
            trackException(session, err);
            return callback(session, respond('Internal Error', err));
        }
        if (events.length) {
            const evt = events[0];
            const isOrWasThe = evt.dt.isSameOrAfter(now, 'day') ? ' is the ' : ' was the ';
            const name = evt.name;
            const speech = hebcal.hebrewDateSSML(name);
            callback(session, respond(name,
                `${srcDateText + isOrWasThe + name}.`,
                srcDateSsml + isOrWasThe + speech,
                true,
                session));
        } else {
            trackException(session, intent.name);
            callback(session, respond(`Internal Error - ${intent.name}`,
                `Sorry, we could not convert ${srcDateText} to Hebrew calendar.`,
                `Sorry, we could not convert ${srcDateSsml} to Hebrew calendar.`));
        }
    });
}

function getDafYomiResponse({name}, session, callback) {
    const args = ['-F', '-h', '-x', '-t'];
    hebcal.invokeHebcal(args, getLocation(session), (err, events) => {
        let found = false;
        if (err) {
            trackException(session, err);
            return callback(session, respond('Internal Error', err));
        }
        events.forEach(({name}) => {
            if (name.indexOf('Daf Yomi:') === 0) {
                const daf = name.substr(10);
                const cardText = `Today's Daf Yomi is ${daf}`;
                found = true;
                return callback(session, respond(daf, cardText, null, true, session));
            }
        });
        if (!found) {
            trackException(session, name);
            return callback(session, respond(`Internal Error - ${name}`,
                "Sorry, we could fetch Daf Yomi. Please try again later."));
        }
    });
}

function getOmerResponse(intent, session, callback) {
    const args = ['-o', '-h', '-x', '--years', '2'];
    const location = getLocation(session);
    const now = hebcal.getNowForLocation(location);
    const targetDay = getHebrewDateSrc(now, location);
    hebcal.invokeHebcal(args, location, (err, events) => {
        if (err) {
            trackException(session, err);
            return callback(session, respond('Internal Error', err));
        }
        const omerEvents = events.filter(({name, dt}) => {
            return hebcal.reOmer.test(name) && dt.isSameOrAfter(targetDay, 'day');
        });
        console.log(`Filtered ${events.length} events to ${omerEvents.length} future`);
        if (omerEvents.length === 0) {
            return callback(session, respond('Interal Error', 'Cannot find Omer in event list.'));
        }
        const evt = omerEvents[0];
        if (evt.dt.isSame(targetDay, 'day')) {
            const matches = evt.name.match(hebcal.reOmer);
            const num = matches[1];
            const weeks = Math.floor(num / 7);
            const days = num % 7;
            const todayOrTonightStr = todayOrTonight(now, location);
            let suffix = '';
            const speech = ` is the <say-as interpret-as="ordinal">${num}</say-as> day of the Omer`;
            if (weeks) {
                suffix = `, which is ${weeks} week`;
                if (weeks > 1) {
                    suffix += 's';
                }
                if (days) {
                    suffix += ` and ${days} day`;
                    if (days > 1) {
                        suffix += 's';
                    }
                }
            }
            return callback(session, respond(evt.name,
                `${todayOrTonightStr} is the ${evt.name}${suffix}.`,
                todayOrTonightStr + speech + suffix,
                true,
                session));
        } else {
            const observedDt = hebcal.dayEventObserved(evt);
            const dateSsml = hebcal.formatDateSsml(observedDt);
            const dateText = observedDt.format('dddd, MMMM Do YYYY');
            const prefix = 'The counting of the Omer begins at sundown on ';
            callback(session, respond('Counting of the Omer',
                `${prefix + dateText}.`,
                prefix + dateSsml,
                true,
                session));
        }
    });
}

function getHolidayResponse({slots, name}, session, callback) {
    let args;
    const searchStr0 = slots.Holiday.value.toLowerCase();
    const searchStr = hebcal.getHolidayAlias(searchStr0) || searchStr0;
    let titleYear;

    if (name === "GetHoliday") {
        args = ['--years', '2'];
    } else if (name === "GetHolidayDate") {
        if (slots && slots.MyYear && slots.MyYear.value) {
            args = [slots.MyYear.value];
            titleYear = slots.MyYear.value;
        }
    } else if (name === "GetHolidayNextYear") {
        const year = new Date().getFullYear() + 1;
        const yearStr = year.toString();
        args = [yearStr];
        titleYear = yearStr;
    }

    hebcal.invokeHebcal(args, getLocation(session), (err, events) => {
        const now = getNowForLocation(session);
        if (err) {
            trackException(session, err);
            return callback(session, respond('Internal Error', err));
        }
        if (name === "GetHoliday") {
            // events today or in the future
            const future = events.filter(({dt}) => {
                return dt.isSameOrAfter(now, 'day');
            });
            console.log(`Filtered ${events.length} events to ${future.length} future`);
            events = future;
        }
        const eventsFiltered = hebcal.filterEvents(events);
        console.log(`Filtered to ${eventsFiltered.length} first occurrences`);
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
        const found = eventsFiltered.filter(({name}) => {
            if (searchStr === 'rosh chodesh') {
                return name.indexOf('Rosh Chodesh ') === 0;
            } else {
                const h = hebcal.getHolidayBasename(name);
                return h.toLowerCase() === searchStr;
            }
        });
        if (found.length) {
            const evt = found[0];
            const holiday = hebcal.getHolidayBasename(evt.name);
            const ipa = hebcal.getHolidayIPA(holiday);
            const phoneme = hebcal.getPhonemeTag(ipa, holiday);
            const observedDt = hebcal.dayEventObserved(evt);
            const observedWhen = hebcal.beginsWhen(evt.name);
            const dateSsml = hebcal.formatDateSsml(observedDt);
            const dateText = observedDt.format('dddd, MMMM Do YYYY');
            const begins = observedDt.isSameOrAfter(now, 'day') ? 'begins' : 'began';
            const isToday = observedDt.isSame(now, 'day');
            let beginsOn = ` ${begins} ${observedWhen} `;
            let title = holiday;
            if (titleYear) {
                title += ` ${titleYear}`;
            }
            if (!isToday) {
                beginsOn += 'on ';
            }
            callback(session, respond(title,
                `${holiday + beginsOn + dateText}.`,
                phoneme + beginsOn + dateSsml,
                true,
                session));
        } else {
            callback(session, respond(slots.Holiday.value,
                `Sorry, we could not find the date for ${slots.Holiday.value}.`));
        }
    });
}

function respond(title, cardText, ssmlContent, addShabbatShalom, session) {
    const specialGreeting = session && session.attributes ? session.attributes.specialGreeting : undefined;
    const location = getLocation(session);
    const cardText2 = hebcal.strWithSpecialGreeting(cardText, location, false, addShabbatShalom, specialGreeting);
    const ssmlContent2 = hebcal.strWithSpecialGreeting(ssmlContent, location, true, addShabbatShalom, specialGreeting);
    const outputSpeech = ssmlContent2 ? {
        type: 'SSML',
        ssml: `<speak>${ssmlContent2}</speak>`
    } : {
        type: 'PlainText',
        text: cardText2
    };
    console.log(`RESPONSE: ${cardText2}`);
    return {
        outputSpeech,
        card: {
            type: "Simple",
            title,
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
            title: `Hebcal - ${title}`,
            content: `Hebcal - ${output}`
        },
        reprompt: {
            outputSpeech: {
                type: "PlainText",
                text: repromptText
            }
        },
        shouldEndSession
    };
}

function buildResponse(sessionAttributes, speechletResponse) {
    return {
        version: "1.0",
        sessionAttributes,
        response: speechletResponse
    };
}
