Track the Message Status of Outbound Messages

This guide shows you how to use Twilio's status callbacks to track changes of the message status of outbound messages you send with Programmable Messaging.

Message status changes occur throughout the lifecycle of a message from creation, through sending, to delivery, and even read receipt for supporting messaging channels.

(information)
Info
The guide focuses on outbound messages created using the Message Resource of the Programmable Messaging REST API and covers the necessary considerations when using a Messaging Service.

Before you begin

Before you dive into this guide, make sure you're familiar with the following:

You should know how to send a message using the Programmable Messaging API. You can follow a Messaging Quickstart in the programming language of your choice.
Review our guide Outbound Message Status in Status Callbacks to understand for which status changes Twilio sends a status callback request.
If your use case involves the sending of high volumes of messages or message scheduling, then you should know what a Messaging Service is and how to use it when sending a message.
The status callbacks covered in this guide are Twilio webhooks. Check out our guide to Getting Started with Twilio Webhooks. Find other webhook pages, such as a security guide and FAQ in the Webhooks section of the docs.
Note: The code samples in this guide require some local setup steps. Select your language of choice below to learn how to set up your development environment.

Node.js
Python
C# and ASP.NET MVC
PHP
Java
Ruby
Go
Let's get started!

How to track outbound message status

Tracking the message status of an outbound message is a two-step process

Set up a status callback endpoint

How are status callback requests sent?
Implement a status callback handler (simplified example)
Send a message with status callback URL

Scenario 1: No Messaging Service
Scenario 2: Messaging Service used
Step 1. Set up a status callback endpoint

In order to track the message status of an outbound message, you must first create an API endpoint that:

Is served under a publicly accessible URL, the status callback URL, and
Implements a status callback handler for Twilio's message status callback HTTP requests.
(warning)
Warning
A status callback URL must contain a valid hostname. Underscores are not allowed.

How you implement your status callback endpoint depends on your use case and technology preferences. This may mean you

Create and host a small web application to handle the requests in the programming language and framework of your choice
Add an additional new endpoint to your existing web application
Use a serverless framework like Twilio Serverless Functions.
How are status callback requests sent?

Twilio sends status callback requests as HTTP POST requests with a Content-Type of application/x-www-form-urlencoded.

(warning)
Warning
The properties included in Twilio's request to the StatusCallback URL vary by messaging channel and event type and are subject to change.

Twilio occasionally adds new properties without advance notice.

When integrating with status callback requests, it is important that your implementation is able to accept and correctly run signature validation on an evolving set of parameters.

Twilio strongly recommends using the signature validation methods provided in the Helper Libraries and not implementing your own signature validation.

In a status callback request, Twilio provides a subset of the standard request properties, and additionally MessageStatus and ErrorCode. These properties are described in the table below.

Property Description
MessageStatus The status of the Message resource at the time the status callback request was sent.
ErrorCode If an error occurred (i.e. the MessageStatus is failed or undelivered), this property provides additional information about the failure.
For example, a status callback request sent when the Message resource for an outbound SMS changes status to sent, may contain the following content:

Copy code block
"AccountSid": "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
"From": "+15017250604"
"MessageSid": "SM1342fe1b2c904d1ab04f0fc7a58abca9"
"MessageStatus": "sent"
"SmsSid": "SM1342fe1b2c904d1ab04f0fc7a58abca9"
"SmsStatus": "sent"
SMS/MMS
For most SMS/MMS Messages that have a Status of delivered or undelivered, Twilio's request to the StatusCallback URL contains an additional property:

Property Description
RawDlrDoneDate This property is a passthrough of the Done Date included in the DLR (Delivery Receipt) that Twilio received from the carrier.

The value is in YYMMDDhhmm format.
YY is last two digits of the year (00-99)
MM is the two-digit month (01-12)
DD is the two-digit day (01-31)
hh is the two-digit hour (00-23)
mm is the two-digit minute (00-59).
Learn more on the "Addition of RawDlrDoneDate to Delivered and Undelivered Status Webhooks" Changelog page
.
WhatsApp and other messaging channels
If the Message resource uses WhatsApp or another messaging channel, Twilio's request to the StatusCallback URL contains additional properties. These properties are listed in the table below.

Property Description
ChannelInstallSid The Installed Channel SID that was used to send this message
ChannelStatusMessage The error message returned by the underlying messaging channel if Message delivery failed. This property is present only if the Message delivery failed.
ChannelPrefix The channel-specific prefix identifying the messaging channel associated with this Message
EventType This property contains information about post-delivery events. If the channel supports read receipts (currently WhatsApp only), this property's value is READ after the recipient has read the message.
Implement a status callback handler (simplified example)

(information)
Info
You may want to explore how status callback requests behave before working through your actual implementation. A light-weight way to accomplish this goal is to use Twilio Serverless Functions and inspect the status callbacks in the Console using the Function Editor's debugging feature.

Log into your Twilio Account
If you do not already have a suitable Functions and Assets Service
in your Console, you can create a new service for your status callback handler endpoint. Let's assume you created a new service under the name status-callback-prototyping.
From your service go to the Functions Editor to Add a new Function e.g. under the path /message-status with the following handler code:

Copy code block
// Log Status Callback requests

exports.handler = function(context, event, callback) {
console.log("Invoked with: ", event);
return callback(null, "");
};
By default your new serverless function is created as a protected endpoint, which means Twilio Serverless performs signature validation to ensure only valid Twilio requests invoke your handler.

Save the new function.
Deploy your new serverless function by pressing Deploy All.
Change the toggle control above the bottom-right corner logging window to Live logs on.
Click on the Copy URL link above the bottom-right logging window to copy the URL for your prototype status callback endpoint into your clipboard. The copied URL would look something like this: https://status-callback-prototyping-1234.twil.io/message-status.
You can now use your copied status callback URL in the next step of this guide: Step 2. Send a message with status callback URL.

Once you sent a message, you can inspect the logged status callback request in the bottom-right logging window of the Functions Editor in Console.
Serverless Functions Status Callback - Functions Editor.
Expand image
Your response to Twilio's status callback request should have an HTTP status code of 200 (OK). No response content is required.

What your status callback handler should do when receiving a status callback request, depends on your use case.

The following simplified web application illustrates how you could log the MessageSid and MessageStatus of outbound messages as they move through their lifecycle.

(warning)
Warning
Status callback requests are HTTP requests and are therefore subject to differences in latency caused by changing network conditions.

Status callback requests are sent in accordance with the message status transitions described in the guide Outbound Message Status in Status Callbacks. Some of these status transitions may occur in quick succession.

As a result, there is no guarantee that the status callback requests always arrive at your endpoint in the order they were sent.

You should bear this consideration in mind when implementing your status callback handler.

(information)
Info
Read our guide Best Practices for Messaging Delivery Status Logging for advanced considerations when implementing a production-grade status logging solution.

Handle a Message status callback request

Node.js

Report code block

Copy code block
const http = require('http');
const express = require('express');
const bodyParser = require('body-parser');

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));

app.post('/message-status', (req, res) => {
const messageSid = req.body.MessageSid;
const messageStatus = req.body.MessageStatus;

console.log(`SID: ${messageSid}, Status: ${messageStatus}`);

res.sendStatus(200);
});

http.createServer(app).listen(1337, () => {
console.log('Express server listening on port 1337');
});
Step 2. Send a message with status callback URL

In Step 1 you implemented a status callback handler which is publicly available at your status callback URL.

In this step you learn how to ensure Twilio sends status callback requests to your status callback URL for outbound messages.

How you do this may depend on whether you use a Messaging Service to send messages or not.

Scenario 1: No Messaging Service

For Twilio to send status callback requests, you need to provide your status callback URL in the StatusCallback parameter of each message for which you want to track the MessageStatus.

To get the following code sample to run, replace the following information:

Replace the From phone number with one of your Twilio numbers
Replace the To number with your mobile number
Replace the StatusCallback URL with your status callback URL
Send a Message without Messaging Service with a StatusCallback URL

Node.js

Report code block

Copy code block
// Download the helper library from https://www.twilio.com/docs/node/install
const twilio = require("twilio"); // Or, for ESM: import twilio from "twilio";

// Find your Account SID and Auth Token at twilio.com/console
// and set the environment variables. See http://twil.io/secure
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

async function createMessage() {
const message = await client.messages.create({
body: "McAvoy or Stewart? These timelines can get so confusing.",
from: "+15017122661",
statusCallback: "http://example.com/MessageStatus",
to: "+15558675310",
});

console.log(message.body);
}

createMessage();
Response

Copy response
{
"account_sid": "ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
"api_version": "2010-04-01",
"body": "McAvoy or Stewart? These timelines can get so confusing.",
"date_created": "Thu, 24 Aug 2023 05:01:45 +0000",
"date_sent": "Thu, 24 Aug 2023 05:01:45 +0000",
"date_updated": "Thu, 24 Aug 2023 05:01:45 +0000",
"direction": "outbound-api",
"error_code": null,
"error_message": null,
"from": "+15017122661",
"num_media": "0",
"num_segments": "1",
"price": null,
"price_unit": null,
"messaging_service_sid": "MGaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
"sid": "SMaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
"status": "queued",
"subresource_uris": {
"media": "/2010-04-01/Accounts/ACaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/Messages/SMaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/Media.json"
},
"tags": {
"campaign_name": "Spring Sale 2022",
"message_type": "cart_abandoned"
},
"to": "+15558675310",
"uri": "/2010-04-01/Accounts/ACaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/Messages/SMaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.json"
}
Scenario 2: Messaging Service used

Messaging Services can be configured to have a service-level Delivery Status Callback. When creating a new Messaging Service in Console, you can specify this service-level Delivery Status Callback in Step 3 - Set up Integrations.

You can use the status callback URL from Step 1 of this guide for this Delivery Status Callback integration. If you do so, you do not have to provide the status callback URL as a message-specific parameter.

Alternatively, you can provide a message-specific status callback URL in the StatusCallback parameter for a message created with the Messaging Service.

Which of these two options is more appropriate depends on your use case.

Option 1 - Use Service-level Delivery Status Callback
To get the following code sample to run, replace the following information:

Replace the MessagingServiceSid with the SID of one of your Messaging Services that has a Deliver Status Callback integration configured in Console
Replace the To number with your mobile number
Send a Message using Messaging Service with Delivery Status Callback Integration

Node.js

Report code block

Copy code block
// Download the helper library from https://www.twilio.com/docs/node/install
const twilio = require("twilio"); // Or, for ESM: import twilio from "twilio";

// Find your Account SID and Auth Token at twilio.com/console
// and set the environment variables. See http://twil.io/secure
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

async function createMessage() {
const message = await client.messages.create({
body: "McAvoy or Stewart? These timelines can get so confusing.",
messagingServiceSid: "MG9752274e9e519418a7406176694466fa",
to: "+15558675310",
});

console.log(message.body);
}

createMessage();
Response

Copy response
{
"account_sid": "ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
"api_version": "2010-04-01",
"body": "McAvoy or Stewart? These timelines can get so confusing.",
"date_created": "Thu, 24 Aug 2023 05:01:45 +0000",
"date_sent": "Thu, 24 Aug 2023 05:01:45 +0000",
"date_updated": "Thu, 24 Aug 2023 05:01:45 +0000",
"direction": "outbound-api",
"error_code": null,
"error_message": null,
"from": "+14155552345",
"num_media": "0",
"num_segments": "1",
"price": null,
"price_unit": null,
"messaging_service_sid": "MG9752274e9e519418a7406176694466fa",
"sid": "SMaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
"status": "queued",
"subresource_uris": {
"media": "/2010-04-01/Accounts/ACaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/Messages/SMaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/Media.json"
},
"tags": {
"campaign_name": "Spring Sale 2022",
"message_type": "cart_abandoned"
},
"to": "+15558675310",
"uri": "/2010-04-01/Accounts/ACaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/Messages/SMaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.json"
}
Option 2 - Use Message-specific status callback URL
(information)
Info
If your Messaging Service has a service-level Delivery Status Callback configured in the Console and you provide a messages-specific StatusCallback URL as shown in the next code sample, Twilio sends the status callback requests to the message-specific StatusCallback URL.

To get the following code sample to run, replace the following information:

Replace the MessagingServiceSid with the SID of one of your Messaging Services
Replace the To number with your mobile number
Replace the StatusCallback URL with your status callback URL
Send a Message using Messaging Service and StatusCallback URL

Node.js

Report code block

Copy code block
// Download the helper library from https://www.twilio.com/docs/node/install
const twilio = require("twilio"); // Or, for ESM: import twilio from "twilio";

// Find your Account SID and Auth Token at twilio.com/console
// and set the environment variables. See http://twil.io/secure
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

async function createMessage() {
const message = await client.messages.create({
body: "McAvoy or Stewart? These timelines can get so confusing.",
messagingServiceSid: "MG9752274e9e519418a7406176694466fa",
statusCallback: "http://example.com/MessageStatus",
to: "+15558675310",
});

console.log(message.body);
}

createMessage();
Response

Copy response
{
"account_sid": "ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
"api_version": "2010-04-01",
"body": "McAvoy or Stewart? These timelines can get so confusing.",
"date_created": "Thu, 24 Aug 2023 05:01:45 +0000",
"date_sent": "Thu, 24 Aug 2023 05:01:45 +0000",
"date_updated": "Thu, 24 Aug 2023 05:01:45 +0000",
"direction": "outbound-api",
"error_code": null,
"error_message": null,
"from": "+14155552345",
"num_media": "0",
"num_segments": "1",
"price": null,
"price_unit": null,
"messaging_service_sid": "MG9752274e9e519418a7406176694466fa",
"sid": "SMaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
"status": "queued",
"subresource_uris": {
"media": "/2010-04-01/Accounts/ACaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/Messages/SMaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/Media.json"
},
"tags": {
"campaign_name": "Spring Sale 2022",
"message_type": "cart_abandoned"
},
"to": "+15558675310",
"uri": "/2010-04-01/Accounts/ACaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/Messages/SMaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.json"
}
