const moment = require('moment-timezone');

// don't lazily load
const AWS = require('aws-sdk');

const SunCalc = require('suncalc');
const config = require('./config.json');

const hebcal = {
    cities: {},

    init() {
        this.setDefaultTimeZone(config.defaultTimezone);
        for (let k in config.month2ipa) {
            const rck = `Rosh Chodesh ${k}`;
            config.holiday2ipa[rck] = config.roshChodeshIpa + config.month2ipa[k];
        }
        console.log("Loading cities.json...");
        const allCities = require('./cities.json');
        console.log(`Parsing ${allCities.length} cities`);
        this.cities = this.loadCities(allCities);
        this.initCityAliases();
    },

    loadCities(allCities) {
        const cities = {};
        const cityObjs = allCities.map(this.parseCityString);
        cityObjs.forEach(city => {
            const cityLc = city.name.toLowerCase();
            let aliasLc;
            if (city.cc == 'US') {
                const stateLc = config.stateNames[city.state].toLowerCase();
                aliasLc = `${cityLc} ${stateLc}`;
            } else {
                const countryLc = city.country.toLowerCase();
                aliasLc = `${cityLc} ${countryLc}`;
            }
            if (!cities[cityLc]) {
                cities[cityLc] = city;
            }
            cities[aliasLc] = city;
        });
        // this is silly, but alias the first occurrence of each country and US state
        cityObjs.forEach(city => {
            if (city.cc == 'US') {
                const stateLc = config.stateNames[city.state].toLowerCase();
                if (!cities[stateLc]) {
                    cities[stateLc] = city;
                }
            } else {
                const countryLc = city.country.toLowerCase();
                if (!cities[countryLc]) {
                    cities[countryLc] = city;
                }
            }
        });
        return cities;
    },

    parseCityString(str) {
        const f = str.split('|');
        const cityName = f[0];
        const country = f[1];
        const admin1 = f[2];
        const latitude = +f[3];
        const longitude = +f[4];
        const tzid = f[5];
        const geoid = f[6];

        const city = {
            name: cityName,
            cc: country,
            latitude,
            longitude,
            tzid
        };

        if (geoid) {
            city.geoid = +geoid;
        }
        if (country == 'US') {
            city.state = admin1;
            city.cityName = `${cityName}, ${admin1}`;
        } else {
            const countryName = config.countryNames[country];
            city.country = countryName;
            city.cityName = `${cityName}, ${countryName}`;
        }
        return city;
    },

    initCityAliases() {
        const aliasMap = {
            'new york city': ['nyc', 'n y c', 'new york', 'new york new york'],
            'the bronx': ['bronx', 'bronx new york'],
            'los angeles': ['la', 'l a'],
            'washington': ['dc', 'd c', 'washington dc', 'washington d c'],
            'london': ['england', 'great britain', 'britain'],
            'glasgow': ['scotland'],
            'belfast': ['northern ireland'],
            'cardiff': ['wales'],
            'south lake tahoe': ['lake tahoe', 'tahoe'],
            'las vegas': ['vegas']
        };
        for (const city in aliasMap) {
            const c = this.cities[city];
            const aliases = aliasMap[city];
            for (let i = 0; i < aliases.length; i++) {
                this.cities[aliases[i]] = c;
            }
        }
    },

    defaultTimezone: config.defaultTimezone,

    setDefaultTimeZone(tzid) {
        this.defaultTimezone = tzid;
        moment.tz.setDefault(tzid);
//        process.env.TZ = tzid;
    },

    getCity(str) {
        return this.cities[str.toLowerCase()];
    },

    getHolidayAlias(str) {
        return config.holidayAlias[str];
    },

    getHolidayIPA(str) {
        return config.holiday2ipa[str];
    },

    getPhonemeTag(ipa, innerText) {
        if (!ipa) {
            return innerText;
        }
        return `<phoneme alphabet="ipa" ph="${ipa}">${innerText}</phoneme>`;
    },

    hebrewDateSSML(str, suppressYear) {
        const matches = str.match(this.reHebrewDate);
        const day = matches[1];
        const month = matches[2];
        const year = matches[3];
        const ipa = config.month2ipa[month];
        const phoneme = this.getPhonemeTag(ipa, month);
        let ssml = `<say-as interpret-as="ordinal">${day}</say-as> of ${phoneme}`;
        if (!suppressYear) {
            ssml += `, ${year.substr(0,2)} ${year.substr(2)}`;
        }
        return ssml;
    },

    weekendGreeting(location) {
        const now = this.getNowForLocation(location);
        const dow = now.day();
        if (dow === 6) {
            if (this.isAfterSunset(now, location)) {
                return 'Shavua Tov';
            } else {
                return 'Shabbat Shalom';
            }
        } else if (dow === 5) {
            return 'Shabbat Shalom';
        } else if (dow === 0 && now.hour() <= 12) {
            return 'Shavua Tov';
        }
        return null;
    },

    strWithSpecialGreeting(str, location, ssml, addShabbatShalom, specialGreeting) {
        const shabbatGreeting = addShabbatShalom ? this.weekendGreeting(location) : null;
        const isTodaySpecial = typeof specialGreeting === 'object' && specialGreeting.length;
        let greetings = shabbatGreeting ? [ shabbatGreeting ] : [];
        let ss;
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
        if (ssml) {
            ss += ' <break time="0.3s"/>';
            greetings = greetings.map(function(x) {
                const ipa = config.greeting2ipa[x];
                return this.getPhonemeTag(ipa, x);
            }, this);
        } else {
            ss += '\n';
        }
        ss += greetings.join(' and ');
        ss += '.';
        return ss;
    },

    filterEvents(events) {
        const dest = [];
        const seen = {};
        events.forEach(evt => {
            let subj = evt.name;
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
                subj = evt.basename;
            }
            if (seen[subj]) {
                return;
            }
            dest.push(evt);
            if (subj != "Asara B'Tevet") {
                seen[subj] = true;
            }
        });
        return dest;
    },

    beginsWhen(name) {
        if (name === "Leil Selichot") {
            return "after nightfall";
        } else if (this.beginsAtDawn(name)) {
            return "at dawn";
        } else {
            return "at sundown";
        }
    },

    beginsAtDawn(name) {
        const re =  /^(Tzom|Asara|Ta\'anit) /;
        return name.search(re) != -1;
    },

    dayEventObserved({name, dt}) {
        if (this.beginsAtDawn(name) || name === "Leil Selichot") {
            return dt;
        } else {
            return dt.subtract(1, 'd');
        }
    },

    // returns a 8-char string with 0-padding on month and day if needed
    formatDateSsml(dt) {
        const now = moment();
        const isToday = dt.isSame(now, 'day');

        if (isToday) {
            return 'Today';
        } else {
            const year = dt.format('YYYY');
            const month = dt.format('MM');
            const day = dt.format('DD');
            const dow = dt.format('dddd');
            const thisYear = now.format('YYYY');
            const yearStr = (thisYear == year) ? '????' : year;

            return `${dow}, <say-as interpret-as="date">${yearStr}${month}${day}</say-as>`;
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
    parseAmazonDateFormat(str) {
        if (str.length == 4 & str.charAt(3) == 'X') {
            const yearStr = str.substr(0,3);
            const year = (+yearStr) * 10;
            return moment({ year, month : 1, day : 1 });
        }
        const m = moment(str);
        if ((str.length == 8 && str.charAt(4) == '-' && str.charAt(5) == 'W') ||
            (str.length == 11 && str.substr(8) == '-WE')) {
            m.day(6); // advance to Saturday
        }
        return m;
    },

    getUpcomingFriday(now) {
        const dow = now.day();
        if (dow === 5) {
            return now;
        } else if (dow === 6) {
            return now.clone().day(12); // Friday next week
        } else {
            return now.clone().day(5); // Friday later this week
        }
    },

    getTzidFromLocation(location) {
        if (typeof location === 'object' && typeof location.tzid === 'string') {
            return location.tzid;
        }
        return undefined;
    },

    getParashaOrHolidayName(evt) {
        const name = evt.name;
        if (name.indexOf("Parashat ") === 0) {
            const space = name.indexOf(' ');
            const parsha = name.substr(space + 1);
            const ipa = config.parsha2ipa[parsha];
            return {
                title: name,
                name,
                ipa: `ˈpɑːʁɑːˈʃɑːt ${ipa}`
            };
        } else {
            const holiday = evt.basename;
            return {
                title: `${holiday} Torah reading`,
                name: holiday,
                ipa: config.holiday2ipa[holiday]
            };
        }
    },

    reOmer: /^(\d+)\w+ day of the Omer$/,

    reHebrewDate: /^(\d+)\w+ of ([^,]+), (\d+)$/,

    getGreetingForHoliday({name}) {
        let str = name;
        if (str.indexOf('Erev ') === 0) {
            str = str.substr(5);
        }
        if (this.reHebrewDate.test(str) || this.reOmer.test(str)) {
            // ignore Hebrew date and Omer
            return undefined;
        } else if (str.indexOf('Shabbat ') === 0 || config.noGreetingHolidays.includes(str)) {
            // no Chag Sameach on these days
            return undefined;
        } else if (str.indexOf('Rosh Chodesh ') === 0) {
            return 'Chodesh Tov';
        } else if (config.fastHolidays.includes(str)) {
            return 'Tzom Kal';
        } else if (str.includes(" (CH''M)")) {
            return "Mo'adim L'Simcha";
        } else if (str.indexOf('Chanukah') === 0) {
            return 'Chag Urim Sameach';
        } else if (str.includes('Pesach')) {
            return "Chag Kasher v'Sameach";
        } else if (str.indexOf('Rosh Hashana') === 0) {
            return 'Shana Tovah';
        } else if (str === 'Yom Kippur') {
            return "G'mar Chatimah Tovah";
        } else {
            return 'Chag Sameach';
        }
    },

    getSpecialGreetings(events) {
        const greetings = events.map(this.getGreetingForHoliday, this);
        return greetings.filter(str => {
            return str !== undefined;
        });
    },

    /**
     * @param {*} location
     * @return {moment.Moment}
     */
    getSunset({tzid, latitude, longitude}) {
        const now = new Date();
        const nowM = moment.tz(now, tzid);
        const suntimes = SunCalc.getTimes(now, latitude, longitude);
        const sunsetM = moment.tz(suntimes.sunset, tzid);
        if (sunsetM.isBefore(nowM, 'day')) {
            const tomorrow = new Date(now.getTime() + 86400000);
            const suntimes2 = SunCalc.getTimes(tomorrow, latitude, longitude);
            return moment.tz(suntimes2.sunset, tzid);
        }
        return sunsetM;
    },

    /**
     * @param {*} location
     * @return {moment.Moment}
     */
    getMomentForTodayHebrewDate(location) {
        const now = moment.tz(location.tzid);
        const sunset = hebcal.getSunset(location);
        const beforeSunset = now.isBefore(sunset);
        const m = beforeSunset ? now : now.add(1, 'd');
        return m;
    },

    /**
     * @param {*} location
     * @return {moment.Moment}
     */
    getNowForLocation(location) {
        if (location && location.tzid) {
            return moment.tz(location.tzid);
        } else {
            return moment();
        }
    },

    /**
     * @param {moment.Moment} now
     * @param {*} location
     * @return {boolean}
     */
    isAfterSunset(now, location) {
        if (location && location.latitude) {
            const sunset = this.getSunset(location);
            return now.isAfter(sunset);
        }
        return false;
    },

    getUsaTzid(state, tz, dst) {
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

    parseZipCodeRow(str) {
        const f = str.split('|');
        const r = {
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

    loadZipsDb() {
        let arr = require('./zips.json');
        const db = {};
        for (let i = 0; i < arr.length; ++i) {
            const str = arr[i];
            const pipe = str.indexOf('|');
            const zipCode = str.substr(0, pipe);
            db[zipCode] = str;
        }
        console.log(`Loaded ${arr.length} ZIP codes`);
        arr = null;
        return db;
    },

    lookupZipCode(zipCode, callback) {
        if (!this.zipsDb) {
            this.zipsDb = this.loadZipsDb();
        }
        const row0 = this.zipsDb[zipCode];
        if (!row0) {
            callback(null, null);
        } else {
            const row = this.parseZipCodeRow(row0);
            const tzid = this.getUsaTzid(row.State, row.TimeZone, row.DayLightSaving);
            const cityName = `${row.CityMixedCase}, ${row.State}`;
            const result = {
                zipCode,
                latitude: row.Latitude,
                longitude: row.Longitude,
                tzid,
                cc: 'US',
                cityName
            };
            if (row.GeoId) {
                result.geoid = row.GeoId;
            }
            callback(null, result);
        }
    },

    // dynamodb
    dynamodb: null,
    dynamoTableName: 'HebcalUsers2',

    getDynamoDB() {
        if (!this.dynamodb) {
            console.log("Creating DynamoDB...");
            this.dynamodb = new AWS.DynamoDB({apiVersion: '2012-08-10'});
        }
        return this.dynamodb;
    },

    lookupUser(userId, callback) {
        const params = {
            TableName: this.dynamoTableName,
            Key: {
                UserId: {
                    S: userId
                }
            }
        };
        const dynamodb = this.getDynamoDB();
        console.log(`Getting from DynamoDB userId=${userId}`);
        const request = dynamodb.getItem(params);
        const timeoutObject = setTimeout(() => {
            console.log(`ABORT DynamoDB request for userId=${userId}`);
            request.abort();
            callback(null);
        }, 2000);
        request.send((err, {Item}) => {
            clearTimeout(timeoutObject);
            if (err) {
                console.log(err, err.stack);
                callback(null);
            } else if (typeof Item == 'undefined') {
                callback(null);
            } else {
                console.log(`SUCCESS Got from DynamoDB userId=${userId},ts=${Item.Timestamp.N}`);
                const user = {
                    ts: Item.Timestamp.N
                };
                if (Item.Data && Item.Data.S) {
                    user.location = JSON.parse(Item.Data.S);
                }
                callback(user);
            }
        });
    },

    saveUser(userId, data, callback) {
        const params = {
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
        const dynamodb = this.getDynamoDB();
        console.log(`Storing in DynamoDB userId=${userId},data=${params.Item.Data.S}`);
        dynamodb.putItem(params, (err, data) => {
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
//var testCities = 'Hawaii,Portugal,New Zealand,Costa Rica,San Jose,Israel'.split(',');
//var testCities = 'England,Scotland,Wales,Northern Ireland,Ireland'.split(',');
//var testCities = 'japan,arizona,canada,victoria,United Arab Emirates'.split(',');
var testCities = 'anchorage,honolulu,London,Paris,Seattle,Jerusalem,San Francisco,Sao Paulo,tel aviv israel,tokyo japan,Washington DC,San Jose California,Reykjavik,perth,Wellington,melbourne'.split(',');
testCities.forEach(function(str) {
    var city = hebcal.getCity(str);
    if (typeof city === 'undefined') {
        console.log("*** DID NOT FIND " + str);
        return;
    }
    console.log(JSON.stringify(city, null, 2));
    var m = hebcal.getMomentForTodayHebrewDate(city);
    var now = moment.tz(city.tzid);
    var sunset = hebcal.getSunset(city);
    var delta = now.diff(sunset);

    var prefix = "Sunset for " + city.name;
    var prefix2 = delta < 0 ? ' is ' : ' was ';
    var dur = moment.duration(delta).humanize();
    var suffix = ", hebdate src=" + m.format('YYYY MM DD');
    var suffix2 = delta < 0 ? ' from now' : ' ago';
    console.log(prefix + prefix2 + dur + suffix2 + suffix);
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
    var sunsetZ = hebcal.getSunset(location);
    console.log(location.tzid);
    console.log(sunsetZ.format());
    console.log(sunsetZ.isBefore(now));
    var m = hebcal.getMomentForTodayHebrewDate(location);
    var args = m.format('M D YYYY').split(' ');
    console.log(m.format());
    console.log(hebcal.weekendGreeting(location));
    console.log(hebcal.strWithSpecialGreeting("Hello.", location, true, true, []));
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
