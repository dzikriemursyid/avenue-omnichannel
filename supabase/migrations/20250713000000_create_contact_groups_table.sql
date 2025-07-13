-- Create contact_groups table
CREATE TABLE IF NOT EXISTS "public"."contact_groups" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "name" text NOT NULL,
    "description" text,
    "color" text DEFAULT '#3B82F6',
    "icon" text DEFAULT 'Users',
    "contact_count" integer DEFAULT 0,
    "created_by" uuid,
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now()
);

-- Add primary key and constraints
ALTER TABLE ONLY "public"."contact_groups"
    ADD CONSTRAINT "contact_groups_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."contact_groups"
    ADD CONSTRAINT "contact_groups_name_key" UNIQUE ("name");

-- Add foreign key for created_by
ALTER TABLE ONLY "public"."contact_groups"
    ADD CONSTRAINT "contact_groups_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");

-- Add indexes
CREATE INDEX "idx_contact_groups_name" ON "public"."contact_groups" USING btree ("name");
CREATE INDEX "idx_contact_groups_created_by" ON "public"."contact_groups" USING btree ("created_by");

-- Add updated_at trigger
CREATE OR REPLACE TRIGGER "update_contact_groups_updated_at" 
    BEFORE UPDATE ON "public"."contact_groups" 
    FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

-- Update contacts table to use group_id as UUID foreign key
-- First, let's clean up the existing group_id column and make it a proper UUID
-- Ubah tipe kolom group_id menjadi UUID dengan casting eksplisit
ALTER TABLE "public"."contacts"
ALTER COLUMN "group_id" TYPE uuid USING group_id::uuid;



-- Add foreign key constraint for group_id
ALTER TABLE ONLY "public"."contacts"
    ADD CONSTRAINT "contacts_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."contact_groups"("id") ON DELETE SET NULL;

-- Create default groups
INSERT INTO "public"."contact_groups" ("name", "description", "color", "icon", "contact_count")
VALUES 
    ('All Contacts', 'All contacts in the system', '#6B7280', 'Users', 0),
    ('Customers', 'Paying customers', '#10B981', 'ShoppingBag', 0),
    ('Leads', 'Potential customers', '#F59E0B', 'Target', 0),
    ('Partners', 'Business partners', '#8B5CF6', 'Handshake', 0),
    ('Vendors', 'Service providers', '#EF4444', 'Truck', 0),
    ('Employees', 'Company employees', '#3B82F6', 'Briefcase', 0),
    ('Family', 'Family members', '#EC4899', 'Heart', 0),
    ('Friends', 'Personal friends', '#06B6D4', 'Users', 0);

-- Add RLS policies for contact_groups
ALTER TABLE "public"."contact_groups" ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can view contact groups
CREATE POLICY "Users can view contact groups" ON "public"."contact_groups" FOR SELECT 
    USING (
        auth.role() = 'authenticated'
    );

-- Policy: Users can create groups
CREATE POLICY "Users can create contact groups" ON "public"."contact_groups" FOR INSERT 
    WITH CHECK (
        get_current_user_role() = ANY (ARRAY['admin', 'general_manager', 'leader', 'agent'])
    );

-- Policy: Users can update groups they created or have permission
CREATE POLICY "Users can update contact groups" ON "public"."contact_groups" FOR UPDATE 
    USING (
        get_current_user_role() = ANY (ARRAY['admin', 'general_manager']) OR
        created_by = auth.uid()
    );

-- Policy: Users can delete groups they created or have permission
CREATE POLICY "Users can delete contact groups" ON "public"."contact_groups" FOR DELETE 
    USING (
        get_current_user_role() = ANY (ARRAY['admin', 'general_manager']) OR
        created_by = auth.uid()
    );

-- Function to update group contact counts
CREATE OR REPLACE FUNCTION update_group_contact_count()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Add trigger to update group counts when contacts change
CREATE TRIGGER update_contact_group_count
    AFTER INSERT OR UPDATE OR DELETE ON contacts
    FOR EACH ROW
    EXECUTE FUNCTION update_group_contact_count();

-- Grant permissions
GRANT ALL ON TABLE "public"."contact_groups" TO "anon";
GRANT ALL ON TABLE "public"."contact_groups" TO "authenticated";
GRANT ALL ON TABLE "public"."contact_groups" TO "service_role";