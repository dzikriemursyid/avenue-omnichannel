# Contact Groups Migration Fix

## Issue

Existing contacts in the database have `group_id = NULL`, which means they don't appear in any specific group. Only the "All Contacts" group shows all contacts regardless of group_id.

## Solution Options

### Option 1: Keep existing contacts unassigned (Recommended)

No action needed. The "All Contacts" group will show all contacts regardless of group_id. This is the current behavior.

### Option 2: Assign all existing contacts to "All Contacts" group

If you want existing contacts to be explicitly assigned to the "All Contacts" group:

```sql
-- Get the ID of "All Contacts" group
-- Then update all contacts with NULL group_id
UPDATE contacts
SET group_id = (
    SELECT id FROM contact_groups WHERE name = 'All Contacts' LIMIT 1
)
WHERE group_id IS NULL;
```

### Option 3: Create an "Unassigned" group for existing contacts

```sql
-- Create an "Unassigned" group
INSERT INTO contact_groups (name, description, color, icon)
VALUES ('Unassigned', 'Contacts without a specific group', '#9CA3AF', 'Users');

-- Assign all NULL group_id contacts to this group
UPDATE contacts
SET group_id = (
    SELECT id FROM contact_groups WHERE name = 'Unassigned' LIMIT 1
)
WHERE group_id IS NULL;
```

## Current Behavior (No Migration Needed)

- **"All Contacts" group**: Shows ALL contacts (including those with NULL group_id)
- **Specific groups**: Show only contacts assigned to that group
- **Adding new contacts**:
  - When in "All Contacts" → contact gets NULL group_id
  - When in specific group → contact gets that group_id automatically

## Recommendation

**Keep the current behavior** (Option 1). This is the most flexible approach:

- Existing contacts remain unassigned but visible in "All Contacts"
- New contacts get assigned to appropriate groups based on context
- Clean separation between "All Contacts" (everything) and specific groups
