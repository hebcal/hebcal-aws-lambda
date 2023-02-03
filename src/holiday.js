const hebcal = require('./hebcal-app');
const dayjs = require('dayjs');
const { HebrewCalendar } = require('@hebcal/core');
const { respond  } = require("./respond");
const { getLocation, formatEvents } = require("./common");

function getHolidayResponse({ slots, name }, session, callback) {
    const location = getLocation(session);
    const il = Boolean(location && location.cc && location.cc === 'IL');
    const options = { il };
    const searchStr0 = slots.Holiday.value.toLowerCase();
    const searchStr = hebcal.getHolidayAlias(searchStr0) || searchStr0;
    let titleYear;

    if (name === "GetHoliday") {
        options.numYears = 2;
    } else if (name === "GetHolidayDate") {
        if (slots && slots.MyYear && slots.MyYear.value) {
            options.year = +slots.MyYear.value;
            titleYear = slots.MyYear.value;
        }
    } else if (name === "GetHolidayNextYear") {
        const year = new Date().getFullYear() + 1;
        options.year = year;
        titleYear = year.toString();
    }

    const now = dayjs();
    const events0 = HebrewCalendar.calendar(options);
    let events = formatEvents(events0, location);
    console.log(`Got ${events.length} events`);

    if (name === "GetHoliday") {
        // events today or in the future
        const future = events.filter((evt) => {
            return evt.dt.isSameOrAfter(now, 'day');
        });
        console.log(`Filtered ${events.length} events to ${future.length} future`);
        events = future;
    }
    const eventsFiltered = hebcal.filterEvents(events);
    console.log(`Filtered to ${eventsFiltered.length} first occurrences`);
    /*
    console.log(JSON.stringify({events: eventsFiltered}));
    console.log("Searching for [" + searchStr + "] in " + eventsFiltered.length);
    if (eventsFiltered.length) {
        var evt = eventsFiltered[0],
            evt2 = eventsFiltered[eventsFiltered.length - 1];
        console.log("Event 0 is [" + evt.name + "] on " + evt.dt.format('YYYY-MM-DD'));
        console.log("Event " + (eventsFiltered.length - 1) + " is [" + evt2.name + "] on " + evt2.dt.format('YYYY-MM-DD'));
    }
    */
    const found = eventsFiltered.filter((evt) => {
        if (searchStr === 'rosh chodesh') {
            return evt.name.indexOf('Rosh Chodesh ') === 0;
        } else {
            return evt.basename.toLowerCase() === searchStr;
        }
    });
    if (found.length) {
        const evt = found[0];
        const holiday = evt.basename;
        const ipa = hebcal.getHolidayIPA(holiday);
        const phoneme = hebcal.getPhonemeTag(ipa, holiday);
        const observedDt = hebcal.dayEventObserved(evt);
        const observedWhen = hebcal.beginsWhen(evt.name);
        const dateSsml = hebcal.formatDateSsml(observedDt);
        const dateText = observedDt.format('dddd, MMMM D YYYY');
        const begins = observedDt.isSameOrAfter(now, 'day') ? 'begins' : 'began';
        const isToday = observedDt.isSame(now, 'day');
        let beginsOn = ` ${begins} ${observedWhen} `;
        let title = holiday;
        if (titleYear) {
            title += ` ${titleYear}`;
        }
        if (!isToday) {
            beginsOn += 'on ';
        }
        callback(session, respond(title,
            `${holiday + beginsOn + dateText}.`,
            phoneme + beginsOn + dateSsml,
            true,
            session));
    } else {
        callback(session, respond(slots.Holiday.value,
            `Sorry, we could not find the date for ${slots.Holiday.value}.`));
    }
}
exports.getHolidayResponse = getHolidayResponse;
