const hebcal = require('./hebcal-app');
const dayjs = require('dayjs');
const { HDate, OmerEvent, months, greg } = require('@hebcal/core');
const { respond, getLocation } = require("./respond");

function getOmerResponse(intent, session, callback) {
    const location = getLocation(session);
    const {targetDay, afterSunset} = hebcal.getDayjsForTodayHebrewDate(location);
    const hd = new HDate(targetDay.toDate());
    const hyear = hd.getFullYear();
    const beginOmer = HDate.hebrew2abs(hyear, months.NISAN, 16);
    const endOmer = HDate.hebrew2abs(hyear, months.SIVAN, 5);
    const abs = hd.abs();
    if (abs >= beginOmer && abs <= endOmer) {
        const num = abs - beginOmer + 1;
        const weeks = Math.floor(num / 7);
        const days = num % 7;
        const todayOrTonightStr = afterSunset ? 'Tonight' : 'Today';
        let suffix = '';
        const speech = ` is the <say-as interpret-as="ordinal">${num}</say-as> day of the Omer`;
        if (weeks) {
            suffix = `, which is ${weeks} week`;
            if (weeks > 1) {
                suffix += 's';
            }
            if (days) {
                suffix += ` and ${days} day`;
                if (days > 1) {
                    suffix += 's';
                }
            }
        }
        const ev = new OmerEvent(hd, num);
        const title = ev.render();
        return callback(session, respond(title,
            `${todayOrTonightStr} is the ${title}${suffix}.`,
            todayOrTonightStr + speech + suffix,
            true,
            session));
    } else {
        const upcoming = abs < beginOmer ? beginOmer : HDate.hebrew2abs(hyear + 1, months.NISAN, 16);
        const upcomingDt = greg.abs2greg(upcoming); /** @todo: subtract 1? */
        const observedDt = dayjs(upcomingDt);
        const dateSsml = hebcal.formatDateSsml(observedDt);
        const dateText = observedDt.format('dddd, MMMM D YYYY');
        const prefix = 'The counting of the Omer begins at sundown on ';
        callback(session, respond('Counting of the Omer',
            `${prefix}${dateText}.`,
            prefix + dateSsml,
            true,
            session));
    }
}
exports.getOmerResponse = getOmerResponse;
