-- Fix spaces permissions to only show spaces the user has access to
-- Not all spaces on the platform!

-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Anyone can view spaces" ON public.spaces;
DROP POLICY IF EXISTS "Authenticated users can create spaces" ON public.spaces;
DROP POLICY IF EXISTS "Users can update their own spaces" ON public.spaces;

-- Create proper restrictive policies

-- Users can only view spaces they are members of
CREATE POLICY "Users can view their member spaces" ON public.spaces
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.space_members
            WHERE space_members.space_id = spaces.id
            AND space_members.user_id = auth.uid()
        )
    );

-- Users can create new spaces
CREATE POLICY "Authenticated users can create spaces" ON public.spaces
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Only space creators can update their spaces
CREATE POLICY "Space creators can update their spaces" ON public.spaces
    FOR UPDATE USING (created_by = auth.uid());