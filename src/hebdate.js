import * as hebcal from './hebcal-app.js';
import { HDate } from '@hebcal/core';
import { respond } from "./respond.js";
import { getLocation, getHebrewDateSrc, todayOrTonight, getDateSlotValue } from "./common.js";

export function getHebrewDateResponse(intent, session, callback) {
    const location = getLocation(session);
    const slotValue = getDateSlotValue(intent);
    const {src, hd} = getHebrewDateSrc(location, slotValue);
    let srcDateSsml = hebcal.formatDateSsml(src, location);
    let srcDateText = src.format('MMMM D, YYYY');
    if (!slotValue) {
        const now = hebcal.nowInLocation(location);
        srcDateSsml = todayOrTonight(now, location);
        srcDateText = now.format('MMMM D, YYYY');
        if (hebcal.isAfterSunset(now, location)) {
            srcDateText += ' (after sunset)';
        }
    }
    const name = hd.render();
    const speech = hebcal.hebrewDateSSML(name);
    callback(session, respond(name,
        `${srcDateText} is the ${name}.`,
        srcDateSsml + ' is the ' + speech,
        true,
        session));
}
