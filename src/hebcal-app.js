import {readFileSync} from 'node:fs';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';

// don't lazily load
import {DynamoDBClient, GetItemCommand, PutItemCommand} from "@aws-sdk/client-dynamodb";

import {Location, HDate, GeoLocation, Zmanim} from '@hebcal/core';
import config from './config.json' with { type: "json" };
import pkg from './package.json' with { type: "json" };

/**
 * @param {string} f
 * @return {any}
 */
function readJSON(f) {
  const fileUrl = new URL(f, import.meta.url);
  return JSON.parse(readFileSync(fileUrl, 'utf8'));
}

dayjs.extend(utc);
dayjs.extend(timezone);

const hebcal = {
    cities: {},

    init() {
        const t0 = Date.now();
        console.log(`Init ${pkg.name}/${pkg.version}`);
        this.setDefaultTimeZone(config.defaultTimezone);
        for (let k in config.month2ipa) {
            const rck = `Rosh Chodesh ${k}`;
            config.holiday2ipa[rck] = config.roshChodeshIpa + config.month2ipa[k];
        }
        this.zipsDb = this.loadZipsDb(); // about 20ms
        console.log("Loading cities.json...");
        const allCities = readJSON('./cities.json');
        console.log(`Parsing ${allCities.length} cities`);
        this.cities = this.loadCities(allCities); // about 9ms
        this.initCityAliases();
        const t1 = Date.now();
        console.log(`Init finished in ${t1 - t0}ms`);
    },

    loadCities(allCities) {
        const cities = {};
        const cityObjs = allCities.map(this.parseCityString);
        const processCity = (city) => {
            const cityLc = city.name.toLowerCase();
            if (!cities[cityLc]) {
                cities[cityLc] = city;
            }
            if (city.cc == 'US') {
                const stateLc = config.stateNames[city.state].toLowerCase();
                const aliasLc = `${cityLc} ${stateLc}`;
                cities[aliasLc] = city;
            } else {
                const countryLc = city.country.toLowerCase();
                const aliasLc = `${cityLc} ${countryLc}`;
                cities[aliasLc] = city;
                if (city.admin1) {
                    const a1lc = city.admin1.toLowerCase();
                    const alias2 = `${cityLc} ${a1lc}`;
                    cities[alias2] = city;
                }
            }
        };
        // this is silly, but alias the first occurrence of each country and US state
        const aliasFirstCityOccurrence = (city) => {
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
        };
        cityObjs.forEach(processCity);
        for (const zipCode of Object.keys(this.zipsDb)) {
            const zipObj = this.lookupZipCode(zipCode);
            if (zipObj.state && config.stateNames[zipObj.state]) {
                const stateLc = config.stateNames[zipObj.state].toLowerCase();
                const cityLc = zipObj.name.toLowerCase();
                const aliasLc = `${cityLc} ${stateLc}`;
                if (!cities[aliasLc]) {
                    processCity(zipObj);
                }
            }
        }
        cityObjs.forEach(aliasFirstCityOccurrence);
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

        const city = {
            name: cityName,
            cc: country,
            latitude,
            longitude,
            tzid
        };

        if (country == 'US') {
            city.state = admin1;
            city.cityName = `${cityName}, ${admin1}`;
        } else {
            const countryName = config.countryNames[country];
            city.country = countryName;
            const suffix = admin1 || countryName;
            city.cityName = `${cityName}, ${suffix}`;
            if (admin1) {
                city.admin1 = admin1;
            }
        }
        return city;
    },

    initCityAliases() {
        const aliasMap = {
            'new york city': ['nyc', 'n y c', 'new york', 'new york new york'],
            'the bronx': ['bronx', 'bronx new york'],
            'los angeles': ['la', 'l a'],
            'washington': ['dc', 'd c', 'washington dc', 'washington d c'],
            'london': ['england', 'great britain', 'britain', 'london uk', 'london england'],
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
        const now = this.nowInLocation(location);
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
    formatDateSsml(dt, location) {
        const now = hebcal.nowInLocation(location);
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
    parseAmazonDateFormat(str, location) {
        if (str.length == 4 & str.charAt(3) == 'X') {
            const yearStr = str.substr(0,3);
            const year = (+yearStr) * 10;
            return dayjs(new Date(year, 0, 1));
        }
        const tzid = (location && location.tzid) || this.defaultTimezone;
        let m = dayjs.tz(str, tzid);
        if ((str.length == 8 && str.charAt(4) == '-' && str.charAt(5) == 'W') ||
            (str.length == 11 && str.substr(8) == '-WE')) {
            m = m.day(6); // advance to Saturday
        }
        return m;
    },

    getUpcomingFriday(now) {
        const midnight = now.hour(0).minute(0).second(0).millisecond(0);
        const dow = midnight.day();
        if (dow === 5) {
            return midnight;
        } else if (dow === 6) {
            return midnight.day(12); // Friday next week
        } else {
            return midnight.day(5); // Friday later this week
        }
    },

    getUpcomingSaturday(now) {
        const midnight = now.hour(0).minute(0).second(0).millisecond(0);
        const dow = midnight.day();
        if (dow === 6) {
            return midnight;
        } else {
            return midnight.day(6); // Shabbat later this week
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
            const ipa = config.parashatIpa + evt.orig.parsha.map((s) => config.parsha2ipa[s]).join(' ');
            return {
                title: name,
                name,
                ipa,
            };
        } else {
            const holiday = evt.basename;
            const ipaPrefix = holiday.startsWith('Shabbat ') ? '' : config.parashatIpa;
            const ipa = ipaPrefix + config.holiday2ipa[holiday];
            return {
                title: `${holiday} Torah reading`,
                name: holiday,
                ipa,
            };
        }
    },

    reOmer: /^(\d+)\w+ day of the Omer$/,

    reHebrewDate: /^(\d+)\w+ of ([^,]+), (\d+)$/,

    getGreetingForHoliday(evt) {
        const name = evt.name;
        let str = name;
        if (str.indexOf('Erev ') === 0) {
            str = str.substr(5);
        }
        if (this.reHebrewDate.test(str) || this.reOmer.test(str)) {
            // ignore Hebrew date and Omer
            return undefined;
        } else if (str.indexOf('Shabbat ') === 0) {
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
        } else if (config.chagSameach.includes(evt.basename)) {
            return 'Chag Sameach';
        } else {
            return undefined;
        }
    },

    getSpecialGreetings(events) {
        const greetings = events.map(this.getGreetingForHoliday, this);
        return greetings.filter(str => {
            return str !== undefined;
        });
    },

    /**
     * @param {Date} dt
     * @param {*} location
     * @return {dayjs.Dayjs}
     */
    getSunset(dt, location) {
        const gloc = new GeoLocation(null, location.latitude, location.longitude, 0, location.tzid);
        const zmanim = new Zmanim(gloc, dt, false);
        const sunset = zmanim.sunset();
        return dayjs.tz(sunset, location.tzid);
    },

    /**
     * @param {*} location
     * @return {dayjs.Dayjs}
     */
    nowInLocation(location) {
        const tzid = (location && location.tzid) || this.defaultTimezone;
        return dayjs.tz(new Date(), tzid);
    },

    /**
     * @param {*} location
     * @return {dayjs.Dayjs}
     */
    getDayjsForTodayHebrewDate(location) {
        const tzid = (location && location.tzid) || this.defaultTimezone;
        const now = dayjs.tz(new Date(), tzid);
        const localDate = new Date(now.year(), now.month(), now.date());
        let hd = new HDate(localDate);
        const afterSunset = this.isAfterSunset(now, location);
        if (afterSunset) {
            hd = hd.next();
        }
        const d = dayjs.tz(localDate, tzid);
        const targetDay = afterSunset ? d.add(1, 'd') : d;
        // console.log(`tzid=${tzid}, now=${now.format('YYYY-MM-DD HH:mm:ss')}, localDate=${localDate.toISOString()}, afterSunset=${afterSunset}, targetDay=${targetDay.format('YYYY-MM-DD HH:mm:ss')}, hd=${hd.toString()}`);
        return {now, afterSunset, d, targetDay, hd};
    },

    makeCandleLightingSpeech(evt, location) {
        const dowText = evt.dt.format('dddd');
        const dateText = dowText + ', ' + evt.dt.format('MMMM D YYYY');
        const timeText = evt.dt.format('h:mma');
        let cardText = `${evt.name} is at ${timeText} on ${dateText} in ${location.cityName}`;
        if (location.zipCode) {
            cardText += ` ${location.zipCode}`;
        }
        cardText += '.';
        const now = this.nowInLocation(location);
        let whenSpeech;
        if (now.day() === evt.dt.day()) {
            whenSpeech = 'tonight';
        } else if (now.day() === 6 && evt.dt.day() === 5) {
            whenSpeech = 'next Friday night';
        } else {
            whenSpeech = 'on ' + dowText;
        }
        const ssml = `${evt.name} ${whenSpeech}, in ${location.cityName}, is at ${timeText}.`;
        const title = `${evt.name} ${timeText}`;
        return { title, cardText, ssml };
    },

    /**
     * @param {dayjs.Dayjs} now
     * @param {*} location
     * @return {boolean}
     */
    isAfterSunset(now, location) {
        if (location && location.latitude && location.tzid) {
            const localDate = new Date(now.year(), now.month(), now.date());
            const sunset = this.getSunset(localDate, location);
            const afterSunset = now.isAfter(sunset);
            // console.log(`tz=${location.tzid}, now=${now.format('YYYY-MM-DDTHH:MM')}, sunset=${sunset.format('YYYY-MM-DDTHH:MM')}, afterSunset=${afterSunset}`);
            return afterSunset;
        } else if (now.hour() > 19) {
            return true;
        }
        return false;
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
        return r;
    },

    loadZipsDb() {
        let arr = readJSON('./zips.json');
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

    lookupZipCode(zipCode) {
        if (!this.zipsDb) {
            this.zipsDb = this.loadZipsDb();
        }
        const row0 = this.zipsDb[zipCode];
        if (!row0) {
            return null;
        } else {
            const row = this.parseZipCodeRow(row0);
            const tzid = Location.getUsaTzid(row.State, row.TimeZone, row.DayLightSaving);
            const stateName = config.stateNames[row.State] || row.State;
            const cityName = `${row.CityMixedCase}, ${stateName}`;
            const result = {
                zipCode,
                latitude: row.Latitude,
                longitude: row.Longitude,
                tzid,
                name: row.CityMixedCase,
                state: row.State,
                cc: 'US',
                cityName
            };
            return result;
        }
    },

    // dynamodb
    dynamodb: null,
    dynamoTableName: 'HebcalUsers2',

    getDynamoDB() {
        if (!this.dynamodb) {
            console.log("Creating DynamoDB...");
            this.dynamodb = new DynamoDBClient({ region: "us-east-1" });
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
        const command = new GetItemCommand(params);
        const timeoutObject = setTimeout(() => {
            console.log(`ABORT DynamoDB request for userId=${userId}`);
            callback(null);
        }, 2000);
        dynamodb.send(command).then((data) => {
            clearTimeout(timeoutObject);
            const Item = data.Item;
            if (typeof Item == 'undefined') {
                callback(null);
            } else {
                console.log(`SUCCESS Got from DynamoDB userId=${userId}`);
                const user = {
                    ts: Item.Timestamp.N
                };
                if (Item.Data && Item.Data.S) {
                    user.location = JSON.parse(Item.Data.S);
                }
                callback(user);
            }
        }).catch((err) => {
            console.log("ERROR dynamodb.getItem");
            console.log(err);
            callback(null);
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
        const command = new PutItemCommand(params);
        dynamodb.send(command).then((data) => {
            console.log('SUCCESS dynamodb.putItem');
            if (callback) {
                callback();
            }
        }).catch((err) => {
            console.log("ERROR dynamodb.putItem");
            console.log(err);
            if (callback) {
                callback();
            }
        });
    }
};

hebcal.init();

export default hebcal;
