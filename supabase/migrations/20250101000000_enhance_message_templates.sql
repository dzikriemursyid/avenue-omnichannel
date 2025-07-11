-- Migration: Enhance message_templates table for better Twilio integration
-- Date: 2025-01-01
-- Description: Add fields to better support Twilio Content API integration

-- Add new fields for enhanced Twilio integration
ALTER TABLE message_templates 
ADD COLUMN IF NOT EXISTS twilio_approval_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS twilio_approval_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS template_type TEXT DEFAULT 'text' CHECK (template_type IN ('text', 'card', 'media')),
ADD COLUMN IF NOT EXISTS media_urls TEXT[],
ADD COLUMN IF NOT EXISTS twilio_metadata JSONB DEFAULT '{}';

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_message_templates_status 
    ON message_templates(status);

CREATE INDEX IF NOT EXISTS idx_message_templates_category 
    ON message_templates(category);

CREATE INDEX IF NOT EXISTS idx_message_templates_twilio_status 
    ON message_templates(twilio_approval_status);

CREATE INDEX IF NOT EXISTS idx_message_templates_template_type 
    ON message_templates(template_type);

-- Add comments for documentation
COMMENT ON COLUMN message_templates.twilio_approval_status IS 'Twilio approval status: pending, approved, rejected';
COMMENT ON COLUMN message_templates.twilio_approval_date IS 'Date when template was approved/rejected by Twilio';
COMMENT ON COLUMN message_templates.template_type IS 'Template type: text, card, media';
COMMENT ON COLUMN message_templates.media_urls IS 'Array of media URLs for media templates';
COMMENT ON COLUMN message_templates.twilio_metadata IS 'Additional Twilio metadata (approval links, etc.)';

-- Update existing templates to have proper template_type
UPDATE message_templates 
SET template_type = CASE 
    WHEN button_config IS NOT NULL AND jsonb_array_length(button_config) > 0 THEN 'card'
    WHEN media_urls IS NOT NULL AND array_length(media_urls, 1) > 0 THEN 'media'
    ELSE 'text'
END
WHERE template_type = 'text';

-- Set twilio_approval_status for existing templates
UPDATE message_templates 
SET twilio_approval_status = 'approved', 
    twilio_approval_date = created_at
WHERE template_id IS NOT NULL AND template_id != '';

-- Create function to extract template type from Twilio data
CREATE OR REPLACE FUNCTION extract_template_type(twilio_types JSONB)
RETURNS TEXT AS $$
BEGIN
    IF twilio_types ? 'twilio/card' THEN
        RETURN 'card';
    ELSIF twilio_types ? 'twilio/media' THEN
        RETURN 'media';
    ELSE
        RETURN 'text';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create function to extract media URLs from Twilio data
CREATE OR REPLACE FUNCTION extract_media_urls(twilio_types JSONB)
RETURNS TEXT[] AS $$
DECLARE
    media_urls TEXT[] := '{}';
    template_type TEXT;
    media_data JSONB;
BEGIN
    -- Check each template type for media
    FOR template_type IN SELECT jsonb_object_keys(twilio_types)
    LOOP
        media_data := twilio_types -> template_type -> 'media';
        IF media_data IS NOT NULL AND jsonb_typeof(media_data) = 'array' THEN
            SELECT array_cat(media_urls, ARRAY(
                SELECT jsonb_array_elements_text(media_data)
            )) INTO media_urls;
        END IF;
    END LOOP;
    
    RETURN media_urls;
END;
$$ LANGUAGE plpgsql; 