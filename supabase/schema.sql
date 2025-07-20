

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."can_manage_user_simple"("target_user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    current_role_var TEXT;
    target_role_var TEXT;
    current_team_var UUID;
    target_team_var UUID;
BEGIN
    current_role_var := get_current_user_role();
    current_team_var := get_current_user_team();
    
    SELECT role, team_id INTO target_role_var, target_team_var
    FROM profiles WHERE id = target_user_id;
    
    -- Admin can manage anyone
    IF current_role_var = 'admin' THEN
        RETURN TRUE;
    END IF;
    
    -- GM can manage non-admins
    IF current_role_var = 'general_manager' AND target_role_var != 'admin' THEN
        RETURN TRUE;
    END IF;
    
    -- Leaders can manage team members
    IF current_role_var = 'leader' 
       AND target_role_var IN ('agent', 'leader')
       AND current_team_var = target_team_var 
       AND current_team_var IS NOT NULL THEN
        RETURN TRUE;
    END IF;
    
    -- Self-management
    IF auth.uid() = target_user_id THEN
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$;


ALTER FUNCTION "public"."can_manage_user_simple"("target_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."close_expired_conversations"() RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  closed_count INTEGER := 0;
BEGIN
  -- Update conversations where window has expired
  UPDATE conversations 
  SET 
    status = 'closed',
    is_within_window = false,
    updated_at = NOW()
  WHERE 
    conversation_window_expires_at < NOW() 
    AND status != 'closed'
    AND last_customer_message_at IS NOT NULL;
  
  GET DIAGNOSTICS closed_count = ROW_COUNT;
  
  RETURN closed_count;
END;
$$;


ALTER FUNCTION "public"."close_expired_conversations"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."extract_media_urls"("twilio_types" "jsonb") RETURNS "text"[]
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."extract_media_urls"("twilio_types" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."extract_template_type"("twilio_types" "jsonb") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF twilio_types ? 'twilio/card' THEN
        RETURN 'card';
    ELSIF twilio_types ? 'twilio/media' THEN
        RETURN 'media';
    ELSE
        RETURN 'text';
    END IF;
END;
$$;


ALTER FUNCTION "public"."extract_template_type"("twilio_types" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_campaign_readiness"("campaign_id" "uuid") RETURNS TABLE("ready" boolean, "issues" "text"[])
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  campaign_row campaigns%ROWTYPE;
  template_row message_templates%ROWTYPE;
  total_contacts INTEGER;
  issues_array TEXT[] := '{}';
BEGIN
  -- Get campaign details
  SELECT * INTO campaign_row FROM campaigns WHERE id = campaign_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, ARRAY['Campaign not found'];
    RETURN;
  END IF;
  
  -- Check template
  SELECT * INTO template_row FROM message_templates WHERE id = campaign_row.template_id;
  
  IF NOT FOUND THEN
    issues_array := array_append(issues_array, 'Template not found');
  ELSIF template_row.status != 'approved' THEN
    issues_array := array_append(issues_array, 'Template not approved');
  ELSIF template_row.twilio_approval_status != 'approved' THEN
    issues_array := array_append(issues_array, 'Template not approved by Twilio');
  END IF;
  
  -- Check target segments
  IF campaign_row.target_segments IS NULL OR array_length(campaign_row.target_segments, 1) = 0 THEN
    issues_array := array_append(issues_array, 'No target audience selected');
  ELSE
    -- Count total contacts in target segments
    SELECT COALESCE(SUM(contact_count), 0) INTO total_contacts
    FROM contact_groups 
    WHERE id = ANY(campaign_row.target_segments);
    
    IF total_contacts = 0 THEN
      issues_array := array_append(issues_array, 'Target audience has no contacts');
    END IF;
  END IF;
  
  -- Check scheduling
  IF campaign_row.schedule_type = 'scheduled' THEN
    IF campaign_row.scheduled_at IS NULL THEN
      issues_array := array_append(issues_array, 'Scheduled time not set');
    ELSIF campaign_row.scheduled_at <= NOW() THEN
      issues_array := array_append(issues_array, 'Scheduled time is in the past');
    END IF;
  END IF;
  
  RETURN QUERY SELECT (array_length(issues_array, 1) = 0), issues_array;
END;
$$;


ALTER FUNCTION "public"."get_campaign_readiness"("campaign_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_campaign_readiness"("campaign_id" "uuid") IS 'Check if campaign is ready to be sent with detailed issue reporting';



CREATE OR REPLACE FUNCTION "public"."get_campaign_stats"("campaign_id" "uuid") RETURNS TABLE("total_contacts" integer, "messages_sent" integer, "messages_delivered" integer, "messages_read" integer, "messages_failed" integer, "delivery_rate" numeric, "read_rate" numeric)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  contacts_count INTEGER;
  sent_count INTEGER;
  delivered_count INTEGER;
  read_count INTEGER;
  failed_count INTEGER;
BEGIN
  -- Get total contacts for this campaign
  SELECT COALESCE(SUM(cg.contact_count), 0) INTO contacts_count
  FROM campaigns c
  JOIN contact_groups cg ON cg.id = ANY(c.target_segments)
  WHERE c.id = campaign_id;
  
  -- Get message statistics
  SELECT 
    COALESCE(SUM(CASE WHEN cm.status = 'sent' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN cm.status = 'delivered' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN cm.status = 'read' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN cm.status = 'failed' THEN 1 ELSE 0 END), 0)
  INTO sent_count, delivered_count, read_count, failed_count
  FROM campaign_messages cm
  WHERE cm.campaign_id = campaign_id;
  
  RETURN QUERY SELECT 
    contacts_count,
    sent_count,
    delivered_count,
    read_count,
    failed_count,
    CASE WHEN sent_count > 0 THEN (delivered_count::NUMERIC / sent_count::NUMERIC * 100) ELSE 0 END,
    CASE WHEN delivered_count > 0 THEN (read_count::NUMERIC / delivered_count::NUMERIC * 100) ELSE 0 END;
END;
$$;


ALTER FUNCTION "public"."get_campaign_stats"("campaign_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_campaign_stats"("campaign_id" "uuid") IS 'Get comprehensive statistics for a campaign';



CREATE OR REPLACE FUNCTION "public"."get_campaign_with_variables"("campaign_uuid" "uuid") RETURNS TABLE("id" "uuid", "name" "text", "description" "text", "template_id" "uuid", "template_name" "text", "template_variables" "jsonb", "target_segments" "uuid"[], "schedule_type" "text", "scheduled_at" timestamp with time zone, "status" "text", "created_by" "uuid", "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.description,
    c.template_id,
    mt.name as template_name,
    c.template_variables,
    c.target_segments,
    c.schedule_type,
    c.scheduled_at,
    c.status,
    c.created_by,
    c.created_at,
    c.updated_at
  FROM campaigns c
  LEFT JOIN message_templates mt ON mt.id = c.template_id
  WHERE c.id = campaign_uuid;
END;
$$;


ALTER FUNCTION "public"."get_campaign_with_variables"("campaign_uuid" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_campaign_with_variables"("campaign_uuid" "uuid") IS 'Get campaign with template information and variables';



CREATE OR REPLACE FUNCTION "public"."get_current_user_role"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    user_role_var TEXT;
BEGIN
    -- Direct query bypassing RLS using SECURITY DEFINER
    SELECT role INTO user_role_var 
    FROM profiles 
    WHERE id = auth.uid();
    
    RETURN COALESCE(user_role_var, 'none');
EXCEPTION
    WHEN OTHERS THEN
        RETURN 'none';
END;
$$;


ALTER FUNCTION "public"."get_current_user_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_current_user_team"() RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    user_team_var UUID;
BEGIN
    -- Direct query bypassing RLS using SECURITY DEFINER
    SELECT team_id INTO user_team_var 
    FROM profiles 
    WHERE id = auth.uid();
    
    RETURN user_team_var;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."get_current_user_team"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, team_id, phone_number, avatar_url)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', 'New User'),
    COALESCE(new.raw_user_meta_data->>'role', 'agent'),
    CASE 
      WHEN new.raw_user_meta_data->>'team_id' IS NULL OR new.raw_user_meta_data->>'team_id' = 'none' THEN NULL
      ELSE (new.raw_user_meta_data->>'team_id')::uuid
    END,
    new.raw_user_meta_data->>'phone_number', -- Add phone_number field
    new.raw_user_meta_data->>'avatar_url'    -- Add avatar_url field
  );
  RETURN new;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_new_message"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Trigger realtime notification when new message is inserted
  PERFORM pg_notify('new_message', row_to_json(NEW)::text);
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_new_message"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_conversation_last_message"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Update conversation's last_message_at when new message is added
  UPDATE conversations 
  SET last_message_at = NEW.timestamp,
      updated_at = NOW()
  WHERE id = NEW.conversation_id;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_conversation_last_message"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_conversation_window"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Only update if it's an inbound message (from customer)
  IF NEW.direction = 'inbound' THEN
    -- Update the conversation's last customer message timestamp
    UPDATE conversations 
    SET 
      last_customer_message_at = NEW.created_at,
      conversation_window_expires_at = NEW.created_at + INTERVAL '24 hours',
      is_within_window = true,
      status = CASE 
        WHEN status = 'closed' THEN 'open'  -- Reopen if customer messages
        ELSE status 
      END,
      updated_at = NOW()
    WHERE id = NEW.conversation_id;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_conversation_window"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_group_contact_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Update count for old group (if any)
    IF OLD.group_id IS NOT NULL THEN
        UPDATE contact_groups 
        SET contact_count = (
            SELECT COUNT(*) FROM contacts 
            WHERE group_id = OLD.group_id
        )
        WHERE id = OLD.group_id;
    END IF;
    
    -- Update count for new group (if any)
    IF NEW.group_id IS NOT NULL THEN
        UPDATE contact_groups 
        SET contact_count = (
            SELECT COUNT(*) FROM contacts 
            WHERE group_id = NEW.group_id
        )
        WHERE id = NEW.group_id;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_group_contact_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_sent_messages_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_sent_messages_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_campaign_template_variables"("campaign_template_id" "uuid", "campaign_variables" "jsonb") RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  template_variables TEXT[];
  campaign_var_keys TEXT[];
  missing_vars TEXT[];
BEGIN
  -- Get template variables
  SELECT variables INTO template_variables 
  FROM message_templates 
  WHERE id = campaign_template_id;
  
  -- If template has no variables, campaign should have no variables
  IF template_variables IS NULL OR array_length(template_variables, 1) IS NULL THEN
    RETURN jsonb_typeof(campaign_variables) = 'null' OR campaign_variables = '{}'::jsonb;
  END IF;
  
  -- Extract campaign variable keys
  SELECT array_agg(key) INTO campaign_var_keys
  FROM jsonb_object_keys(campaign_variables) AS key;
  
  -- Check if all template variables are provided
  SELECT array_agg(var) INTO missing_vars
  FROM unnest(template_variables) AS var
  WHERE var NOT IN (SELECT unnest(campaign_var_keys));
  
  -- Return true if no missing variables
  RETURN missing_vars IS NULL OR array_length(missing_vars, 1) IS NULL;
END;
$$;


ALTER FUNCTION "public"."validate_campaign_template_variables"("campaign_template_id" "uuid", "campaign_variables" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."validate_campaign_template_variables"("campaign_template_id" "uuid", "campaign_variables" "jsonb") IS 'Validate that campaign template variables match the template requirements';



CREATE OR REPLACE FUNCTION "public"."validate_twilio_content_sid"("content_sid" "text") RETURNS boolean
    LANGUAGE "plpgsql"
    AS $_$
BEGIN
  -- Twilio Content SID format: HX followed by 32 characters
  RETURN content_sid ~ '^HX[0-9a-fA-F]{32}$';
END;
$_$;


ALTER FUNCTION "public"."validate_twilio_content_sid"("content_sid" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."validate_twilio_content_sid"("content_sid" "text") IS 'Validate Twilio Content SID format (HX + 32 hex characters)';


SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."app_settings" (
    "key" "text" NOT NULL,
    "value" "jsonb" NOT NULL,
    "description" "text",
    "updated_by" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."app_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."campaign_analytics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "campaign_id" "uuid",
    "total_sent" integer DEFAULT 0,
    "total_delivered" integer DEFAULT 0,
    "total_read" integer DEFAULT 0,
    "total_failed" integer DEFAULT 0,
    "delivery_rate" numeric(5,2) DEFAULT 0,
    "read_rate" numeric(5,2) DEFAULT 0,
    "cost_estimate" numeric(10,2) DEFAULT 0,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."campaign_analytics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."campaign_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "campaign_id" "uuid",
    "contact_id" "uuid",
    "message_sid" "text",
    "phone_number" "text" NOT NULL,
    "template_data" "jsonb",
    "status" "text" DEFAULT 'pending'::"text",
    "error_message" "text",
    "sent_at" timestamp with time zone,
    "delivered_at" timestamp with time zone,
    "read_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "campaign_messages_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'sent'::"text", 'delivered'::"text", 'read'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."campaign_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."campaigns" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "template_id" "uuid",
    "target_segments" "uuid"[],
    "schedule_type" "text" NOT NULL,
    "scheduled_at" timestamp with time zone,
    "recurring_config" "jsonb",
    "status" "text" DEFAULT 'draft'::"text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "template_variables" "jsonb" DEFAULT '{}'::"jsonb",
    "variable_source" "text" DEFAULT 'manual'::"text",
    "header_text" "text",
    CONSTRAINT "campaigns_schedule_type_check" CHECK (("schedule_type" = ANY (ARRAY['immediate'::"text", 'scheduled'::"text", 'recurring'::"text"]))),
    CONSTRAINT "campaigns_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'scheduled'::"text", 'running'::"text", 'completed'::"text", 'paused'::"text", 'failed'::"text"]))),
    CONSTRAINT "campaigns_variable_source_check" CHECK (("variable_source" = ANY (ARRAY['manual'::"text", 'contact'::"text"]))),
    CONSTRAINT "check_template_variables_valid" CHECK ("public"."validate_campaign_template_variables"("template_id", "template_variables"))
);


ALTER TABLE "public"."campaigns" OWNER TO "postgres";


COMMENT ON COLUMN "public"."campaigns"."template_variables" IS 'Dynamic template variables for the campaign (e.g., discount_code, discount_percentage)';



COMMENT ON COLUMN "public"."campaigns"."variable_source" IS 'Source for template variables: manual (user input) or contact (from contact data)';



COMMENT ON COLUMN "public"."campaigns"."header_text" IS 'Campaign-specific header image URL that overrides template default header_text';



CREATE TABLE IF NOT EXISTS "public"."contact_groups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "color" "text" DEFAULT '#3B82F6'::"text",
    "icon" "text" DEFAULT 'Users'::"text",
    "contact_count" integer DEFAULT 0,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."contact_groups" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contacts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "phone_number" "text" NOT NULL,
    "name" "text",
    "email" "text",
    "profile_picture_url" "text",
    "tags" "text"[],
    "custom_fields" "jsonb" DEFAULT '{}'::"jsonb",
    "last_interaction_at" timestamp with time zone,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "group_id" "uuid",
    "group_name" "text",
    CONSTRAINT "contacts_phone_format" CHECK (("phone_number" ~ '^\+[1-9]\d{1,14}$'::"text"))
);


ALTER TABLE "public"."contacts" OWNER TO "postgres";


COMMENT ON COLUMN "public"."contacts"."group_id" IS 'Custom group identifier for organizing contacts';



COMMENT ON COLUMN "public"."contacts"."group_name" IS 'Display name for the contact group';



CREATE TABLE IF NOT EXISTS "public"."conversations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "contact_id" "uuid",
    "assigned_agent_id" "uuid",
    "team_id" "uuid",
    "status" "text" DEFAULT 'open'::"text",
    "priority" "text" DEFAULT 'normal'::"text",
    "last_message_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "last_customer_message_at" timestamp with time zone,
    "conversation_window_expires_at" timestamp with time zone,
    "is_within_window" boolean DEFAULT true,
    CONSTRAINT "conversations_priority_check" CHECK (("priority" = ANY (ARRAY['low'::"text", 'normal'::"text", 'high'::"text", 'urgent'::"text"]))),
    CONSTRAINT "conversations_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'pending'::"text", 'closed'::"text"])))
);


ALTER TABLE "public"."conversations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."message_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "template_id" "text" NOT NULL,
    "category" "text" NOT NULL,
    "language_code" "text" DEFAULT 'id'::"text" NOT NULL,
    "header_text" "text",
    "body_text" "text" NOT NULL,
    "footer_text" "text",
    "button_config" "jsonb",
    "variables" "text"[],
    "status" "text" DEFAULT 'pending'::"text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "twilio_approval_status" "text" DEFAULT 'pending'::"text",
    "twilio_approval_date" timestamp with time zone,
    "template_type" "text" DEFAULT 'text'::"text",
    "media_urls" "text"[],
    "twilio_metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "usage_count" integer DEFAULT 0,
    "last_used_at" timestamp with time zone,
    CONSTRAINT "check_valid_twilio_content_sid" CHECK ("public"."validate_twilio_content_sid"("template_id")),
    CONSTRAINT "message_templates_category_check" CHECK (("category" = ANY (ARRAY['marketing'::"text", 'utility'::"text", 'authentication'::"text"]))),
    CONSTRAINT "message_templates_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"]))),
    CONSTRAINT "message_templates_template_type_check" CHECK (("template_type" = ANY (ARRAY['text'::"text", 'card'::"text", 'media'::"text"])))
);


ALTER TABLE "public"."message_templates" OWNER TO "postgres";


COMMENT ON COLUMN "public"."message_templates"."twilio_approval_status" IS 'Twilio approval status: pending, approved, rejected';



COMMENT ON COLUMN "public"."message_templates"."twilio_approval_date" IS 'Date when template was approved/rejected by Twilio';



COMMENT ON COLUMN "public"."message_templates"."template_type" IS 'Template type: text, card, media';



COMMENT ON COLUMN "public"."message_templates"."media_urls" IS 'Array of media URLs for media templates';



COMMENT ON COLUMN "public"."message_templates"."twilio_metadata" IS 'Additional Twilio metadata (approval links, etc.)';



CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_id" "uuid",
    "message_sid" "text",
    "direction" "text" NOT NULL,
    "message_type" "text" DEFAULT 'text'::"text",
    "content" "text",
    "media_url" "text",
    "media_content_type" "text",
    "sent_by" "uuid",
    "timestamp" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "from_number" "text",
    "to_number" "text",
    CONSTRAINT "messages_direction_check" CHECK (("direction" = ANY (ARRAY['inbound'::"text", 'outbound'::"text"]))),
    CONSTRAINT "messages_message_type_check" CHECK (("message_type" = ANY (ARRAY['text'::"text", 'image'::"text", 'document'::"text", 'audio'::"text", 'video'::"text"])))
);


ALTER TABLE "public"."messages" OWNER TO "postgres";


COMMENT ON COLUMN "public"."messages"."from_number" IS 'Phone number that sent the message (format: whatsapp:+6281234567890)';



COMMENT ON COLUMN "public"."messages"."to_number" IS 'Phone number that received the message (format: whatsapp:+6281234567890)';



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "full_name" "text" NOT NULL,
    "role" "text" NOT NULL,
    "team_id" "uuid",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "phone_number" character varying,
    "avatar_url" "text",
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'general_manager'::"text", 'leader'::"text", 'agent'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sent_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "template_id" "uuid" NOT NULL,
    "recipient" "text" NOT NULL,
    "message_sid" "text",
    "status" "text" NOT NULL,
    "error_message" "text",
    "variables" "jsonb",
    "sent_by" "uuid" NOT NULL,
    "sent_at" timestamp with time zone DEFAULT "now"(),
    "is_test" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "sent_messages_status_check" CHECK (("status" = ANY (ARRAY['sent'::"text", 'failed'::"text", 'delivered'::"text", 'read'::"text"])))
);


ALTER TABLE "public"."sent_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."teams" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "leader_id" "uuid",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."teams" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."twilio_webhook_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "campaign_id" "uuid",
    "received_at" timestamp with time zone DEFAULT "now"(),
    "payload" "jsonb" NOT NULL,
    "webhook_type" "text" DEFAULT 'status'::"text",
    "message_sid" "text",
    "raw_headers" "jsonb"
);


ALTER TABLE "public"."twilio_webhook_logs" OWNER TO "postgres";


ALTER TABLE ONLY "public"."app_settings"
    ADD CONSTRAINT "app_settings_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."campaign_analytics"
    ADD CONSTRAINT "campaign_analytics_campaign_id_key" UNIQUE ("campaign_id");



ALTER TABLE ONLY "public"."campaign_analytics"
    ADD CONSTRAINT "campaign_analytics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."campaign_messages"
    ADD CONSTRAINT "campaign_messages_campaign_id_contact_id_key" UNIQUE ("campaign_id", "contact_id");



ALTER TABLE ONLY "public"."campaign_messages"
    ADD CONSTRAINT "campaign_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."campaigns"
    ADD CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contact_groups"
    ADD CONSTRAINT "contact_groups_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."contact_groups"
    ADD CONSTRAINT "contact_groups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contacts"
    ADD CONSTRAINT "contacts_phone_number_key" UNIQUE ("phone_number");



ALTER TABLE ONLY "public"."contacts"
    ADD CONSTRAINT "contacts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."message_templates"
    ADD CONSTRAINT "message_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_message_sid_key" UNIQUE ("message_sid");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sent_messages"
    ADD CONSTRAINT "sent_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."twilio_webhook_logs"
    ADD CONSTRAINT "twilio_webhook_logs_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_campaign_analytics_campaign_id" ON "public"."campaign_analytics" USING "btree" ("campaign_id");



CREATE INDEX "idx_campaign_analytics_performance" ON "public"."campaign_analytics" USING "btree" ("campaign_id", "updated_at");



CREATE INDEX "idx_campaign_messages_campaign_id" ON "public"."campaign_messages" USING "btree" ("campaign_id");



CREATE INDEX "idx_campaign_messages_contact_id" ON "public"."campaign_messages" USING "btree" ("contact_id");



CREATE INDEX "idx_campaign_messages_message_sid" ON "public"."campaign_messages" USING "btree" ("message_sid");



CREATE INDEX "idx_campaign_messages_message_sid_lookup" ON "public"."campaign_messages" USING "btree" ("message_sid") WHERE ("message_sid" IS NOT NULL);



CREATE INDEX "idx_campaign_messages_status" ON "public"."campaign_messages" USING "btree" ("status");



CREATE INDEX "idx_campaigns_active_status" ON "public"."campaigns" USING "btree" ("status", "scheduled_at") WHERE ("status" = ANY (ARRAY['draft'::"text", 'scheduled'::"text", 'running'::"text"]));



CREATE INDEX "idx_campaigns_created_by" ON "public"."campaigns" USING "btree" ("created_by");



CREATE INDEX "idx_campaigns_header_text" ON "public"."campaigns" USING "btree" ("header_text") WHERE ("header_text" IS NOT NULL);



CREATE INDEX "idx_campaigns_scheduled_at" ON "public"."campaigns" USING "btree" ("scheduled_at");



CREATE INDEX "idx_campaigns_status" ON "public"."campaigns" USING "btree" ("status");



CREATE INDEX "idx_campaigns_target_segments" ON "public"."campaigns" USING "gin" ("target_segments");



CREATE INDEX "idx_campaigns_template_id" ON "public"."campaigns" USING "btree" ("template_id");



CREATE INDEX "idx_campaigns_template_variables" ON "public"."campaigns" USING "gin" ("template_variables");



CREATE INDEX "idx_contact_groups_created_by" ON "public"."contact_groups" USING "btree" ("created_by");



CREATE INDEX "idx_contact_groups_name" ON "public"."contact_groups" USING "btree" ("name");



CREATE INDEX "idx_contacts_created_at" ON "public"."contacts" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_contacts_group_id" ON "public"."contacts" USING "btree" ("group_id");



CREATE INDEX "idx_contacts_last_interaction" ON "public"."contacts" USING "btree" ("last_interaction_at" DESC);



CREATE INDEX "idx_contacts_phone" ON "public"."contacts" USING "btree" ("phone_number");



CREATE INDEX "idx_conversations_assigned_agent" ON "public"."conversations" USING "btree" ("assigned_agent_id");



CREATE INDEX "idx_conversations_status_updated" ON "public"."conversations" USING "btree" ("status", "updated_at" DESC);



CREATE INDEX "idx_conversations_window_expires" ON "public"."conversations" USING "btree" ("conversation_window_expires_at", "status") WHERE ("conversation_window_expires_at" IS NOT NULL);



CREATE INDEX "idx_conversations_within_window" ON "public"."conversations" USING "btree" ("is_within_window", "status");



CREATE INDEX "idx_message_templates_approval_status" ON "public"."message_templates" USING "btree" ("twilio_approval_status");



CREATE INDEX "idx_message_templates_category" ON "public"."message_templates" USING "btree" ("category");



CREATE INDEX "idx_message_templates_last_used_at" ON "public"."message_templates" USING "btree" ("last_used_at");



CREATE INDEX "idx_message_templates_status" ON "public"."message_templates" USING "btree" ("status");



CREATE INDEX "idx_message_templates_template_id" ON "public"."message_templates" USING "btree" ("template_id");



CREATE INDEX "idx_message_templates_template_type" ON "public"."message_templates" USING "btree" ("template_type");



CREATE INDEX "idx_message_templates_twilio_status" ON "public"."message_templates" USING "btree" ("twilio_approval_status");



CREATE INDEX "idx_message_templates_usage_count" ON "public"."message_templates" USING "btree" ("usage_count");



CREATE INDEX "idx_messages_conversation_timestamp" ON "public"."messages" USING "btree" ("conversation_id", "timestamp" DESC);



CREATE INDEX "idx_messages_direction_timestamp" ON "public"."messages" USING "btree" ("direction", "timestamp" DESC);



CREATE INDEX "idx_messages_from_number" ON "public"."messages" USING "btree" ("from_number");



CREATE INDEX "idx_messages_phone_timestamp" ON "public"."messages" USING "btree" ("from_number", "to_number", "timestamp" DESC);



CREATE INDEX "idx_messages_to_number" ON "public"."messages" USING "btree" ("to_number");



CREATE INDEX "idx_sent_messages_message_sid" ON "public"."sent_messages" USING "btree" ("message_sid");



CREATE INDEX "idx_sent_messages_recipient" ON "public"."sent_messages" USING "btree" ("recipient");



CREATE INDEX "idx_sent_messages_sent_at" ON "public"."sent_messages" USING "btree" ("sent_at");



CREATE INDEX "idx_sent_messages_sent_by" ON "public"."sent_messages" USING "btree" ("sent_by");



CREATE INDEX "idx_sent_messages_status" ON "public"."sent_messages" USING "btree" ("status");



CREATE INDEX "idx_sent_messages_template_id" ON "public"."sent_messages" USING "btree" ("template_id");



CREATE INDEX "idx_twilio_webhook_logs_campaign_id" ON "public"."twilio_webhook_logs" USING "btree" ("campaign_id");



CREATE INDEX "idx_twilio_webhook_logs_received_at" ON "public"."twilio_webhook_logs" USING "btree" ("received_at" DESC);



CREATE OR REPLACE TRIGGER "trigger_new_message" AFTER INSERT ON "public"."messages" FOR EACH ROW EXECUTE FUNCTION "public"."notify_new_message"();



CREATE OR REPLACE TRIGGER "trigger_update_conversation_last_message" AFTER INSERT ON "public"."messages" FOR EACH ROW EXECUTE FUNCTION "public"."update_conversation_last_message"();



CREATE OR REPLACE TRIGGER "trigger_update_conversation_window" AFTER INSERT ON "public"."messages" FOR EACH ROW EXECUTE FUNCTION "public"."update_conversation_window"();



CREATE OR REPLACE TRIGGER "update_campaign_analytics_updated_at" BEFORE UPDATE ON "public"."campaign_analytics" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_campaigns_updated_at" BEFORE UPDATE ON "public"."campaigns" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_contact_group_count" AFTER INSERT OR DELETE OR UPDATE ON "public"."contacts" FOR EACH ROW EXECUTE FUNCTION "public"."update_group_contact_count"();



CREATE OR REPLACE TRIGGER "update_contact_groups_updated_at" BEFORE UPDATE ON "public"."contact_groups" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_contacts_updated_at" BEFORE UPDATE ON "public"."contacts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_conversations_updated_at" BEFORE UPDATE ON "public"."conversations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_sent_messages_updated_at" BEFORE UPDATE ON "public"."sent_messages" FOR EACH ROW EXECUTE FUNCTION "public"."update_sent_messages_updated_at"();



ALTER TABLE ONLY "public"."app_settings"
    ADD CONSTRAINT "app_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."campaign_analytics"
    ADD CONSTRAINT "campaign_analytics_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."campaign_messages"
    ADD CONSTRAINT "campaign_messages_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."campaign_messages"
    ADD CONSTRAINT "campaign_messages_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."campaigns"
    ADD CONSTRAINT "campaigns_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."campaigns"
    ADD CONSTRAINT "campaigns_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."message_templates"("id");



ALTER TABLE ONLY "public"."contact_groups"
    ADD CONSTRAINT "contact_groups_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."contacts"
    ADD CONSTRAINT "contacts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."contacts"
    ADD CONSTRAINT "contacts_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."contact_groups"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_assigned_agent_id_fkey" FOREIGN KEY ("assigned_agent_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "fk_teams_leader" FOREIGN KEY ("leader_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."message_templates"
    ADD CONSTRAINT "message_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_sent_by_fkey" FOREIGN KEY ("sent_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id");



ALTER TABLE ONLY "public"."sent_messages"
    ADD CONSTRAINT "sent_messages_sent_by_fkey" FOREIGN KEY ("sent_by") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sent_messages"
    ADD CONSTRAINT "sent_messages_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."message_templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."twilio_webhook_logs"
    ADD CONSTRAINT "twilio_webhook_logs_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE CASCADE;



CREATE POLICY "Admin and GM's can Delete Contacts" ON "public"."contacts" FOR DELETE USING (("public"."get_current_user_role"() = ANY (ARRAY['admin'::"text", 'general_manager'::"text"])));



CREATE POLICY "Admins and GMs can create teams" ON "public"."teams" FOR INSERT WITH CHECK (("public"."get_current_user_role"() = ANY (ARRAY['admin'::"text", 'general_manager'::"text"])));



CREATE POLICY "Admins and GMs can delete teams" ON "public"."teams" FOR DELETE USING (("public"."get_current_user_role"() = ANY (ARRAY['admin'::"text", 'general_manager'::"text"])));



CREATE POLICY "Admins and GMs can update any profile" ON "public"."profiles" FOR UPDATE USING (("public"."get_current_user_role"() = ANY (ARRAY['admin'::"text", 'general_manager'::"text"]))) WITH CHECK (("public"."get_current_user_role"() = ANY (ARRAY['admin'::"text", 'general_manager'::"text"])));



CREATE POLICY "Admins and GMs can update teams" ON "public"."teams" FOR UPDATE USING ((("public"."get_current_user_role"() = ANY (ARRAY['admin'::"text", 'general_manager'::"text"])) OR (("public"."get_current_user_role"() = 'leader'::"text") AND ("leader_id" = "auth"."uid"()))));



CREATE POLICY "Admins can view all profiles" ON "public"."profiles" FOR SELECT USING (("public"."get_current_user_role"() = 'admin'::"text"));



CREATE POLICY "Agents can create conversations" ON "public"."conversations" FOR INSERT WITH CHECK (("public"."get_current_user_role"() = ANY (ARRAY['admin'::"text", 'general_manager'::"text", 'leader'::"text", 'agent'::"text"])));



CREATE POLICY "Agents can view team profiles" ON "public"."profiles" FOR SELECT USING ((("public"."get_current_user_role"() = 'agent'::"text") AND (("auth"."uid"() = "id") OR (("team_id" = "public"."get_current_user_team"()) AND ("team_id" IS NOT NULL)))));



CREATE POLICY "Allow admin and trigger profile creation" ON "public"."profiles" FOR INSERT WITH CHECK ((("public"."get_current_user_role"() = 'admin'::"text") OR ("auth"."uid"() = "id")));



CREATE POLICY "Assigned agents can update conversations" ON "public"."conversations" FOR UPDATE USING ((("public"."get_current_user_role"() = ANY (ARRAY['admin'::"text", 'general_manager'::"text"])) OR ("assigned_agent_id" = "auth"."uid"()) OR ("team_id" = "public"."get_current_user_team"())));



CREATE POLICY "Campaign creators and admins can update" ON "public"."campaigns" FOR UPDATE USING ((("public"."get_current_user_role"() = ANY (ARRAY['admin'::"text", 'general_manager'::"text"])) OR ("created_by" = "auth"."uid"())));



CREATE POLICY "Conversation participants can create messages" ON "public"."messages" FOR INSERT WITH CHECK (("public"."get_current_user_role"() = ANY (ARRAY['admin'::"text", 'general_manager'::"text", 'leader'::"text", 'agent'::"text"])));



CREATE POLICY "GM can view all profiles" ON "public"."profiles" FOR SELECT USING (("public"."get_current_user_role"() = 'general_manager'::"text"));



CREATE POLICY "Leaders and above can create campaigns" ON "public"."campaigns" FOR INSERT WITH CHECK (("public"."get_current_user_role"() = ANY (ARRAY['admin'::"text", 'general_manager'::"text", 'leader'::"text"])));



CREATE POLICY "Leaders can update team members" ON "public"."profiles" FOR UPDATE USING ((("public"."get_current_user_role"() = 'leader'::"text") AND ("team_id" = "public"."get_current_user_team"()) AND ("team_id" IS NOT NULL))) WITH CHECK ((("public"."get_current_user_role"() = 'leader'::"text") AND ("team_id" = "public"."get_current_user_team"()) AND ("team_id" IS NOT NULL)));



CREATE POLICY "Leaders can view team profiles" ON "public"."profiles" FOR SELECT USING ((("public"."get_current_user_role"() = 'leader'::"text") AND (("auth"."uid"() = "id") OR ("team_id" = "public"."get_current_user_team"()) OR ("id" IN ( SELECT "teams"."leader_id"
   FROM "public"."teams"
  WHERE ("teams"."leader_id" = "auth"."uid"()))))));



CREATE POLICY "Only admins can delete profiles" ON "public"."profiles" FOR DELETE USING (("public"."get_current_user_role"() = 'admin'::"text"));



CREATE POLICY "Only admins can modify app_settings" ON "public"."app_settings" USING (("public"."get_current_user_role"() = 'admin'::"text")) WITH CHECK (("public"."get_current_user_role"() = 'admin'::"text"));



CREATE POLICY "Only admins can view app_settings" ON "public"."app_settings" FOR SELECT USING (("public"."get_current_user_role"() = 'admin'::"text"));



CREATE POLICY "System can insert campaign messages" ON "public"."campaign_messages" FOR INSERT WITH CHECK (true);



CREATE POLICY "System can manage campaign analytics" ON "public"."campaign_analytics" USING (true);



CREATE POLICY "System can update campaign messages" ON "public"."campaign_messages" FOR UPDATE USING (true);



CREATE POLICY "Users can create contact groups" ON "public"."contact_groups" FOR INSERT WITH CHECK (("public"."get_current_user_role"() = ANY (ARRAY['admin'::"text", 'general_manager'::"text", 'leader'::"text", 'agent'::"text"])));



CREATE POLICY "Users can create contacts" ON "public"."contacts" FOR INSERT WITH CHECK (("public"."get_current_user_role"() = ANY (ARRAY['admin'::"text", 'general_manager'::"text", 'leader'::"text", 'agent'::"text"])));



CREATE POLICY "Users can delete contact groups" ON "public"."contact_groups" FOR DELETE USING ((("public"."get_current_user_role"() = ANY (ARRAY['admin'::"text", 'general_manager'::"text"])) OR ("created_by" = "auth"."uid"())));



CREATE POLICY "Users can insert sent messages" ON "public"."sent_messages" FOR INSERT WITH CHECK ((("sent_by" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"text", 'general_manager'::"text", 'leader'::"text"])))))));



CREATE POLICY "Users can update contact groups" ON "public"."contact_groups" FOR UPDATE USING ((("public"."get_current_user_role"() = ANY (ARRAY['admin'::"text", 'general_manager'::"text"])) OR ("created_by" = "auth"."uid"())));



CREATE POLICY "Users can update own profile enhanced" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can update sent messages" ON "public"."sent_messages" FOR UPDATE USING ((("sent_by" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"text", 'general_manager'::"text"])))))));



CREATE POLICY "Users can update team contacts" ON "public"."contacts" FOR UPDATE USING ((("public"."get_current_user_role"() = ANY (ARRAY['admin'::"text", 'general_manager'::"text"])) OR ("created_by" IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."team_id" = "public"."get_current_user_team"())))));



CREATE POLICY "Users can view assigned conversations" ON "public"."conversations" FOR SELECT USING ((("public"."get_current_user_role"() = ANY (ARRAY['admin'::"text", 'general_manager'::"text"])) OR ("assigned_agent_id" = "auth"."uid"()) OR ("team_id" = "public"."get_current_user_team"())));



CREATE POLICY "Users can view campaign analytics" ON "public"."campaign_analytics" FOR SELECT USING (("campaign_id" IN ( SELECT "campaigns"."id"
   FROM "public"."campaigns"
  WHERE (("public"."get_current_user_role"() = ANY (ARRAY['admin'::"text", 'general_manager'::"text"])) OR (("public"."get_current_user_role"() = ANY (ARRAY['leader'::"text", 'agent'::"text"])) AND ("campaigns"."created_by" IN ( SELECT "profiles"."id"
           FROM "public"."profiles"
          WHERE ("profiles"."team_id" = "public"."get_current_user_team"()))))))));



CREATE POLICY "Users can view campaign messages" ON "public"."campaign_messages" FOR SELECT USING (("campaign_id" IN ( SELECT "campaigns"."id"
   FROM "public"."campaigns"
  WHERE (("public"."get_current_user_role"() = ANY (ARRAY['admin'::"text", 'general_manager'::"text"])) OR (("public"."get_current_user_role"() = ANY (ARRAY['leader'::"text", 'agent'::"text"])) AND ("campaigns"."created_by" IN ( SELECT "profiles"."id"
           FROM "public"."profiles"
          WHERE ("profiles"."team_id" = "public"."get_current_user_team"()))))))));



CREATE POLICY "Users can view campaigns" ON "public"."campaigns" FOR SELECT USING ((("public"."get_current_user_role"() = ANY (ARRAY['admin'::"text", 'general_manager'::"text"])) OR (("public"."get_current_user_role"() = ANY (ARRAY['leader'::"text", 'agent'::"text"])) AND ("created_by" IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."team_id" = "public"."get_current_user_team"()))))));



CREATE POLICY "Users can view contact groups" ON "public"."contact_groups" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Users can view conversation messages" ON "public"."messages" FOR SELECT USING (("conversation_id" IN ( SELECT "conversations"."id"
   FROM "public"."conversations"
  WHERE (("public"."get_current_user_role"() = ANY (ARRAY['admin'::"text", 'general_manager'::"text"])) OR ("conversations"."assigned_agent_id" = "auth"."uid"()) OR ("conversations"."team_id" = "public"."get_current_user_team"())))));



CREATE POLICY "Users can view own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view sent messages" ON "public"."sent_messages" FOR SELECT USING ((("sent_by" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"text", 'general_manager'::"text", 'leader'::"text"])))))));



CREATE POLICY "Users can view team contacts" ON "public"."contacts" FOR SELECT USING ((("public"."get_current_user_role"() = ANY (ARRAY['admin'::"text", 'general_manager'::"text"])) OR ("created_by" IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."team_id" = "public"."get_current_user_team"())))));



CREATE POLICY "Users can view teams based on role" ON "public"."teams" FOR SELECT USING ((("public"."get_current_user_role"() = ANY (ARRAY['admin'::"text", 'general_manager'::"text"])) OR (("public"."get_current_user_role"() = ANY (ARRAY['leader'::"text", 'agent'::"text"])) AND (("leader_id" = "auth"."uid"()) OR ("id" = "public"."get_current_user_team"())))));



ALTER TABLE "public"."campaign_analytics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."campaign_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."campaigns" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."contact_groups" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."contacts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."conversations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "messages_insert_policy" ON "public"."messages" FOR INSERT WITH CHECK (true);



CREATE POLICY "messages_select_policy" ON "public"."messages" FOR SELECT USING (true);



CREATE POLICY "messages_update_policy" ON "public"."messages" FOR UPDATE USING ((("sent_by" = "auth"."uid"()) OR ("auth"."role"() = 'service_role'::"text")));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sent_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."teams" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."conversations";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."messages";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."can_manage_user_simple"("target_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_manage_user_simple"("target_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_manage_user_simple"("target_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."close_expired_conversations"() TO "anon";
GRANT ALL ON FUNCTION "public"."close_expired_conversations"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."close_expired_conversations"() TO "service_role";



GRANT ALL ON FUNCTION "public"."extract_media_urls"("twilio_types" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."extract_media_urls"("twilio_types" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."extract_media_urls"("twilio_types" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."extract_template_type"("twilio_types" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."extract_template_type"("twilio_types" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."extract_template_type"("twilio_types" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_campaign_readiness"("campaign_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_campaign_readiness"("campaign_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_campaign_readiness"("campaign_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_campaign_stats"("campaign_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_campaign_stats"("campaign_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_campaign_stats"("campaign_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_campaign_with_variables"("campaign_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_campaign_with_variables"("campaign_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_campaign_with_variables"("campaign_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_current_user_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_user_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_user_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_current_user_team"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_user_team"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_user_team"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_new_message"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_new_message"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_new_message"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_conversation_last_message"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_conversation_last_message"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_conversation_last_message"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_conversation_window"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_conversation_window"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_conversation_window"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_group_contact_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_group_contact_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_group_contact_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_sent_messages_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_sent_messages_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_sent_messages_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_campaign_template_variables"("campaign_template_id" "uuid", "campaign_variables" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."validate_campaign_template_variables"("campaign_template_id" "uuid", "campaign_variables" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_campaign_template_variables"("campaign_template_id" "uuid", "campaign_variables" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_twilio_content_sid"("content_sid" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."validate_twilio_content_sid"("content_sid" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_twilio_content_sid"("content_sid" "text") TO "service_role";


















GRANT ALL ON TABLE "public"."app_settings" TO "anon";
GRANT ALL ON TABLE "public"."app_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."app_settings" TO "service_role";



GRANT ALL ON TABLE "public"."campaign_analytics" TO "anon";
GRANT ALL ON TABLE "public"."campaign_analytics" TO "authenticated";
GRANT ALL ON TABLE "public"."campaign_analytics" TO "service_role";



GRANT ALL ON TABLE "public"."campaign_messages" TO "anon";
GRANT ALL ON TABLE "public"."campaign_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."campaign_messages" TO "service_role";



GRANT ALL ON TABLE "public"."campaigns" TO "anon";
GRANT ALL ON TABLE "public"."campaigns" TO "authenticated";
GRANT ALL ON TABLE "public"."campaigns" TO "service_role";



GRANT ALL ON TABLE "public"."contact_groups" TO "anon";
GRANT ALL ON TABLE "public"."contact_groups" TO "authenticated";
GRANT ALL ON TABLE "public"."contact_groups" TO "service_role";



GRANT ALL ON TABLE "public"."contacts" TO "anon";
GRANT ALL ON TABLE "public"."contacts" TO "authenticated";
GRANT ALL ON TABLE "public"."contacts" TO "service_role";



GRANT ALL ON TABLE "public"."conversations" TO "anon";
GRANT ALL ON TABLE "public"."conversations" TO "authenticated";
GRANT ALL ON TABLE "public"."conversations" TO "service_role";



GRANT ALL ON TABLE "public"."message_templates" TO "anon";
GRANT ALL ON TABLE "public"."message_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."message_templates" TO "service_role";



GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."sent_messages" TO "anon";
GRANT ALL ON TABLE "public"."sent_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."sent_messages" TO "service_role";



GRANT ALL ON TABLE "public"."teams" TO "anon";
GRANT ALL ON TABLE "public"."teams" TO "authenticated";
GRANT ALL ON TABLE "public"."teams" TO "service_role";



GRANT ALL ON TABLE "public"."twilio_webhook_logs" TO "anon";
GRANT ALL ON TABLE "public"."twilio_webhook_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."twilio_webhook_logs" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






























RESET ALL;
