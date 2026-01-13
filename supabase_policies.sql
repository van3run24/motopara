-- Enable Row Level Security
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Enable Realtime for tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
ALTER PUBLICATION supabase_realtime ADD TABLE public.likes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.events;

-- Add is_read column to messages table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='messages' AND column_name='is_read'
    ) THEN
        ALTER TABLE public.messages ADD COLUMN is_read BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- MESSAGES POLICIES
DROP POLICY IF EXISTS "Users can view messages in their chats" ON public.messages;
CREATE POLICY "Users can view messages in their chats" ON public.messages
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.chats
    WHERE id = messages.chat_id
    AND (participant_1_id = auth.uid() OR participant_2_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can insert messages in their chats" ON public.messages;
CREATE POLICY "Users can insert messages in their chats" ON public.messages
FOR INSERT WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1 FROM public.chats
    WHERE id = chat_id
    AND (participant_1_id = auth.uid() OR participant_2_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;
CREATE POLICY "Users can update their own messages" ON public.messages
FOR UPDATE USING (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Users can delete their own messages" ON public.messages;
CREATE POLICY "Users can delete their own messages" ON public.messages
FOR DELETE USING (auth.uid() = sender_id);

-- NEW POLICY: Allow updating is_read for received messages
DROP POLICY IF EXISTS "Users can mark received messages as read" ON public.messages;
CREATE POLICY "Users can mark received messages as read" ON public.messages
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.chats
    WHERE id = messages.chat_id
    AND (participant_1_id = auth.uid() OR participant_2_id = auth.uid())
  )
);

-- ALLOW READ STATUS UPDATES (Safe RPC function)
-- This function allows updating is_read status for messages in a chat where the user is a participant
CREATE OR REPLACE FUNCTION mark_messages_read(p_chat_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.messages
  SET is_read = true
  WHERE chat_id = p_chat_id
  AND sender_id != auth.uid()
  AND is_read = false
  AND EXISTS (
    SELECT 1 FROM public.chats
    WHERE id = p_chat_id
    AND (participant_1_id = auth.uid() OR participant_2_id = auth.uid())
  );
END;
$$;

-- USERS POLICIES
DROP POLICY IF EXISTS "Public read access to users" ON public.users;
CREATE POLICY "Public read access to users" ON public.users
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users
FOR UPDATE USING (auth.uid() = id);

-- CHATS POLICIES
DROP POLICY IF EXISTS "Users can view own chats" ON public.chats;
CREATE POLICY "Users can view own chats" ON public.chats
FOR SELECT USING (
  auth.uid() = participant_1_id OR auth.uid() = participant_2_id
);

DROP POLICY IF EXISTS "Users can create chats" ON public.chats;
CREATE POLICY "Users can create chats" ON public.chats
FOR INSERT WITH CHECK (
  auth.uid() = participant_1_id OR auth.uid() = participant_2_id
);

-- LIKES POLICIES
DROP POLICY IF EXISTS "Users can insert likes" ON public.likes;
CREATE POLICY "Users can insert likes" ON public.likes
FOR INSERT WITH CHECK (auth.uid() = from_user_id);

DROP POLICY IF EXISTS "Users can view likes" ON public.likes;
CREATE POLICY "Users can view likes" ON public.likes
FOR SELECT USING (
  auth.uid() = from_user_id OR auth.uid() = to_user_id
);

-- EVENTS POLICIES
DROP POLICY IF EXISTS "Public read access to events" ON public.events;
CREATE POLICY "Public read access to events" ON public.events
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create events" ON public.events;
CREATE POLICY "Users can create events" ON public.events
FOR INSERT WITH CHECK (auth.uid() = created_by_id);

DROP POLICY IF EXISTS "Users can delete own events" ON public.events;
CREATE POLICY "Users can delete own events" ON public.events
FOR DELETE USING (auth.uid() = created_by_id);
