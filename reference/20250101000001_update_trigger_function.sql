-- Update the handle_new_user trigger function to include new fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER; 