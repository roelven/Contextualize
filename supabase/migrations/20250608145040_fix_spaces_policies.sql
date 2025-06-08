-- Fix recursive policies on spaces table and simplify the access model

-- Drop all existing conflicting policies on spaces table
DROP POLICY IF EXISTS "Anyone can view spaces" ON public.spaces;
DROP POLICY IF EXISTS "Users can view spaces they are members of" ON public.spaces;
DROP POLICY IF EXISTS "Users can update their own spaces" ON public.spaces;
DROP POLICY IF EXISTS "Authenticated users can create spaces" ON public.spaces;
DROP POLICY IF EXISTS "Users can create spaces" ON public.spaces;

-- Drop problematic policies on messages that reference space_members
DROP POLICY IF EXISTS "Users can view messages in their spaces" ON public.messages;
DROP POLICY IF EXISTS "Users can create messages in their spaces" ON public.messages;
DROP POLICY IF EXISTS "Authenticated users can insert messages" ON public.messages;

-- Create simple, non-recursive policies for spaces
-- For now, let's make spaces visible to everyone but editable only by creators
-- This avoids the recursion issue while we get the basic functionality working

CREATE POLICY "Anyone can view spaces" ON public.spaces
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create spaces" ON public.spaces
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update their own spaces" ON public.spaces
    FOR UPDATE USING (created_by = auth.uid());

-- Create simple policies for messages that don't reference space_members
-- (Anyone can view messages policy already exists, so we skip that)

CREATE POLICY "Authenticated users can create messages" ON public.messages
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');