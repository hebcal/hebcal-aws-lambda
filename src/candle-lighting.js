const hebcal = require('./hebcal-app');
const dayjs = require('dayjs');
const { HebrewCalendar, Location } = require('@hebcal/core');
const { respond, getLocation, userSpecifiedLocation, getWhichZipCodeResponse } = require("./respond");
const { formatEvents } = require("./common");
const { trackRequest } = require("./track2");

function getCandleLightingResponse(request, session, callback) {
    const intent = request.intent;
    const now = dayjs();
    const friday = hebcal.getUpcomingFriday(now);
    let location = userSpecifiedLocation(intent);
    const sessionLocation = getLocation(session);

    if (location && location.cityNotFound) {
        console.log(`NOTFOUND: ${location.cityName}`);
        const myCallback = (session, speechletResponse) => {
            const details = {category: 'error', action: 'cityNotFound', name: location.cityName};
            trackRequest(request, session, details).then(() => {
                callback(session, speechletResponse);
            });
        }
        return getWhichZipCodeResponse(session, myCallback,
            `Sorry, we are having trouble finding the city ${location.cityName}. `);
    }

    const hebcalEventsCallback = (events) => {
        const found = events.filter(({ name }) => {
            return name === 'Candle lighting';
        });
        if (found.length) {
            const evt = found[0];
            const { title, cardText, ssml } = hebcal.makeCandleLightingSpeech(evt, location);
            callback(session, respond(title, cardText, ssml, true, session));
        } else {
            console.log(`Found NO events with date=${friday.format('YYYY-MM-DD')}`);
            const details = {category: 'exception', action: 'noEvents', name: friday.format('YYYY-MM-DD')};
            trackRequest(request, session, details).then(() => {
                callback(session, respond(`Internal Error - ${intent.name}`,
                `Sorry, we could not get candle-lighting times for ${location.cityName}`));
            });
        }
    };

    const myInvokeHebcal = location => {
        const loc = new Location(location.latitude, location.longitude, location.cc === 'IL',
            location.tzid, location.cityName, location.cc, location.geoid);
        const dt = friday.toDate();
        const events0 = HebrewCalendar.calendar({
            location: loc,
            candlelighting: true,
            noHolidays: true,
            start: dt,
            end: dt,
        });
        const events = formatEvents(events0, location);
        hebcalEventsCallback(events);
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
            const myCallback = (session, speechletResponse) => {
                const details = {category: 'error', action: 'zipNotFound', name: location.zipCode};
                trackRequest(request, session, details).then(() => {
                    callback(session, speechletResponse);
                });
            }
            return getWhichZipCodeResponse(session, myCallback,
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
exports.getCandleLightingResponse = getCandleLightingResponse;
