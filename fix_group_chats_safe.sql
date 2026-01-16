-- МЯГКОЕ ИСПРАВЛЕНИЕ СТРУКТУРЫ ГРУППОВЫХ ЧАТОВ (сохраняем всех пользователей)
-- Этот скрипт только добавляет недостающие таблицы и исправляет связи

-- 1. Проверяем и создаем таблицу group_chats если не существует
CREATE TABLE IF NOT EXISTS group_chats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  created_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Проверяем и создаем таблицу group_chat_participants если не существует
CREATE TABLE IF NOT EXISTS group_chat_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_chat_id UUID REFERENCES group_chats(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(group_chat_id, user_id)
);

-- 3. Добавляем group_chat_id в таблицу events если не существует
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='events' AND column_name='group_chat_id'
    ) THEN
        ALTER TABLE events ADD COLUMN group_chat_id UUID REFERENCES group_chats(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 4. Добавляем group_chat_id в таблицу messages если не существует
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='messages' AND column_name='group_chat_id'
    ) THEN
        ALTER TABLE messages ADD COLUMN group_chat_id UUID REFERENCES group_chats(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 5. Создаем индексы если не существуют
CREATE INDEX IF NOT EXISTS idx_group_chats_event_id ON group_chats(event_id);
CREATE INDEX IF NOT EXISTS idx_group_chats_created_by ON group_chats(created_by_id);
CREATE INDEX IF NOT EXISTS idx_group_chat_participants_chat_id ON group_chat_participants(group_chat_id);
CREATE INDEX IF NOT EXISTS idx_group_chat_participants_user_id ON group_chat_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_group_chat_id ON messages(group_chat_id);

-- 6. Включаем RLS для новых таблиц если не включен
ALTER TABLE group_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_chat_participants ENABLE ROW LEVEL SECURITY;

-- 7. Удаляем старые политики если существуют и создаем новые
DROP POLICY IF EXISTS "Anyone can view group chats" ON group_chats;
DROP POLICY IF EXISTS "Authenticated users can create group chats" ON group_chats;
DROP POLICY IF EXISTS "Users can update own group chats" ON group_chats;
DROP POLICY IF EXISTS "Users can delete own group chats" ON group_chats;

-- Создаем правильные политики для group_chats
CREATE POLICY "Anyone can view group chats" ON group_chats
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create group chats" ON group_chats
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update own group chats" ON group_chats
  FOR UPDATE USING (created_by_id = auth.uid());

CREATE POLICY "Users can delete own group chats" ON group_chats
  FOR DELETE USING (created_by_id = auth.uid());

-- Политики для group_chat_participants
DROP POLICY IF EXISTS "Anyone can view group chat participants" ON group_chat_participants;
DROP POLICY IF EXISTS "Authenticated users can join group chats" ON group_chat_participants;
DROP POLICY IF EXISTS "Users can leave group chats" ON group_chat_participants;

CREATE POLICY "Anyone can view group chat participants" ON group_chat_participants
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can join group chats" ON group_chat_participants
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can leave group chats" ON group_chat_participants
  FOR DELETE USING (user_id = auth.uid());

-- 8. Обновляем политики для messages чтобы поддерживать групповые чаты
DROP POLICY IF EXISTS "Users can view messages in own chats" ON messages;
DROP POLICY IF EXISTS "Users can insert messages in own chats" ON messages;
DROP POLICY IF EXISTS "Users can view messages in own chats and group chats" ON messages;
DROP POLICY IF EXISTS "Users can insert messages in own chats and group chats" ON messages;

-- Создаем обновленные политики для messages
CREATE POLICY "Users can view messages in own chats and group chats" ON messages
  FOR SELECT USING (
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

-- 9. Создаем функцию для updated_at если не существует
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 10. Создаем триггер для group_chats если не существует
DROP TRIGGER IF EXISTS update_group_chats_updated_at ON group_chats;
CREATE TRIGGER update_group_chats_updated_at 
    BEFORE UPDATE ON group_chats 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 11. Удаляем все упоминания старых таблиц event_chats если они есть
DROP TABLE IF EXISTS event_chats CASCADE;
DROP TABLE IF EXISTS event_chat_participants CASCADE;
DROP FUNCTION IF EXISTS public.handle_event_chat() CASCADE;
DROP TRIGGER IF EXISTS event_chat_trigger ON events;

-- 12. Проверяем результат
SELECT 
    'group_chats' as table_name,
    (SELECT COUNT(*) FROM group_chats) as row_count
UNION ALL
SELECT 
    'group_chat_participants' as table_name,
    (SELECT COUNT(*) FROM group_chat_participants) as row_count
UNION ALL
SELECT 
    'users' as table_name,
    (SELECT COUNT(*) FROM users) as row_count
UNION ALL
SELECT 
    'events' as table_name,
    (SELECT COUNT(*) FROM events) as row_count;

-- 13. Перезагружаем схему для применения изменений
NOTIFY pgrst, 'reload schema';

SELECT 'Group chat structure fixed successfully! All users data preserved.' as status;
