-- Migration: Create table for storing raw Twilio webhook payloads
CREATE TABLE IF NOT EXISTS public.twilio_webhook_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE,
    received_at timestamp with time zone DEFAULT now(),
    payload jsonb NOT NULL,
    webhook_type text DEFAULT 'status', -- e.g. 'status', 'incoming', etc
    message_sid text,
    raw_headers jsonb
);

CREATE INDEX IF NOT EXISTS idx_twilio_webhook_logs_campaign_id ON public.twilio_webhook_logs (campaign_id);
CREATE INDEX IF NOT EXISTS idx_twilio_webhook_logs_received_at ON public.twilio_webhook_logs (received_at DESC); 