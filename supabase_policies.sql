-- Enable Row Level Security
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- MESSAGES POLICIES
-- Allow users to view messages in chats they are part of
CREATE POLICY "Users can view messages in their chats" ON public.messages
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.chats
    WHERE id = messages.chat_id
    AND (participant_1_id = auth.uid() OR participant_2_id = auth.uid())
  )
);

-- Allow users to insert messages in chats they are part of
CREATE POLICY "Users can insert messages in their chats" ON public.messages
FOR INSERT WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1 FROM public.chats
    WHERE id = chat_id
    AND (participant_1_id = auth.uid() OR participant_2_id = auth.uid())
  )
);

-- Allow users to update their own messages
CREATE POLICY "Users can update their own messages" ON public.messages
FOR UPDATE USING (auth.uid() = sender_id);

-- Allow users to delete their own messages
CREATE POLICY "Users can delete their own messages" ON public.messages
FOR DELETE USING (auth.uid() = sender_id);

-- USERS POLICIES
-- Allow public read access to users (for search)
CREATE POLICY "Public read access to users" ON public.users
FOR SELECT USING (true);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile" ON public.users
FOR UPDATE USING (auth.uid() = id);

-- CHATS POLICIES
-- Users can view their own chats
CREATE POLICY "Users can view own chats" ON public.chats
FOR SELECT USING (
  auth.uid() = participant_1_id OR auth.uid() = participant_2_id
);

-- Users can create chats (matches)
CREATE POLICY "Users can create chats" ON public.chats
FOR INSERT WITH CHECK (
  auth.uid() = participant_1_id OR auth.uid() = participant_2_id
);

-- LIKES POLICIES
-- Users can insert likes
CREATE POLICY "Users can insert likes" ON public.likes
FOR INSERT WITH CHECK (auth.uid() = from_user_id);

-- Users can view likes (to check matches)
CREATE POLICY "Users can view likes" ON public.likes
FOR SELECT USING (
  auth.uid() = from_user_id OR auth.uid() = to_user_id
);

-- EVENTS POLICIES
-- Public read access to events
CREATE POLICY "Public read access to events" ON public.events
FOR SELECT USING (true);

-- Users can create events
CREATE POLICY "Users can create events" ON public.events
FOR INSERT WITH CHECK (auth.uid() = created_by_id);

-- Users can delete their own events
CREATE POLICY "Users can delete own events" ON public.events
FOR DELETE USING (auth.uid() = created_by_id);

-- STORAGE POLICIES (You need to run this in Supabase Storage dashboard or SQL editor)
-- Create bucket 'images' if not exists
INSERT INTO storage.buckets (id, name, public) VALUES ('images', 'images', true) ON CONFLICT DO NOTHING;

-- Policy to allow authenticated uploads
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'images');

-- Policy to allow public viewing
CREATE POLICY "Allow public viewing" ON storage.objects
FOR SELECT TO public USING (bucket_id = 'images');
