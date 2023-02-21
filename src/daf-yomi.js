const hebcal = require('./hebcal-app');
const { DafYomi } = require('@hebcal/core');
const { respond } = require("./respond");
const { getLocation, getHebrewDateSrc, getDateSlotValue } = require("./common");

function getDafYomiResponse(intent, session, callback) {
    const location = getLocation(session);
    const now = hebcal.nowInLocation(location);
    const slotValue = getDateSlotValue(intent);
    const src = getHebrewDateSrc(now, location, slotValue);
    const dy = new DafYomi(new Date(src.year(), src.month(), src.date()));
    const daf = dy.render();
    const cardText = `Today's Daf Yomi is ${daf}`;
    return callback(session, respond(daf, cardText, null, true, session));
}
exports.getDafYomiResponse = getDafYomiResponse;
