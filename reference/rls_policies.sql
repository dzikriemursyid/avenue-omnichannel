-- ===================================================
-- FRESH START RLS - TRIGGER-COMPATIBLE POLICIES
-- Run AFTER mvp_database_schema.sql is successfully applied
-- ===================================================

-- ================================
-- STEP 1: VERIFY SCHEMA EXISTS
-- ================================

-- Check if main tables exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        RAISE EXCEPTION 'Table "profiles" does not exist. Please run mvp_database_schema.sql first.';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'teams') THEN
        RAISE EXCEPTION 'Table "teams" does not exist. Please run mvp_database_schema.sql first.';
    END IF;
    
    RAISE NOTICE 'Schema verification passed. Proceeding with RLS setup.';
END $$;

-- ================================
-- STEP 2: DROP EXISTING PROBLEMATIC POLICIES
-- ================================

-- Drop recursive policies that cause infinite loops
DROP POLICY IF EXISTS "Team can view contacts" ON contacts;

-- Clean slate for profiles policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "GM can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Leaders can view team profiles" ON profiles;
DROP POLICY IF EXISTS "Agents can view own and team profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
DROP POLICY IF EXISTS "Leaders can update team members" ON profiles;
DROP POLICY IF EXISTS "Only admins can create profiles" ON profiles;

-- ================================
-- STEP 3: CREATE HELPER FUNCTIONS (SECURITY DEFINER)
-- ================================

-- Function to get current user's role (bypasses RLS)
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS TEXT AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current user's team_id (bypasses RLS)
CREATE OR REPLACE FUNCTION get_current_user_team()
RETURNS UUID AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================
-- STEP 4: TRIGGER-FRIENDLY PROFILES POLICIES
-- ================================

-- Keep the basic self-view policy (already exists and works)
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);

-- Policy: Admins can see all profiles
CREATE POLICY "Admins can view all profiles" ON profiles
    FOR SELECT USING (
        get_current_user_role() = 'admin'
    );

-- Policy: General Managers can see all profiles
CREATE POLICY "GM can view all profiles" ON profiles
    FOR SELECT USING (
        get_current_user_role() = 'general_manager'
    );

-- Policy: Leaders can see their team members + own profile
CREATE POLICY "Leaders can view team profiles" ON profiles
    FOR SELECT USING (
        get_current_user_role() = 'leader' 
        AND (
            auth.uid() = id OR -- Can see own profile
            team_id = get_current_user_team() OR -- Can see team members
            id IN (
                SELECT leader_id FROM teams 
                WHERE leader_id = auth.uid()
            ) -- Can see if they're team leader
        )
    );

-- Policy: Agents can see own profile and team members
CREATE POLICY "Agents can view team profiles" ON profiles
    FOR SELECT USING (
        get_current_user_role() = 'agent' 
        AND (
            auth.uid() = id OR -- Can see own profile
            (team_id = get_current_user_team() AND team_id IS NOT NULL) -- Can see team members
        )
    );

-- ================================
-- STEP 5: UPDATE POLICIES
-- ================================

-- Policy: Users can update their own profile (non-conflicting with existing)
CREATE POLICY "Users can update own profile enhanced" ON profiles
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Policy: Admins can update any profile
CREATE POLICY "Admins can update any profile" ON profiles
    FOR UPDATE USING (
        get_current_user_role() = 'admin'
    )
    WITH CHECK (
        get_current_user_role() = 'admin'
    );

-- Policy: Leaders can update their team members
CREATE POLICY "Leaders can update team members" ON profiles
    FOR UPDATE USING (
        get_current_user_role() = 'leader' 
        AND team_id = get_current_user_team()
        AND team_id IS NOT NULL
    )
    WITH CHECK (
        get_current_user_role() = 'leader' 
        AND team_id = get_current_user_team()
        AND team_id IS NOT NULL
    );

-- ================================
-- STEP 6: INSERT POLICIES (TRIGGER-COMPATIBLE)
-- ================================

-- CRITICAL: Allow trigger to create profiles
CREATE POLICY "Allow admin and trigger profile creation" ON profiles
    FOR INSERT WITH CHECK (
        -- Allow admins to create profiles manually
        get_current_user_role() = 'admin' OR
        -- Allow triggers to create profiles (when auth.uid() matches profile id)
        auth.uid() = id
    );

-- ================================
-- STEP 7: DELETE POLICIES
-- ================================

-- Only admins can delete profiles
CREATE POLICY "Only admins can delete profiles" ON profiles
    FOR DELETE USING (
        get_current_user_role() = 'admin'
    );

-- ================================
-- STEP 8: TEAMS TABLE POLICIES
-- ================================

-- Teams policies using helper functions
CREATE POLICY "Admins and GMs can create teams" ON teams
    FOR INSERT WITH CHECK (
        get_current_user_role() IN ('admin', 'general_manager')
    );

-- ADD MISSING SELECT POLICIES FOR TEAMS
CREATE POLICY "Users can view teams based on role" ON teams
    FOR SELECT USING (
        get_current_user_role() IN ('admin', 'general_manager') OR
        (get_current_user_role() IN ('leader', 'agent') AND (
            -- Leaders can see their own team
            leader_id = auth.uid() OR
            -- Team members can see their team
            id = get_current_user_team()
        ))
    );

CREATE POLICY "Admins and GMs can update teams" ON teams
    FOR UPDATE USING (
        get_current_user_role() IN ('admin', 'general_manager') OR
        (get_current_user_role() = 'leader' AND leader_id = auth.uid())
    );

CREATE POLICY "Only admins can delete teams" ON teams
    FOR DELETE USING (
        get_current_user_role() = 'admin'
    );

-- ================================
-- STEP 9: CONTACTS TABLE POLICIES (NON-RECURSIVE)
-- ================================

-- Simple contact policies using helper functions (no recursion)
CREATE POLICY "Users can view team contacts" ON contacts
    FOR SELECT USING (
        get_current_user_role() IN ('admin', 'general_manager') OR
        created_by IN (
            SELECT id FROM profiles 
            WHERE team_id = get_current_user_team()
        )
    );

CREATE POLICY "Users can create contacts" ON contacts
    FOR INSERT WITH CHECK (
        get_current_user_role() IN ('admin', 'general_manager', 'leader', 'agent')
    );

CREATE POLICY "Users can update team contacts" ON contacts
    FOR UPDATE USING (
        get_current_user_role() IN ('admin', 'general_manager') OR
        created_by IN (
            SELECT id FROM profiles 
            WHERE team_id = get_current_user_team()
        )
    );

-- ================================
-- STEP 10: CAMPAIGNS TABLE POLICIES
-- ================================

-- Campaign policies for role-based access
CREATE POLICY "Users can view campaigns" ON campaigns
    FOR SELECT USING (
        get_current_user_role() IN ('admin', 'general_manager') OR
        (get_current_user_role() IN ('leader', 'agent') AND 
         created_by IN (
             SELECT id FROM profiles 
             WHERE team_id = get_current_user_team()
         ))
    );

CREATE POLICY "Leaders and above can create campaigns" ON campaigns
    FOR INSERT WITH CHECK (
        get_current_user_role() IN ('admin', 'general_manager', 'leader')
    );

CREATE POLICY "Campaign creators and admins can update" ON campaigns
    FOR UPDATE USING (
        get_current_user_role() IN ('admin', 'general_manager') OR
        created_by = auth.uid()
    );

-- ================================
-- STEP 11: CONVERSATIONS TABLE POLICIES
-- ================================

-- Conversation access based on assignment and team
CREATE POLICY "Users can view assigned conversations" ON conversations
    FOR SELECT USING (
        get_current_user_role() IN ('admin', 'general_manager') OR
        assigned_agent_id = auth.uid() OR
        team_id = get_current_user_team()
    );

CREATE POLICY "Agents can create conversations" ON conversations
    FOR INSERT WITH CHECK (
        get_current_user_role() IN ('admin', 'general_manager', 'leader', 'agent')
    );

CREATE POLICY "Assigned agents can update conversations" ON conversations
    FOR UPDATE USING (
        get_current_user_role() IN ('admin', 'general_manager') OR
        assigned_agent_id = auth.uid() OR
        team_id = get_current_user_team()
    );

-- ================================
-- STEP 12: MESSAGES TABLE POLICIES
-- ================================

-- Message policies based on conversation access
CREATE POLICY "Users can view conversation messages" ON messages
    FOR SELECT USING (
        conversation_id IN (
            SELECT id FROM conversations 
            WHERE get_current_user_role() IN ('admin', 'general_manager') OR
                  assigned_agent_id = auth.uid() OR
                  team_id = get_current_user_team()
        )
    );

CREATE POLICY "Conversation participants can create messages" ON messages
    FOR INSERT WITH CHECK (
        get_current_user_role() IN ('admin', 'general_manager', 'leader', 'agent')
    );

-- ================================
-- STEP 13: APP SETTINGS POLICIES
-- ================================

-- Only admins can manage app settings
CREATE POLICY "Only admins can view app_settings" ON app_settings
    FOR SELECT USING (
        get_current_user_role() = 'admin'
    );

CREATE POLICY "Only admins can modify app_settings" ON app_settings
    FOR ALL USING (
        get_current_user_role() = 'admin'
    )
    WITH CHECK (
        get_current_user_role() = 'admin'
    );

-- ================================
-- STEP 14: HELPER FUNCTIONS FOR APPLICATION
-- ================================

-- User management helper function
CREATE OR REPLACE FUNCTION can_manage_user_simple(target_user_id UUID)
RETURNS BOOLEAN AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================
-- STEP 15: VERIFY TRIGGER COMPATIBILITY
-- ================================

-- Test trigger compatibility
DO $$
DECLARE
    trigger_exists BOOLEAN;
    function_exists BOOLEAN;
    policy_exists BOOLEAN;
BEGIN
    -- Check if trigger exists
    SELECT EXISTS (
        SELECT 1 FROM pg_trigger pt
        JOIN pg_class pc ON pc.oid = pt.tgrelid
        JOIN pg_namespace pn ON pn.oid = pc.relnamespace
        WHERE pc.relname = 'users' 
        AND pn.nspname = 'auth'
        AND pt.tgname = 'on_auth_user_created'
    ) INTO trigger_exists;
    
    -- Check if function exists
    SELECT EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user'
    ) INTO function_exists;
    
    -- Check if trigger-friendly policy exists
    SELECT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' 
        AND policyname LIKE '%trigger%'
    ) INTO policy_exists;
    
    RAISE NOTICE '=== RLS SETUP COMPLETE ===';
    RAISE NOTICE 'Trigger exists: %', trigger_exists;
    RAISE NOTICE 'Function exists: %', function_exists;
    RAISE NOTICE 'Trigger-friendly policy: %', policy_exists;
    
    IF trigger_exists AND function_exists AND policy_exists THEN
        RAISE NOTICE '✅ Ready for automatic profile creation!';
        RAISE NOTICE 'Test by creating a new user in Supabase Dashboard';
    ELSE
        RAISE NOTICE '⚠️ Some components missing - check trigger setup';
    END IF;
END $$;
