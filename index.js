/*
const spawn = require('child_process').spawn;
const ls = spawn('ls', ['-lh', '/usr']);

ls.stdout.on('data', (data) => {
  console.log(`stdout: ${data}`);
});

ls.stderr.on('data', (data) => {
  console.log(`stderr: ${data}`);
});

ls.on('close', (code) => {
  console.log(`child process exited with code ${code}`);
});

child.on('error', (err) => {
  console.log('Failed to start child process.');
});
*/

// Route the incoming request based on type (LaunchRequest, IntentRequest,
// etc.) The JSON body of the request is provided in the event parameter.
exports.handler = function (event, context) {
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
    console.log("onSessionStarted requestId=" + sessionStartedRequest.requestId +
        ", sessionId=" + session.sessionId);
}

/**
 * Called when the user launches the skill without specifying what they want.
 */
function onLaunch(launchRequest, session, callback) {
    console.log("onLaunch requestId=" + launchRequest.requestId +
        ", sessionId=" + session.sessionId);

    // Dispatch to your skill's launch.
    getWelcomeResponse(callback);
}

/**
 * Called when the user specifies an intent for this skill.
 */
function onIntent(intentRequest, session, callback) {
    console.log("onIntent requestId=" + intentRequest.requestId +
        ", sessionId=" + session.sessionId);

    var intent = intentRequest.intent,
        intentName = intentRequest.intent.name;

    // Dispatch to your skill's intent handlers
    if ("GetHoliday" === intentName) {
        getHebcalResponse(intent, session, callback);
    } else if ("GetHolidayDate" === intentName) {
        getHebcalResponse(intent, session, callback);
    } else if ("GetParsha" === intentName) {
        getHebcalResponse(intent, session, callback);
    } else if ("GetHebrewDate" === intentName || "GetHebrewDateTwo" === intentName) {
        getHebcalResponse(intent, session, callback);
    } else if ("GetCandleLighting" === intentName) {
        getHebcalResponse(intent, session, callback);
    } else if ("GetOmer" === intentName) {
        getHebcalResponse(intent, session, callback);
    } else if ("AMAZON.CancelIntent" === intentName || "AMAZON.StopIntent" === intentName) {
        callback({}, buildSpeechletResponse("Goodbye", "Goodbye", null, true));
    } else {
        callback({}, buildSpeechletResponse("Invalid intent", "Invalid intent " + intentName + ". Goodbye", null, true));
//        throw "Invalid intent";
    }
}

/**
 * Called when the user ends the session.
 * Is not called when the skill returns shouldEndSession=true.
 */
function onSessionEnded(sessionEndedRequest, session) {
    console.log("onSessionEnded requestId=" + sessionEndedRequest.requestId +
        ", sessionId=" + session.sessionId);
    // Add cleanup logic here
}

// --------------- Functions that control the skill's behavior -----------------------

function getWelcomeResponse(callback) {
    // If we wanted to initialize the session to have some attributes we could add those here.
    var sessionAttributes = {};
    var cardTitle = "Welcome";
    // If the user either does not reply to the welcome message or says something that is not
    // understood, they will be prompted again with this text.
    var repromptText = "You can ask when a holiday is, today's Hebrew date, candle lighting times, the Parashat HaShavuah, or the days of the Omer.";
    var speechOutput = "Welcome to HebCal Heeb-Cal Hebe-Kal Hieb-Kal Heib-Kal. " +
        repromptText + " What will it be?";
    var shouldEndSession = false;

    callback(sessionAttributes,
        buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

function getHebcalResponse(intent, session, callback) {
    var repromptText = null;
    var sessionAttributes = {};
    var shouldEndSession = false;
    var speechOutput = "We heard you specify intent " + intent.name + ".";

    if (intent.slots && intent.slots.MyDate) {
        speechOutput += " Date was " + intent.slots.MyDate.value + ".";
    }

    if (intent.slots && intent.slots.Holiday) {
        speechOutput += " Holiday was " + intent.slots.Holiday.value + ".";
    }

    speechOutput += " You are awesome.";

    // Setting repromptText to null signifies that we do not want to reprompt the user.
    // If the user does not respond or says something that is not understood, the session
    // will end.
    callback(sessionAttributes,
         buildSpeechletResponse(intent.name, speechOutput, repromptText, shouldEndSession));
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