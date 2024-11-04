import { DafYomi } from '@hebcal/learning';
import { respond } from "./respond.js";
import { getLocation, getHebrewDateSrc, getDateSlotValue } from "./common.js";

export function getDafYomiResponse(intent, session, callback) {
    const location = getLocation(session);
    const slotValue = getDateSlotValue(intent);
    const {hd} = getHebrewDateSrc(location, slotValue);
    const dy = new DafYomi(hd);
    const daf = dy.render();
    const cardText = `Today's Daf Yomi is ${daf}`;
    return callback(session, respond(daf, cardText, null, true, session));
}
