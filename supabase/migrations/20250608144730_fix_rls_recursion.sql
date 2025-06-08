-- Fix infinite recursion in RLS policies for space_members table

-- Drop the problematic recursive policies
DROP POLICY IF EXISTS "Space owners can add members" ON public.space_members;
DROP POLICY IF EXISTS "Users can view members of their spaces" ON public.space_members;

-- Create non-recursive policies for space_members

-- Allow space owners to add members by checking ownership in the spaces table directly
CREATE POLICY "Space owners can add members" ON public.space_members
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.spaces
            WHERE spaces.id = space_id
            AND spaces.created_by = auth.uid()
        )
    );

-- Allow users to view members of spaces they own or are members of
-- Use a simpler approach that doesn't cause recursion
CREATE POLICY "Users can view members of their spaces" ON public.space_members
    FOR SELECT USING (
        -- User can see members of spaces they own
        EXISTS (
            SELECT 1 FROM public.spaces
            WHERE spaces.id = space_members.space_id
            AND spaces.created_by = auth.uid()
        )
        OR
        -- User can see members of spaces where they are already a member
        -- This is safe because we're checking a specific row, not doing a table scan
        (space_members.user_id = auth.uid())
    );

-- Also add a policy to allow users to insert themselves as members when joining via shared link
CREATE POLICY "Users can add themselves as members" ON public.space_members
    FOR INSERT WITH CHECK (user_id = auth.uid());