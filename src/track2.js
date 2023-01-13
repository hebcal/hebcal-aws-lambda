const matomoAnalytics = require('./hebcal-track');
const { getLocation } = require("./respond");

function getTrackingOptions(session) {
    const location = getLocation(session);
    let options;
    if (location) {
        if (location.geoid) {
            options = {
                geoid: location.geoid
            };
        } else if (location.cc && location.cc.length && location.cc != 'US') {
            options = {
                geoid: location.cc
            };
        }
        options.location = location;
    }
    return options;
}
function trackScreenview(session, screenName, action, label) {
    const options = getTrackingOptions(session);
    options.action = action;
    options.label = label;
    matomoAnalytics.send(screenName, session.user.userId, options);
}
function trackEvent(session, category, action, label) {
    const options = getTrackingOptions(session);
    options.action = action;
    options.label = label;
    matomoAnalytics.send(category, session.user.userId, options);
}

function trackException(session, description) {
    const options = getTrackingOptions(session);
    options.action = description;
    matomoAnalytics.send('Exception', session.user.userId, options);
}

function trackIntent(intent, session) {
  const intentName = intent.name;
  const slotvals = [];
  let count = 0;
  const slots = intent.slots;
  if (typeof slots === 'object') {
    for (const [key, val] of Object.entries(slots)) {
        if (typeof val.value === 'string' && val.value.length) {
            slotvals.push([key, val.value]);
            count++;
        }
    }
  }
  if (count === 0) {
    trackScreenview(session, intentName);
  } else if (count === 1) {
    const slotval = slotvals[0];
    trackScreenview(session, intentName, slotval[0], slotval[1]);
  } else {
    trackScreenview(session, intentName, 'multi', JSON.stringify(slotvals));
  }
}

exports.trackIntent = trackIntent;
exports.trackScreenview = trackScreenview;
exports.trackEvent = trackEvent;
exports.trackException = trackException;
