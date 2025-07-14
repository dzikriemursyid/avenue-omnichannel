# Campaign Progress Tracking System

This document explains the real-time campaign progress tracking system that monitors WhatsApp message delivery status through Twilio webhooks.

## Overview

The campaign progress tracking system provides real-time analytics for WhatsApp campaigns by:

1. **Webhook Integration**: Receives status updates from Twilio for each message
2. **Database Analytics**: Stores and calculates delivery statistics in real-time
3. **UI Updates**: Shows live progress updates in the dashboard
4. **Auto-refresh**: Automatically refreshes running campaigns every 30 seconds

## System Architecture

### Database Schema

#### `campaigns` Table

- Stores campaign metadata and status
- Status: `draft`, `scheduled`, `running`, `completed`, `paused`, `failed`

#### `campaign_messages` Table

- Tracks individual message delivery status
- Links to campaigns and contacts
- Stores Twilio message SID for webhook correlation

#### `campaign_analytics` Table

- Aggregated campaign statistics
- Real-time delivery rates and read rates
- Updated by webhook callbacks

### Webhook Flow

```mermaid
graph TD
    A[Campaign Sent] --> B[Twilio Processes Message]
    B --> C[Status Update: queued/sent/delivered/read/failed]
    C --> D[Twilio Webhook Call]
    D --> E[/api/webhooks/twilio]
    E --> F[Update campaign_messages]
    F --> G[Update campaign_analytics]
    G --> H[Mark Campaign Complete if Done]
    H --> I[UI Auto-refresh Shows Update]
```

## Webhook Implementation

### Endpoint: `/api/webhooks/twilio`

**URL**: `https://webhook.dzynthesis.dev/webhook/twilio/status`

The webhook handler processes Twilio status callbacks and updates the database:

```javascript
// Status mapping
const messageStatusMap = {
  queued: "pending",
  sent: "sent",
  delivered: "delivered",
  read: "read",
  failed: "failed",
  undelivered: "failed",
};
```

### Webhook Data Processing

1. **Parse Form Data**: Extract Twilio parameters from form-encoded request
2. **Find Message**: Locate campaign message by MessageSid
3. **Update Status**: Update message status and timestamps
4. **Calculate Analytics**: Aggregate statistics for the campaign
5. **Check Completion**: Mark campaign as completed if all messages processed

### Analytics Calculation

```javascript
const deliveryRate = totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100 * 100) / 100 : 0;

const readRate = totalDelivered > 0 ? Math.round((totalRead / totalDelivered) * 100 * 100) / 100 : 0;
```

## UI Components

### Campaign Overview (`campaign-overview-optimized.tsx`)

**Features**:

- Real-time analytics cards showing total sent, delivered, read, and failed messages
- Auto-refresh every 30 seconds for running campaigns
- Live indicators for running campaigns
- Enhanced progress bars with detailed statistics

**Key Metrics**:

- Total Campaigns: Count of all campaigns
- Messages Sent: Total messages sent across all campaigns
- Delivered: Messages successfully delivered with delivery rate
- Read: Messages read by recipients with read rate
- Failed: Failed messages with failure rate

### Campaign Details (`campaign-details-with-analytics.tsx`)

**Features**:

- Detailed real-time progress tracking
- Individual message status breakdown
- Auto-refresh every 15 seconds for running campaigns
- Message-level analytics with timestamps

**Analytics Displayed**:

- Overall campaign progress
- Delivery rate progress bar
- Read rate progress bar
- Success rate (non-failed messages)
- Recent message status updates

## API Endpoints

### Get Campaigns List

```
GET /api/dashboard/campaigns
```

Returns campaigns with embedded analytics data.

### Get Campaign Details

```
GET /api/dashboard/campaigns/{id}
```

Returns individual campaign with full analytics.

### Get Campaign Messages

```
GET /api/dashboard/campaigns/{id}/messages
```

Returns message-level status information.

## Real-time Features

### Auto-refresh Behavior

**Campaign Overview**:

- Refreshes every 30 seconds if running campaigns exist
- Can be toggled on/off by user
- Shows live indicator for running campaigns

**Campaign Details**:

- Refreshes every 15 seconds for running campaigns
- More frequent updates for detailed monitoring
- Shows real-time message status changes

### Status Indicators

- **Draft**: Clock icon, gray badge
- **Scheduled**: Calendar icon, blue badge
- **Running**: Send icon, green badge with pulse animation
- **Completed**: CheckCircle icon, purple badge
- **Paused**: AlertCircle icon, yellow badge
- **Failed**: XCircle icon, red badge

## Testing the System

### 1. Create Test Campaign

```bash
# Create a campaign through the dashboard
# Use a small contact group for testing
```

### 2. Monitor Webhook Logs

```bash
# Watch the Next.js development server logs
pnpm dev

# Look for webhook status updates:
# 📤 Message queued for delivery
# ✈️ Message sent to WhatsApp
# ✅ Message delivered to recipient
# 👁️ Message read by recipient
```

### 3. Verify Analytics Updates

```bash
# Run the test script
cd docs/example
node test-campaign-progress.js
```

### 4. Check UI Updates

1. Open campaign overview page
2. Send a campaign
3. Watch for real-time updates
4. Verify progress bars update
5. Check campaign details page for detailed analytics

## Troubleshooting

### Common Issues

1. **Webhook not receiving calls**:

   - Check tunnel is running: `cloudflared tunnel run avenue-webhook`
   - Verify webhook URL in Twilio console
   - Check firewall settings

2. **Analytics not updating**:

   - Check webhook logs for errors
   - Verify campaign_messages table has correct message_sid
   - Check campaign_analytics table for updates

3. **UI not refreshing**:
   - Verify auto-refresh is enabled
   - Check browser console for errors
   - Ensure campaigns have 'running' status

### Debug Commands

```bash
# Check webhook endpoint
curl https://webhook.dzynthesis.dev/webhook/twilio/status

# Test webhook with sample data
curl -X POST https://webhook.dzynthesis.dev/webhook/twilio/status \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "MessageSid=SM_test&MessageStatus=delivered&From=whatsapp:+1234567890&To=whatsapp:+0987654321"

# Check campaign analytics in database
psql -h your-db-host -d your-db -c "SELECT * FROM campaign_analytics ORDER BY updated_at DESC LIMIT 5;"
```

## Best Practices

### Campaign Management

1. **Test with Small Groups**: Always test campaigns with small contact groups first
2. **Monitor Webhook Logs**: Watch the terminal for webhook status updates
3. **Check Analytics**: Verify analytics match expected delivery rates
4. **Handle Failures**: Monitor failed messages and investigate causes

### Performance Optimization

1. **Auto-refresh Control**: Users can disable auto-refresh to reduce server load
2. **Efficient Queries**: Analytics queries are optimized with proper indexes
3. **Batch Updates**: Webhook updates are processed efficiently
4. **Caching**: Consider implementing Redis caching for high-volume campaigns

### Security Considerations

1. **Webhook Validation**: Consider adding Twilio signature validation
2. **Rate Limiting**: Implement rate limiting on webhook endpoints
3. **Authentication**: All API endpoints require proper authentication
4. **Data Validation**: All webhook data is validated before processing

## Future Enhancements

1. **Real-time WebSocket Updates**: Push updates to UI without polling
2. **Campaign Scheduling**: Enhanced scheduling with timezone support
3. **Advanced Analytics**: Delivery time analysis, retry logic
4. **Bulk Operations**: Pause/resume multiple campaigns
5. **Export Features**: Export campaign analytics to CSV/PDF
6. **Notification System**: Email/SMS alerts for campaign completion

## Conclusion

The campaign progress tracking system provides comprehensive real-time monitoring of WhatsApp campaigns through Twilio webhook integration. It offers detailed analytics, automatic status updates, and a responsive UI that keeps users informed about their campaign performance.

The system is designed to be scalable, reliable, and user-friendly, making it easy to monitor campaign progress and analyze delivery performance in real-time.
