-- Исправление RLS политик для group_chats
DROP POLICY IF EXISTS "Users can view group chats" ON group_chats;
DROP POLICY IF EXISTS "Users can create group chats" ON group_chats;
DROP POLICY IF EXISTS "Users can update own group chats" ON group_chats;
DROP POLICY IF EXISTS "Users can delete own group chats" ON group_chats;

-- Более гибкие политики
CREATE POLICY "Users can view group chats" ON group_chats
  FOR SELECT USING (
    created_by_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM group_chat_participants 
      WHERE group_chat_participants.group_chat_id = group_chats.id 
      AND group_chat_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create group chats" ON group_chats
  FOR INSERT WITH CHECK (created_by_id = auth.uid());

CREATE POLICY "Users can update own group chats" ON group_chats
  FOR UPDATE USING (created_by_id = auth.uid());

CREATE POLICY "Users can delete own group chats" ON group_chats
  FOR DELETE USING (created_by_id = auth.uid());

-- Для group_chat_participants
DROP POLICY IF EXISTS "Users can view group chat participants" ON group_chat_participants;
DROP POLICY IF EXISTS "Users can join group chats" ON group_chat_participants;
DROP POLICY IF EXISTS "Users can leave group chats" ON group_chat_participants;

CREATE POLICY "Users can view group chat participants" ON group_chat_participants
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM group_chats 
      WHERE group_chats.id = group_chat_participants.group_chat_id 
      AND group_chats.created_by_id = auth.uid()
    )
  );

CREATE POLICY "Users can join group chats" ON group_chat_participants
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can leave group chats" ON group_chat_participants
  FOR DELETE USING (user_id = auth.uid());
