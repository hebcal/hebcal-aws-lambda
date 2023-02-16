const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const { HebrewCalendar, HDate, Location } = require('@hebcal/core');
const hebcal = require('./hebcal-app');

dayjs.extend(utc);
dayjs.extend(timezone);

function getLocation(session) {
    if (session && session.attributes && session.attributes.location) {
        return session.attributes.location;
    }
    return undefined;
}

/**
 * @param {dayjs.Dayjs} now
 * @param {*} location
 * @param {*} slotValue
 * @return {dayjs.Dayjs}
 */
function getHebrewDateSrc(now, location, slotValue) {
    if (slotValue) {
        return hebcal.parseAmazonDateFormat(slotValue);
    } else if (location && location.latitude && location.tzid) {
        const {targetDay} = hebcal.getDayjsForTodayHebrewDate(location);
        return targetDay;
    } else {
        return now;
    }
}

function todayOrTonight(now, location) {
  return hebcal.isAfterSunset(now, location) ? 'Tonight' : 'Today';
}

function getDateSlotValue({ slots }) {
    return slots && slots.MyDate && slots.MyDate.value;
}

const reParsha = /^(Parashat|Pesach|Sukkot|Shavuot|Rosh Hashana|Yom Kippur|Simchat Torah|Shmini Atzeret)/;

function getParshaHaShavua(hd, location) {
    const il = Boolean(location && location.cc && location.cc === 'IL');
    const saturday = hd.onOrAfter(6);
    const events0 = HebrewCalendar.calendar({
        start: saturday,
        end: saturday,
        sedrot: true,
        il,
    });
    const events = formatEvents(events0, location);
    const parsha = events.find((evt) => {
        if (evt.name === 'Rosh Hashana LaBehemot') {
            return false;
        }
        return evt.name.search(reParsha) != -1;
    });
    const specialShabbat = events.find((evt) => {
        return evt.name.indexOf('Shabbat ') === 0;
    });
    return {parsha, specialShabbat};
}

/**
 * @param {HDate} hd
 * @param {any} location
 * @param {number} numDays
 * @return {any[]}
 */
function getUpcomingEvents(hd, location, numDays) {
    const il = Boolean(typeof location === 'object' && location.cc === 'IL');
    const opts = {
        start: hd,
        end: new HDate(hd.abs() + numDays),
        il,
        shabbatMevarchim: false,
    };
    if (typeof location === 'object') {
        opts.location = new Location(location.latitude, location.longitude, il,
            location.tzid, location.cityName, location.cc);
        opts.candlelighting = true;
        opts.havdalahMins = 0;
    }
    const events0 = HebrewCalendar.calendar(opts);
    return formatEvents(events0, location);
}

/**
 * @param {HDate} hd
 * @param {any} location
 * @return {any[]}
 */
function getHolidaysOnDate(hd, location) {
    const il = Boolean(location && location.cc && location.cc === 'IL');
    const events0 = HebrewCalendar.getHolidaysOnDate(hd) || [];
    const events1 = events0.filter((ev) => (il && ev.observedInIsrael() || (!il && ev.observedInDiaspora())));
    return formatEvents(events1, location);
}
function formatEvents(events, location) {
    const tzid = hebcal.getTzidFromLocation(location);
    return events.map((ev) => {
        const dt = ev.getDate().greg();
        const iso = dt.toISOString().substring(0, 10);
        const str = ev.eventTimeStr ? iso + ' ' + ev.eventTimeStr + ':00' : iso;
        const d = tzid && ev.eventTimeStr ? dayjs.tz(str, tzid) : dayjs(str);
        return {
            name: ev.renderBrief(),
            dt: d,
            basename: ev.basename(),
            orig: ev,
        };
    });
}

exports.getLocation = getLocation;
exports.getHolidaysOnDate = getHolidaysOnDate;
exports.formatEvents = formatEvents;
exports.getDateSlotValue = getDateSlotValue;
exports.todayOrTonight = todayOrTonight;
exports.getHebrewDateSrc = getHebrewDateSrc;
exports.getParshaHaShavua = getParshaHaShavua;
exports.getUpcomingEvents = getUpcomingEvents;
