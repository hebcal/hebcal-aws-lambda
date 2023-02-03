const hebcal = require('./hebcal-app');
const dayjs = require('dayjs');
const { HebrewCalendar } = require('@hebcal/core');
const { respond, buildResponse } = require("./respond");
const { getLocation, formatEvents } = require("./common");
const { trackEventSQS } = require("./track2");

const reParsha = /^(Parashat|Pesach|Sukkot|Shavuot|Rosh Hashana|Yom Kippur|Simchat Torah|Shmini Atzeret)/;
function getParshaResponse(request, session, callback) {
    const intent = request.intent;
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
        const details = {category: 'exception', action: 'noTorah', name: saturday.format('YYYY-MM-DD')};
        const speechletResponse = respond(`Internal Error - ${intent.name}`,
            `Sorry, we could find the weekly Torah portion.`);
        const response = buildResponse(session?.attributes, speechletResponse);
        trackEventSQS(request, session, response, details).then(() => {
            callback(session, speechletResponse);
        });
    }
}
exports.getParshaResponse = getParshaResponse;
