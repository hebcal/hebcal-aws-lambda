var spawn = require('child_process').spawn,
    readline = require('readline'),
    moment = require('moment-timezone');

var parsha2ipa = {
"Achrei Mot": "ʔäχaʁej mot",
"Balak": "bɑːlɑːk",
"Bamidbar": "bɑːmidØbɑːʁ",
"Bechukotai": "bəχukotäj",
"Beha'alotcha": "bØhäʕalotØχä",
"Behar": "bəhɑːʁ",
"Bereshit": "bəˈʁeɪʃit",
"Beshalach": "bəʃɑːˈlɑːχ",
"Bo": "boʔ",
"Chayei Sara": "χäjeɪ sɑːˈʁɑː",
"Chukat": "χukɑːt",
"Devarim": "dəvɑːʁˈim",
"Eikev": "ʕeɪkev",
"Emor": "ʔeɪmoʁ",
"Ha'Azinu": "hɑːʔˈɑːˈzinu",
"Kedoshim": "kØdoʃˈim",
"Ki Tavo": "ki ˈtɑːvoʔ",
"Ki Teitzei": "ki ˈteɪʦeɪʔ",
"Ki Tisa": "ki ˈtisɑː",
"Korach": "koʁäχ",
"Lech-Lecha": "ˈleχ ləˈχɑː",
"Masei": "mäsØˈeɪ",
"Matot": "mätot",
"Metzora": "mØʦoʁäʕ",
"Miketz": "mikeɪʦ",
"Mishpatim": "miʃØpɑːtˈim",
"Nasso": "nɑːso",
"Nitzavim": "niʦävˈim",
"Noach": "noˈäχ",
"Pekudei": "pəkuˈdeɪ",
"Pinchas": "ˈpinχɑːs",
"Re'eh": "ʁØˈeɪ",
"Sh'lach": "ˈʃØläχ ləˈχä",
"Shemot": "ʃØmot",
"Shmini": "ʃׁØmini",
"Shoftim": "ʃofØtˈim",
"Tazria": "ˈtɑːzʁijɑː",
"Terumah": "təˈʁumäh",
"Tetzaveh": "təˈʦäˈve",
"Toldot": "ˈtolØˈdot",
"Tzav": "ˈʦɑːv",
"Vaera": "vɑːˈeɪʁɑː",
"Vaetchanan": "vɑːetχäˈnɑːn",
"Vayakhel": "vɑːjäkØheɪl",
"Vayechi": "vɑːˈjəχi",
"Vayeilech": "vɑːˈjeɪleχ",
"Vayera": "vɑːˈjeɪʁäʔ",
"Vayeshev": "vɑːˈjeɪʃev",
"Vayetzei": "vɑːˈjeɪʦeɪ",
"Vayigash": "vɑːjiˈgɑːʃ",
"Vayikra": "vɑːˈjikØʁɑː",
"Vayishlach": "vɑːjiʃØˈläχ",
"Vezot Haberakhah": "vəˈzot häˈbəʁäχäh",
"Yitro": "jitØˈʁo"
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
"Tevet": "ˈtevet",
"Tishrei": "ˈtiʃʁeɪ"
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

var ZIPCODES_TZ_MAP = {
    '0'  : 'UTC',
    '4'  : 'America/Puerto_Rico',
    '5'  : 'America/New_York',
    '6'  : 'America/Chicago',
    '7'  : 'America/Denver',
    '8'  : 'America/Los_Angeles',
    '9'  : 'America/Anchorage',
    '10' : 'Pacific/Honolulu',
    '11' : 'Pacific/Pago_Pago',
    '13' : 'Pacific/Funafuti',
    '14' : 'Pacific/Guam',
    '15' : 'Pacific/Palau'
};

for (var k in month2ipa) {
    holiday2ipa["Rosh Chodesh " + k] = roshChodeshIpa + month2ipa[k];
}

moment.tz.setDefault("America/New_York");

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
        if (intent.slots && intent.slots.ZipCode && intent.slots.ZipCode.value
            && intent.slots.ZipCode.value.length == 5) {
            getCandleLightingResponse(intent, session, callback);
        } else {
            getWhichZipCodeResponse(callback);
        }
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
    if (str.indexOf('Rosh Chodesh Adar ') !== 0) {
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
    var now = moment(),
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
        var yearStr = str.substr(0,3),
            year = (+yearStr) * 10;
        return moment({ year : year, month : 1, day : 1 });
    }
    var m = moment(str);
    if ((str.length == 8 && str.charAt(4) == '-' && str.charAt(5) == 'W')
        || (str.length == 11 && str.substr(8) == '-WE')) {
        return m.day('Saturday');
    } 
    return m;
}

function invokeHebcal(args, callback) {
    var proc, rd, events = [];
    var evtTimeRe = /(\d+:\d+)$/;

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
        var dt;
        if (name.indexOf('Candle lighting') === 0
            || name.indexOf('Havdalah') === 0) {
            var matches = name.match(evtTimeRe),
                hourMin = matches[1],
                timeStr = mdy + ' ' + hourMin;
            dt = moment(timeStr, 'MM/DD/YYYY HH:mm');
            name = name.substr(0, name.indexOf(':'));
        } else {
            dt = moment(mdy, 'MM/DD/YYYY');
        }
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

function getParashaOrHolidayName(name) {
    if (name.indexOf("Parashat ") === 0) {
        var space = name.indexOf(' '),
            parsha = name.substr(space + 1),
            ipa = parsha2ipa[parsha];
        return {
            title: name,
            name: name,
            ipa: 'ˈpɑːʁɑːˈʃɑːt ' + ipa
        }
    } else {
        var holiday = getHolidayBasename(name),
            ipa = holiday2ipa[holiday];
        return {
            title: holiday + ' Torah reading',
            name: holiday,
            ipa: ipa
        }
    }
}

function latlongToHebcal(latitude,longitude) {
    var latDeg = latitude > 0 ? Math.floor(latitude) : Math.ceil(latitude),
        longDeg = longitude > 0 ? Math.floor(longitude) : Math.ceil(longitude),
        latMin = Math.floor((latitude - latDeg) * 60),
        longMin = Math.floor((longitude - longDeg) * 60);
    return {
        latitude: latitude,
        longitude: longitude,
        latDeg: latDeg,
        latMin: Math.abs(latMin),
        longDeg: longDeg * -1,
        longMin: Math.abs(longMin)
    };
}

function getUsaTzid(state,tz,dst) {
    if (state && state === 'AK' && tz === 10) {
        return 'America/Adak';
    } else if (state && state === 'AZ' && tz === 7) {
        if (dst === 'Y') {
            return 'America/Denver';
        } else {
            return 'America/Phoenix';
        }
    } else {
        return ZIPCODES_TZ_MAP[tz];
    }
}

function getWhichZipCodeResponse(callback, prefixText) {
    var cardTitle = "What ZIP code?";
    var repromptText = "Which ZIP code for candle lighting times?";
    var speechOutput = prefixText ? (prefixText + repromptText) : repromptText;
    var shouldEndSession = false;
    callback({prev:'getWhichZipCodeResponse'},
        buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

function getCandleLightingResponse(intent, session, callback) {
    var friday = moment().day('Friday'),
        friYear = friday.format('YYYY');
    var sqlite3 = require('sqlite3').verbose();

    var db = new sqlite3.Database('zips.sqlite3', sqlite3.OPEN_READONLY);

    var zipCode = intent.slots.ZipCode.value;

    var sql = "SELECT CityMixedCase,State,Latitude,Longitude,TimeZone,DayLightSaving \
    FROM ZIPCodes_Primary \
    WHERE ZipCode = '" + zipCode + "'";

    db.get(sql, function(err, row) {
        if (err) {
            return callback({}, respond('Internal Error', err));
        } else if (!row) {
            return getWhichZipCodeResponse(callback,
                'We could not find ZIP code ' + zipCode + '. ');
        }
        var tzid = getUsaTzid(row.State, row.TimeZone, row.DayLightSaving);
        var ll = latlongToHebcal(row.Latitude, row.Longitude);
        var cityName = row.CityMixedCase + ', ' + row.State;
        var args = [
            '-c',
            '-E',
            '-L', ll.longDeg + ',' + ll.longMin,
            '-l', ll.latDeg  + ',' + ll.latMin,
            '-z', tzid,
            '-m', '50',
            friYear
        ];
        moment.tz.setDefault(tzid);
        invokeHebcal(args, function(err, events) {
            if (err) {
                return callback({}, respond('Internal Error', err));
            }
            var found = events.filter(function(evt) {
                return evt.name === 'Candle lighting'
                    && evt.dt.isSame(friday, 'day');
            });
            if (found.length) {
                var evt = found[0],
                    dateText = evt.dt.format('dddd, MMMM Do YYYY'),
                    timeText = evt.dt.format('h:mma');
                callback({}, respond(evt.name + ' ' + timeText,
                    evt.name + ' is at ' + timeText + ' on ' + dateText + ' in ' + cityName + ' ' + zipCode + '.',
                    evt.name + ' on Friday, in ' + cityName + ', is at ' + timeText + '.',
                    true));
            } else {
                callback({}, respond('Internal Error - ' + intent.name,
                    "Sorry, we could not get candle-lighting times for " + cityName));
            }
        });
    });
}

function getParshaResponse(intent, session, callback) {
    var saturday = moment().day('Saturday'),
        satYear = saturday.format('YYYY');
    var args = ['-s', satYear];
    invokeHebcal(args, function(err, events) {
        var re =  /^(Parashat|Pesach|Sukkot|Shavuot|Rosh Hashana|Yom Kippur|Simchat Torah|Shmini Atzeret)/;
        if (err) {
            return callback({}, respond('Internal Error', err));
        }
        var found = events.filter(function(evt) {
            return evt.dt.isSame(saturday, 'day')
                && evt.name.search(re) != -1;
        });
        if (found.length) {
            var result = getParashaOrHolidayName(found[0].name);
            var phoneme = '<phoneme alphabet="ipa" ph="' + result.ipa + '">' + result.name + '</phoneme>';
            callback({}, respond(result.title,
                "This week's Torah portion is " + result.name + '.',
                "This week's Torah portion is " + phoneme,
                true));
        }
    });
}

function getHebrewDateResponse(intent, session, callback) {
    var src = (intent.slots && intent.slots.MyDate && intent.slots.MyDate.value)
        ? parseAmazonDateFormat(intent.slots.MyDate.value)
        : moment(),
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
                now = moment(),
                isOrWasThe = evt.dt.isSameOrAfter(now, 'day') ? ' is the ' : ' was the ',
                name = evt.name;
            var speech = hebrewDateSSML(name);
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

function getOmerResponse(intent, session, callback) {
    var args = ['-o', '--years', '2'];
    invokeHebcal(args, function(err, events) {
        var now = moment();
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
                speech,
                true));
        } else {
            var observedDt = dayEventObserved(evt),
                dateSsml = formatDateSsml(observedDt),
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
        searchStr = holidayAlias[searchStr0] || searchStr0;
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

    invokeHebcal(args, function(err, events) {
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
                phoneme + beginsOn + dateSsml,
                true));
        } else {
            callback({}, respond(intent.slots.Holiday.value,
                'Sorry, we could not find the date for ' + intent.slots.Holiday.value + '.'));
        }
    });
}

function strWithShabbatShalom(str, isTodayShabbat, ssml) {
    var ss;
    if (!isTodayShabbat || !str || !str.length) {
        return str;
    }
    ss = str;
    if (str.charAt(str.length - 1) !== '.') {
        ss += '.';
    }
    ss += ' ';
    if (ssml) {
        ss += '<phoneme alphabet="ipa" ph="ʃəˈbɑːt ʃɑːˈlom">';
    }
    ss += 'Shabbat Shalom';
    if (ssml) {
        ss += '</phoneme>';
    }
    ss += '.';
    return ss;
}

function respond(title, cardText, ssmlContent, addShabbatShalom) {
    var isTodayShabbat = addShabbatShalom ? moment().day() === 6 : false;
    var cardText2 = strWithShabbatShalom(cardText, isTodayShabbat, false),
        ssmlContent2 = strWithShabbatShalom(ssmlContent, isTodayShabbat, true);
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