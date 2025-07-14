Content API Public Endpoints

(information)
Info
While the Content API supports an unlimited number of content templates, WhatsApp limits users to 6000 approved templates. Large parts of this page refer to v1 of the Content API. Content template search only applies to v2.

Property nameTypeRequiredDescriptionChild properties
dateCreated
string<date-time>
Optional
Not PII
The date and time in GMT that the resource was created specified in RFC 2822
format.

dateUpdated
string<date-time>
Optional
Not PII
The date and time in GMT that the resource was last updated specified in RFC 2822
format.

sid
SID<HX>
Optional
Not PII
The unique string that that we created to identify the Content resource.

Pattern:
^HX[0-9a-fA-F]{32}$
Min length:
34
Max length:
34
accountSid
SID<AC>
Optional
Not PII
The SID of the Account that created Content resource.

Pattern:
^AC[0-9a-fA-F]{32}$
Min length:
34
Max length:
34
friendlyName
string
Optional
Not PII
A string name used to describe the Content resource. Not visible to the end recipient.

language
string
Optional
Not PII
Two-letter (ISO 639-1) language code (e.g., en) identifying the language the Content resource is in.

variables
object
Optional
Not PII
Defines the default placeholder values for variables included in the Content resource. e.g. {"1": "Customer_Name"}.

types
object
Optional
Not PII
The Content types (e.g. twilio/text) for this Content resource.

url
string<uri>
Optional
Not PII
The URL of the resource, relative to https://content.twilio.com.

links
object<uri-map>
Optional
Not PII
A list of links related to the Content resource, such as approval_fetch and approval_create

Create a Content API template

Copy code block
POST https://content.twilio.com/v1/Content
(information)
Info
We recommend that you save the Content SID that can be found in the API response to use for later. This SID is used during send time and in various other requests to identify the template.

Create a Content API template

C#

Report code block

Copy code block
// Install the C# / .NET helper library from twilio.com/docs/csharp/install

using System;
using Twilio;
using Twilio.Rest.Content.V1;

     TwilioClient.Init(accountSid, authToken);

    // define the twilio/text type for less rich channels (e.g. SMS)
    var twilioText = new TwilioText.Builder();
    twilioText.WithBody("Hi {{1}}.  Thanks for contacting Owl Air Support. How can we help?");

    // define the twilio/quick-reply type for more rich channels
    var twilioQuickReply = new TwilioQuickReply.Builder();
    twilioQuickReply.WithBody("Owl Air Support");
    var quickreply1 = new QuickReplyAction.Builder()
        .WithTitle("Contact Us")
        .WithId("flightid1")
        .Build();
    var quickreply2 = new QuickReplyAction.Builder()
        .WithTitle("Check gate number")
        .WithId("gateid1")
        .Build();
    var quickreply3 = new QuickReplyAction.Builder()
        .WithTitle("Speak with an agent")
        .WithId("agentid1")
        .Build();
    twilioQuickReply.WithActions(new List<QuickReplyAction>() { quickreply1, quickreply2, quickreply3 });

    // define all the content types to be part of the template
    var types = new Types.Builder();
    types.WithTwilioText(twilioText.Build());
    types.WithTwilioQuickReply(twilioQuickReply.Build());

    // build the create request object
    var contentCreateRequest = new ContentCreateRequest.Builder();
    contentCreateRequest.WithTypes(types.Build());
    contentCreateRequest.WithLanguage("en");
    contentCreateRequest.WithFriendlyName("owl_air_qr");
    contentCreateRequest.WithVariables(new Dictionary<string, string>() { {"1", "John"} });

    // create the twilio template
    var contentTemplate = await CreateAsync(contentCreateRequest.Build());

    Console.WriteLine($"Created Twilio Content Template SID: {contentTemplate.Sid}");

Output

Copy output
{
"account_sid": "ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
"date_created": "2022-08-29T10:43:20Z",
"date_updated": "2022-08-29T10:43:20Z",
"friendly_name": "owl_air_qr",
"language": "en",
"links": {
"approval_create": "https://content.twilio.com/v1/Content/HXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX/ApprovalRequests/whatsapp",
"approval_fetch": "https://content.twilio.com/v1/Content/HXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX/ApprovalRequests"
},
"sid": "HXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
"types": {
"twilio/text": {
"body": "Hi, {{ 1 }}. \n Thanks for contacting Owl Air Support. How can I help?."
},
"twilio/quick-reply": {
"body": "Hi, {{ 1 }}. \n Thanks for contacting Owl Air Support. How can I help?",
"actions": [
{
"id": "flightid1",
"title": "Check flight status"
},
{
"id": "gateid1",
"title": "Check gate number"
},
{
"id": "agentid1",
"title": "Speak with an agent"
}
]
}
},
"url": "https://content.twilio.com/v1/Content/HXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
"variables": {
"1": "Owl Air Customer"
}
}
Fetch information about templates

Fetch a content resource

Copy code block
GET https://content.twilio.com/v1/Content/{ContentSid}
Retrieve information about a single Content API template.

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
Fetch a Content API resource

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

async function fetchContent() {
const content = await client.content.v1
.contents("HXaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")
.fetch();

console.log(content.dateCreated);
}

fetchContent();
Response

Copy response
{
"sid": "HXaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
"account_sid": "ACaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
"friendly_name": "Some content",
"language": "en",
"variables": {
"name": "foo"
},
"types": {
"twilio/text": {
"body": "Foo Bar Co is located at 39.7392, 104.9903"
},
"twilio/location": {
"longitude": 104.9903,
"latitude": 39.7392,
"label": "Foo Bar Co"
}
},
"url": "https://content.twilio.com/v1/Content/HXaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
"date_created": "2015-07-30T19:00:00Z",
"date_updated": "2015-07-30T19:00:00Z",
"links": {
"approval_create": "https://content.twilio.com/v1/Content/HXaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/ApprovalRequests/whatsapp",
"approval_fetch": "https://content.twilio.com/v1/Content/HXaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/ApprovalRequests"
}
}
Template search (v2)

Filters Number of filters Behavior
Language Multiple Pick multiple options of supported languages that matches the template's language field.
ContentType Multiple Pick multiple options of supported content types. This checks for the existence of contenttype fields e.g. twilio/text
ChannelEligibility Multiple Pick multiple options of the supported {channel}:{template_status} format which refers to the approval_content.channel.status field
Content Single Case-insensitive search pattern in the body, title, sub_title, friendly_name, approval_content.channel.name fields. Max character length: 1024. Max number of words: 30. Document will return with 100% match. Matches the order of words in friendly_name, approval_content.whatsapp.name.
ContentName Single Pattern to search for in the friendly_name (content template name) and approval_content.channel.name fields. Max character length: 450. Max number of words allowed: 30.
DateCreatedBefore Single Date and time value before template creation to be used in your content templates search. Format example: DateCreatedBefore=YYYY-MM-DDThh:mm:ssZ
DateCreatedAfter Single Date and time value after template creation to be used in your content templates search. Format example: DateCreatedAfter=YYYY-MM-DDThh:mm:ssZ
DateCreatedBefore, DateCreatedAfter Single Specify a datetime range for your content templates search. Format example: DateCreatedBefore=YYYY-MM-DDThh:mm:ssZ&DateCreatedAfter=YYYY-MM-DDThh:mm:ssZ

Copy code block
GET "https://content.twilio.com/v2/Content?PageSize=100&Content=hello"

Copy code block
GET "https://content.twilio.com/v2/ContentAndApprovals?ChannelEligibility=whatsapp:unsubmitted&Language=en"
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
Fetch content and approvals

Copy code block
GET https://content.twilio.com/v1/ContentAndApprovals
Retrieve information about templates and their approval status. The WhatsApp Flow publish status will be returned in the approvals object. Pagination is supported in this endpoint.

To learn more, see WhatsApp approval statuses.

Fetch content and approvals

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

async function listContentAndApprovals() {
const contentAndApprovals = await client.content.v1.contentAndApprovals.list({
limit: 20,
});

contentAndApprovals.forEach((c) => console.log(c.dateCreated));
}

listContentAndApprovals();
Response

Copy response
{
"contents": [],
"meta": {
"page": 0,
"page_size": 10,
"first_page_url": "https://content.twilio.com/v1/ContentAndApprovals?PageSize=10&Page=0",
"previous_page_url": null,
"next_page_url": null,
"url": "https://content.twilio.com/v1/ContentAndApprovals?PageSize=10&Page=0",
"key": "contents"
}
}
Fetch mapping between legacy WhatsApp and content templates

Copy code block
GET https://content.twilio.com/v1/LegacyContent
For customers that have had their templates synced over from WA templates you can retrieve a mapping between all the templates, their language and body text and their new Content Sids.

Pagination is supported in this endpoint.
Fetch legacy WhatsApp content mapping

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

async function listLegacyContent() {
const legacyContents = await client.content.v1.legacyContents.list({
limit: 20,
});

legacyContents.forEach((l) => console.log(l.dateCreated));
}

listLegacyContent();
Response

Copy response
{
"contents": [],
"meta": {
"page": 0,
"page_size": 10,
"first_page_url": "https://content.twilio.com/v1/LegacyContent?PageSize=10&Page=0",
"previous_page_url": null,
"url": "https://content.twilio.com/v1/LegacyContent?PageSize=10&Page=0",
"next_page_url": null,
"key": "contents"
}
}
Pagination

For endpoints where pagination is supported you can append the following parameters to the request URL to paginate the results. The limit of page size is 1 MB of data. This is typically ~500 templates. If you aren't seeing some templates, please reduce your page size and pull the data in multiple pages.

PageSize: Recommended Limit 500
PageToken: Equivalent to page number starting with page=0. To navigate to the next page use the page token referenced the meta.next_page_url field at the bottom of the returned results. Entering the next page in a page= field won't work. Only PageToken is supported.
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
Submit templates for approval

Submit a template approval for WhatsApp

(information)
Info
By default, to send outbound messages to WhatsApp users, a template approval by WhatsApp is required. However, if a WhatsApp user sends an inbound message, then a 24-hour messaging session is initiated and certain outbound rich content types can be sent without a template.

For details regarding which content types require approval and 24-hour session limitations, please refer to the following chart.

To use your content template on WhatsApp, you can request approval by submitting a request along with additional information required by WhatsApp. To ensure your WhatsApp templates are approved please see our guide WhatsApp Notification Messages with Templates. Approval by WhatsApp typically takes 1 business day.

Copy code block
POST https://content.twilio.com/v1/Content/{ContentSid}/ApprovalRequests/WhatsApp
Path parameters
Parameter Type Required Description
content_sid string Yes Content resource you want to submit for approval.
Additional parameters required by WhatsApp
Parameter Type Required Description
name string Yes Name that uniquely identifies the Content. Only lowercase alphanumeric characters or underscores.
category enum Yes Use case category the Content corresponds to, as defined by WhatsApp
.
The following are the available WhatsApp categories:
UTILITY
MARKETING
AUTHENTICATION
Submit a template for WhatsApp approval

curl

Report code block

Copy code block
curl -X POST 'https://content.twilio.com/v1/Content/HXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX/ApprovalRequests/whatsapp' \
-H 'Content-Type: application/json' \
-u $TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN \
-d '{
"name": "flight_replies",
"category": "UTILITY"
}'
Output

Copy output
{
"category": "TRANSPORTATION_UPDATE",
"status": "received",
"rejection_reason": "",
"name": "flight_replies",
"content_type": "twilio/quick-reply"
}
Fetch an approval status request

Copy code block
GET https://content.twilio.com/v1/Content/{ContentSid}/ApprovalRequests
All WhatsApp approval statuses can be found here. Flow status will begin to be returned in the approvals object.

Path parameters

Property nameTypeRequiredPIIDescription
sid
SID<HX>
required
Not PII
The Twilio-provided string that uniquely identifies the Content resource whose approval information to fetch.

Pattern:
^HX[0-9a-fA-F]{32}$
Min length:
34
Max length:
34
Fetch an approval Status Request

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

async function fetchApprovalFetch() {
const approvalFetch = await client.content.v1
.contents("HXaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")
.approvalFetch()
.fetch();

console.log(approvalFetch.sid);
}

fetchApprovalFetch();
Response

Copy response
{
"sid": "HXaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
"account_sid": "ACaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
"whatsapp": {
"type": "whatsapp",
"name": "tree_fiddy",
"category": "UTILITY",
"content_type": "twilio/location",
"status": "approved",
"rejection_reason": "",
"allow_category_change": true
},
"url": "https://content.twilio.com/v1/Content/HXaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/ApprovalRequests"
}
Send a template

Send a message with preconfigured content

Copy code block
POST https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/Messages
To send messages you will use the content SID message body and your Twilio account SID in the POST request URL. For templates that use variables, please specify these variables in the POST request to send messages.

Path parameters

Property nameTypeRequiredPIIDescription
accountSid
SID<AC>
required
Not PII
The SID of the Account creating the Message resource.

Pattern:
^AC[0-9a-fA-F]{32}$
Min length:
34
Max length:
34
Request body parameters

Encoding type:application/x-www-form-urlencoded
Schema
Example
Property nameTypeRequiredDescriptionChild properties
to
string<phone-number>
required
PII MTL: 120 days
The recipient's phone number in E.164 format (for SMS/MMS) or channel address, e.g. whatsapp:+15552229999.

statusCallback
string<uri>
Optional
Not PII
The URL of the endpoint to which Twilio sends Message status callback requests. URL must contain a valid hostname and underscores are not allowed. If you include this parameter with the messaging_service_sid, Twilio uses this URL instead of the Status Callback URL of the Messaging Service.

applicationSid
SID<AP>
Optional
Not PII
The SID of the associated TwiML Application. Message status callback requests are sent to the TwiML App's message_status_callback URL. Note that the status_callback parameter of a request takes priority over the application_sid parameter; if both are included application_sid is ignored.

Pattern:
^AP[0-9a-fA-F]{32}$
Min length:
34
Max length:
34
maxPrice
number
Optional
Not PII
[OBSOLETE] This parameter will no longer have any effect as of 2024-06-03.

provideFeedback
boolean
Optional
Not PII
Boolean indicating whether or not you intend to provide delivery confirmation feedback to Twilio (used in conjunction with the Message Feedback subresource). Default value is false.

attempt
integer
Optional
Not PII
Total number of attempts made (including this request) to send the message regardless of the provider used

validityPeriod
integer
Optional
Not PII
The maximum length in seconds that the Message can remain in Twilio's outgoing message queue. If a queued Message exceeds the validity_period, the Message is not sent. Accepted values are integers from 1 to 36000. Default value is 36000. A validity_period greater than 5 is recommended. Learn more about the validity period

forceDelivery
boolean
Optional
Not PII
Reserved

contentRetention
enum<string>
Optional
Not PII
Possible values:
retain
discard
addressRetention
enum<string>
Optional
Not PII
Possible values:
retain
obfuscate
smartEncoded
boolean
Optional
Not PII
Whether to detect Unicode characters that have a similar GSM-7 character and replace them. Can be: true or false.

persistentAction
array[string]
Optional
Not PII
Rich actions for non-SMS/MMS channels. Used for sending location in WhatsApp messages.

trafficType
enum<string>
Optional
Not PII
Possible values:
free
shortenUrls
boolean
Optional
Not PII
For Messaging Services with Link Shortening configured only: A Boolean indicating whether or not Twilio should shorten links in the body of the Message. Default value is false. If true, the messaging_service_sid parameter must also be provided.

scheduleType
enum<string>
Optional
Not PII
Possible values:
fixed
sendAt
string<date-time>
Optional
Not PII
The time that Twilio will send the message. Must be in ISO 8601 format.

sendAsMms
boolean
Optional
Not PII
If set to true, Twilio delivers the message as a single MMS message, regardless of the presence of media.

contentVariables
string
Optional
Not PII
For Content Editor/API only: Key-value pairs of Template variables and their substitution values. content_sid parameter must also be provided. If values are not defined in the content_variables parameter, the Template's default placeholder values are used.

riskCheck
enum<string>
Optional
Not PII
Possible values:
enable
disable
from
string<phone-number>
required if MessagingServiceSid is not passed
PII MTL: 120 days
The sender's Twilio phone number (in E.164
format), alphanumeric sender ID, Wireless SIM, short code
, or channel address (e.g., whatsapp:+15554449999). The value of the from parameter must be a sender that is hosted within Twilio and belongs to the Account creating the Message. If you are using messaging_service_sid, this parameter can be empty (Twilio assigns a from value from the Messaging Service's Sender Pool) or you can provide a specific sender from your Sender Pool.

messagingServiceSid
SID<MG>
required if From is not passed
Not PII
The SID of the Messaging Service you want to associate with the Message. When this parameter is provided and the from parameter is omitted, Twilio selects the optimal sender from the Messaging Service's Sender Pool. You may also provide a from parameter if you want to use a specific Sender from the Sender Pool.

Pattern:
^MG[0-9a-fA-F]{32}$
Min length:
34
Max length:
34
body
string
required if MediaUrl or ContentSid is not passed
PII MTL: 30 days
The text content of the outgoing message. Can be up to 1,600 characters in length. SMS only: If the body contains more than 160 GSM-7 characters (or 70 UCS-2 characters), the message is segmented and charged accordingly. For long body text, consider using the send_as_mms parameter
.

mediaUrl
array[string<uri>]
required if Body or ContentSid is not passed
Not PII
The URL of media to include in the Message content. jpeg, jpg, gif, and png file types are fully supported by Twilio and content is formatted for delivery on destination devices. The media size limit is 5 MB for supported file types (jpeg, jpg, png, gif) and 500 KB for other types of accepted media. To send more than one image in the message, provide multiple media_url parameters in the POST request. You can include up to ten media_url parameters per message. International
and carrier
limits apply.

contentSid
SID<HX>
required if Body or MediaUrl is not passed
Not PII
For Content Editor/API only: The SID of the Content Template to be used with the Message, e.g., HXXXXXXXXXXXXXXXXXXXXXXXXXXXXX. If this parameter is not provided, a Content Template is not used. Find the SID in the Console on the Content Editor page. For Content API users, the SID is found in Twilio's response when creating the Template or by fetching your Templates.

Pattern:
^HX[0-9a-fA-F]{32}$
Min length:
34
Max length:
34
Send a message with preconfigured content

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
contentSid: "HXXXXXXXX",
contentVariables: JSON.stringify({
1: "YOUR_VARIABLE1",
2: "YOURVARIABLE2",
}),
from: "MGXXXXXXXXX",
to: "whatsapp:+18005551234",
});

console.log(message.sid);
}

createMessage();
Response

Copy response
{
"account_sid": "ACXXXXXXXXX",
"api_version": "2010-04-01",
"body": "Hello! 👍",
"date_created": "Thu, 24 Aug 2023 05:01:45 +0000",
"date_sent": "Thu, 24 Aug 2023 05:01:45 +0000",
"date_updated": "Thu, 24 Aug 2023 05:01:45 +0000",
"direction": "outbound-api",
"error_code": null,
"error_message": null,
"from": "MGXXXXXXXXX",
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
"to": "whatsapp:+18005551234",
"uri": "/2010-04-01/Accounts/ACaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/Messages/SMaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.json"
}
(warning)
Warning
The From field in the POST request to the Programmable Messaging API must include a Messaging Service that includes a WhatsApp or Facebook Messenger sender.

Send templates using status callbacks

Status callback URLs can be set for all messages in a Messaging Service
(under the Integration settings for a specific Messaging Service) or when you send an individual outbound message, by including the StatusCallback parameter. To learn more about status callback URLs, see Monitor the status of your WhatsApp outbound message.

Copy code block
-d "StatusCallback=http://postb.in/1234abcd" \

Send messages scheduled ahead of time

With content templates, you can schedule SMS, MMS, and WhatsApp messages to be sent at a fixed time in the future.

Scheduling a message is free. You'll only pay for a message once it's sent.

To learn more, see message scheduling.

Copy code block
--data-urlencode "SendAt=2021-11-30T20:36:27Z" \
--data-urlencode "ScheduleType=fixed" \
Send scheduled messages

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
contentSid: "HXXXXXXXXXXXXXXX",
contentVariables: JSON.stringify({
1: "YOUR_VARIABLE1",
2: "YOURVARIABLE2",
}),
messagingServiceSid: "MGXXXXXXXXXXX",
scheduleType: "fixed",
sendAt: new Date("2023-11-30 20:36:27"),
to: "whatsapp:+18005551234",
});

console.log(message.body);
}

createMessage();
Response

Copy response
{
"account_sid": "ACXXXXXXXXXX",
"api_version": "2010-04-01",
"body": "Hello! 👍",
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
"messaging_service_sid": "MGXXXXXXXXXXX",
"sid": "SMaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
"status": "queued",
"subresource_uris": {
"media": "/2010-04-01/Accounts/ACaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/Messages/SMaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/Media.json"
},
"tags": {
"campaign_name": "Spring Sale 2022",
"message_type": "cart_abandoned"
},
"to": "whatsapp:+18005551234",
"uri": "/2010-04-01/Accounts/ACaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/Messages/SMaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.json"
}
Template status change alerts

Twilio supports error codes for "Alarms", "Rejected", and "Paused" WhatsApp Templates. With Twilio Alarms, you can receive webhook or email notifications when errors occur. Approved alarms are also available as a Beta feature.

For more information, see alerts for Rejected and Paused WhatsApp Templates
.
