-- Добавление group_chat_id в таблицу messages
ALTER TABLE messages ADD COLUMN group_chat_id UUID REFERENCES group_chats(id) ON DELETE CASCADE;

-- Создание индекса для group_chat_id
CREATE INDEX idx_messages_group_chat_id ON messages(group_chat_id);

-- Обновление RLS политики для сообщений, чтобы поддерживать групповые чаты
DROP POLICY IF EXISTS "Users can view messages in own chats" ON messages;
DROP POLICY IF EXISTS "Users can insert messages in own chats" ON messages;

-- Новая политика для просмотра сообщений (личные и групповые чаты)
CREATE POLICY "Users can view messages in own chats and group chats" ON messages
  FOR SELECT USING (
    -- Личные чаты
    EXISTS (
      SELECT 1 FROM chats 
      WHERE chats.id = messages.chat_id 
      AND (chats.participant_1_id = auth.uid() OR chats.participant_2_id = auth.uid())
    )
    OR
    -- Групповые чаты
    EXISTS (
      SELECT 1 FROM group_chat_participants 
      WHERE group_chat_participants.group_chat_id = messages.group_chat_id 
      AND group_chat_participants.user_id = auth.uid()
    )
  );

-- Новая политика для отправки сообщений (личные и групповые чаты)
CREATE POLICY "Users can insert messages in own chats and group chats" ON messages
  FOR INSERT WITH CHECK (
    -- Личные чаты
    (chat_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM chats 
      WHERE chats.id = messages.chat_id 
      AND (chats.participant_1_id = auth.uid() OR chats.participant_2_id = auth.uid())
    ))
    OR
    -- Групповые чаты
    (group_chat_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM group_chat_participants 
      WHERE group_chat_participants.group_chat_id = messages.group_chat_id 
      AND group_chat_participants.user_id = auth.uid()
    ))
  );
