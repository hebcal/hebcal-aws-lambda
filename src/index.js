var spawn = require('child_process').spawn;
var readline = require('readline');

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
    var repromptText = "You can ask when a holiday is, today's Hebrew date, candle lighting times, the weekly Torah portion, or the days of the Omer.";
    var speechOutput = "Welcome to Hieb-Kal. " + repromptText + " What will it be?";
    var shouldEndSession = false;

    callback(sessionAttributes,
        buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

function getHebcalResponse(intent, session, callback) {
    var repromptText = null;
    var sessionAttributes = {};
    var shouldEndSession = true;

    var hebcalOpts = ['-e'];
    if (intent.name === "GetParsha") {
        hebcalOpts.push('-t');
        hebcalOpts.push('-S');
    } else if (intent.name === "GetHebrewDate") {
        hebcalOpts.push('-t');
    } else if (intent.name === "GetHebrewDateTwo") {
        hebcalOpts.push('-d');
    } else if (intent.name === "GetOmer") {
        hebcalOpts.push('-o');
    } else if (intent.name === "GetCandleLighting") {
        hebcalOpts.push('-c');
        hebcalOpts.push('-E');
    }

    process.env['PATH'] = process.env['PATH'] + ':' + process.env['LAMBDA_TASK_ROOT'];
    var proc = spawn('./hebcal', hebcalOpts);

    var events = [];

    var rd = readline.createInterface({
        input: proc.stdout,
        terminal: false
    }).on('line', function(line) {
        var space = line.indexOf(' ');
        var mdy = line.substr(0, space).split('.');
        var isoDate = mdy.reverse().join('-');
        var name = line.substr(space + 1);
        var dt = new Date(isoDate);
        events.push({dt: dt, name: name, lname: name.toLowerCase()});
    })

    proc.on('close', function(code) {
        if (events.length === 0) {
            callback({}, respond(intent, "Sorry, something is broken!"));
        } else if (intent.name === "GetParsha") {
            var found = events.filter(function(evt) {
                return evt.name.indexOf("Parashat ") === 0;
            });
            if (found.length) {
                callback({},
                    respond(intent, "This week's Torah portion is " + found[0].name));
            }
        } else if (intent.name === "GetHebrewDate") {
            callback({}, respond(intent, "Today is " + events[0].name));
        } else if (intent.name === "GetHebrewDateTwo" && intent.slots && intent.slots.MyDate) {
            var src = new Date(intent.slots.MyDate.value);
            var found = events.filter(function(evt) {
                return evt.dt.getFullYear() == src.getFullYear() &&
                    evt.dt.getMonth() == src.getMonth() &&
                    evt.dt.getDate() == src.getDate();
            });
            if (found.length) {
                callback({},
                    respond(intent, intent.slots.MyDate.value + " is "
                        + found[0].name));
            } else {
                callback({},
                    respond(intent, "Sorry, we could not convert Gregorian date "
                        + intent.slots.MyDate.value + " for some reason"));
            }
        } else if (intent.name === "GetOmer") {
            callback({},
                respond(intent, "Sorry, Omer is not implemented yet."));
        } else if (intent.name === "GetCandleLighting") {
            callback({},
                respond(intent, "Sorry, candle lighting times are not implemented yet."));
        } else if (intent.slots && intent.slots.Holiday) {
            var searchStr = intent.slots.Holiday.value.toLowerCase();
            if (searchStr === 'passover') {
                searchStr = 'pesach';
            } else if (searchStr == 'candle lighting') {
                callback({},
                    respond(intent, "Sorry, candle lighting times are not implemented yet."));
            }
            var now = new Date().getTime();
            var future = events.filter(function(evt) {
                return evt.dt.getTime() >= now;
            });
            var found = future.filter(function(evt) {
                return evt.lname.indexOf(searchStr) != -1;
            });
            if (found.length) {
                callback({},
                    respond(intent, found[0].name + " occurs on "
                        + found[0].dt.toDateString()));
            } else {
                callback({},
                    respond(intent, "Sorry, we could not find the date for "
                        + intent.slots.Holiday.value + " for some reason"));
            }
        } else {
            callback({}, respond(intent, "Sorry, something is also broken!"));
        }
    });

    proc.on('error', function(err) {
        console.log('Failed to start child process.');
    });
}

function respond(intent, speechOutput) {
    return buildSpeechletResponse(intent.name, speechOutput, null, true);
}

function getFakeResponse(intent, session, callback) {
    var repromptText = null;
    var sessionAttributes = {};
    var shouldEndSession = true;
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