var spawn = require('child_process').spawn;
var readline = require('readline');

var parsha2ipa = {
"Achrei Mot": "ʔäχaʁej mot",
"Balak": "bäläk",
"Bamidbar": "bØmidØbäʁ",
"Bechukotai": "bØχukotäj",
"Beha'alotcha": "bØhäʕalotØχä",
"Behar": "bØhäʁ",
"Bereshit": "bØʁeʔʃijt",
"Beshalach": "bØʃäläχ",
"Bo": "boʔ",
"Chayei Sara": "χäjej ʃäoʁäh",
"Chukat": "χukät",
"Devarim": "dØväʁijm",
"Eikev": "ʕekev",
"Emor": "ʔemoʁ",
"Ha'Azinu": "häʔazijnu",
"Kedoshim": "kØdʃijm",
"Ki Tavo": "kij tävoʔ",
"Ki Teitzei": "kij teʦeʔ",
"Ki Tisa": "kij tiʃׂäʔ",
"Korach": "koʁäχ",
"Lech-Lecha": "leχØ lØχä",
"Masei": "mäsØʕej",
"Matot": "mätot",
"Metzora": "mØʦoʁäʕ",
"Miketz": "mikeʦ",
"Mishpatim": "miʃØpätijm",
"Nasso": "näsʔ",
"Nitzavim": "niʦävijm",
"Noach": "noχä",
"Pekudei": "fØkudej",
"Pinchas": "pijnØχäs",
"Re'eh": "ʁØʔeh",
"Sh'lach": "ʃØläχ lØχä",
"Shemot": "ʃØmot",
"Shmini": "ʃׁØmijnij",
"Shoftim": "ʃofØtijm",
"Tazria": "täzØʁijʕä",
"Terumah": "tØʁumäh",
"Tetzaveh": "tØʦäueh",
"Toldot": "tolØdot",
"Tzav": "ʦäv",
"Vaera": "väʔeʁäʔ",
"Vaetchanan": "väʔetØχänän",
"Vayakhel": "väjäkØhel",
"Vayechi": "väjØχij",
"Vayeilech": "väjeleχØ",
"Vayera": "väjeʁäʔ",
"Vayeshev": "väjeʃev",
"Vayetzei": "väjeʦeʔ",
"Vayigash": "väjigäʃ",
"Vayikra": "väjikØʁäʔ",
"Vayishlach": "väjiʃØläχ",
"Vezot Haberakhah": "vØzoʔt häbØʁäχäh",
"Yitro": "jitØʁo"
};

var holiday2ipa = {
"Asara B'Tevet": "ʕasäʁäh bØtevet",
"Candle lighting": "hdlkt nʁvt",
"Chanukah": "χanukäh",
"Havdalah": "hävdäläh",
"Lag BaOmer": "l״g bØʕomeʁ",
"Leil Selichot": "sljχvt",
"Pesach": "pesäχ",
"Pesach Sheni": "pesäχ ʃnj",
"Purim": "puʁijm",
"Purim Katan": "puʁijm kätän",
"Rosh Chodesh Adar": "ʁoʔʃ χvdʃ ʔädäʁ",
"Rosh Chodesh Adar I": "ʁoʔʃ χvdʃ ʔädäʁ ʔ׳",
"Rosh Chodesh Adar II": "ʁoʔʃ χvdʃ ʔädäʁ v׳",
"Rosh Chodesh Av": "ʁoʔʃ χvdʃ ʔäv",
"Rosh Chodesh Cheshvan": "ʁoʔʃ χvdʃ χeʃØvän",
"Rosh Chodesh Elul": "ʁoʔʃ χvdʃ ʔelul",
"Rosh Chodesh Iyyar": "ʁoʔʃ χvdʃ ʔijäjʁ",
"Rosh Chodesh Kislev": "ʁoʔʃ χvdʃ kisØlev",
"Rosh Chodesh Nisan": "ʁoʔʃ χvdʃ nijsän",
"Rosh Chodesh Sh'vat": "ʁoʔʃ χvdʃ ʃØvät",
"Rosh Chodesh Sivan": "ʁoʔʃ χvdʃ sijvän",
"Rosh Chodesh Tamuz": "ʁoʔʃ χvdʃ tämuz",
"Rosh Chodesh Tevet": "ʁoʔʃ χvdʃ tevet",
"Rosh Hashana": "ʁoʔʃ häʃׁänäh",
"Shabbat Chazon": "ʃäbät χazon",
"Shabbat HaChodesh": "ʃäbät häχodeʃ",
"Shabbat HaGadol": "ʃäbät hägädol",
"Shabbat Machar Chodesh": "ʃvt mχʁ χvdʃ",
"Shabbat Nachamu": "ʃäbät näχamu",
"Shabbat Parah": "ʃäbät pʁh",
"Shabbat Rosh Chodesh": "ʃvt ʁʔʃ χvdʃ",
"Shabbat Shekalim": "ʃäbät ʃØkälijm",
"Shabbat Shuva": "ʃäbät ʃuväh",
"Shabbat Zachor": "ʃäbät zäχoʁ",
"Shavuot": "ʃävuʕot",
"Shmini Atzeret": "ʃØmijnij ʕaʦeʁet",
"Shushan Purim": "ʃuʃän puʁijm",
"Sigd": "sjgd",
"Simchat Torah": "simØχät toʁäh",
"Sukkot": "sukot",
"Ta'anit Bechorot": "täʕanijt bØχoʁot",
"Ta'anit Esther": "täʕanijt ʔesØteʁ",
"Tish'a B'Av": "tiʃØʕäh bØʔäv",
"Tu B'Av": "tu bØʔäv",
"Tu BiShvat": "tu biʃØvät",
"Tzom Gedaliah": "ʦom gØdälØjäh",
"Tzom Tammuz": "ʦom tämuz",
"Yom HaAtzma'ut": "jom häʕäʦØmäʔut",
"Yom HaShoah": "jom häʃׁoʔäh",
"Yom HaZikaron": "jom häzikäʁon",
"Yom Kippur": "jom kipuʁ",
"Yom Yerushalayim": "jom jØʁuʃäläjim"
};

var holidayAlias = {
    'hanukkah': 'chanukah',
    'passover': 'pesach',
    'sukkos': 'sukkot',
    'sukkoth': 'sukkot',
    'simchas torah': 'simchat torah',
    "ta'anis bechoros": "ta'anit bechorot",
    'shavuos': 'shavuot'
};

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
    getWelcomeResponse(callback);
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
            getHebcalResponse(intent, session, callback);
        } else {
            getWhichHolidayResponse(callback);
        }
    } else if ("GetParsha" === intentName) {
        getHebcalResponse(intent, session, callback);
    } else if ("GetHebrewDate" === intentName || "GetHebrewDateTwo" === intentName) {
        getHebcalResponse(intent, session, callback);
    } else if ("GetCandleLighting" === intentName) {
        getHebcalResponse(intent, session, callback);
    } else if ("GetOmer" === intentName) {
        getHebcalResponse(intent, session, callback);
    } else if ("AMAZON.CancelIntent" === intentName || "AMAZON.StopIntent" === intentName) {
        callback({}, buildSpeechletResponse("Goodbye", "Goodbye", null, true, false));
    } else {
        callback({}, buildSpeechletResponse("Invalid intent", "Invalid intent " + intentName + ". Goodbye", null, true, false));
//        throw "Invalid intent";
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

function getWelcomeResponse(callback) {
    // If we wanted to initialize the session to have some attributes we could add those here.
    var sessionAttributes = {};
    var cardTitle = "Welcome";
    // If the user either does not reply to the welcome message or says something that is not
    // understood, they will be prompted again with this text.
    var repromptText = "You can ask about holidays, the Torah portion, or Hebrew dates.";
    var speechOutput = "Welcome to Hieb-Kal. " + repromptText + " What will it be?";
    var shouldEndSession = false;

    callback(sessionAttributes,
        buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession, false));
}

function getWhichHolidayResponse(callback) {
    var cardTitle = "What holiday?";
    var repromptText = "Which holiday would you like?";
    var speechOutput = "Sorry, Hieb-Kal didn't understand the holiday. " + repromptText;
    var shouldEndSession = false;
    callback({},
        buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession, false));    
}

function hebrewDateSSML(str) {
    var re = /^(\d+)\w+ of ([^,]+), (\d+)$/,
        matches = str.match(re),
        day = matches[1],
        month = matches[2],
        year = matches[3];
    return "<say-as interpret-as=\"ordinal\">" + day + "</say-as> of "
        + month + ", "
        + year.substr(0,2) + " " + year.substr(2);
}

function getHolidayBasename(str) {
    str = str.replace(/ \d\d\d\d$/, '');
    str = str.replace(/ \(CH\'\'M\)$/, '');
    str = str.replace(/ \(Hoshana Raba\)$/, '');
    if (str !== 'Rosh Chodesh Adar II') {
        str = str.replace(/ [IV]+$/, '');
    }
    str = str.replace(/: \d Candles?$/, '');
    str = str.replace(/: 8th Day$/, '');
    str = str.replace(/^Erev /, '');
    return str;
}

// returns a 8-char string with 0-padding on month and day if needed
function formatDateSsml(dt) {
    var year = dt.getFullYear(),
        month = dt.getMonth() + 1,
        day = dt.getDate(),
        thisYear = new Date().getFullYear(),
        yearStr = thisYear == year ? '????' : year.toString(),
        m = month.toString(),
        d = day.toString(),
        mp = m.length == 2 ? '' : '0',
        dp = d.length == 2 ? '' : '0';
    return '<say-as interpret-as="date">'
        + yearStr
        + mp + m + dp + d
        + '</say-as>';
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
        if (intent.slots && intent.slots.MyDate
            && intent.slots.MyDate.value && intent.slots.MyDate.value.length) {
            hebcalOpts.push(intent.slots.MyDate.value.substr(0, 4));
        }
    } else if (intent.name === "GetOmer") {
        hebcalOpts.push('-o');
    } else if (intent.name === "GetCandleLighting") {
        hebcalOpts.push('-c');
        hebcalOpts.push('-E');
    } else if (intent.name === "GetHolidayDate") {
        if (intent.slots && intent.slots.MyDate
            && intent.slots.MyDate.value && intent.slots.MyDate.value.length) {
            hebcalOpts.push(intent.slots.MyDate.value.substr(0, 4));
        }
    } else if (intent.name === "GetHolidayNextYear") {
        var year = new Date().getFullYear() + 1;
        hebcalOpts.push(year.toString());
    }

    process.env['PATH'] = process.env['PATH'] + ':' + process.env['LAMBDA_TASK_ROOT'];
//    console.log(JSON.stringify(hebcalOpts));
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
        events.push({dt: dt, name: name});
    })

    proc.on('close', function(code) {
//        if (events.length !== 0) {
//            console.log(JSON.stringify(events));
//        }
        if (events.length === 0) {
            callback({}, respond(intent, "Sorry, something is broken!"));
        } else if (intent.name === "GetParsha") {
            var found = events.filter(function(evt) {
                return evt.name.indexOf("Parashat ") === 0;
            });
            if (found.length) {
                var space = found[0].name.indexOf(' '),
                    parsha = found[0].name.substr(space + 1),
                    ipa = parsha2ipa[parsha] || parsha;
                var phoneme = "<phoneme alphabet=\"ipa\" ph=\"paʁaʃat " + ipa + "\">" + found[0].name + "</phoneme>";
                callback({},
                    respond(intent, "This week's Torah portion is " + phoneme));
            }
        } else if (intent.name === "GetHebrewDate") {
            var speech = hebrewDateSSML(events[0].name);
            callback({}, respond(intent, "Today is the " + speech));
        } else if (intent.name === "GetHebrewDateTwo" && intent.slots && intent.slots.MyDate) {
            var src = new Date(intent.slots.MyDate.value);
            var found = events.filter(function(evt) {
                return evt.dt.getFullYear() === src.getFullYear() &&
                    evt.dt.getMonth() === src.getMonth() &&
                    evt.dt.getDate() === src.getDate();
            });
            if (found.length) {
                var speech = hebrewDateSSML(found[0].name);
                callback({},
                    respond(intent, intent.slots.MyDate.value + " is the " + speech));
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
            var searchStr0 = intent.slots.Holiday.value.toLowerCase(),
                searchStr = holidayAlias[searchStr0] || searchStr0;
            if (searchStr == 'candle lighting' || searchStr == 'candle lighting time'
                || searchStr == 'shabbat' || searchStr == 'shabbos') {
                callback({},
                    respond(intent, "Sorry, candle lighting times are not implemented yet."));
            }
            var now = new Date().getTime();
            var future = events.filter(function(evt) {
                return evt.dt.getTime() >= now;
            });
            var found = future.filter(function(evt) {
                var h = getHolidayBasename(evt.name);
                return h.toLowerCase() === searchStr;
            });
            if (found.length) {
                var holiday = getHolidayBasename(found[0].name);
                var ipa = holiday2ipa[holiday];
                var phoneme = ipa
                    ? "<phoneme alphabet=\"ipa\" ph=\"" + ipa + "\">" + holiday + "</phoneme>"
                    : holiday;
                var dateSsml = formatDateSsml(found[0].dt);
                callback({},
                    respond(intent, phoneme + " begins on " + dateSsml));
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
    return buildSpeechletResponse(intent.name, speechOutput, null, true, true);
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
         buildSpeechletResponse(intent.name, speechOutput, repromptText, shouldEndSession, false));
}

// --------------- Helpers that build all of the responses -----------------------

function buildSpeechletResponse(title, output, repromptText, shouldEndSession, ssml) {
    var outputSpeech = ssml ? {
        type: "SSML",
        ssml: "<speak>" + output + "</speak>"
    } : {
        type: "PlainText",
        text: output
    };
    return {
        outputSpeech: outputSpeech,
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