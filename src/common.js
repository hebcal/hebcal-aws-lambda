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
 * @param {*} location
 * @param {*} slotValue
 * @return {dayjs.Dayjs}
 */
function getHebrewDateSrc(location, slotValue) {
    if (slotValue) {
        const src = hebcal.parseAmazonDateFormat(slotValue, location);
        const hd = new HDate(new Date(src.year(), src.month(), src.date()));
        return {src, hd};
    } else if (location && location.latitude && location.tzid) {
        const {targetDay, hd} = hebcal.getDayjsForTodayHebrewDate(location);
        return {src: targetDay, hd};
    } else {
        const now = hebcal.nowInLocation(location);
        let hd = new HDate(new Date(now.year(), now.month(), now.date()));
        if (now.hour() > 19) {
            hd = hd.next(); // Consider 8pm or later "after sunset"
        }
        return {src: now, hd};
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
    }
    const events0 = HebrewCalendar.calendar(opts);
    const events1 = events0.filter((ev) => {
        const desc = ev.getDesc();
        if (desc === 'Fast begins' || desc === 'Fast ends') {
            return false;
        } else if (desc.startsWith("Erev ")) {
            return false;
        }
        return true;
    });
    return formatEvents(events1, location);
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
    const tzid = hebcal.getTzidFromLocation(location) || hebcal.defaultTimezone;
    return events.map((ev) => {
        const dt = ev.getDate().greg();
        const iso = dt.toISOString().substring(0, 10);
        const str = ev.eventTimeStr ? iso + ' ' + ev.eventTimeStr + ':00' : iso;
        const d = dayjs.tz(str, tzid);
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
