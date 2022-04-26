const googleAnalytics = require('./hebcal-track');
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
    }
    return options;
}
function trackScreenview(session, screenName) {
    const options = getTrackingOptions(session);
    googleAnalytics.screenview(session.user.userId, screenName, options);
}
function trackEvent(session, category, action, label) {
    const options = getTrackingOptions(session);
    googleAnalytics.event(session.user.userId, category, action, label, options);
}

function trackException(session, description) {
    const options = getTrackingOptions(session);
    googleAnalytics.exception(session.user.userId, description, options);
}

function trackIntent(intent, session) {
  const intentName = intent.name;
  trackScreenview(session, intentName);
  if (typeof intent.slots === 'object') {
      const slots = intent.slots;
      for (const slot in slots) {
          const slotval = slots[slot].value;
          if (slotval && slotval.length) {
              trackEvent(session, slot, slotval);
          }
      }
  }
}

exports.trackIntent = trackIntent;
exports.trackScreenview = trackScreenview;
exports.trackEvent = trackEvent;
exports.trackException = trackException;
