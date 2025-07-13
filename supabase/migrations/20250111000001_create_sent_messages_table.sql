-- Create sent_messages table for tracking template sends
CREATE TABLE sent_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES message_templates(id) ON DELETE CASCADE,
    recipient TEXT NOT NULL,
    message_sid TEXT,
    status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'delivered', 'read')),
    error_message TEXT,
    variables JSONB,
    sent_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    is_test BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_sent_messages_template_id ON sent_messages(template_id);
CREATE INDEX idx_sent_messages_recipient ON sent_messages(recipient);
CREATE INDEX idx_sent_messages_sent_by ON sent_messages(sent_by);
CREATE INDEX idx_sent_messages_sent_at ON sent_messages(sent_at);
CREATE INDEX idx_sent_messages_status ON sent_messages(status);
CREATE INDEX idx_sent_messages_message_sid ON sent_messages(message_sid);

-- Add RLS policies
ALTER TABLE sent_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view sent messages they sent or if they have appropriate permissions
CREATE POLICY "Users can view sent messages" ON sent_messages
    FOR SELECT
    USING (
        sent_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'general_manager', 'leader')
        )
    );

-- Policy: Users can insert sent messages if they have campaign management permissions
CREATE POLICY "Users can insert sent messages" ON sent_messages
    FOR INSERT
    WITH CHECK (
        sent_by = auth.uid() AND
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'general_manager', 'leader')
        )
    );

-- Policy: Users can update sent messages they sent (for status updates)
CREATE POLICY "Users can update sent messages" ON sent_messages
    FOR UPDATE
    USING (
        sent_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'general_manager')
        )
    );

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_sent_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_sent_messages_updated_at
    BEFORE UPDATE ON sent_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_sent_messages_updated_at();

-- Add usage_count and last_used_at columns to message_templates table if they don't exist
ALTER TABLE message_templates 
ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMP WITH TIME ZONE;

-- Create index on usage_count for analytics
CREATE INDEX IF NOT EXISTS idx_message_templates_usage_count ON message_templates(usage_count);
CREATE INDEX IF NOT EXISTS idx_message_templates_last_used_at ON message_templates(last_used_at);