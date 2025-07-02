

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


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

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
    CONSTRAINT "campaigns_schedule_type_check" CHECK (("schedule_type" = ANY (ARRAY['immediate'::"text", 'scheduled'::"text", 'recurring'::"text"]))),
    CONSTRAINT "campaigns_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'scheduled'::"text", 'running'::"text", 'completed'::"text", 'paused'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."campaigns" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contact_segment_members" (
    "contact_id" "uuid" NOT NULL,
    "segment_id" "uuid" NOT NULL,
    "added_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."contact_segment_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contact_segments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "criteria" "jsonb",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."contact_segments" OWNER TO "postgres";


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
    CONSTRAINT "contacts_phone_format" CHECK (("phone_number" ~ '^\+[1-9]\d{1,14}$'::"text"))
);


ALTER TABLE "public"."contacts" OWNER TO "postgres";


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
    CONSTRAINT "conversations_priority_check" CHECK (("priority" = ANY (ARRAY['low'::"text", 'normal'::"text", 'high'::"text", 'urgent'::"text"]))),
    CONSTRAINT "conversations_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'pending'::"text", 'closed'::"text"])))
);


ALTER TABLE "public"."conversations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."daily_metrics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "date" "date" NOT NULL,
    "agent_id" "uuid",
    "team_id" "uuid",
    "messages_sent" integer DEFAULT 0,
    "messages_received" integer DEFAULT 0,
    "conversations_handled" integer DEFAULT 0,
    "response_time_avg_minutes" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."daily_metrics" OWNER TO "postgres";


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
    CONSTRAINT "message_templates_category_check" CHECK (("category" = ANY (ARRAY['marketing'::"text", 'utility'::"text", 'authentication'::"text"]))),
    CONSTRAINT "message_templates_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."message_templates" OWNER TO "postgres";


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
    CONSTRAINT "messages_direction_check" CHECK (("direction" = ANY (ARRAY['inbound'::"text", 'outbound'::"text"]))),
    CONSTRAINT "messages_message_type_check" CHECK (("message_type" = ANY (ARRAY['text'::"text", 'image'::"text", 'document'::"text", 'audio'::"text", 'video'::"text"])))
);


ALTER TABLE "public"."messages" OWNER TO "postgres";


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



ALTER TABLE ONLY "public"."contact_segment_members"
    ADD CONSTRAINT "contact_segment_members_pkey" PRIMARY KEY ("contact_id", "segment_id");



ALTER TABLE ONLY "public"."contact_segments"
    ADD CONSTRAINT "contact_segments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contacts"
    ADD CONSTRAINT "contacts_phone_number_key" UNIQUE ("phone_number");



ALTER TABLE ONLY "public"."contacts"
    ADD CONSTRAINT "contacts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."daily_metrics"
    ADD CONSTRAINT "daily_metrics_date_agent_id_key" UNIQUE ("date", "agent_id");



ALTER TABLE ONLY "public"."daily_metrics"
    ADD CONSTRAINT "daily_metrics_pkey" PRIMARY KEY ("id");



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



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_campaign_messages_campaign_id" ON "public"."campaign_messages" USING "btree" ("campaign_id");



CREATE INDEX "idx_campaign_messages_status" ON "public"."campaign_messages" USING "btree" ("status");



CREATE INDEX "idx_contacts_created_at" ON "public"."contacts" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_contacts_last_interaction" ON "public"."contacts" USING "btree" ("last_interaction_at" DESC);



CREATE INDEX "idx_contacts_phone" ON "public"."contacts" USING "btree" ("phone_number");



CREATE INDEX "idx_conversations_assigned_agent" ON "public"."conversations" USING "btree" ("assigned_agent_id");



CREATE INDEX "idx_conversations_status_updated" ON "public"."conversations" USING "btree" ("status", "updated_at" DESC);



CREATE INDEX "idx_messages_conversation_timestamp" ON "public"."messages" USING "btree" ("conversation_id", "timestamp" DESC);



CREATE INDEX "idx_messages_direction_timestamp" ON "public"."messages" USING "btree" ("direction", "timestamp" DESC);



CREATE OR REPLACE TRIGGER "update_campaigns_updated_at" BEFORE UPDATE ON "public"."campaigns" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_contacts_updated_at" BEFORE UPDATE ON "public"."contacts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_conversations_updated_at" BEFORE UPDATE ON "public"."conversations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



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



ALTER TABLE ONLY "public"."contact_segment_members"
    ADD CONSTRAINT "contact_segment_members_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contact_segment_members"
    ADD CONSTRAINT "contact_segment_members_segment_id_fkey" FOREIGN KEY ("segment_id") REFERENCES "public"."contact_segments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contact_segments"
    ADD CONSTRAINT "contact_segments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."contacts"
    ADD CONSTRAINT "contacts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_assigned_agent_id_fkey" FOREIGN KEY ("assigned_agent_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id");



ALTER TABLE ONLY "public"."daily_metrics"
    ADD CONSTRAINT "daily_metrics_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."daily_metrics"
    ADD CONSTRAINT "daily_metrics_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id");



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



CREATE POLICY "Admins and GMs can create teams" ON "public"."teams" FOR INSERT WITH CHECK (("public"."get_current_user_role"() = ANY (ARRAY['admin'::"text", 'general_manager'::"text"])));



CREATE POLICY "Admins and GMs can update teams" ON "public"."teams" FOR UPDATE USING ((("public"."get_current_user_role"() = ANY (ARRAY['admin'::"text", 'general_manager'::"text"])) OR (("public"."get_current_user_role"() = 'leader'::"text") AND ("leader_id" = "auth"."uid"()))));



CREATE POLICY "Admins can update any profile" ON "public"."profiles" FOR UPDATE USING (("public"."get_current_user_role"() = 'admin'::"text")) WITH CHECK (("public"."get_current_user_role"() = 'admin'::"text"));



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



CREATE POLICY "Only admins can delete teams" ON "public"."teams" FOR DELETE USING (("public"."get_current_user_role"() = 'admin'::"text"));



CREATE POLICY "Only admins can modify app_settings" ON "public"."app_settings" USING (("public"."get_current_user_role"() = 'admin'::"text")) WITH CHECK (("public"."get_current_user_role"() = 'admin'::"text"));



CREATE POLICY "Only admins can view app_settings" ON "public"."app_settings" FOR SELECT USING (("public"."get_current_user_role"() = 'admin'::"text"));



CREATE POLICY "Users can create contacts" ON "public"."contacts" FOR INSERT WITH CHECK (("public"."get_current_user_role"() = ANY (ARRAY['admin'::"text", 'general_manager'::"text", 'leader'::"text", 'agent'::"text"])));



CREATE POLICY "Users can update own profile enhanced" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can update team contacts" ON "public"."contacts" FOR UPDATE USING ((("public"."get_current_user_role"() = ANY (ARRAY['admin'::"text", 'general_manager'::"text"])) OR ("created_by" IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."team_id" = "public"."get_current_user_team"())))));



CREATE POLICY "Users can view assigned conversations" ON "public"."conversations" FOR SELECT USING ((("public"."get_current_user_role"() = ANY (ARRAY['admin'::"text", 'general_manager'::"text"])) OR ("assigned_agent_id" = "auth"."uid"()) OR ("team_id" = "public"."get_current_user_team"())));



CREATE POLICY "Users can view campaigns" ON "public"."campaigns" FOR SELECT USING ((("public"."get_current_user_role"() = ANY (ARRAY['admin'::"text", 'general_manager'::"text"])) OR (("public"."get_current_user_role"() = ANY (ARRAY['leader'::"text", 'agent'::"text"])) AND ("created_by" IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."team_id" = "public"."get_current_user_team"()))))));



CREATE POLICY "Users can view conversation messages" ON "public"."messages" FOR SELECT USING (("conversation_id" IN ( SELECT "conversations"."id"
   FROM "public"."conversations"
  WHERE (("public"."get_current_user_role"() = ANY (ARRAY['admin'::"text", 'general_manager'::"text"])) OR ("conversations"."assigned_agent_id" = "auth"."uid"()) OR ("conversations"."team_id" = "public"."get_current_user_team"())))));



CREATE POLICY "Users can view own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view team contacts" ON "public"."contacts" FOR SELECT USING ((("public"."get_current_user_role"() = ANY (ARRAY['admin'::"text", 'general_manager'::"text"])) OR ("created_by" IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."team_id" = "public"."get_current_user_team"())))));



CREATE POLICY "Users can view teams based on role" ON "public"."teams" FOR SELECT USING ((("public"."get_current_user_role"() = ANY (ARRAY['admin'::"text", 'general_manager'::"text"])) OR (("public"."get_current_user_role"() = ANY (ARRAY['leader'::"text", 'agent'::"text"])) AND (("leader_id" = "auth"."uid"()) OR ("id" = "public"."get_current_user_team"())))));



ALTER TABLE "public"."campaign_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."campaigns" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."contacts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."conversations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."teams" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."can_manage_user_simple"("target_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_manage_user_simple"("target_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_manage_user_simple"("target_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_current_user_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_user_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_user_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_current_user_team"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_user_team"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_user_team"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


















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



GRANT ALL ON TABLE "public"."contact_segment_members" TO "anon";
GRANT ALL ON TABLE "public"."contact_segment_members" TO "authenticated";
GRANT ALL ON TABLE "public"."contact_segment_members" TO "service_role";



GRANT ALL ON TABLE "public"."contact_segments" TO "anon";
GRANT ALL ON TABLE "public"."contact_segments" TO "authenticated";
GRANT ALL ON TABLE "public"."contact_segments" TO "service_role";



GRANT ALL ON TABLE "public"."contacts" TO "anon";
GRANT ALL ON TABLE "public"."contacts" TO "authenticated";
GRANT ALL ON TABLE "public"."contacts" TO "service_role";



GRANT ALL ON TABLE "public"."conversations" TO "anon";
GRANT ALL ON TABLE "public"."conversations" TO "authenticated";
GRANT ALL ON TABLE "public"."conversations" TO "service_role";



GRANT ALL ON TABLE "public"."daily_metrics" TO "anon";
GRANT ALL ON TABLE "public"."daily_metrics" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_metrics" TO "service_role";



GRANT ALL ON TABLE "public"."message_templates" TO "anon";
GRANT ALL ON TABLE "public"."message_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."message_templates" TO "service_role";



GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."teams" TO "anon";
GRANT ALL ON TABLE "public"."teams" TO "authenticated";
GRANT ALL ON TABLE "public"."teams" TO "service_role";









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
