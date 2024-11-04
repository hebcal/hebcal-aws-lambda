import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { getLocation } from "./common.js";
import pkg from './package.json' with { type: "json" };

const sqsClient = new SQSClient({ region: 'us-east-1' });

export async function trackEventSQS(request, session, response, details) {
  const now = new Date();
  const duration = now.getTime() - session.attributes.startTime;
  let title = response?.response?.card?.title;
  if (typeof title === 'string' && title.startsWith('Hebcal - ')) {
    title = title.substring(9);
  }
  const body = {
    timestamp: request?.timestamp || now.toISOString(),
    client: pkg.name + '/' + pkg.version,
    requestType: request?.type,
    requestId: request?.requestId,
    sessionId: session?.sessionId,
    userId: session?.user?.userId,
    locale: request?.locale,
    duration: duration,
    title: title,
  };
  const intentName = request?.intent?.name;
  if (intentName) {
    body.intentName = intentName;
  }
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
