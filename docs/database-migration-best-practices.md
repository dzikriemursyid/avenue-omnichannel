# Database Migration Best Practices

Panduan lengkap untuk mengelola database migrations dalam project WhatsApp omnichannel menggunakan Supabase CLI.

## 🎯 Overview

Setelah melakukan schema pull dari remote database, dokumen ini menjelaskan best practices untuk mengelola perubahan database ke depannya tanpa perlu reset ulang.

## 🚀 Migration Strategies

### Option 1: Normal Migration Flow (Recommended)

Untuk perubahan normal sehari-hari, gunakan workflow standard:

```bash
# 1. Buat migration baru
supabase migration new add_new_feature

# 2. Edit file migration yang dibuat
# supabase/migrations/20250717000000_add_new_feature.sql

# 3. Apply ke local development
supabase db reset

# 4. Test perubahan
supabase db diff

# 5. Apply ke remote production
supabase db push
```

**Kapan digunakan:**
- ✅ Menambah field baru ke table existing
- ✅ Membuat table baru
- ✅ Menambah index atau constraint
- ✅ Membuat function atau trigger baru
- ✅ Mengubah data type yang compatible

### Option 2: Schema Diff-Based (Recommended untuk Development)

Buat perubahan via UI/SQL editor, lalu generate migration:

```bash
# 1. Buat perubahan di Supabase Dashboard atau direct SQL

# 2. Generate migration dari perbedaan
supabase db diff --schema public > supabase/migrations/20250717000000_new_changes.sql

# 3. Review file yang dihasilkan

# 4. Apply ke production
supabase db push
```

**Kapan digunakan:**
- ✅ Rapid prototyping di development
- ✅ Menggunakan Supabase Dashboard untuk perubahan
- ✅ Complex schema changes yang lebih mudah via UI
- ✅ Reverse engineering dari production fixes

### Option 3: Pull & Reset (Untuk Major Changes Only)

**⚠️ HANYA gunakan untuk major restructuring!**

```bash
# 1. Backup current state
supabase db dump -f backup_$(date +%Y%m%d).sql

# 2. Clear migrations
rm supabase/migrations/*.sql

# 3. Pull fresh schema
supabase db pull

# 4. Rename as initial migration
mv supabase/schema.sql supabase/migrations/20250717000000_initial_schema.sql
```

**Kapan digunakan:**
- ❌ Jangan gunakan untuk perubahan kecil
- ⚠️ Major database restructuring
- ⚠️ Corruption dalam migration history
- ⚠️ Development environment yang berantakan

## 📋 Recommended Workflow untuk Project Ini

### 1. Small Changes (Daily Development)

**Contoh: Menambah field avatar ke table contacts**

```bash
# Step 1: Buat migration
supabase migration new add_contact_avatar_field

# Step 2: Edit migration file
# supabase/migrations/20250717000000_add_contact_avatar_field.sql
```

```sql
-- Add avatar field to contacts table
ALTER TABLE contacts ADD COLUMN avatar_url TEXT;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_contacts_avatar ON contacts(avatar_url);

-- Add comment
COMMENT ON COLUMN contacts.avatar_url IS 'URL to user avatar image';
```

```bash
# Step 3: Apply to local for testing
supabase db reset

# Step 4: Test your application
npm run dev

# Step 5: Apply to production
supabase db push
```

### 2. Medium Changes (Feature Additions)

**Contoh: Menambah message reactions system**

```bash
# Step 1: Plan the feature
supabase migration new add_message_reactions_system

# Step 2: Create comprehensive migration
```

```sql
-- Create message_reactions table
CREATE TABLE IF NOT EXISTS message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'love', 'laugh', 'angry', 'sad')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one reaction type per user per message
  UNIQUE(message_id, user_id, reaction_type)
);

-- Add indexes for performance
CREATE INDEX idx_message_reactions_message_id ON message_reactions(message_id);
CREATE INDEX idx_message_reactions_user_id ON message_reactions(user_id);
CREATE INDEX idx_message_reactions_created_at ON message_reactions(created_at DESC);

-- Add RLS policies
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all reactions" ON message_reactions
  FOR SELECT USING (true);

CREATE POLICY "Users can manage own reactions" ON message_reactions
  FOR ALL USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_message_reactions_updated_at
  BEFORE UPDATE ON message_reactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add helpful functions
CREATE OR REPLACE FUNCTION get_message_reaction_counts(message_uuid UUID)
RETURNS JSON AS $$
BEGIN
  RETURN (
    SELECT json_object_agg(reaction_type, count)
    FROM (
      SELECT reaction_type, COUNT(*) as count
      FROM message_reactions 
      WHERE message_id = message_uuid
      GROUP BY reaction_type
    ) counts
  );
END;
$$ LANGUAGE plpgsql;
```

### 3. Complex Changes (Multiple Tables)

**Contoh: Add user settings and preferences system**

```bash
supabase migration new add_user_settings_system
```

```sql
-- User settings table
CREATE TABLE IF NOT EXISTS user_settings (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  theme TEXT DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'auto')),
  language TEXT DEFAULT 'en' CHECK (language IN ('en', 'id', 'es', 'fr')),
  notifications JSONB DEFAULT '{"email": true, "push": true, "sound": true}'::jsonb,
  timezone TEXT DEFAULT 'UTC',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User preferences for chat
CREATE TABLE IF NOT EXISTS chat_preferences (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  auto_scroll BOOLEAN DEFAULT true,
  show_timestamps BOOLEAN DEFAULT true,
  message_preview_length INTEGER DEFAULT 100 CHECK (message_preview_length > 0),
  typing_indicators BOOLEAN DEFAULT true,
  read_receipts BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Initialize settings for existing users
INSERT INTO user_settings (user_id)
SELECT id FROM profiles
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO chat_preferences (user_id)
SELECT id FROM profiles  
ON CONFLICT (user_id) DO NOTHING;

-- Add triggers
CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_preferences_updated_at
  BEFORE UPDATE ON chat_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Auto-create settings for new users
CREATE OR REPLACE FUNCTION create_user_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_settings (user_id) VALUES (NEW.id);
  INSERT INTO chat_preferences (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_user_settings_on_profile_create
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_user_settings();
```

## ⚙️ Development vs Production Strategy

### Development Environment

```bash
# Development - bebas experiment
supabase db reset                    # Reset kapan saja
supabase migration new experiment    # Coba fitur baru
supabase db diff                     # Check perubahan
# Iterate, reset, repeat
```

### Staging Environment

```bash
# Staging - test before production
supabase link --project-ref staging-project-ref
supabase db push --dry-run          # Check SQL first
supabase db push                     # Apply to staging
# Test thoroughly
```

### Production Environment

```bash
# Production - ALWAYS incremental dan careful
supabase link --project-ref production-project-ref
supabase db push --dry-run          # ALWAYS dry run first
supabase db push                     # Apply after confirmation
# Monitor closely
```

## 🛡️ Safety Measures

### 1. Always Backup Before Major Changes

```bash
# Manual backup
supabase db dump -f backup_$(date +%Y%m%d_%H%M%S).sql

# Automated backup script
#!/bin/bash
BACKUP_DIR="database-backups"
mkdir -p $BACKUP_DIR
BACKUP_FILE="$BACKUP_DIR/backup_$(date +%Y%m%d_%H%M%S).sql"
supabase db dump -f "$BACKUP_FILE"
echo "✅ Backup created: $BACKUP_FILE"

# Optional: Upload to cloud storage
# aws s3 cp "$BACKUP_FILE" s3://your-backup-bucket/
```

### 2. Use Staging Environment

```bash
# Setup staging workflow
supabase link --project-ref staging-ref

# Test migration
supabase db push --dry-run
supabase db push

# Run tests
npm run test:staging

# If all good, deploy to production
supabase link --project-ref production-ref
supabase db push
```

### 3. Migration Validation

```bash
# Dry run untuk check SQL
supabase db push --dry-run

# Check diff sebelum apply
supabase db diff

# Validate schema after migration  
supabase db lint

# Check migration status
supabase migration list
```

### 4. Rollback Strategy

```sql
-- Always include rollback instructions in migration comments
/*
Migration: Add message reactions system
Date: 2025-01-17
Author: Developer Name

Purpose: Add ability for users to react to messages

Rollback plan:
1. DROP TABLE message_reactions;
2. DROP FUNCTION get_message_reaction_counts(UUID);
*/
```

## 📁 File Organization Best Practices

```
supabase/
├── migrations/
│   ├── 20250717000000_initial_schema.sql           # Base schema dari pull
│   ├── 20250718000000_add_message_reactions.sql    # Feature: Message reactions
│   ├── 20250719000000_optimize_conversation_indexes.sql  # Performance
│   ├── 20250720000000_add_user_settings.sql        # Feature: User preferences
│   ├── 20250721000000_add_webhook_retry_logic.sql  # Infrastructure
│   └── 20250722000000_conversation_analytics.sql   # Analytics features
├── seed.sql                                        # Sample/test data
├── config.toml                                     # Supabase configuration
└── schema.sql                                      # Reference schema (current state)
```

## 🔄 Migration Naming Convention

### Format Pattern

```
YYYYMMDDHHMMSS_descriptive_name.sql
```

### Good Examples

```bash
# Features
20250717120000_add_message_reactions.sql
20250717130000_add_user_notification_preferences.sql
20250717140000_implement_conversation_templates.sql

# Performance
20250718120000_optimize_conversation_queries.sql
20250718130000_add_message_search_indexes.sql

# Fixes
20250719120000_fix_conversation_window_trigger.sql
20250719130000_update_message_status_enum.sql

# Infrastructure
20250720120000_add_webhook_logging.sql
20250720130000_implement_audit_trail.sql
```

### Bad Examples

```bash
# Avoid these:
migration.sql              # Not descriptive
new_stuff.sql              # Vague
fix.sql                    # What fix?
update_db.sql              # Too generic
temp_changes.sql           # Temporary should not be in migrations
```

## 🎯 Migration Categories

### 1. Schema Changes

```sql
-- Table modifications
ALTER TABLE conversations ADD COLUMN archived_at TIMESTAMPTZ;
ALTER TABLE messages ALTER COLUMN content TYPE TEXT;
DROP TABLE IF EXISTS deprecated_table;

-- Constraints and indexes
CREATE INDEX CONCURRENTLY idx_messages_conversation_timestamp 
ON messages(conversation_id, created_at DESC);
ALTER TABLE contacts ADD CONSTRAINT unique_phone_number UNIQUE(phone_number);
```

### 2. Data Migrations

```sql
-- Data transformations
UPDATE conversations 
SET status = 'archived' 
WHERE last_message_at < NOW() - INTERVAL '90 days';

-- Populate new fields
UPDATE contacts 
SET full_name = COALESCE(first_name || ' ' || last_name, name)
WHERE full_name IS NULL;
```

### 3. Security Updates

```sql
-- RLS policies
CREATE POLICY "agents_own_conversations" ON conversations
  FOR ALL USING (
    auth.uid() IN (
      SELECT user_id FROM profiles 
      WHERE role IN ('agent', 'leader', 'admin')
    )
  );

-- Grant permissions
GRANT SELECT ON conversations TO authenticated;
REVOKE DELETE ON messages FROM authenticated;
```

### 4. Performance Optimizations

```sql
-- Indexes for performance
CREATE INDEX CONCURRENTLY idx_conversations_window_status 
ON conversations(status, is_within_window) 
WHERE conversation_window_expires_at IS NOT NULL;

-- Analyze tables after index creation
ANALYZE conversations;
ANALYZE messages;
```

## 🚨 Common Pitfalls and How to Avoid

### 1. Breaking Changes

```sql
-- ❌ BAD: Will break existing code
ALTER TABLE messages DROP COLUMN content;

-- ✅ GOOD: Deprecate gradually
ALTER TABLE messages ADD COLUMN message_text TEXT;
-- Update code to use message_text
-- Later: DROP COLUMN content;
```

### 2. Long-Running Migrations

```sql
-- ❌ BAD: Locks table for long time
CREATE INDEX idx_large_table ON large_table(column);

-- ✅ GOOD: Non-blocking index creation
CREATE INDEX CONCURRENTLY idx_large_table ON large_table(column);
```

### 3. Missing Rollback Plans

```sql
-- ✅ ALWAYS document rollback
/*
Rollback plan:
DROP INDEX idx_conversations_window_status;
ALTER TABLE conversations DROP COLUMN new_field;
*/
```

## 📊 Monitoring and Maintenance

### 1. Migration Status Tracking

```bash
# Check migration history
supabase migration list

# See what's pending
supabase db diff

# Check current schema version
psql -c "SELECT * FROM supabase_migrations.schema_migrations ORDER BY version DESC LIMIT 5;"
```

### 2. Performance Monitoring

```sql
-- Monitor slow queries after migration
SELECT query, mean_exec_time, calls
FROM pg_stat_statements 
WHERE mean_exec_time > 1000
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Check index usage
SELECT schemaname, tablename, indexname, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
WHERE idx_tup_read = 0;
```

### 3. Regular Maintenance

```bash
# Weekly schema check
supabase db lint

# Monthly performance review
supabase db analyze

# Quarterly backup verification
pg_restore --list backup_latest.sql
```

## 🎯 Recommendations untuk Project Ini

### Going Forward Strategy

1. **Use Normal Migration Flow** untuk 95% perubahan
2. **Keep current schema.sql** sebagai reference documentation
3. **Always backup** sebelum major changes
4. **Test di local** dengan `supabase db reset`
5. **Use staging environment** untuk testing sebelum production
6. **Document rollback plans** dalam migration comments

### When to Reset vs Migrate

**Use Normal Migration:**
- ✅ Adding new features
- ✅ Performance improvements
- ✅ Bug fixes
- ✅ Security updates
- ✅ Regular development

**Only Reset When:**
- ❌ Database corruption
- ❌ Major architectural changes (rare)
- ❌ Development experiments gone wrong
- ❌ Migration history completely broken

### Emergency Procedures

```bash
# If migration fails in production
supabase db dump -f emergency_backup.sql
supabase migration repair --status reverted $(migration_id)
# Fix migration file
supabase db push
```

---

Dengan mengikuti practices ini, kita dapat maintain **clean migration history**, **safe deployments**, dan **reliable database evolution** untuk project WhatsApp omnichannel! 🚀