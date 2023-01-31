const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');
const matomoAnalytics = require('./hebcal-track');
const { getLocation } = require("./respond");
const sqsClient = new SQSClient({ region: 'us-east-1' });
const pkg = require('./package.json');

async function trackRequest(request, session, details) {
  const body = {
    timestamp: new Date().toISOString(),
    client: pkg.name + '/' + pkg.version,
    requestType: request?.type,
    requestId: request?.requestId,
    sessionId: session?.sessionId,
    userId: session?.user?.userId,
    locale: request?.locale,
  };
  const slotvals = {};
  let count = 0;
  const slots = request?.intent?.slots;
  if (typeof slots === 'object' && slots !== null) {
    for (const [key, val] of Object.entries(slots)) {
        if (typeof val.value === 'string' && val.value.length) {
            slotvals[key] = val.value;
            count++;
        }
    }
  }
  if (count) {
    body.intentName = request?.intent?.name;
    body.slots = slotvals;
  }
  const location = getLocation(session);
  if (location) {
    body.location = location;
  }
  if (details) {
    body.details = details;
  }
  const params = {
    QueueUrl: 'https://sqs.us-east-1.amazonaws.com/904217700991/alexa-matomo-track',
    MessageBody: JSON.stringify(body),
  };
  console.log(`Sending tracking to SQS`, body);
  const command = new SendMessageCommand(params);
  try {
    const data = await sqsClient.send(command);
    console.log(`SUCCESS sent SQS messageId ${data.MessageId}`);
  } catch (err) {
    console.log('ERROR sqsClient.send', err);
  }
}

function getTrackingOptions(session) {
    const location = getLocation(session);
    let options = {};
    if (location) {
        if (location.cc && location.cc.length && location.cc != 'US') {
            options.geoid = location.cc;
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
function trackIntent(intent, session) {
  const intentName = intent.name;
  const slotvals = {};
  let count = 0;
  const slots = intent.slots;
  if (typeof slots === 'object') {
    for (const [key, val] of Object.entries(slots)) {
        if (typeof val.value === 'string' && val.value.length) {
            slotvals[key] = val.value;
            count++;
        }
    }
  }
  if (count === 0) {
    trackScreenview(session, intentName);
  } else if (count === 1) {
    const slotval = Object.entries(slotvals)[0];
    trackScreenview(session, intentName, slotval[0], slotval[1]);
  } else {
    trackScreenview(session, intentName, 'slots', JSON.stringify(slotvals));
  }
}

exports.trackIntent = trackIntent;
exports.trackScreenview = trackScreenview;
exports.trackRequest = trackRequest;
