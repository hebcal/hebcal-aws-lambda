const hebcal = require('./hebcal-app');
const dayjs = require('dayjs');
const { HebrewCalendar, HDate } = require('@hebcal/core');
const { respond, buildResponse } = require("./respond");
const { getLocation, formatEvents, getParshaHaShavua } = require("./common");
const { trackEventSQS } = require("./track2");

function getParshaResponse(request, session, callback) {
    const intent = request.intent;
    const now = dayjs();
    const saturday = now.day(6);
    const location = getLocation(session);
    const hd = new HDate(now.toDate());
    const {parsha, specialShabbat} = getParshaHaShavua(hd, location);
    if (parsha) {
        const todayOrThisWeek = (now.day() === 6) ? 'Today' : 'This week';
        const prefixText = `${todayOrThisWeek}'s Torah portion is `;
        const result = hebcal.getParashaOrHolidayName(parsha);
        const phoneme = hebcal.getPhonemeTag(result.ipa, result.name);
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
