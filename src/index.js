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
"Chayei Sara": "χäjeɪ ʃäoʁäh",
"Chukat": "χukät",
"Devarim": "dØväʁˈim",
"Eikev": "ʕeɪkev",
"Emor": "ʔeɪmoʁ",
"Ha'Azinu": "häʔazijnu",
"Kedoshim": "kØdoʃˈim",
"Ki Tavo": "kij tävoʔ",
"Ki Teitzei": "ki teɪʦeɪʔ",
"Ki Tisa": "kij tiʃׂäʔ",
"Korach": "koʁäχ",
"Lech-Lecha": "leχØ lØχä",
"Masei": "mäsØʕeɪ",
"Matot": "mätot",
"Metzora": "mØʦoʁäʕ",
"Miketz": "mikeɪʦ",
"Mishpatim": "miʃØpätˈim",
"Nasso": "näsʔ",
"Nitzavim": "niʦävˈim",
"Noach": "noχä",
"Pekudei": "fØkudeɪ",
"Pinchas": "pijnØχäs",
"Re'eh": "ʁØˈeɪ",
"Sh'lach": "ʃØläχ lØχä",
"Shemot": "ʃØmot",
"Shmini": "ʃׁØmini",
"Shoftim": "ʃofØtˈim",
"Tazria": "täzØʁijʕä",
"Terumah": "tØʁumäh",
"Tetzaveh": "tØʦäveh",
"Toldot": "tolØdot",
"Tzav": "ʦäv",
"Vaera": "väʔeʁäʔ",
"Vaetchanan": "väʔetØχänän",
"Vayakhel": "väjäkØhel",
"Vayechi": "väjØχi",
"Vayeilech": "väjeɪleχ",
"Vayera": "väjeɪʁäʔ",
"Vayeshev": "väjeɪʃev",
"Vayetzei": "väjeɪʦeʔ",
"Vayigash": "väjigäʃ",
"Vayikra": "väjikØʁäʔ",
"Vayishlach": "väjiʃØläχ",
"Vezot Haberakhah": "vØzoʔt häbØʁäχäh",
"Yitro": "jitØʁo"
};

var month2ipa = {
"Adar": "ɑːˈdɑːʁ",
"Adar I": "ɑːˈdɑːʁ rijˈʃon",
"Adar II": "ɑːˈdɑːʁ ʃeɪˈnj",
"Av": "ˈɑːv",
"Cheshvan": "ˈχeʃØvɑːn",
"Elul": "ˈelul",
"Iyyar": "iˈjɑːʁ",
"Kislev": "ˈkisØlev",
"Nisan": "nijˈsɑːn",
"Sh'vat": "ʃəˈvɑːt",
"Sivan": "sijˈvɑːn",
"Tamuz": "tɑːˈmuz",
"Tevet": "ˈtevet"
};

var roshChodeshIpa = "ˈʁoʔʃ ˈχodəʃ ";

var holiday2ipa = {
"Asara B'Tevet": "ʕasäʁäh bØtevet",
"Candle lighting": "hɒdlɒˈkɒt neɪˈʁot",
"Chanukah": "χɒnuˈkɒ",
"Havdalah": "hɒvdɒˈlɒ",
"Lag B'Omer": "ˈlɒg bɒˈomeʁ",
"Lag BaOmer": "ˈlɒg bɒˈomeʁ",
"Leil Selichot": "ˈleɪl slijˈχot",
"Pesach": "ˈpeɪsɑːχ",
"Pesach Sheni": "ˈpeɪsɑːχ ʃeɪˈnj",
"Purim": "puːʁˈim",
"Purim Katan": "puːʁˈim kɒˈtɒn",
"Rosh Chodesh Adar": roshChodeshIpa + month2ipa["Adar"],
"Rosh Chodesh Adar I": roshChodeshIpa + month2ipa["Adar I"],
"Rosh Chodesh Adar II": roshChodeshIpa + month2ipa["Adar II"],
"Rosh Chodesh Av": roshChodeshIpa + month2ipa["Av"],
"Rosh Chodesh Cheshvan": roshChodeshIpa + month2ipa["Cheshvan"],
"Rosh Chodesh Elul": roshChodeshIpa + month2ipa["Elul"],
"Rosh Chodesh Iyyar": roshChodeshIpa + month2ipa["Iyyar"],
"Rosh Chodesh Kislev": roshChodeshIpa + month2ipa["Kislev"],
"Rosh Chodesh Nisan": roshChodeshIpa + month2ipa["Nisan"],
"Rosh Chodesh Sh'vat": roshChodeshIpa + month2ipa["Sh'vat"],
"Rosh Chodesh Sivan": roshChodeshIpa + month2ipa["Sivan"],
"Rosh Chodesh Tamuz": roshChodeshIpa + month2ipa["Tamuz"],
"Rosh Chodesh Tevet": roshChodeshIpa + month2ipa["Tevet"],
"Rosh Hashana": "ʁoʔʃ häʃׁänäh",
"Shabbat Chazon": "ʃəˈbɑːt χazon",
"Shabbat HaChodesh": "ʃəˈbɑːt häχodeʃ",
"Shabbat HaGadol": "ʃəˈbɑːt hägädol",
"Shabbat Machar Chodesh": "ʃəˈbɑːt mχʁ χvdʃ",
"Shabbat Nachamu": "ʃəˈbɑːt näχamu",
"Shabbat Parah": "ʃəˈbɑːt pʁh",
"Shabbat Rosh Chodesh": "ʃəˈbɑːt ʁʔʃ χvdʃ",
"Shabbat Shekalim": "ʃəˈbɑːt ʃØkälˈim",
"Shabbat Shuva": "ʃəˈbɑːt ʃuväh",
"Shabbat Zachor": "ʃəˈbɑːt zɒˈχoʊʁ",
"Shavuot": "ʃävuʕot",
"Shmini Atzeret": "ʃØmijnij ʕaʦeʁet",
"Shushan Purim": "ʃuʃän puːʁˈim",
"Sigd": "sjgd",
"Simchat Torah": "ˈsimχɒt ˈtoʊrə",
"Sukkot": "sukot",
"Ta'anit Bechorot": "täʕanijt bØχoʁot",
"Ta'anit Esther": "täʕanijt ʔesØteʁ",
"Tish'a B'Av": "tiʃˈäh bəˈäv",
"Tu B'Av": "ˈtu bəˈäv",
"Tu B'Shvat": "ˈtu biʃəˈvɑːt",
"Tu BiShvat": "ˈtu biʃəˈvɑːt",
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
    getWelcomeResponse(callback, false);
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
            getWhichHolidayResponse(callback);
        }
    } else if ("GetParsha" === intentName) {
        getParshaResponse(intent, session, callback);
    } else if ("GetHebrewDate" === intentName) {
        getHebrewDateResponse(intent, session, callback);
    } else if ("GetOmer" === intentName) {
        getOmerResponse(intent, session, callback);
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
    var repromptText = "You can ask about holidays, the Torah portion, or Hebrew dates.";
    var nag = ' What will it be?';
    var args = ['-t'];
    invokeHebcal(args, function(err, events) {
        if (err) {
            return callback({}, respond('Internal Error', err));
        }
        var hebrewDateStr = events[0].name;
        var speech = hebrewDateSSML(hebrewDateStr, true);
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
    callback({},
        buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

function getWhichHolidayResponse(callback) {
    var cardTitle = "What holiday?";
    var repromptText = "Which holiday would you like?";
    var speechOutput = "Sorry, Hieb-Kal didn't understand the holiday. " + repromptText;
    var shouldEndSession = false;
    callback({},
        buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

function hebrewDateSSML(str, suppressYear) {
    var re = /^(\d+)\w+ of ([^,]+), (\d+)$/,
        matches = str.match(re),
        day = matches[1],
        month = matches[2],
        year = matches[3],
        ipa = month2ipa[month],
        phoneme = '<phoneme alphabet="ipa" ph="' + ipa + '">' + month + '</phoneme>',
        ssml = '<say-as interpret-as="ordinal">' + day + '</say-as> of ' + phoneme;
    if (!suppressYear) {
        ssml += ', ' + year.substr(0,2) + ' ' + year.substr(2);
    }
    return ssml;
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
    var now = moment.utc(),
        isToday = dt.isSame(now, 'day');

    if (isToday) {
        return 'Today';
    } else {
        var year = dt.format('YYYY'),
            month = dt.format('MM'),
            day = dt.format('DD'),
            dow = dt.format('dddd'),
            thisYear = now.format('YYYY'),
            yearStr = (thisYear == year) ? '????' : year;

        return dow + ', <say-as interpret-as="date">'
            + yearStr
            + month + day
            + '</say-as>';

    }
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

function invokeHebcal(args, callback) {
    var proc, rd, events = [];

    process.env['PATH'] = process.env['PATH'] + ':' + process.env['LAMBDA_TASK_ROOT'];
    proc = spawn('./hebcal', args);

    proc.on('error', function(err) {
        console.log('Failed to start child process.');
        callback('Failed to start child process.', null);
    });

    rd = readline.createInterface({
        input: proc.stdout,
        terminal: false
    }).on('line', function(line) {
        var space = line.indexOf(' ');
        var mdy = line.substr(0, space);
        var name = line.substr(space + 1);
        var dt = moment.utc(mdy, 'MM/DD/YYYY');
        events.push({dt: dt, name: name});
    })

    proc.on('close', function(code) {
        console.log("Got " + events.length + " events");
        if (events.length === 0) {
            callback('No event data available.', null);
        } else {
            callback(null, events);
        }
    });
}

function getParshaResponse(intent, session, callback) {
    var args = ['-t', '-S'];
    invokeHebcal(args, function(err, events) {
        if (err) {
            return callback({}, respond('Internal Error', err));
        }
        var found = events.filter(function(evt) {
            return evt.name.indexOf("Parashat ") === 0;
        });
        if (found.length) {
            var name = found[0].name;
            var space = name.indexOf(' '),
                parsha = name.substr(space + 1),
                ipa = parsha2ipa[parsha] || parsha;
            var phoneme = '<phoneme alphabet="ipa" ph="paʁaˈʃat ' + ipa + '">' + name + '</phoneme>';
            callback({}, respond(name,
                "This week's Torah portion is " + name + '.',
                "This week's Torah portion is " + phoneme));
        }
    });
}

function getHebrewDateResponse(intent, session, callback) {
    var src = (intent.slots && intent.slots.MyDate && intent.slots.MyDate.value)
        ? parseAmazonDateFormat(intent.slots.MyDate.value)
        : moment.utc(),
        args = ['-d', src.format('YYYY')],
        srcDateSsml = formatDateSsml(src),
        srcDateText = src.format('MMMM Do YYYY');
    invokeHebcal(args, function(err, events) {
        if (err) {
            return callback({}, respond('Internal Error', err));
        }
        var found = events.filter(function(evt) {
            return evt.dt.isSame(src, 'day');
        });
        if (found.length) {
            var evt = found[0],
                now = moment.utc(),
                isOrWasThe = evt.dt.isSameOrAfter(now, 'day') ? ' is the ' : ' was the ',
                name = evt.name;
            var speech = hebrewDateSSML(name);
            callback({}, respond(name,
                srcDateText + isOrWasThe + name + '.',
                srcDateSsml + isOrWasThe + speech));
        } else {
            callback({}, respond('Internal Error - ' + intent.name,
                "Sorry, we could not convert " + srcDateText + " to Hebrew calendar.",
                "Sorry, we could not convert " + srcDateSsml + " to Hebrew calendar."));
        }
    });
}

function getOmerResponse(intent, session, callback) {
    var args = ['-o', '--years', '2'];
    invokeHebcal(args, function(err, events) {
        var now = moment.utc();
        if (err) {
            return callback({}, respond('Internal Error', err));
        }
        var re = /^(\d+)\w+ day of the Omer$/;
        var omerEvents = events.filter(function(evt) {
            return re.test(evt.name) && evt.dt.isSameOrAfter(now, 'day');
        });
        console.log("Filtered " + events.length + " events to " + omerEvents.length + " future");
        if (omerEvents.length == 0) {
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
                speech));
        } else {
            var observedDt = dayEventObserved(evt),
                dateSsml = formatDateSsml(observedDt),
                dateText = observedDt.format('dddd, MMMM Do YYYY');
            var prefix = 'The counting of the Omer begins at sundown on ';
            callback({}, respond('Counting of the Omer',
                prefix + dateText + '.',
                prefix + dateSsml));
        }
    });
}

function getHolidayResponse(intent, session, callback) {
    var args;
    var searchStr0 = intent.slots.Holiday.value.toLowerCase(),
        searchStr = holidayAlias[searchStr0] || searchStr0;
    var titleYear;

    if (searchStr == 'candle lighting' || searchStr == 'candle lighting time'
        || searchStr == 'shabbat' || searchStr == 'shabbos') {
        return callback({}, respond('Shabbat candle lighting times',
            "Candle lighting times are not yet supported."));
    }

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

    invokeHebcal(args, function(err, events) {
        var now = moment.utc();
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
        var eventsFiltered = filterEvents(events);
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
                var h = getHolidayBasename(evt.name);
                return h.toLowerCase() === searchStr;
            }
        });
        if (found.length) {
            var holiday = getHolidayBasename(found[0].name);
            var ipa = holiday2ipa[holiday];
            var phoneme = ipa
                ? '<phoneme alphabet="ipa" ph="' + ipa + '">' + holiday + '</phoneme>'
                : holiday;
            var observedDt = dayEventObserved(found[0]),
                observedWhen = beginsWhen(found[0].name);
            var dateSsml = formatDateSsml(observedDt),
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
                phoneme + beginsOn + dateSsml));
        } else {
            callback({}, respond(intent.slots.Holiday.value,
                'Sorry, we could not find the date for ' + intent.slots.Holiday.value + '.'));
        }
    });
}

function respond(title, cardText, ssmlContent) {
    var outputSpeech = ssmlContent ? {
        type: 'SSML',
        ssml: '<speak>' + ssmlContent + '</speak>'
    } : {
        type: 'PlainText',
        text: cardText
    };
    return {
        outputSpeech: outputSpeech,
        card: {
            type: "Simple",
            title: title,
            content: cardText
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