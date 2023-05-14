const hebcal = require('./hebcal-app');
const { DafYomi } = require('@hebcal/learning');
const { respond } = require("./respond");
const { getLocation, getHebrewDateSrc, getDateSlotValue } = require("./common");

function getDafYomiResponse(intent, session, callback) {
    const location = getLocation(session);
    const slotValue = getDateSlotValue(intent);
    const {hd} = getHebrewDateSrc(location, slotValue);
    const dy = new DafYomi(hd);
    const daf = dy.render();
    const cardText = `Today's Daf Yomi is ${daf}`;
    return callback(session, respond(daf, cardText, null, true, session));
}
exports.getDafYomiResponse = getDafYomiResponse;
