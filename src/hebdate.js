const hebcal = require('./hebcal-app');
const { HDate } = require('@hebcal/core');
const { respond } = require("./respond");
const { getLocation, getHebrewDateSrc, todayOrTonight, getDateSlotValue } = require("./common");

function getHebrewDateResponse(intent, session, callback) {
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

exports.getHebrewDateResponse = getHebrewDateResponse;
