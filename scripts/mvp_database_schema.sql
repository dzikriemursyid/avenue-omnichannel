-- MVP Omnichannel CRM Database Schema
-- Target: Supabase PostgreSQL with RLS (Row Level Security)

-- ================================
-- 1. USER MANAGEMENT & ROLES
-- ================================

-- Teams for organizing users (create first to avoid circular dependency)
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    leader_id UUID, -- Will add constraint later
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User profiles (extends Supabase auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'general_manager', 'leader', 'agent')),
    team_id UUID REFERENCES teams(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key constraint for team leader after profiles table exists
ALTER TABLE teams ADD CONSTRAINT fk_teams_leader 
    FOREIGN KEY (leader_id) REFERENCES profiles(id);

-- ================================
-- 2. CONTACT MANAGEMENT
-- ================================

-- Contact segments for grouping
CREATE TABLE contact_segments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    criteria JSONB, -- Store segment rules
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Main contacts table
CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number TEXT UNIQUE NOT NULL, -- WhatsApp phone (with country code)
    name TEXT,
    email TEXT,
    profile_picture_url TEXT,
    tags TEXT[], -- Simple tagging system
    custom_fields JSONB DEFAULT '{}', -- Flexible additional data
    last_interaction_at TIMESTAMPTZ,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Indexes for performance
    CONSTRAINT contacts_phone_format CHECK (phone_number ~ '^\+[1-9]\d{1,14}$')
);

-- Many-to-many: contacts to segments
CREATE TABLE contact_segment_members (
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    segment_id UUID REFERENCES contact_segments(id) ON DELETE CASCADE,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (contact_id, segment_id)
);

-- ================================
-- 3. CAMPAIGN MANAGEMENT
-- ================================

-- WhatsApp message templates
CREATE TABLE message_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    template_id TEXT NOT NULL, -- WhatsApp template ID
    category TEXT NOT NULL CHECK (category IN ('marketing', 'utility', 'authentication')),
    language_code TEXT NOT NULL DEFAULT 'id',
    header_text TEXT,
    body_text TEXT NOT NULL,
    footer_text TEXT,
    button_config JSONB, -- Store button configurations
    variables TEXT[], -- Template variables like {{1}}, {{2}}
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Campaign definitions
CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    template_id UUID REFERENCES message_templates(id),
    target_segments UUID[], -- Array of segment IDs
    schedule_type TEXT NOT NULL CHECK (schedule_type IN ('immediate', 'scheduled', 'recurring')),
    scheduled_at TIMESTAMPTZ,
    recurring_config JSONB, -- For recurring campaigns
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'running', 'completed', 'paused', 'failed')),
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Campaign execution tracking
CREATE TABLE campaign_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    message_sid TEXT, -- Twilio message SID
    phone_number TEXT NOT NULL,
    template_data JSONB, -- Personalized template variables
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
    error_message TEXT,
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(campaign_id, contact_id)
);

-- ================================
-- 4. CHAT SYSTEM
-- ================================

-- Chat conversations
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    assigned_agent_id UUID REFERENCES profiles(id),
    team_id UUID REFERENCES teams(id),
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'pending', 'closed')),
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    last_message_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat messages
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    message_sid TEXT UNIQUE, -- Twilio message SID (null for outbound)
    direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'document', 'audio', 'video')),
    content TEXT,
    media_url TEXT,
    media_content_type TEXT,
    sent_by UUID REFERENCES profiles(id), -- NULL for inbound messages
    timestamp TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================
-- 5. ANALYTICS & TRACKING
-- ================================

-- Daily metrics rollup
CREATE TABLE daily_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    agent_id UUID REFERENCES profiles(id),
    team_id UUID REFERENCES teams(id),
    messages_sent INTEGER DEFAULT 0,
    messages_received INTEGER DEFAULT 0,
    conversations_handled INTEGER DEFAULT 0,
    response_time_avg_minutes INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(date, agent_id)
);

-- Campaign analytics
CREATE TABLE campaign_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    total_sent INTEGER DEFAULT 0,
    total_delivered INTEGER DEFAULT 0,
    total_read INTEGER DEFAULT 0,
    total_failed INTEGER DEFAULT 0,
    delivery_rate DECIMAL(5,2) DEFAULT 0,
    read_rate DECIMAL(5,2) DEFAULT 0,
    cost_estimate DECIMAL(10,2) DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(campaign_id)
);

-- ================================
-- 6. SYSTEM CONFIGURATION
-- ================================

-- App settings
CREATE TABLE app_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES profiles(id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================
-- 7. INDEXES FOR PERFORMANCE
-- ================================

-- Contact indexes
CREATE INDEX idx_contacts_phone ON contacts(phone_number);
CREATE INDEX idx_contacts_created_at ON contacts(created_at DESC);
CREATE INDEX idx_contacts_last_interaction ON contacts(last_interaction_at DESC);

-- Message indexes
CREATE INDEX idx_messages_conversation_timestamp ON messages(conversation_id, timestamp DESC);
CREATE INDEX idx_messages_direction_timestamp ON messages(direction, timestamp DESC);

-- Campaign indexes
CREATE INDEX idx_campaign_messages_status ON campaign_messages(status);
CREATE INDEX idx_campaign_messages_campaign_id ON campaign_messages(campaign_id);

-- Conversation indexes
CREATE INDEX idx_conversations_assigned_agent ON conversations(assigned_agent_id);
CREATE INDEX idx_conversations_status_updated ON conversations(status, updated_at DESC);

-- ================================
-- 8. ROW LEVEL SECURITY (RLS) SETUP
-- ================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_messages ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (expand based on business rules)
-- Profiles: Users can see their own profile + team members
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

-- Contacts: Team-based access
CREATE POLICY "Team can view contacts" ON contacts
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND 
                (role IN ('admin', 'general_manager') OR team_id IN (
                    SELECT team_id FROM profiles WHERE id = contacts.created_by
                )))
    );

-- ================================
-- 9. FUNCTIONS & TRIGGERS
-- ================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to relevant tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================
-- 10. INITIAL DATA
-- ================================

-- Insert default team
INSERT INTO teams (name, description) VALUES ('Default Team', 'Default team for initial setup');

-- Insert app settings
INSERT INTO app_settings (key, value, description) VALUES 
('whatsapp_webhook_url', '""', 'WhatsApp webhook endpoint URL'),
('twilio_account_sid', '""', 'Twilio Account SID'),
('default_business_hours', '{"start": "09:00", "end": "17:00", "timezone": "Asia/Jakarta"}', 'Default business hours'),
('max_concurrent_conversations', '10', 'Maximum concurrent conversations per agent');

-- Function untuk auto-create profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, team_id)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', 'New User'),
    COALESCE(new.raw_user_meta_data->>'role', 'agent'),
    (new.raw_user_meta_data->>'team_id')::uuid
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
