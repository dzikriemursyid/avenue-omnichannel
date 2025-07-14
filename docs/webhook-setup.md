# Twilio WhatsApp Webhook Setup Guide

This guide explains how to set up and test Twilio WhatsApp webhooks for receiving message status callbacks.

## Overview

The webhook system allows your application to receive real-time updates about message delivery status from Twilio. When you send a WhatsApp message through your campaign system, Twilio will send status updates to your webhook endpoint.

## Webhook Endpoint

**URL:** `https://webhook.dzynthesis.dev/webhook/twilio/status`
**Local URL:** `http://localhost:3000/api/webhooks/twilio`

## Supported Message Statuses

- `queued` - Message has been queued for delivery
- `sent` - Message has been sent to WhatsApp
- `delivered` - Message has been delivered to the recipient
- `read` - Message has been read by the recipient
- `failed` - Message delivery failed
- `undelivered` - Message could not be delivered

## Setup Steps

### 1. Environment Configuration

Make sure your `.env.local` file contains:

```env
TWILIO_WEBHOOK_URL='https://webhook.dzynthesis.dev/webhook/twilio/status'
```

### 2. Tunnel Setup

Start your tunnel to forward webhook calls to your local development server:

```bash
# In a separate terminal, run your tunnel to port 3001
# This should forward to https://webhook.dzynthesis.dev
```

### 3. Next.js Development Server

Start your Next.js application:

```bash
pnpm dev
```

Your webhook endpoint will be available at `http://localhost:3000/api/webhooks/twilio`

## How It Works

### 1. Message Sending

When you send a campaign message, the system:

- Calls Twilio API with `statusCallback` parameter
- Stores the message in `campaign_messages` table with status `sent`
- Twilio begins processing the message

### 2. Status Updates

As the message progresses through Twilio's system:

- Twilio sends POST requests to your webhook endpoint
- Each request contains the message SID and new status
- Your webhook updates the database and analytics

### 3. Database Updates

The webhook automatically:

- Updates `campaign_messages` table with new status
- Updates `campaign_analytics` with aggregated statistics
- Marks campaigns as `completed` when all messages are processed

## Testing

### Test the Webhook Endpoint

1. **Test GET endpoint:**

   ```bash
   curl https://webhook.dzynthesis.dev/webhook/twilio/status
   ```

2. **Test with sample data:**
   ```bash
   cd docs/example
   node test-webhook.js
   ```

### Test with Real Campaign

1. Create a campaign in the dashboard
2. Send the campaign
3. Monitor the webhook logs for status updates
4. Check the campaign analytics for updated statistics

## Webhook Data Structure

Twilio sends the following data in POST requests:

```json
{
  "MessageSid": "SM1234567890abcdef1234567890abcdef",
  "MessageStatus": "delivered",
  "From": "whatsapp:+6281234567890",
  "To": "whatsapp:+628979118504",
  "Body": "Your message content",
  "ApiVersion": "2010-04-01",
  "AccountSid": "YOUR_TWILIO_ACCOUNT_SID",
  "ErrorCode": "30008", // Only present if status is 'failed'
  "ErrorMessage": "Unknown error" // Only present if status is 'failed'
}
```

## Database Schema

### campaign_messages Table

- `message_sid` - Twilio message SID (unique identifier)
- `status` - Current message status
- `sent_at` - When message was sent
- `delivered_at` - When message was delivered
- `read_at` - When message was read
- `error_message` - Error details if failed

### campaign_analytics Table

- `campaign_id` - Campaign identifier
- `total_sent` - Total messages sent
- `total_delivered` - Total messages delivered
- `total_read` - Total messages read
- `total_failed` - Total messages failed
- `delivery_rate` - Delivery success percentage
- `read_rate` - Read rate percentage

## Troubleshooting

### Common Issues

1. **Webhook not receiving calls:**

   - Check that your tunnel is running
   - Verify the webhook URL is correct
   - Check Twilio console for webhook failures

2. **Database not updating:**

   - Check the webhook logs for errors
   - Verify the message SID exists in campaign_messages
   - Check database permissions

3. **Analytics not updating:**
   - Verify campaign_analytics table exists
   - Check for database constraint errors
   - Review the analytics calculation logic

### Debug Logging

The webhook includes comprehensive logging:

- All incoming webhook data
- Database query results
- Status mapping information
- Analytics calculations
- Error messages

Monitor your application logs to see webhook activity in real-time.

## Security Considerations

- The webhook endpoint is publicly accessible
- Consider implementing Twilio signature validation for production
- Monitor webhook logs for unusual activity
- Implement rate limiting if needed

## Next Steps

1. Set up your tunnel to forward to port 3001
2. Start your Next.js development server
3. Test the webhook endpoint with the test script
4. Send a real campaign and monitor the webhook logs
5. Verify that campaign analytics are updating correctly
