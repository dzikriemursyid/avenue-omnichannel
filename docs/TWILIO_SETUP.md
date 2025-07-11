# Twilio WhatsApp Setup Guide

## Prerequisites

1. Twilio Account with WhatsApp Business API access
2. Verified WhatsApp Business Number
3. Approved WhatsApp message templates

## Environment Variables

Add these to your `.env.local` file:

```bash
# Twilio Configuration
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_WHATSAPP_FROM=whatsapp:+628979118504  # Your WhatsApp Business number
TWILIO_WEBHOOK_URL=https://your-domain.com/api/webhooks/twilio
```

## Setup Steps

### 1. Configure Webhook in Twilio Console

1. Go to [Twilio Console](https://console.twilio.com)
2. Navigate to Messaging > Settings > WhatsApp senders
3. Select your WhatsApp sender
4. Configure the webhook URL:
   - **Status Callback URL**: `https://your-domain.com/api/webhooks/twilio`

### 2. Create WhatsApp Templates

1. Go to [Content Template Builder](https://console.twilio.com/us1/content/content-templates)
2. Create a new template
3. Select WhatsApp as the channel
4. Configure your template:
   - **Name**: Your template name
   - **Category**: Marketing/Utility/Authentication
   - **Language**: Indonesian (id)
   - **Content**: Your message with variables like {{1}}, {{2}}
5. Submit for approval
6. Once approved, note the Content SID (starts with HX...)

### 3. Database Setup

Ensure your database has the required tables:

```sql
-- Message templates table
CREATE TABLE message_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    template_id TEXT NOT NULL, -- Twilio Content SID
    category TEXT NOT NULL,
    language_code TEXT NOT NULL DEFAULT 'id',
    header_text TEXT,
    body_text TEXT NOT NULL,
    footer_text TEXT,
    button_config JSONB,
    variables TEXT[], -- Template variables
    status TEXT DEFAULT 'pending',
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Campaign messages tracking
CREATE TABLE campaign_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES campaigns(id),
    contact_id UUID REFERENCES contacts(id),
    message_sid TEXT,
    phone_number TEXT NOT NULL,
    template_data JSONB,
    status TEXT DEFAULT 'pending',
    error_message TEXT,
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4. Test Your Setup

1. Create a test campaign
2. Add test contacts (make sure phone numbers are in E.164 format: +628xxx)
3. Send the campaign
4. Monitor the webhook logs

## API Endpoints

### Send Campaign

```bash
POST /api/campaigns/{campaignId}/send
Content-Type: application/json

{
  "batchSize": 50,
  "delayBetweenBatches": 1000
}
```

### Webhook Handler

```
POST /api/webhooks/twilio
```

Twilio will send status updates to this endpoint automatically.

## Troubleshooting

### Common Issues

1. **Template not approved**: Ensure your WhatsApp template is approved in Twilio Console
2. **Invalid phone number**: Phone numbers must be in E.164 format with country code
3. **Rate limiting**: Adjust `batchSize` and `delayBetweenBatches` if hitting rate limits
4. **Webhook not receiving updates**: Check your webhook URL is publicly accessible

### Debug Mode

Enable debug logging by setting:

```javascript
// In your campaign sender
console.log("Sending message:", {
  contentSid: template.template_id,
  contentVariables,
  to: formatWhatsAppNumber(contact.phone_number),
});
```

## Best Practices

1. **Batch Processing**: Send messages in batches to avoid rate limiting
2. **Error Handling**: Always record failed messages for retry
3. **Template Variables**: Ensure all required variables are provided
4. **Phone Validation**: Validate phone numbers before sending
5. **Status Tracking**: Monitor delivery and read rates

## Security

1. Never expose your `TWILIO_AUTH_TOKEN` in client-side code
2. Validate webhook requests are from Twilio (optional but recommended)
3. Use environment variables for all sensitive configuration
4. Implement rate limiting on your API endpoints
