-- Create campaigns table
CREATE TABLE IF NOT EXISTS "public"."campaigns" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "name" text NOT NULL,
    "description" text,
    "template_id" uuid REFERENCES message_templates(id),
    "target_segments" uuid[],
    "schedule_type" text NOT NULL CHECK (schedule_type IN ('immediate', 'scheduled', 'recurring')),
    "scheduled_at" timestamp with time zone,
    "recurring_config" jsonb,
    "status" text DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'running', 'completed', 'paused', 'failed')),
    "created_by" uuid REFERENCES profiles(id),
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now()
);

-- Add primary key (only if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'campaigns_pkey' 
        AND conrelid = 'public.campaigns'::regclass
    ) THEN
        ALTER TABLE ONLY "public"."campaigns"
            ADD CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id");
    END IF;
END $$;

-- Add indexes (only if they don't exist)
CREATE INDEX IF NOT EXISTS "idx_campaigns_created_by" ON "public"."campaigns" USING btree ("created_by");
CREATE INDEX IF NOT EXISTS "idx_campaigns_status" ON "public"."campaigns" USING btree ("status");
CREATE INDEX IF NOT EXISTS "idx_campaigns_scheduled_at" ON "public"."campaigns" USING btree ("scheduled_at");

-- Add updated_at trigger
CREATE OR REPLACE TRIGGER "update_campaigns_updated_at" 
    BEFORE UPDATE ON "public"."campaigns" 
    FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

-- Create campaign_messages table for tracking message delivery
CREATE TABLE IF NOT EXISTS "public"."campaign_messages" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "campaign_id" uuid REFERENCES campaigns(id) ON DELETE CASCADE,
    "contact_id" uuid REFERENCES contacts(id) ON DELETE CASCADE,
    "message_sid" text, -- Twilio message SID
    "phone_number" text NOT NULL,
    "template_data" jsonb, -- Personalized template variables
    "status" text DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
    "error_message" text,
    "sent_at" timestamp with time zone,
    "delivered_at" timestamp with time zone,
    "read_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT now(),
    
    UNIQUE(campaign_id, contact_id)
);

-- Add primary key for campaign_messages (only if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'campaign_messages_pkey' 
        AND conrelid = 'public.campaign_messages'::regclass
    ) THEN
        ALTER TABLE ONLY "public"."campaign_messages"
            ADD CONSTRAINT "campaign_messages_pkey" PRIMARY KEY ("id");
    END IF;
END $$;

-- Add indexes for campaign_messages (only if they don't exist)
CREATE INDEX IF NOT EXISTS "idx_campaign_messages_campaign_id" ON "public"."campaign_messages" USING btree ("campaign_id");
CREATE INDEX IF NOT EXISTS "idx_campaign_messages_contact_id" ON "public"."campaign_messages" USING btree ("contact_id");
CREATE INDEX IF NOT EXISTS "idx_campaign_messages_status" ON "public"."campaign_messages" USING btree ("status");
CREATE INDEX IF NOT EXISTS "idx_campaign_messages_message_sid" ON "public"."campaign_messages" USING btree ("message_sid");

-- Create campaign_analytics table for performance tracking
CREATE TABLE IF NOT EXISTS "public"."campaign_analytics" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "campaign_id" uuid REFERENCES campaigns(id) ON DELETE CASCADE,
    "total_sent" integer DEFAULT 0,
    "total_delivered" integer DEFAULT 0,
    "total_read" integer DEFAULT 0,
    "total_failed" integer DEFAULT 0,
    "delivery_rate" decimal(5,2) DEFAULT 0,
    "read_rate" decimal(5,2) DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now(),
    
    UNIQUE(campaign_id)
);

-- Add primary key for campaign_analytics (only if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'campaign_analytics_pkey' 
        AND conrelid = 'public.campaign_analytics'::regclass
    ) THEN
        ALTER TABLE ONLY "public"."campaign_analytics"
            ADD CONSTRAINT "campaign_analytics_pkey" PRIMARY KEY ("id");
    END IF;
END $$;

-- Add indexes for campaign_analytics (only if they don't exist)
CREATE INDEX IF NOT EXISTS "idx_campaign_analytics_campaign_id" ON "public"."campaign_analytics" USING btree ("campaign_id");

-- Add updated_at trigger for campaign_analytics
CREATE OR REPLACE TRIGGER "update_campaign_analytics_updated_at" 
    BEFORE UPDATE ON "public"."campaign_analytics" 
    FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

-- Add RLS policies for campaigns
ALTER TABLE "public"."campaigns" ENABLE ROW LEVEL SECURITY;

-- Users can view campaigns based on their role and team
DROP POLICY IF EXISTS "Users can view campaigns" ON campaigns;
CREATE POLICY "Users can view campaigns" ON campaigns
    FOR SELECT USING (
        get_current_user_role() IN ('admin', 'general_manager') OR
        (get_current_user_role() IN ('leader', 'agent') AND 
         created_by IN (
             SELECT id FROM profiles 
             WHERE team_id = get_current_user_team()
         ))
    );

-- Leaders and above can create campaigns
DROP POLICY IF EXISTS "Leaders and above can create campaigns" ON campaigns;
CREATE POLICY "Leaders and above can create campaigns" ON campaigns
    FOR INSERT WITH CHECK (
        get_current_user_role() IN ('admin', 'general_manager', 'leader')
    );

-- Campaign creators and admins can update
DROP POLICY IF EXISTS "Campaign creators and admins can update" ON campaigns;
CREATE POLICY "Campaign creators and admins can update" ON campaigns
    FOR UPDATE USING (
        get_current_user_role() IN ('admin', 'general_manager') OR
        created_by = auth.uid()
    );

-- Add RLS policies for campaign_messages
ALTER TABLE "public"."campaign_messages" ENABLE ROW LEVEL SECURITY;

-- Users can view campaign messages for campaigns they have access to
DROP POLICY IF EXISTS "Users can view campaign messages" ON campaign_messages;
CREATE POLICY "Users can view campaign messages" ON campaign_messages
    FOR SELECT USING (
        campaign_id IN (
            SELECT id FROM campaigns WHERE (
                get_current_user_role() IN ('admin', 'general_manager') OR
                (get_current_user_role() IN ('leader', 'agent') AND 
                 created_by IN (
                     SELECT id FROM profiles 
                     WHERE team_id = get_current_user_team()
                 ))
            )
        )
    );

-- System can insert campaign messages (for webhooks)
DROP POLICY IF EXISTS "System can insert campaign messages" ON campaign_messages;
CREATE POLICY "System can insert campaign messages" ON campaign_messages
    FOR INSERT WITH CHECK (true);

-- System can update campaign messages (for webhooks)
DROP POLICY IF EXISTS "System can update campaign messages" ON campaign_messages;
CREATE POLICY "System can update campaign messages" ON campaign_messages
    FOR UPDATE USING (true);

-- Add RLS policies for campaign_analytics
ALTER TABLE "public"."campaign_analytics" ENABLE ROW LEVEL SECURITY;

-- Users can view campaign analytics for campaigns they have access to
DROP POLICY IF EXISTS "Users can view campaign analytics" ON campaign_analytics;
CREATE POLICY "Users can view campaign analytics" ON campaign_analytics
    FOR SELECT USING (
        campaign_id IN (
            SELECT id FROM campaigns WHERE (
                get_current_user_role() IN ('admin', 'general_manager') OR
                (get_current_user_role() IN ('leader', 'agent') AND 
                 created_by IN (
                     SELECT id FROM profiles 
                     WHERE team_id = get_current_user_team()
                 ))
            )
        )
    );

-- System can insert/update campaign analytics
DROP POLICY IF EXISTS "System can manage campaign analytics" ON campaign_analytics;
CREATE POLICY "System can manage campaign analytics" ON campaign_analytics
    FOR ALL USING (true); 