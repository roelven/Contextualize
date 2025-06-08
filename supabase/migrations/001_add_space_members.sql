-- Create space_members table to track who has access to each space
CREATE TABLE IF NOT EXISTS public.space_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    space_id UUID NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(space_id, user_id)
);

-- Enable RLS on space_members
ALTER TABLE public.space_members ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view spaces they are members of" ON public.spaces;
DROP POLICY IF EXISTS "Users can create spaces" ON public.spaces;
DROP POLICY IF EXISTS "Users can update their own spaces" ON public.spaces;
DROP POLICY IF EXISTS "Users can view messages in their spaces" ON public.messages;
DROP POLICY IF EXISTS "Users can create messages in their spaces" ON public.messages;

-- Create RLS policies for spaces
CREATE POLICY "Users can view spaces they are members of" ON public.spaces
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.space_members
            WHERE space_members.space_id = spaces.id
            AND space_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create spaces" ON public.spaces
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own spaces" ON public.spaces
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.space_members
            WHERE space_members.space_id = spaces.id
            AND space_members.user_id = auth.uid()
            AND space_members.role = 'owner'
        )
    );

-- Create RLS policies for space_members
CREATE POLICY "Users can view members of their spaces" ON public.space_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.space_members sm
            WHERE sm.space_id = space_members.space_id
            AND sm.user_id = auth.uid()
        )
    );

CREATE POLICY "Space owners can add members" ON public.space_members
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.space_members
            WHERE space_members.space_id = space_id
            AND space_members.user_id = auth.uid()
            AND space_members.role = 'owner'
        )
    );

-- Create RLS policies for messages
CREATE POLICY "Users can view messages in their spaces" ON public.messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.space_members
            WHERE space_members.space_id = messages.space_id
            AND space_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create messages in their spaces" ON public.messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.space_members
            WHERE space_members.space_id = space_id
            AND space_members.user_id = auth.uid()
        )
    );

-- Create function to automatically add creator as owner when space is created
CREATE OR REPLACE FUNCTION public.add_creator_as_owner()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.space_members (space_id, user_id, role)
    VALUES (NEW.id, NEW.created_by, 'owner');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to add creator as owner
CREATE TRIGGER add_creator_as_owner_trigger
    AFTER INSERT ON public.spaces
    FOR EACH ROW
    EXECUTE FUNCTION public.add_creator_as_owner();

-- Add username column to profiles if it doesn't exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT; 