-- Fix foreign key relationships to enable PostgREST relationship queries

-- The issue is that messages.user_id references auth.users.id 
-- and profiles.id also references auth.users.id
-- But PostgREST can't traverse through the auth schema
-- So we need to create a direct relationship or use a different approach

-- First, create missing profiles for any users that don't have them
INSERT INTO public.profiles (id, username)
SELECT DISTINCT u.id, u.email
FROM auth.users u
WHERE u.id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

-- Option 1: Create a direct foreign key from messages to profiles
-- This assumes that every user_id in messages has a corresponding profile
ALTER TABLE public.messages 
DROP CONSTRAINT IF EXISTS messages_profiles_fkey;

ALTER TABLE public.messages 
ADD CONSTRAINT messages_profiles_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id);

-- Also fix space_members to profiles relationship  
ALTER TABLE public.space_members 
DROP CONSTRAINT IF EXISTS space_members_profiles_fkey;

ALTER TABLE public.space_members 
ADD CONSTRAINT space_members_profiles_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id);

-- Ensure all users have profiles by creating them if they don't exist
-- This function will be called by a trigger
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (new.id, new.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-create profiles for new users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();