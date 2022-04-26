const dayjs = require('dayjs');
const { DafYomi } = require('@hebcal/core');
const { respond, getLocation } = require("./respond");
const { getHebrewDateSrc, getDateSlotValue } = require("./common");

function getDafYomiResponse(intent, session, callback) {
    const location = getLocation(session);
    const now = dayjs();
    const slotValue = getDateSlotValue(intent);
    const src = getHebrewDateSrc(now, location, slotValue);
    const dy = new DafYomi(src.toDate());
    const daf = dy.render();
    const cardText = `Today's Daf Yomi is ${daf}`;
    return callback(session, respond(daf, cardText, null, true, session));
}
exports.getDafYomiResponse = getDafYomiResponse;
