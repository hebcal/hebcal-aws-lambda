import * as hebcal from './hebcal-app.js';
import dayjs from 'dayjs';
import { HDate, OmerEvent, months, greg } from '@hebcal/core';
import { respond } from "./respond.js";
import { getLocation } from "./common.js";

export function makeOmerSpeech(hd, afterSunset, num) {
    const ev = new OmerEvent(hd, num);
    let text = ev.getTodayIs('en');
    if (afterSunset) {
        text = text.replace(/^Today/, 'Tonight');
    }
    text += '.';
    const title = ev.render();
    return {
        title,
        cardText: text,
        ssml: text,
    };
}

export function getOmerResponse(intent, session, callback) {
    const location = getLocation(session);
    const {afterSunset, hd} = hebcal.getDayjsForTodayHebrewDate(location);
    const hyear = hd.getFullYear();
    const beginOmer = HDate.hebrew2abs(hyear, months.NISAN, 16);
    const endOmer = beginOmer + 48;
    const abs = hd.abs();
    if (abs >= beginOmer && abs <= endOmer) {
        const num = abs - beginOmer + 1;
        const { title, cardText, ssml } = makeOmerSpeech(hd, afterSunset, num);
        return callback(session, respond(title, cardText, ssml, true, session));
    } else {
        const upcoming = abs < beginOmer ? beginOmer : HDate.hebrew2abs(hyear + 1, months.NISAN, 16);
        const upcomingDt = greg.abs2greg(upcoming); /** @todo: subtract 1? */
        const observedDt = dayjs(upcomingDt);
        const dateSsml = hebcal.formatDateSsml(observedDt, location);
        const dateText = observedDt.format('dddd, MMMM D YYYY');
        const prefix = 'The counting of the Omer begins at sundown on ';
        callback(session, respond('Counting of the Omer',
            `${prefix}${dateText}.`,
            prefix + dateSsml,
            true,
            session));
    }
}
