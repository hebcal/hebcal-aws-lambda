const dayjs = require('dayjs');
const { HebrewCalendar } = require('@hebcal/core');
const hebcal = require('./hebcal-app');

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
        return targetDay.toDate();
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

function getHolidaysOnDate(hd, location) {
    const il = Boolean(location && location.cc && location.cc === 'IL');
    const events0 = HebrewCalendar.getHolidaysOnDate(hd) || [];
    const events1 = events0.filter((ev) => (il && ev.observedInIsrael() || (!il && ev.observedInDiaspora())));
    return formatEvents(events1, location);
}
function formatEvents(events, location) {
    return events.map((ev) => {
        const dt = ev.getDate().greg();
        const iso = dt.toISOString().substring(0, 10);
        const time = ev.eventTimeStr ? 'T' + ev.eventTimeStr + ':00' : '';
        return {
            name: ev.renderBrief(),
            dt: dayjs(iso + time),
            basename: ev.basename(),
            orig: ev,
        };
    });
}

exports.getHolidaysOnDate = getHolidaysOnDate;
exports.formatEvents = formatEvents;
exports.getDateSlotValue = getDateSlotValue;
exports.todayOrTonight = todayOrTonight;
exports.getHebrewDateSrc = getHebrewDateSrc;
