-- Fix space_members SELECT policy to resolve 406 Not Acceptable error

-- The issue is that users trying to check if they're members of a space
-- can't query the space_members table due to restrictive RLS policies

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Allow viewing space members" ON public.space_members;
DROP POLICY IF EXISTS "Users can view members of their spaces" ON public.space_members;
DROP POLICY IF EXISTS "Space owners can add members" ON public.space_members;
DROP POLICY IF EXISTS "Users can add themselves as members" ON public.space_members;

-- Create new, working policies

-- Allow users to check if they are members of a space (for access control)
CREATE POLICY "Users can check their own membership" ON public.space_members
    FOR SELECT USING (user_id = auth.uid());

-- Allow users to see all members of spaces they own (avoid recursion)
CREATE POLICY "Space owners can view all members" ON public.space_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.spaces
            WHERE spaces.id = space_members.space_id
            AND spaces.created_by = auth.uid()
        )
    );

-- Allow space owners to add new members
CREATE POLICY "Space owners can add members" ON public.space_members
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.spaces
            WHERE spaces.id = space_id
            AND spaces.created_by = auth.uid()
        )
    );

-- Allow users to add themselves as members (for shared link access)
CREATE POLICY "Users can add themselves as members" ON public.space_members
    FOR INSERT WITH CHECK (user_id = auth.uid());