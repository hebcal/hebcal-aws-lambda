const hebcal = require('./hebcal-app');
const dayjs = require('dayjs');
const { HDate } = require('@hebcal/core');
const { respond, getLocation } = require("./respond");
const { getHebrewDateSrc, todayOrTonight, getDateSlotValue } = require("./common");

function getHebrewDateResponse(intent, session, callback) {
    const location = getLocation(session);
    const now = dayjs();
    const slotValue = getDateSlotValue(intent);
    const src = getHebrewDateSrc(now, location, slotValue);
    let srcDateSsml = hebcal.formatDateSsml(src);
    let srcDateText = src.format('MMMM D YYYY');
    if (!slotValue) {
        srcDateSsml = todayOrTonight(now, location);
        if (hebcal.isAfterSunset(now, location)) {
            srcDateText = now.format('MMMM D YYYY');
            srcDateText += ' (after sunset)';
        }
    }
    const hd = new HDate(src.toDate());
    const name = hd.render();
    const speech = hebcal.hebrewDateSSML(name);
    callback(session, respond(name,
        `${srcDateText} is the ${name}.`,
        srcDateSsml + ' is the ' + speech,
        true,
        session));
}

exports.getHebrewDateResponse = getHebrewDateResponse;
