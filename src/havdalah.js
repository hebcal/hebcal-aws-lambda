const hebcal = require('./hebcal-app');
const dayjs = require('dayjs');
const { HebrewCalendar, Location } = require('@hebcal/core');
const { respond, getLocation, userSpecifiedLocation, getWhichZipCodeResponse } = require("./respond");
const { formatEvents } = require("./common");
const { trackEvent, trackException } = require("./track2");

function getHavdalahResponse(intent, session, callback) {
    const now = dayjs();
    const saturday = hebcal.getUpcomingSaturday(now);
    let location = userSpecifiedLocation(intent);
    const sessionLocation = getLocation(session);

    if (location && location.cityNotFound) {
        console.log(`NOTFOUND: ${location.cityName}`);
        trackEvent(session, 'cityNotFound', location.cityName);
        return getWhichZipCodeResponse(session, callback,
            `Sorry, we don't know where ${location.cityName} is. `);
    }

    const hebcalEventsCallback = (err, events) => {
        if (err) {
            trackException(session, err);
            return callback(session, respond('Internal Error', err));
        }
        const found = events.filter((ev) => ev.orig.getDesc() === 'Havdalah');
        if (found.length) {
            const evt = found[0];
            const dateText = evt.dt.format('dddd, MMMM D YYYY');
            const timeText = evt.dt.format('h:mma');
            let whenSpeech;
            let cardText = `${evt.name} is at ${timeText} on ${dateText} in ${location.cityName}`;
            if (location.zipCode) {
                cardText += ` ${location.zipCode}`;
            }
            cardText += '.';
            if (now.day() === 6) {
                whenSpeech = 'tonight';
            } else {
                whenSpeech = 'on Saturday';
            }
            callback(session, respond(`${evt.name} ${timeText}`,
                cardText,
                `${evt.name} ${whenSpeech}, in ${location.cityName}, is at ${timeText}.`,
                true,
                session));
        } else {
            console.log(`Found NO events with date=${saturday.format('YYYY-MM-DD')}`);
            trackException(session, intent.name);
            callback(session, respond(`Internal Error - ${intent.name}`,
                `Sorry, we could not get Havdalah time for ${location.cityName}`));
        }
    };

    const myInvokeHebcal = location => {
        const loc = new Location(location.latitude, location.longitude, location.cc === 'IL',
            location.tzid, location.cityName, location.cc, location.geoid);
        const dt = saturday.toDate();
        const events0 = HebrewCalendar.calendar({
            location: loc,
            candlelighting: true,
            noHolidays: true,
            start: dt,
            end: dt,
        });
        const events = formatEvents(events0, location);
        hebcalEventsCallback(null, events);
    };

    session.attributes = session.attributes || {};

    if (location && location.latitude) {
        session.attributes.location = location;
        hebcal.saveUser(session.user.userId, location);
        myInvokeHebcal(location);
    } else if (location && location.zipCode) {
        console.log(`Need to lookup zipCode ${location.zipCode}`);
        const data = hebcal.lookupZipCode(location.zipCode);
        if (!data) {
            console.log(`NOTFOUND: ${location.zipCode}`);
            trackEvent(session, 'zipNotFound', location.zipCode);
            return getWhichZipCodeResponse(session, callback,
                `We could not find ZIP code ${location.zipCode}. `);
        }
        // save location in this session and persist in DynamoDB
        location = session.attributes.location = data;
        hebcal.saveUser(session.user.userId, data);
        myInvokeHebcal(location);
    } else if (sessionLocation) {
        location = sessionLocation;
        myInvokeHebcal(location);
    } else {
        return getWhichZipCodeResponse(session, callback);
    }
}
exports.getHavdalahResponse = getHavdalahResponse;
