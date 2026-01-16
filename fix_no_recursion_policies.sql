-- Удаляем все политики чтобы избежать рекурсии
DROP POLICY IF EXISTS "Users can view group chats" ON group_chats;
DROP POLICY IF EXISTS "Users can create group chats" ON group_chats;
DROP POLICY IF EXISTS "Users can update own group chats" ON group_chats;
DROP POLICY IF EXISTS "Users can delete own group chats" ON group_chats;

DROP POLICY IF EXISTS "Users can view group chat participants" ON group_chat_participants;
DROP POLICY IF EXISTS "Users can join group chats" ON group_chat_participants;
DROP POLICY IF EXISTS "Users can leave group chats" ON group_chat_participants;

-- Простые политики без рекурсии для group_chats
CREATE POLICY "Users can view own group chats" ON group_chats
  FOR SELECT USING (created_by_id = auth.uid());

CREATE POLICY "Users can create group chats" ON group_chats
  FOR INSERT WITH CHECK (created_by_id = auth.uid());

CREATE POLICY "Users can update own group chats" ON group_chats
  FOR UPDATE USING (created_by_id = auth.uid());

CREATE POLICY "Users can delete own group chats" ON group_chats
  FOR DELETE USING (created_by_id = auth.uid());

-- Простые политики без рекурсии для group_chat_participants
CREATE POLICY "Users can view own group chat participants" ON group_chat_participants
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can join group chats" ON group_chat_participants
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can leave group chats" ON group_chat_participants
  FOR DELETE USING (user_id = auth.uid());
