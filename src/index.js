const hebcal = require('./hebcal-app');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const {HDate} = require('@hebcal/core');
const isSameOrAfter = require('dayjs/plugin/isSameOrAfter');
const { respond, buildSpeechletResponse, buildResponse, getWhichHolidayResponse } = require("./respond");
const { getHolidaysOnDate } = require("./common");
const { getOmerResponse } = require("./omer");
const { getHebrewDateResponse } = require("./hebdate");
const { trackEventSQS } = require("./track2");
const { getCandleLightingResponse } = require("./candle-lighting");
const { getHavdalahResponse } = require("./havdalah");
const { getParshaResponse } = require("./parsha");
const { getHolidayResponse } = require("./holiday");
const { getDafYomiResponse } = require("./daf-yomi");
const pkg = require('./package.json');

dayjs.extend(isSameOrAfter);
dayjs.extend(utc);
dayjs.extend(timezone);

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
    session.attributes.lambdaApp = pkg.name + '/' + pkg.version;
    hebcal.lookupUser(session.user.userId, (user) => {
        let hd = null;
        let location;
        if (user && user.ts) {
            session.attributes.returningUser = true;
            if (user.location) {
                if (!user.location.cc && user.location.zipCode && user.location.zipCode.length === 5) {
                    user.location.cc = 'US';
                }
                const {targetDay} = hebcal.getDayjsForTodayHebrewDate(user.location);
                hd = new HDate(targetDay.toDate());
                location = session.attributes.location = user.location;
            }
        } else {
            session.attributes.userNotFound = true;
        }
        if (!hd) {
            hd = new HDate();
        }
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

