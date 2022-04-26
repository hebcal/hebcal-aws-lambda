const hebcal = require('./hebcal-app');
const dayjs = require('dayjs');
const { HebrewCalendar } = require('@hebcal/core');
const { respond, getLocation } = require("./respond");
const { formatEvents } = require("./common");
const { trackException } = require("./track2");

const reParsha = /^(Parashat|Pesach|Sukkot|Shavuot|Rosh Hashana|Yom Kippur|Simchat Torah|Shmini Atzeret)/;
function getParshaResponse(intent, session, callback) {
    const now = dayjs();
    const saturday = now.day(6);
    const location = getLocation(session);
    const il = Boolean(location && location.cc && location.cc === 'IL');
    const dt = saturday.toDate();
    const events0 = HebrewCalendar.calendar({
        start: dt,
        end: dt,
        sedrot: true,
        il,
    });
    const events = formatEvents(events0, location);
    const found = events.find((evt) => {
        return evt.name.search(reParsha) != -1;
    });
    if (found) {
        const todayOrThisWeek = (now.day() === 6) ? 'Today' : 'This week';
        const prefixText = `${todayOrThisWeek}'s Torah portion is `;
        const result = hebcal.getParashaOrHolidayName(found);
        const phoneme = hebcal.getPhonemeTag(result.ipa, result.name);
        const specialShabbat = events.find((evt) => {
            return evt.name.indexOf('Shabbat ') === 0;
        });
        let suffixText = '';
        let suffixSsml = '';
        if (specialShabbat) {
            const suffixStart = ' Note the special reading for ';
            const result2 = hebcal.getParashaOrHolidayName(specialShabbat);
            const phoneme2 = hebcal.getPhonemeTag(result2.ipa, result2.name);
            suffixText = `${suffixStart}${specialShabbat.name}.`;
            suffixSsml = `${suffixStart}${phoneme2}.`;
        }
        callback(session, respond(result.title,
            `${prefixText}${result.name}.${suffixText}`,
            `${prefixText}${phoneme}.${suffixSsml}`,
            true,
            session));
    } else {
        trackException(session, intent.name);
        callback(session, respond(`Internal Error - ${intent.name}`,
            "Sorry, we could find the weekly Torah portion."));
    }
}
exports.getParshaResponse = getParshaResponse;
