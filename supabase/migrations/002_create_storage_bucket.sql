-- Create storage bucket for chat images
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-images', 'chat-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies
CREATE POLICY "Users can upload images to their spaces" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'chat-images' AND
  EXISTS (
    SELECT 1 FROM public.space_members
    WHERE space_members.space_id = (storage.foldername(name))[1]::uuid
    AND space_members.user_id = auth.uid()
  )
);

CREATE POLICY "Users can view images in their spaces" ON storage.objects
FOR SELECT USING (
  bucket_id = 'chat-images' AND
  EXISTS (
    SELECT 1 FROM public.space_members
    WHERE space_members.space_id = (storage.foldername(name))[1]::uuid
    AND space_members.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'chat-images' AND
  owner = auth.uid()
); 