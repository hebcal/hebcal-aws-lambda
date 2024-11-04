import * as hebcal from './hebcal-app.js';
import { HDate } from '@hebcal/core';
import { respond, buildResponse } from "./respond.js";
import { getLocation, getParshaHaShavua } from "./common.js";
import { trackEventSQS } from "./track2.js";

export function getParshaResponse(request, session, callback) {
    const intent = request.intent;
    const location = getLocation(session);
    const now = hebcal.nowInLocation(location);
    const saturday = now.day(6);
    const hd = new HDate(new Date(saturday.year(), saturday.month(), saturday.date()));
    const {parsha, specialShabbat} = getParshaHaShavua(hd, location);
    if (parsha) {
        const afterSunset = session?.attributes?.afterSunset;
        const todayOrThisWeek = (now.day() === 6 && !afterSunset) ? 'Today' : 'This week';
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
