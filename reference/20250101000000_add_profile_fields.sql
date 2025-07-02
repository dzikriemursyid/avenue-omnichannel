-- Add missing fields to profiles table
ALTER TABLE profiles 
ADD COLUMN phone_number TEXT,
ADD COLUMN avatar_url TEXT;

-- Add index for phone number lookups
CREATE INDEX idx_profiles_phone ON profiles(phone_number);

-- Add comment for documentation
COMMENT ON COLUMN profiles.phone_number IS 'User phone number for contact purposes';
COMMENT ON COLUMN profiles.avatar_url IS 'URL to user profile avatar image'; 