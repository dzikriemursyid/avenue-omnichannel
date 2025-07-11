Send a message on WhatsApp

You can send messages without WhatsApp approval for up to 24 hours by responding to an inbound message from the end user.

Note: To start a "business-initiated" conversation using WhatsApp, you must submit your message template for approval.

Send any message, such as "hi", from the recipient's number to your WhatsApp sender. Then, send the twilio/quick-reply content template you created to the recipient's number, including the following fields:

Now, send the quick reply content template to the number you want to reach, including the following fields:

Field Description
From The identifier of the sender. Use the folllowing format:
Phone numbers: E.164 format
WhatsApp: whatsapp:E.164
Facebook Messenger: messenger:{messenger_id}
To The identifier of the recipient. Use the folllowing format:
Phone numbers: E.164 format
WhatsApp: whatsapp:E.164
Facebook Messenger: messenger:{messenger_id}
ContentSid The Content SID (for example, HXXXXXXXXXXXXXXXX).
ContentVariables The values you want to substitute into your placeholder variables.
Send a content template created using Content API

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
contentSid: "HXXXXXXX",
contentVariables: JSON.stringify({ 1: "Name" }),
from: "whatsapp:+18551234567",
to: "whatsapp:+18551234567",
});

console.log(message.body);
}

createMessage();
Response

Copy response
{
"account_sid": "ACXXXXXXX",
"api_version": "2010-04-01",
"body": "Hello! 👍",
"date_created": "Thu, 24 Aug 2023 05:01:45 +0000",
"date_sent": "Thu, 24 Aug 2023 05:01:45 +0000",
"date_updated": "Thu, 24 Aug 2023 05:01:45 +0000",
"direction": "outbound-api",
"error_code": null,
"error_message": null,
"from": "whatsapp:+18551234567",
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
"to": "whatsapp:+18551234567",
"uri": "/2010-04-01/Accounts/ACaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/Messages/SMaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.json"
}
You'll now receive a response from your WhatsApp sender.

Fetch all content resources

Copy code block
GET "https://content.twilio.com/v1/Content"
Retrieve all content templates. Pagination is supported in this endpoint.

Fetch all content resources

curl

Report code block

Copy code block
curl -X GET "https://content.twilio.com/v1/Content"
-u $TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN
Output

Copy output
{
"meta": {
"page": 0,
"page_size": 50,
"first_page_url": "https://content.twilio.com/v1/Content?PageSize=50&Page=0",
"previous_page_url": null,
"url": "https://content.twilio.com/v1/Content?PageSize=50&Page=0",
"next_page_url": "https://content.twilio.com/v1/Content?PageSize=50&Page=1&PageToken=DNHXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX-1678723520",
"key": "contents"
},
"contents": [
{
"language": "en",
"date_updated": "2023-03-31T16:06:50Z",
"variables": {
"1": "07:00",
"3": "owl.jpg",
"2": "03/01/2023"
},
"friendly_name": "whatsappcard2",
"account_sid": "ACXXXXXXXXXXXXXXX",
"url": "https://content.twilio.com/v1/Content/HXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
"sid": "HXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
"date_created": "2023-03-31T16:06:50Z",
"types": {
"twilio/card": {
"body": null,
"media": [
"https://twilio.example.com/{{3}}"
],
"subtitle": null,
"actions": [
{
"index": 0,
"type": "QUICK_REPLY",
"id": "Stop",
"title": "Stop Updates"
}
],
"title": "See you at {{1}} on {{2}}. Thank you."
}
},
"links": {
"approval_fetch": "https://content.twilio.com/v1/Content/HXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX/ApprovalRequests",
"approval_create": "https://content.twilio.com/v1/Content/HXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX/ApprovalRequests/whatsapp"
}
},
{
"language": "en",
"date_updated": "2023-03-31T15:50:24Z",
"variables": {
"1": "07:00",
"2": "03/01/2023"
},
"friendly_name": "whatswppward_01234",
"account_sid": "ACXXXXXXXXXXXXXXX",
"url": "https://content.twilio.com/v1/Content/HXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
"sid": "HXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
"date_created": "2023-03-31T15:50:24Z",
"types": {
"twilio/card": {
"body": null,
"media": [
"https://twilio.example.com/owl.jpg"
],
"subtitle": null,
"actions": [
{
"index": 0,
"type": "QUICK_REPLY",
"id": "Stop",
"title": "Stop Updates"
}
],
"title": "See you at {{1}} on {{2}}. Thank you."
}
},
"links": {
"approval_fetch": "https://content.twilio.com/v1/Content/HXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX/ApprovalRequests",
"approval_create": "https://content.twilio.com/v1/Content/HXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX/ApprovalRequests/whatsapp"
}
}
]
}

Delete a content template

Copy code block
DELETE https://content.twilio.com/v1/Content/{ContentSid}
Path parameters

Property nameTypeRequiredPIIDescription
sid
SID<HX>
required
Not PII
The Twilio-provided string that uniquely identifies the Content resource to fetch.

Pattern:
^HX[0-9a-fA-F]{32}$
Min length:
34
Max length:
34
Delete a template using Content API

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

async function deleteContent() {
await client.content.v1.contents("HXXXXXXXX").remove();
}

deleteContent();
