-- Add group columns to contacts table
-- Migration: 20250712000000_add_contact_groups.sql

-- Add group_id and group_name columns to contacts table
ALTER TABLE "public"."contacts" 
ADD COLUMN "group_id" "text",
ADD COLUMN "group_name" "text";

-- Add index for group_id for better query performance
CREATE INDEX "idx_contacts_group_id" ON "public"."contacts" USING "btree" ("group_id");

-- Add comment to document the new columns
COMMENT ON COLUMN "public"."contacts"."group_id" IS 'Custom group identifier for organizing contacts';
COMMENT ON COLUMN "public"."contacts"."group_name" IS 'Display name for the contact group';

-- Update the updated_at trigger to include the new columns
-- (The existing trigger will automatically handle the new columns) 