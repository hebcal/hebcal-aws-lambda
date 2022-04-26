const hebcal = require('./hebcal-app');
const dayjs = require('dayjs');
const {HDate} = require('@hebcal/core');
const isSameOrAfter = require('dayjs/plugin/isSameOrAfter');
const { respond, buildSpeechletResponse, buildResponse, getWhichHolidayResponse } = require("./respond");
const { getHolidaysOnDate } = require("./common");
const { getOmerResponse } = require("./omer");
const { getHebrewDateResponse } = require("./hebdate");
const { trackScreenview, trackIntent } = require("./track2");
const { getCandleLightingResponse } = require("./candle-lighting");
const { getHavdalahResponse } = require("./havdalah");
const { getParshaResponse } = require("./parsha");
const { getHolidayResponse } = require("./holiday");
const { getDafYomiResponse } = require("./daf-yomi");

dayjs.extend(isSameOrAfter);

// Route the incoming request based on type (LaunchRequest, IntentRequest,
// etc.) The JSON body of the request is provided in the event parameter.
exports.handler = function (event, context) {
    console.log(`MAIN event.request=${JSON.stringify(event.request)}`);
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

function loadUserAndGreetings(request, session, callback) {
    session.attributes = session.attributes || {};

    if (session.attributes.todayHebrewDateStr) {
        return callback();
    }

    hebcal.lookupUser(session.user.userId, user => {
        let now = dayjs();
        let location;
        if (user && user.ts) {
            session.attributes.returningUser = true;
            if (user.location) {
                now = hebcal.getDayjsForTodayHebrewDate(user.location);
                location = session.attributes.location = user.location;
            }
        }
        const hd = new HDate(now.toDate());
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
        case "GetHavdalah":
            getHavdalahResponse(intent, session, callback);
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

