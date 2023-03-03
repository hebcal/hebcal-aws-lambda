const { getLocation } = require("./common");
const hebcal = require('./hebcal-app');

function respond(title, cardText, ssmlContent, addShabbatShalom, session) {
    const specialGreeting = session && session.attributes ? session.attributes.specialGreeting : undefined;
    const location = getLocation(session);
    const cardText2 = hebcal.strWithSpecialGreeting(cardText, location, false, addShabbatShalom, specialGreeting);
    const ssmlContent2 = hebcal.strWithSpecialGreeting(ssmlContent, location, true, addShabbatShalom, specialGreeting);
    const outputSpeech = ssmlContent2 ? {
        type: 'SSML',
        ssml: `<speak>${ssmlContent2}</speak>`
    } : {
        type: 'PlainText',
        text: cardText2
    };
    console.log(`RESPONSE: ${cardText2}`);
    return {
        outputSpeech,
        card: {
            type: "Simple",
            title,
            content: cardText2
        },
        reprompt: {
            outputSpeech: {
                type: "PlainText",
                text: null
            }
        },
        shouldEndSession: true
    };
}

function buildResponse(sessionAttributes, speechletResponse) {
  return {
      version: "1.0",
      sessionAttributes,
      response: speechletResponse
  };
}

function buildSpeechletResponse(title, output, repromptText, shouldEndSession) {
  return {
      outputSpeech: {
          type: "PlainText",
          text: output
      },
      card: {
          type: "Simple",
          title: `Hebcal - ${title}`,
          content: `Hebcal - ${output}`
      },
      reprompt: {
          outputSpeech: {
              type: "PlainText",
              text: repromptText
          }
      },
      shouldEndSession
  };
}

function getWhichHolidayResponse(session, callback) {
    const cardTitle = "What holiday?";
    const repromptText = "Which holiday would you like?";
    const speechOutput = `Sorry, Hieb-Kal didn't understand the holiday. ${repromptText}`;
    const shouldEndSession = false;
    session.attributes = session.attributes || {};
    session.attributes.prev = 'getWhichHolidayResponse';
    callback(session,
        buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

function getWhichZipCodeResponse(session, callback, prefixText) {
    const cardTitle = "What City or ZIP code?";
    const repromptText = "Which city or ZIP code for candle lighting times?";
    const speechOutput = prefixText ? (prefixText + repromptText) : repromptText;
    const shouldEndSession = false;
    session.attributes = session.attributes || {};
    session.attributes.prev = 'getWhichZipCodeResponse';
    callback(session,
        buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

/**
 * @private
 * @param {string} str
 * @return {string}
 */
function getCityName(str) {
    const lower = str.toLowerCase();
    if (lower.endsWith(' tomorrow')) {
        return str.substring(0, str.length - 9);
    } else if (lower.endsWith(' tonight')) {
        return str.substring(0, str.length - 8);
    } else if (lower.endsWith(' today')) {
        return str.substring(0, str.length - 6);
    }
    return str;
}

function userSpecifiedLocation(intent) {
    const slots = intent?.slots;
    if (!slots) {
        return false;
    }
    if (slots.CityName?.value) {
        const str = slots.CityName.value;
        const cityName = getCityName(str);
        const location = hebcal.getCity(cityName);
        return location ? location : {
            cityName: cityName,
            cityNotFound: true
        };
    } else if (slots.ZipCode?.value?.length === 5) {
        return {
            zipCode: slots.ZipCode.value
        };
    } else {
        return false;
    }
}

exports.respond = respond;
exports.buildResponse = buildResponse;
exports.buildSpeechletResponse = buildSpeechletResponse;
exports.getWhichHolidayResponse = getWhichHolidayResponse;
exports.getWhichZipCodeResponse = getWhichZipCodeResponse;
exports.userSpecifiedLocation = userSpecifiedLocation;
