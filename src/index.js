var spawn = require('child_process').spawn,
    readline = require('readline'),
    moment = require('moment');

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
"Candle lighting": "hɒdlɒˈkɒt neɪˈʁot",
"Chanukah": "χɒnuˈkɒ",
"Havdalah": "hɒvdɒˈlɒ",
"Lag B'Omer": "ˈlɒg bɒˈomeʁ",
"Lag BaOmer": "ˈlɒg bɒˈomeʁ",
"Leil Selichot": "ˈleɪl slijˈχot",
"Pesach": "ˈpeɪsɑːχ",
"Pesach Sheni": "ˈpeɪsɑːχ ʃnj",
"Purim": "puːʁˈim",
"Purim Katan": "puːʁˈim kɒˈtɒn",
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
"Shabbat Chazon": "ʃəˈbɑːt χazon",
"Shabbat HaChodesh": "ʃəˈbɑːt häχodeʃ",
"Shabbat HaGadol": "ʃəˈbɑːt hägädol",
"Shabbat Machar Chodesh": "ʃəˈbɑːt mχʁ χvdʃ",
"Shabbat Nachamu": "ʃəˈbɑːt näχamu",
"Shabbat Parah": "ʃəˈbɑːt pʁh",
"Shabbat Rosh Chodesh": "ʃəˈbɑːt ʁʔʃ χvdʃ",
"Shabbat Shekalim": "ʃəˈbɑːt ʃØkälijm",
"Shabbat Shuva": "ʃəˈbɑːt ʃuväh",
"Shabbat Zachor": "ʃəˈbɑːt zɒˈχoʊʁ",
"Shavuot": "ʃävuʕot",
"Shmini Atzeret": "ʃØmijnij ʕaʦeʁet",
"Shushan Purim": "ʃuʃän puʁijm",
"Sigd": "sjgd",
"Simchat Torah": "ˈsimχɒt ˈtoʊrə",
"Sukkot": "sukot",
"Ta'anit Bechorot": "täʕanijt bØχoʁot",
"Ta'anit Esther": "täʕanijt ʔesØteʁ",
"Tish'a B'Av": "tiʃØʕäh bØʔäv",
"Tu B'Av": "tu bØʔäv",
"Tu B'Shvat": "tu biʃØvät",
"Tu BiShvat": "tu biʃØvät",
"Tzom Gedaliah": "ʦom ɡəˈdɑːljə",
"Tzom Tammuz": "ʦom tämuz",
"Yom HaAtzma'ut": "ˈjom häʕäʦØmäʔut",
"Yom HaShoah": "ˈjom häʃׁoʔäh",
"Yom HaZikaron": "ˈjom häzikäʁon",
"Yom Kippur": "ˈjom kiˈpuʁ",
"Yom Yerushalayim": "ˈjom jeruˈʃalajim"
};

var holidayAlias = {
    'lag baomer': 'lag b\'omer',
    'tu bishvat': 'tu b\'shvat',
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
    } else if ("GetHebrewDate" === intentName) {
        getHebcalResponse(intent, session, callback);
    } else if ("GetHebrewDateTwo" === intentName) {
        if (intent.slots && intent.slots.MyDate && intent.slots.MyDate.value) {
            getHebcalResponse(intent, session, callback);
        } else {
            getWhichDateResponse(callback);
        }
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

function getWhichDateResponse(callback) {
    var cardTitle = "What date?";
    var repromptText = "Which date would you like me to convert?";
    var speechOutput = "Sorry, Hieb-Kal didn't understand the date. " + repromptText;
    var shouldEndSession = false;
    callback({},
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

function filterEvents(events) {
    var dest = [];
    var seen = {};
    events.forEach(function(evt) {
        var subj = evt.name;
        if (subj.indexOf("Erev ") === 0) {
            return;
        }
        if (subj.indexOf("Chanukah: ") === 0) {
            if (subj === "Chanukah: 2 Candles") {
                subj = "Chanukah";
            } else {
                return;
            }
        } else {
            subj = getHolidayBasename(subj);
        }
        if (seen[subj]) {
            return;
        }
        evt.basename = subj;
        dest.push(evt);
        if (subj != "Asara B'Tevet") {
            seen[subj] = true;
        }
    });
    return dest;
}

function beginsWhen(name) {
    if (name === "Leil Selichot") {
        return "after nightfall";
    } else if (beginsAtDawn(name)) {
        return "at dawn";
    } else {
        return "at sundown";
    }
}

function beginsAtDawn(name) {
    var re =  /^(Tzom|Asara|Ta\'anit) /;
    return name.search(re) != -1;
}

function dayEventObserved(evt) {
    if (beginsAtDawn(evt.name) || evt.name === "Leil Selichot") {
        return evt.dt;
    } else {
        return evt.dt.subtract(1, 'd');
    }
}

// returns a 8-char string with 0-padding on month and day if needed
function formatDateSsml(dt) {
    var year = dt.format('YYYY'),
        month = dt.format('MM'),
        day = dt.format('DD'),
        thisYear = moment().format('YYYY'),
        yearStr = (thisYear == year) ? '????' : year;
    return '<say-as interpret-as="date">'
        + yearStr
        + month + day
        + '</say-as>';
}

/*
“today”: 2015-11-24
“tomorrow”: 2015-11-25
“november twenty-fifth”: 2015-11-25
“next monday”: 2015-11-30
“this week”: 2015-W48
“next week”: 2015-W49
“this weekend”: 2015-W48-WE
“this month”: 2015-11
“next year”: 2016
“this decade”: 201X
*/
function parseAmazonDateFormat(str) {
    if (str.length == 4 & str.charAt(3) == 'X') {
        var year = str.substr(0,3);
        return moment.utc(new Date(+year, 0, 1));
    }
    var m = moment.utc(str);
    if ((str.length == 8 && str.charAt(4) == '-' && str.charAt(5) == 'W')
        || (str.length == 11 && str.substr(8) == '-WE')) {
        return m.day('Saturday');
    } 
    return m;
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
        var m = parseAmazonDateFormat(intent.slots.MyDate.value);
        hebcalOpts.push('-d');
        hebcalOpts.push(m.format('YYYY'));
    } else if (intent.name === "GetOmer") {
        hebcalOpts.push('-o');
    } else if (intent.name === "GetCandleLighting") {
        hebcalOpts.push('-c');
        hebcalOpts.push('-E');
    } else if (intent.name === "GetHoliday") {
        hebcalOpts.push('--years');
        hebcalOpts.push('2');
    } else if (intent.name === "GetHolidayDate") {
        if (intent.slots && intent.slots.MyYear && intent.slots.MyYear.value) {
            hebcalOpts.push(intent.slots.MyYear.value);
        }
    } else if (intent.name === "GetHolidayNextYear") {
        var year = new Date().getFullYear() + 1;
        hebcalOpts.push(year.toString());
    }

    process.env['PATH'] = process.env['PATH'] + ':' + process.env['LAMBDA_TASK_ROOT'];
    console.log(JSON.stringify(hebcalOpts));
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
        var dt = moment.utc(isoDate, 'YYYY-MM-DD');
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
        } else if (intent.name === "GetHebrewDateTwo") {
            var src = parseAmazonDateFormat(intent.slots.MyDate.value);
            var found = events.filter(function(evt) {
                return evt.dt.isSame(src, 'day');
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
                respond(intent, "Candle lighting times are not yet supported."));
        } else if (intent.slots && intent.slots.Holiday) {
            var searchStr0 = intent.slots.Holiday.value.toLowerCase(),
                searchStr = holidayAlias[searchStr0] || searchStr0;
            if (searchStr == 'candle lighting' || searchStr == 'candle lighting time'
                || searchStr == 'shabbat' || searchStr == 'shabbos') {
                callback({},
                    respond(intent, "Candle lighting times are not yet supported."));
            }
            var eventsFiltered = filterEvents(events);
            if (intent.name === "GetHoliday") {
                var now = moment();
                // events today or in the future
                var future = eventsFiltered.filter(function(evt) {
                    return evt.dt.isSameOrAfter(now, 'day');
                });
                eventsFiltered = future;
            }
            console.log("Searching for [" + searchStr + "] in " + eventsFiltered.length);
            if (eventsFiltered.length) {
                var evt = eventsFiltered[0],
                    evt2 = eventsFiltered[eventsFiltered.length - 1];
                console.log("Event 0 is [" + evt.name + "] on " + evt.dt.format('YYYY-MM-DD'));
                console.log("Event " + (eventsFiltered.length - 1) + " is [" + evt2.name + "] on " + evt2.dt.format('YYYY-MM-DD'));
            }
            var found = eventsFiltered.filter(function(evt) {
                if (searchStr === 'rosh chodesh') {
                    return evt.name.indexOf('Rosh Chodesh ') === 0;
                } else {
                    var h = getHolidayBasename(evt.name);
                    console.log("orig=[" + evt.name + "],base=[" + h + "],search=[" + searchStr + "]");
                    return h.toLowerCase() === searchStr;
                }
            });
            if (found.length) {
                var holiday = getHolidayBasename(found[0].name);
                var ipa = holiday2ipa[holiday];
                var phoneme = ipa
                    ? "<phoneme alphabet=\"ipa\" ph=\"" + ipa + "\">" + holiday + "</phoneme>"
                    : holiday;
                var observedDt = dayEventObserved(found[0]),
                    observedWhen = beginsWhen(found[0].name),
                    observedDow = observedDt.format('dddd');
                var dateSsml = formatDateSsml(observedDt);
                callback({},
                    respond(intent, phoneme + " begins " + observedWhen + " on " + observedDow + ", " + dateSsml));
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