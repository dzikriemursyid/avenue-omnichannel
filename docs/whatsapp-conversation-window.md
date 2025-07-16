# WhatsApp 24-Hour Conversation Window Implementation

This document describes the implementation of WhatsApp's 24-hour conversation window policy in our chat system.

## Overview

WhatsApp Business API enforces a 24-hour conversation window policy:
- When a customer sends a message, it opens a 24-hour window for free-form messaging
- During this window, businesses can send any type of message
- After 24 hours of customer inactivity, only approved template messages can be sent
- If a customer sends another message, the 24-hour window resets

## Database Schema

### New Fields Added to `conversations` Table

```sql
-- Tracks when the last customer message was received
last_customer_message_at TIMESTAMPTZ

-- When the current conversation window expires (last_customer_message_at + 24 hours)
conversation_window_expires_at TIMESTAMPTZ

-- Boolean flag for quick checking if conversation is within the window
is_within_window BOOLEAN DEFAULT true
```

### Removed Fields

```sql
-- Removed since we only have one agent handling WhatsApp
assigned_agent (REMOVED)
assigned_agent_id (REMOVED)
```

## Implementation Components

### 1. Database Triggers

**`update_conversation_window()` Function**
- Automatically updates window timestamps when customer sends a message
- Reopens closed conversations when customer messages arrive
- Only triggers on inbound messages (direction = 'inbound')

**Trigger Setup**
```sql
CREATE TRIGGER trigger_update_conversation_window
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_window();
```

### 2. Auto-Close Function

**`close_expired_conversations()` Function**
- Automatically closes conversations where window has expired
- Returns count of closed conversations
- Can be called manually or via cron job

### 3. API Endpoints

**POST `/api/conversations/auto-close`**
- Calls the auto-close function
- Protected with optional CRON_SECRET
- Returns count of closed conversations

**GET `/api/conversations/auto-close`**
- Returns conversations that are expiring soon or already expired
- Useful for monitoring and debugging

### 4. Enhanced Message Sending

**Validation Checks**
- Prevents sending messages to closed conversations
- Prevents sending messages when window has expired
- Returns specific error codes for different scenarios

**Error Codes**
- `CONVERSATION_CLOSED`: Conversation is marked as closed
- `WINDOW_EXPIRED`: 24-hour window has expired

### 5. UI Enhancements

**Conversation List**
- Shows window status indicator (Active/Expired)
- Removed assigned agent information

**Chat Interface**
- Window status badge in chat header
- Enhanced closed conversation warning with explanation
- Clear messaging about 24-hour policy

## Operational Workflow

### Automatic Process Flow

1. **Customer sends message** → Trigger updates window timestamps → Conversation reopened if closed
2. **24 hours pass** → Auto-close job runs → Conversation marked as closed
3. **Agent tries to send** → Validation prevents sending → Error returned
4. **Customer sends again** → Window resets → Conversation reopens

### Manual Operations

**Testing Window Logic**
```bash
node scripts/test-conversation-window.js
```

**Manual Close Expired Conversations**
```sql
SELECT close_expired_conversations();
```

**Check Window Status**
```sql
SELECT 
  id,
  status,
  is_within_window,
  conversation_window_expires_at,
  last_customer_message_at
FROM conversations
WHERE last_customer_message_at IS NOT NULL;
```

## Deployment Steps

### 1. Database Migration
```bash
# Run the migration to add new fields and functions
psql -f supabase/migrations/20250716_add_conversation_window_tracking.sql
```

### 2. Environment Variables
```bash
# Optional: Add cron secret for API protection
CRON_SECRET=your-secure-secret-here
```

### 3. Cron Job Setup
```bash
# Add to crontab to run every 15 minutes
*/15 * * * * curl -X POST -H "Authorization: Bearer YOUR_CRON_SECRET" https://yourdomain.com/api/conversations/auto-close
```

### 4. Application Deployment
- Deploy updated API endpoints
- Deploy updated UI components
- Test with real WhatsApp messages

## Monitoring and Maintenance

### Key Metrics to Monitor

1. **Window Compliance Rate**: % of messages sent within valid windows
2. **Auto-Close Frequency**: How many conversations are auto-closed daily
3. **Reopen Rate**: How often customers reopen closed conversations

### Regular Maintenance

1. **Weekly Review**: Check for conversations stuck in invalid states
2. **Performance Monitoring**: Ensure triggers and functions perform well
3. **Error Monitoring**: Watch for WINDOW_EXPIRED and CONVERSATION_CLOSED errors

### Troubleshooting

**Common Issues:**

1. **Conversations not auto-closing**
   - Check if cron job is running
   - Verify database function permissions
   - Check conversation_window_expires_at values

2. **Window not resetting on customer messages**
   - Verify trigger is active
   - Check if messages are marked as direction='inbound'
   - Ensure webhook is calling update properly

3. **UI showing wrong window status**
   - Refresh conversation data
   - Check if is_within_window field is updated
   - Verify API endpoints return correct fields

## Testing Scenarios

### 1. Happy Path Testing
- Customer sends message → Window opens (24 hours)
- Agent responds within window → Message sent successfully
- 24 hours pass → Conversation auto-closes
- Customer sends again → Conversation reopens

### 2. Edge Case Testing
- Multiple customer messages in sequence → Window keeps extending
- Conversation manually closed → Customer message reopens it
- Agent tries to send after expiry → Proper error returned

### 3. Performance Testing
- Large number of conversations → Auto-close function performance
- High message volume → Trigger performance
- Concurrent window updates → Data consistency

## Future Enhancements

1. **Template Message Support**: Add ability to send approved templates after window expires
2. **Window Warning**: Notify agents when window is about to expire
3. **Analytics Dashboard**: Visual representation of window statistics
4. **Custom Window Duration**: Support for different window durations per contact type
5. **Grace Period**: Optional short grace period before auto-closing

## WhatsApp Policy Compliance

This implementation ensures compliance with WhatsApp Business API policies:
- ✅ Respects 24-hour conversation window
- ✅ Prevents unauthorized messaging outside window
- ✅ Properly handles window resets on customer activity
- ✅ Maintains conversation state accurately
- ✅ Provides clear error messaging for policy violations

For the latest WhatsApp Business API policies, refer to the [official WhatsApp documentation](https://developers.facebook.com/docs/whatsapp/pricing).