-- Migration: Add conversation states for campaign integration
-- Purpose: Support conversation visibility states (active/dormant) and campaign tracking
-- Date: 2025-07-19

-- Add new columns to conversations table
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS visibility_status TEXT DEFAULT 'active' 
    CHECK (visibility_status IN ('active', 'dormant')),
ADD COLUMN IF NOT EXISTS created_by_campaign UUID REFERENCES campaigns(id);

-- Create index for visibility status filtering (performance optimization)
CREATE INDEX IF NOT EXISTS idx_conversations_visibility_status 
ON conversations (visibility_status);

-- Create index for campaign tracking
CREATE INDEX IF NOT EXISTS idx_conversations_created_by_campaign 
ON conversations (created_by_campaign) 
WHERE created_by_campaign IS NOT NULL;

-- Update existing conversations to have 'active' visibility status
UPDATE conversations 
SET visibility_status = 'active' 
WHERE visibility_status IS NULL;

-- Add comment explaining the new columns
COMMENT ON COLUMN conversations.visibility_status IS 
'Visibility state: active (shown in main UI), dormant (hidden until customer replies)';

COMMENT ON COLUMN conversations.created_by_campaign IS 
'Reference to campaign that created this conversation (NULL for regular conversations)';