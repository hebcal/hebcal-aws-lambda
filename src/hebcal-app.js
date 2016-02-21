var spawn = require('child_process').spawn,
    readline = require('readline'),
    moment = require('moment-timezone');

var hebcal = {
    sqlite3: null,

    zipsDb: null,

    defaultTimezone: 'America/New_York',

    roshChodeshIpa: "ˈʁoʔʃ ˈχodəʃ ",

    parsha2ipa: {
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
    },

    month2ipa: {
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
    },


    holiday2ipa: {
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
    },

    holidayAlias: {
        'lag baomer': 'lag b\'omer',
        'tu bishvat': 'tu b\'shvat',
        'hanukkah': 'chanukah',
        'passover': 'pesach',
        'sukkos': 'sukkot',
        'sukkoth': 'sukkot',
        'simchas torah': 'simchat torah',
        "ta'anis bechoros": "ta'anit bechorot",
        'shavuos': 'shavuot'
    },

    ZIPCODES_TZ_MAP: {
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
    },

    init: function() {
        this.setDefaultTimeZone(this.defaultTimezone);
        for (var k in this.month2ipa) {
            var rck = "Rosh Chodesh " + k;
            this.holiday2ipa[rck] = this.roshChodeshIpa + this.month2ipa[k];
        }
    },

    setDefaultTimeZone: function(tzid) {
        moment.tz.setDefault(tzid);
        process.env.TZ = tzid;
    },

    hebrewDateSSML: function(str, suppressYear) {
        var re = /^(\d+)\w+ of ([^,]+), (\d+)$/,
            matches = str.match(re),
            day = matches[1],
            month = matches[2],
            year = matches[3],
            ipa = this.month2ipa[month],
            phoneme = '<phoneme alphabet="ipa" ph="' + ipa + '">' + month + '</phoneme>',
            ssml = '<say-as interpret-as="ordinal">' + day + '</say-as> of ' + phoneme;
        if (!suppressYear) {
            ssml += ', ' + year.substr(0,2) + ' ' + year.substr(2);
        }
        return ssml;
    },

    strWithShabbatShalom: function(str, isTodayShabbat, ssml) {
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
    },

    getHolidayBasename: function(str) {
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
    },

    filterEvents: function(events) {
        var self = this;
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
                subj = self.getHolidayBasename(subj);
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
    },

    beginsWhen: function(name) {
        if (name === "Leil Selichot") {
            return "after nightfall";
        } else if (this.beginsAtDawn(name)) {
            return "at dawn";
        } else {
            return "at sundown";
        }
    },

    beginsAtDawn: function(name) {
        var re =  /^(Tzom|Asara|Ta\'anit) /;
        return name.search(re) != -1;
    },

    dayEventObserved: function(evt) {
        if (this.beginsAtDawn(evt.name) || evt.name === "Leil Selichot") {
            return evt.dt;
        } else {
            return evt.dt.subtract(1, 'd');
        }
    },

    // returns a 8-char string with 0-padding on month and day if needed
    formatDateSsml: function(dt) {
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
    },

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
    parseAmazonDateFormat: function(str) {
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
    },

    invokeHebcal: function(args, callback) {
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
    },

    getParashaOrHolidayName: function(name) {
        if (name.indexOf("Parashat ") === 0) {
            var space = name.indexOf(' '),
                parsha = name.substr(space + 1),
                ipa = this.parsha2ipa[parsha];
            return {
                title: name,
                name: name,
                ipa: 'ˈpɑːʁɑːˈʃɑːt ' + ipa
            }
        } else {
            var holiday = this.getHolidayBasename(name),
                ipa = this.holiday2ipa[holiday];
            return {
                title: holiday + ' Torah reading',
                name: holiday,
                ipa: ipa
            }
        }
    },

    latlongToHebcal: function(latitude,longitude) {
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
    },

    getUsaTzid: function(state,tz,dst) {
        if (state && state === 'AK' && tz === 10) {
            return 'America/Adak';
        } else if (state && state === 'AZ' && tz === 7) {
            if (dst === 'Y') {
                return 'America/Denver';
            } else {
                return 'America/Phoenix';
            }
        } else {
            return this.ZIPCODES_TZ_MAP[tz];
        }
    },

    lookupZipCode: function(zipCode, callback) {
        var self = this;

        if (!this.sqlite3) {
            this.sqlite3 = require('sqlite3').verbose();
            this.zipsDb = new this.sqlite3.Database('zips.sqlite3', this.sqlite3.OPEN_READONLY);
        }

        var sql = "SELECT CityMixedCase,State,Latitude,Longitude,TimeZone,DayLightSaving \
        FROM ZIPCodes_Primary WHERE ZipCode = '" + zipCode + "'";

        this.zipsDb.get(sql, function(err, row) {
            if (err) {
                callback(err);
            } else if (!row) {
                callback(null, null);
            } else {
                var tzid = self.getUsaTzid(row.State, row.TimeZone, row.DayLightSaving);
                var cityName = row.CityMixedCase + ', ' + row.State;
                var result = {
                    zipCode: zipCode,
                    latitude: row.Latitude,
                    longitude: row.Longitude,
                    tzid: tzid,
                    cityName: cityName
                };
                callback(null, result);
            }
        });
    },

    // dynamodb
    /*
    var AWS = require("aws-sdk");

    AWS.config.update({
      region: "us-east-1",
      endpoint: "http://localhost:8000"
    });

    var docClient = new AWS.DynamoDB.DocumentClient();
    lookupUser(docClient, session.user.userId, function(err, data) {
    });
    */
    lookupUser: function(docClient, userId, callback) {
        var params = {
            TableName: "HebcalUsers",
            Key: {
                userId: userId
            }
        };
        docClient.get(params, callback);
    },

    saveUser: function(docClient, user, callback) {
        var params = {
            TableName: "HebcalUsers",
            Key: {
                userId: user.userId,
                zipCode: user.zipCode,
                latitude: user.latitude,
                longitude: user.longitude,
                tzid: user.tzid,
                cityName: user.cityName
            }
        };
        docClient.put(params, callback);
    }
};

hebcal.init();
// console.log(JSON.stringify(hebcal, null, 2));

module.exports = hebcal;