"use strict"; /* jshint node: true */
var spawn = require('child_process').spawn,
    readline = require('readline'),
    moment = require('moment-timezone');

var SunCalc = require('suncalc');

var config = require('./config.json');

var hebcal = {
    cities: {},

    init: function() {
        this.setDefaultTimeZone(config.defaultTimezone);
        for (var k in config.month2ipa) {
            var rck = "Rosh Chodesh " + k;
            config.holiday2ipa[rck] = config.roshChodeshIpa + config.month2ipa[k];
        }
        console.log("Loading cities.json...");
        var allCities = require('./cities.json');
        console.log("Parsing " + allCities.length + " cities");
        this.cities = this.loadCities(allCities);
        this.initCityAliases();
    },

    loadCities: function(allCities) {
        var cities = {};
        var cityObjs = allCities.map(this.parseCityString);
        cityObjs.forEach(function(city) {
            var cityLc = city.name.toLowerCase(),
                aliasLc;
            if (city.cc == 'US') {
                var stateLc = config.stateNames[city.state].toLowerCase();
                aliasLc = cityLc + ' ' + stateLc;
            } else {
                var countryLc = city.country.toLowerCase();
                aliasLc = cityLc + ' ' + countryLc;
            }
            cities[cityLc] = city;
            cities[aliasLc] = city;
        });
        return cities;
    },

    parseCityString: function(str) {
        var f = str.split('|'),
            cityName = f[0],
            country = f[1],
            admin1 = f[2],
            latitude = +f[3],
            longitude = +f[4],
            tzid = f[5],
            city = {
                name: cityName,
                cc: country,
                latitude: latitude,
                longitude: longitude,
                tzid: tzid
            };
        if (country == 'US') {
            city.state = admin1;
            city.cityName = cityName + ', ' + admin1;
        } else {
            var countryName = config.countryNames[country];
            city.country = countryName;
            city.cityName = cityName + ', ' + countryName;
        }
        return city;
    },

    initCityAliases: function() {
        var aliasMap = {
            'new york city': ['nyc', 'n y c', 'new york', 'new york new york'],
            'los angeles': ['la', 'l a'],
            'washington': ['dc', 'd c', 'washington dc', 'washington d c'],
            'las vegas': ['vegas']
        };
        for (var city in aliasMap) {
            var c = this.cities[city];
            var aliases = aliasMap[city];
            for (var i = 0; i < aliases.length; i++) {
                this.cities[aliases[i]] = c;
            }
        }
    },

    defaultTimezone: config.defaultTimezone,

    setDefaultTimeZone: function(tzid) {
        this.defaultTimezone = tzid;
        moment.tz.setDefault(tzid);
//        process.env.TZ = tzid;
    },

    getCity: function(str) {
        return this.cities[str.toLowerCase()];
    },

    getHolidayAlias: function(str) {
        return config.holidayAlias[str];
    },

    getHolidayIPA: function(str) {
        return config.holiday2ipa[str];
    },

    getPhonemeTag: function(ipa, innerText) {
        if (!ipa) {
            return innerText;
        }
        return '<phoneme alphabet="ipa" ph="' + ipa + '">' + innerText + '</phoneme>';
    },

    hebrewDateSSML: function(str, suppressYear) {
        var matches = str.match(this.reHebrewDate),
            day = matches[1],
            month = matches[2],
            year = matches[3],
            ipa = config.month2ipa[month],
            phoneme = this.getPhonemeTag(ipa, month),
            ssml = '<say-as interpret-as="ordinal">' + day + '</say-as> of ' + phoneme;
        if (!suppressYear) {
            ssml += ', ' + year.substr(0,2) + ' ' + year.substr(2);
        }
        return ssml;
    },

    strWithSpecialGreeting: function(str, ssml, addShabbatShalom, specialGreeting) {
        var dow = moment().day(),
            isTodayShabbat = addShabbatShalom ? (dow === 5 || dow === 6) : false,
            isTodaySpecial = typeof specialGreeting === 'object' && specialGreeting.length,
            greetings = isTodayShabbat ? [ 'Shabbat Shalom' ] : [];
        var ss;
        if (isTodaySpecial) {
            greetings = greetings.concat(specialGreeting);
        }
        if (!str || !str.length || !greetings.length) {
            return str;
        }
        ss = str;
        if (str.charAt(str.length - 1) !== '.') {
            ss += '.';
        }
        ss += ' ';
        if (ssml) {
            ss += '<break time="0.3s"/>';
            greetings = greetings.map(function(x) {
                var ipa = config.greeting2ipa[x];
                return this.getPhonemeTag(ipa, x);
            }, this);
        }
        ss += greetings.join(' and ');
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

            return dow + ', <say-as interpret-as="date">' +
                yearStr + month + day + '</say-as>';

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
        if ((str.length == 8 && str.charAt(4) == '-' && str.charAt(5) == 'W') ||
            (str.length == 11 && str.substr(8) == '-WE')) {
            m.day(6); // advance to Saturday
        }
        return m;
    },

    getUpcomingFriday: function(now) {
        var dow = now.day();
        if (dow === 5) {
            return now;
        } else if (dow === 6) {
            return now.clone().day(12); // Friday next week
        } else {
            return now.clone().day(5); // Friday later this week
        }
    },

    getTzidFromLocation: function(location) {
        if (typeof location === 'object' && typeof location.tzid === 'string') {
            return location.tzid;
        }
        return undefined;
    },

    getEnvForTimezone: function(env, tzid) {
        var copy = {};
        // shallow copy of process.env
        for (var attr in env) {
            if (env.hasOwnProperty(attr)) {
                copy[attr] = env[attr];
            }
        }
        copy.TZ = tzid;
        return copy;
    },

    invokeHebcal: function(args, location, callback) {
        var proc, rd, events = [];
        var evtTimeRe = /(\d+:\d+)$/;
        var tzid0 = this.getTzidFromLocation(location),
            tzid = tzid0 || this.defaultTimezone;
        var env = this.getEnvForTimezone(process.env, tzid);

        proc = spawn('./hebcal', args, { cwd: undefined, env: env });

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
            if (name.indexOf('Candle lighting') === 0 ||
                name.indexOf('Havdalah') === 0) {
                var matches = name.match(evtTimeRe),
                    hourMin = matches[1],
                    timeStr = mdy + ' ' + hourMin;
                dt = moment.tz(timeStr, 'MM/DD/YYYY HH:mm', tzid);
                name = name.substr(0, name.indexOf(':'));
            } else {
                dt = moment.tz(mdy, 'MM/DD/YYYY', tzid);
            }
            events.push({dt: dt, name: name});
        });

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
                ipa = config.parsha2ipa[parsha];
            return {
                title: name,
                name: name,
                ipa: 'ˈpɑːʁɑːˈʃɑːt ' + ipa
            };
        } else {
            var holiday = this.getHolidayBasename(name);
            return {
                title: holiday + ' Torah reading',
                name: holiday,
                ipa: config.holiday2ipa[holiday]
            };
        }
    },

    reOmer: /^(\d+)\w+ day of the Omer$/,

    reHebrewDate: /^(\d+)\w+ of ([^,]+), (\d+)$/,

    getGreetingForHoliday: function(evt) {
        var str = evt.name;
        if (str.indexOf('Erev ') === 0) {
            str = str.substr(5);
        }
        if (this.reHebrewDate.test(str) || this.reOmer.test(str)) {
            // ignore Hebrew date and Omer
            return undefined;
        } else if (str.indexOf('Shabbat ') === 0 || config.noGreetingHolidays.indexOf(str) != -1) {
            // no Chag Sameach on these days
            return undefined;
        } else if (str.indexOf('Rosh Chodesh ') === 0) {
            return 'Chodesh Tov';
        } else if (config.fastHolidays.indexOf(str) != -1) {
            return 'Tzom Kal';
        } else if (str.indexOf(" (CH''M)") != -1) {
            return "Mo'adim L'Simcha";
        } else if (str.indexOf('Chanukah') === 0) {
            return 'Chag Urim Sameach';
        } else if (str.indexOf('Pesach') != -1) {
            return "Chag Kasher v'Sameach";
        } else if (str.indexOf('Rosh Hashana') === 0) {
            return 'Shana Tovah';
        } else if (str === 'Yom Kippur') {
            return "G'mar Chatimah Tovah";
        } else {
            return 'Chag Sameach';
        }
    },

    getSpecialGreetings: function(events) {
        var greetings = events.map(this.getGreetingForHoliday, this);
        return greetings.filter(function(str) {
            return str !== undefined;
        });
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

    getSunset: function(location) {
        var now = new Date(),
            nowM = moment.tz(now, location.tzid),
            suntimes = SunCalc.getTimes(now, location.latitude, location.longitude),
            sunsetM = moment.tz(suntimes.sunset, location.tzid);
        if (sunsetM.isBefore(nowM, 'day')) {
            var tomorrow = new Date(now.getTime() + 86400000);
            suntimes = SunCalc.getTimes(tomorrow, location.latitude, location.longitude);
        }
        return suntimes.sunset;
    },

    getTodayHebrewDateArgs: function(location, extraArgs) {
        var now = moment().tz(location.tzid),
            sunset = moment.tz(hebcal.getSunset(location), location.tzid),
            beforeSunset = now.isBefore(sunset),
            m = beforeSunset ? now : now.add(1, 'd');
        var args = [
            '-h', '-x', '-d',
            m.format('M'), m.format('D'), m.format('YYYY')
        ];
        return extraArgs ? args.concat(extraArgs) : args;
    },

    getCandleLightingArgs: function(location, extraArgs) {
        var ll = this.latlongToHebcal(location.latitude, location.longitude);
        var args = [
            '-c',
            '-E',
            '-h',
            '-x',
            '-L', ll.longDeg + ',' + ll.longMin,
            '-l', ll.latDeg  + ',' + ll.latMin,
            '-z', location.tzid,
            '-m', '50'
        ];
//        this.setDefaultTimeZone(location.tzid);
        return extraArgs ? args.concat(extraArgs) : args;
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
            return config.ZIPCODES_TZ_MAP[tz];
        }
    },

    zipsDb: null,

    parseZipCodeRow: function(str) {
        var f = str.split('|');
        var r = {
            ZipCode: f[0],
            State: f[1],
            CityMixedCase: f[2],
            Latitude: +f[3],
            Longitude: +f[4],
            TimeZone: +f[5],
            DayLightSaving: f[6]
        };
        if (f[7] && f[7].length) {
            r.GeoId = +f[7];
        }
        return r;
    },

    loadZipsDb: function() {
        var arr = require('./zips.json'),
            db = {};
        for (var i = 0; i < arr.length; ++i) {
            var str = arr[i],
                pipe = str.indexOf('|'),
                zipCode = str.substr(0, pipe);
            db[zipCode] = str;
        }
        console.log("Loaded " + arr.length + " ZIP codes");
        arr = null;
        return db;
    },

    lookupZipCode: function(zipCode, callback) {
        if (!this.zipsDb) {
            this.zipsDb = this.loadZipsDb();
        }
        var row0 = this.zipsDb[zipCode];
        if (!row0) {
            callback(null, null);
        } else {
            var row = this.parseZipCodeRow(row0);
            var tzid = this.getUsaTzid(row.State, row.TimeZone, row.DayLightSaving);
            var cityName = row.CityMixedCase + ', ' + row.State;
            var result = {
                zipCode: zipCode,
                latitude: row.Latitude,
                longitude: row.Longitude,
                tzid: tzid,
                cityName: cityName
            };
            if (row.GeoId) {
                result.geoId = row.GeoId;
            }
            callback(null, result);
        }
    },

    // dynamodb
    dynamodb: null,
    dynamoTableName: 'HebcalUsers2',

    getDynamoDB: function() {
        if (!this.dynamodb) {
            console.log("Lazily loading aws-sdk and creating DynamoDB");
            var AWS = require('aws-sdk');
            this.dynamodb = new AWS.DynamoDB({apiVersion: '2012-08-10'});
        }
        return this.dynamodb;
    },

    lookupUser: function(userId, callback) {
        var params = {
            TableName: this.dynamoTableName,
            Key: {
                UserId: {
                    S: userId
                }
            }
        };
        var dynamodb = this.getDynamoDB();
        console.log("Getting from DynamoDB userId=" + userId);
        dynamodb.getItem(params, function (err, data) {
            if (err) {
                console.log(err, err.stack);
                callback(null);
            } else if (data.Item === undefined) {
                callback(null);
            } else {
                console.log("SUCCESS Got from DynamoDB userId=" + userId + ",ts=" + data.Item.Timestamp.N);
                var user = {
                    ts: data.Item.Timestamp.N
                };
                if (data.Item.Data && data.Item.Data.S) {
                    user.location = JSON.parse(data.Item.Data.S);
                }
                callback(user);
            }
        });
    },

    saveUser: function(userId, data, callback) {
        var params = {
            TableName: this.dynamoTableName,
            Item: {
                UserId: {
                    S: userId
                },
                Data: {
                    S: JSON.stringify(data)
                },
                Timestamp: {
                    N: Date.now().toString()
                }
            }
        };
        var dynamodb = this.getDynamoDB();
        console.log("Storing in DynamoDB userId=" + userId + ",data=" + params.Item.Data.S);
        dynamodb.putItem(params, function (err, data) {
            if (err) {
                console.log("ERROR dynamodb.putItem");
                console.log(err, err.stack);
            }
            if (callback) {
                callback();
            }
        });
    }
};

hebcal.init();
// console.log(JSON.stringify(hebcal, null, 2));

/*
var testCities = 'London,Paris,Seattle,Jerusalem,San Francisco,Sao Paulo,tel aviv israel,tokyo japan,Washington DC,San Jose California'.split(',');
testCities.forEach(function(str) {
    var city = hebcal.getCity(str);
    console.log(JSON.stringify(city, null, 2));
});

var locations = [{
    latitude: -23.5475,
    longitude: -46.63611,
    tzid: 'America/Sao_Paulo'
},{
    latitude: -8.05389,
    longitude: -34.88111,
    tzid: 'America/Recife'
},{
    latitude: 60.71667,
    longitude: -46.03333,
    tzid: 'America/Godthab'
},{
    latitude: 64.13548,
    longitude: -21.89541,
    tzid: 'Atlantic/Reykjavik'
},{
    latitude: 38.71667,
    longitude: -9.13333,
    tzid: 'Europe/Lisbon'
},{
    latitude: 51.854871,
    longitude: -177.088812,
    tzid: 'America/Adak'
},{
    latitude: 59.93863,
    longitude: 30.31413,
    tzid: 'Europe/Moscow'
},{
    latitude: 41.85003,
    longitude: -87.65005,
    tzid: 'America/Chicago'
},{
    latitude: 37.45779,
    longitude: -122.122538,
    tzid: 'America/Los_Angeles'
},{
    latitude: 48.85341,
    longitude: 2.3488,
    tzid: 'Europe/Paris'
},{
    latitude: -25.96553,
    longitude: 32.58322,
    tzid: 'Africa/Maputo'
},{
    latitude: 40.6501,
    longitude: -73.94958,
    tzid: 'America/New_York'
}
];

var now = moment();
console.log(new Date());
for (var i = locations.length - 1; i >= 0; i--) {
    var location = locations[i];
    var sunset = hebcal.getSunset(location);
    var sunsetZ = moment.tz(sunset, location.tzid);
    console.log(location.tzid);
    console.log(sunsetZ.format());
    console.log(sunsetZ.isBefore(now));
    var args = hebcal.getTodayHebrewDateArgs(location);
    console.log(args);
    hebcal.invokeHebcal(args, location, function(err, events) {
        if (!err && events && events.length) {
            var evt = events[0];
            console.log(evt.dt.format() + " : " + evt.name);
        }
    });
    console.log();
}

hebcal.invokeHebcal(['3', '23', '2016'], {}, function(err, events) {
    console.log("Foobar");
    if (!err) {
        var arr = hebcal.getSpecialGreetings(events);
        console.log(arr);
        console.log(hebcal.strWithSpecialGreeting("Hello.", true, true, arr));
        console.log(hebcal.strWithSpecialGreeting("Hello.", false, true, arr));
        console.log("Quux");
    }
});

hebcal.lookupZipCode('94306', function(err, data) {
    if (err) {
        console.error("Unable to query. Error:", JSON.stringify(err, null, 2));
    } else if (!data) {
        console.error("ZIP not found");
    } else {
        console.error("Success:", JSON.stringify(data, null, 2));
    }
});

hebcal.saveUser('amzn1.echo-sdk-account.QUUX_FOOBAR', {     
    "zipCode": "12345",
    "latitude": 42.8145,
    "longitude": -73.9403,
    "tzid": "America/New_York",
    "cityName": "Schenectady, NY"
},
function() {
    console.log("Got called back!!");
});

    console.log("Immediate return");

hebcal.lookupUser('amzn1.echo-sdk-account.QUUX_FOOBAR',
function(err, data) {
    if (err) {
        console.error("Unable to query. Error:", JSON.stringify(err, null, 2));
    } else {
        console.log("Query succeeded.");
        console.log(JSON.stringify(data, null, 2));
        if (data && data.Item) {
            console.log(data.Item.zipCode);
        }
    }
});
*/

module.exports = hebcal;
