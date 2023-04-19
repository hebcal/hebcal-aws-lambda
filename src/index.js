const hebcal = require('./hebcal-app');
const {HDate, months} = require('@hebcal/core');
const { respond, buildSpeechletResponse, buildResponse, getWhichHolidayResponse } = require("./respond");
const { getHolidaysOnDate, getParshaHaShavua, getLocation, getUpcomingEvents } = require("./common");
const { getOmerResponse, makeOmerSpeech } = require("./omer");
const { getHebrewDateResponse } = require("./hebdate");
const { trackEventSQS } = require("./track2");
const { getCandleLightingResponse } = require("./candle-lighting");
const { getHavdalahResponse } = require("./havdalah");
const { getParshaResponse } = require("./parsha");
const { getHolidayResponse, makeHolidaySpeech } = require("./holiday");
const { getDafYomiResponse } = require("./daf-yomi");
const pkg = require('./package.json');

// Route the incoming request based on type (LaunchRequest, IntentRequest,
// etc.) The JSON body of the request is provided in the event parameter.
exports.handler = function (event, context) {
    console.log(`HELLO WORLD ${pkg.name}/${pkg.version}`);
    event.session.attributes = event.session.attributes || {};
    event.session.attributes.startTime = Date.now();
    console.log(JSON.stringify(event.session));
    console.log(JSON.stringify(event.request));
    try {
/*
        if (event.session.application && event.session.application.applicationId && event.session.application.applicationId !== "amzn1.echo-sdk-ams.app.24d6d476-8351-403f-9047-f08e42a9f623") {
             context.fail("Invalid Application ID=" + event.session.application.applicationId);
        }
*/
        if (event.request.type === "LaunchRequest" || event.request.type === "IntentRequest") {
            event.session.attributes = event.session.attributes || {};
            loadUserAndGreetings(event.request, event.session, () => {
                console.log(`Done looking up user, attrs=` + JSON.stringify(event.session.attributes));
                if (event.request.type === "LaunchRequest") {
                    onLaunch(event.request, event.session, (session, speechletResponse) => {
                        const sessionAttributes = session && session.attributes ? session.attributes : {};
                        const response = buildResponse(sessionAttributes, speechletResponse);
                        trackEventSQS(event.request, event.session, response, null).then(() => {
                            context.succeed(response);
                        });
                    });
                } else {
                    // event.request.type === "IntentRequest"
                    onIntent(event.request, event.session, (session, speechletResponse) => {
                        const sessionAttributes = session && session.attributes ? session.attributes : {};
                        const response = buildResponse(sessionAttributes, speechletResponse);
                        trackEventSQS(event.request, event.session, response, null).then(() => {
                            context.succeed(response);
                        });
                    });
                }
            });
        } else if (event.request.type === "SessionEndedRequest") {
            trackEventSQS(event.request, event.session, {}, null).then(() => {
                context.succeed();
            });
        } else {
            context.fail("Unknown event.request.type");
        }
    } catch (e) {
        context.fail(`Exception: ${e}`);
    }
}

function loadUserAndGreetings(request, session, callback) {
    session.attributes.userId = session.user.userId;
    hebcal.lookupUser(session.user.userId, (user) => {
        let hd = null;
        let location;
        if (user && user.ts) {
            session.attributes.returningUser = true;
            if (user.location) {
                if (!user.location.cc && user.location.zipCode && user.location.zipCode.length === 5) {
                    user.location.cc = 'US';
                }
                const {now, afterSunset, hd: hd0} = hebcal.getDayjsForTodayHebrewDate(user.location);
                session.attributes.now = now.format('YYYY-MM-DD HH:mm:ss');
                session.attributes.afterSunset = afterSunset;
                hd = hd0;
                location = session.attributes.location = user.location;
            }
        } else {
            session.attributes.userNotFound = true;
        }
        if (!hd) {
            // assume default timezone
            const now = hebcal.nowInLocation(undefined);
            session.attributes.now = now.format('YYYY-MM-DD HH:mm:ss');
            hd = new HDate(now.toDate());
            if (now.hour() > 19) {
                // Consider 8pm or later "after sunset"
                session.attributes.afterSunset = true;
                hd = hd.next();
            }
        }
        session.attributes.hdate = hd;
        session.attributes.todayHebrewDateStr = hd.render();
        const events = getHolidaysOnDate(hd, location);
        const arr = hebcal.getSpecialGreetings(events);
        if (arr.length) {
            session.attributes.specialGreeting = arr;
        }
        return callback();
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
                    getCandleLightingResponse(intentRequest, session, callback);
                } else {
                    getHolidayResponse(intent, session, callback);
                }
            } else {
                getWhichHolidayResponse(session, callback);
            }
            break;
        case "GetParsha":
            getParshaResponse(intentRequest, session, callback);
            break;
        case "GetHebrewDate":
        case "MyDateSlotOnlyIntent":
            getHebrewDateResponse(intent, session, callback);
            break;
        case "GetCandles":
        case "SetLocation":
        case "CityNameSlotOnlyIntent":
        case "ZipCodeSlotOnlyIntent":
            getCandleLightingResponse(intentRequest, session, callback);
            break;
        case "GetHavdalah":
            getHavdalahResponse(intentRequest, session, callback);
            break;
        case "GetOmer":
            getOmerResponse(intent, session, callback);
            break;
        case "GetDafYomi":
            getDafYomiResponse(intent, session, callback);
            break;
        case "AMAZON.CancelIntent":
        case "AMAZON.StopIntent":
            const ssmlContent = 'Thanks for using ' +
                hebcal.getPhonemeTag("'hibkæl", 'Hebcal') +
                '. Goodbye.';
            session.attributes.specialGreeting = undefined;
            const response = respond('Goodbye',
                'Thanks for using Hebcal. Goodbye.', ssmlContent);
            callback(session, response);
            break;
        case "AMAZON.HelpIntent":
            getWelcomeResponse(session, callback, true);
            break;
        default:
            callback(session, buildSpeechletResponse("Invalid intent", `Invalid intent ${intentName}. Goodbye`, null, true));
            break;
    }
}

const ssmlBreak = ' <break time="0.2s"/> ';

function makeLaunchSpeech(session) {
    let text = '';
    let ssml = '';
    const afterSunset = session.attributes.afterSunset;
    const when = afterSunset ? 'Tonight' : 'Today';
    const hebrewDateStr = session.attributes.todayHebrewDateStr;
    text += `Welcome to Hebcal. ${when} is the ${hebrewDateStr}.`;
    const speech = hebcal.hebrewDateSSML(hebrewDateStr, true);
    ssml += `Welcome to ` + hebcal.getPhonemeTag("'hibkæl", 'Hebcal') +
        `. ${when} is the ${speech}.`;
    const location = getLocation(session);
    const hd = session.attributes.hdate;
    // Count the Omer
    const hyear = hd.getFullYear();
    const beginOmer = HDate.hebrew2abs(hyear, months.NISAN, 16);
    const endOmer = beginOmer + 48;
    const abs = hd.abs();
    if (abs >= beginOmer && abs <= endOmer) {
        const omerDay = abs - beginOmer + 1;
        const { cardText, ssml: ssml0 } = makeOmerSpeech(hd, afterSunset, omerDay);
        text += '\n' + cardText;
        ssml += ssmlBreak + ssml0;
    }
    const now = hebcal.nowInLocation(location);
    const dow = now.day();
    const {parsha} = getParshaHaShavua(hd, location);
    if (parsha) {
        const todayOrThisWeek = dow === 6 && !afterSunset ?
            'Today' : dow === 5 ? 'Tomorrow' : 'This week';
        const prefixText = `${todayOrThisWeek}'s Torah portion is `;
        const result = hebcal.getParashaOrHolidayName(parsha);
        const phoneme = hebcal.getPhonemeTag(result.ipa, result.name);
        text += `\n${prefixText}${result.name}.`;
        ssml += ssmlBreak + `${prefixText}${phoneme}.`;
    }
    // Check for upcoming holidays and candle lighting time
    const evts = getUpcomingEvents(hd, location, 3);
    const seen = new Set();
    for (const evt of evts) {
        // if there's an exact match (e.g. 2-day Rosh Chodesh), skip 2nd
        if (seen.has(evt.name)) {
            continue;
        } else {
            seen.add(evt.name);
        }
        const {cardText, ssml: ssml0} = (evt.name === 'Candle lighting' || evt.name === 'Havdalah') ?
            hebcal.makeCandleLightingSpeech(evt, location) :
            makeHolidaySpeech(evt, location, session);
        text += '\n' + cardText;
        ssml += ssmlBreak + ssml0;
    }
    return {text, ssml};
}

function getWelcomeResponse(session, callback, isHelpIntent) {
    let cardText = '';
    let ssmlContent = '';
    if (!isHelpIntent) {
        const {text, ssml} = makeLaunchSpeech(session);
        cardText = text;
        ssmlContent = ssml;
    }
    const repromptText = "You can ask about holidays, the Torah portion, candle lighting times, or Hebrew dates.";
    if (isHelpIntent || !session.attributes.returningUser) {
        cardText += '\n' + repromptText;
        ssmlContent += ' ' + repromptText;
    }
    const nag = 'What will it be?';
    const response = respond('Welcome to Hebcal',
        cardText + '\n' + nag,
        ssmlContent + ssmlBreak + nag);
    response.shouldEndSession = false;
    response.reprompt.outputSpeech.text = repromptText;
    callback(session, response);
}
