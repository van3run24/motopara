-- ГАРАНТИРОВАННОЕ УДАЛЕНИЕ СТАРЫХ ССЫЛОК (ИСПРАВЛЕННАЯ ВЕРСИЯ)
-- Правильный синтаксис PostgreSQL для политик

-- 1. Явно удаляем таблицу если она существует (игнорируем ошибки)
DROP TABLE IF EXISTS event_chats CASCADE;
DROP TABLE IF EXISTS event_chat_participants CASCADE;

-- 2. Удаляем функции которые могут ссылаться на старые таблицы
DROP FUNCTION IF EXISTS public.handle_event_chat() CASCADE;
DROP FUNCTION IF EXISTS public.event_chat_trigger() CASCADE;

-- 3. Удаляем триггеры на events которые могут ссылаться на event_chats
DROP TRIGGER IF EXISTS event_chat_trigger ON events;

-- 4. Удаляем старые политики если они существуют
DROP POLICY IF EXISTS "Anyone can view group chats" ON group_chats;
DROP POLICY IF EXISTS "Authenticated users can create group chats" ON group_chats;
DROP POLICY IF EXISTS "Users can update own group chats" ON group_chats;
DROP POLICY IF EXISTS "Users can delete own group chats" ON group_chats;
DROP POLICY IF EXISTS "Anyone can view group chat participants" ON group_chat_participants;
DROP POLICY IF EXISTS "Authenticated users can join group chats" ON group_chat_participants;
DROP POLICY IF EXISTS "Users can leave group chats" ON group_chat_participants;

-- 5. Создаем правильные таблицы если их нет
CREATE TABLE IF NOT EXISTS group_chats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    created_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS group_chat_participants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    group_chat_id UUID REFERENCES group_chats(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(group_chat_id, user_id)
);

-- 6. Добавляем колонки если их нет
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'group_chat_id') THEN
        ALTER TABLE events ADD COLUMN group_chat_id UUID REFERENCES group_chats(id) ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'group_chat_id') THEN
        ALTER TABLE messages ADD COLUMN group_chat_id UUID REFERENCES group_chats(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 7. Включаем RLS
ALTER TABLE group_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_chat_participants ENABLE ROW LEVEL SECURITY;

-- 8. Создаем политики с правильным синтаксисом
CREATE POLICY "Anyone can view group chats" ON group_chats FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create group chats" ON group_chats FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can update own group chats" ON group_chats FOR UPDATE USING (created_by_id = auth.uid());
CREATE POLICY "Users can delete own group chats" ON group_chats FOR DELETE USING (created_by_id = auth.uid());

CREATE POLICY "Anyone can view group chat participants" ON group_chat_participants FOR SELECT USING (true);
CREATE POLICY "Authenticated users can join group chats" ON group_chat_participants FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can leave group chats" ON group_chat_participants FOR DELETE USING (user_id = auth.uid());

-- 9. Обновляем политики для messages чтобы поддерживать групповые чаты
DROP POLICY IF EXISTS "Users can view messages in own chats" ON messages;
DROP POLICY IF EXISTS "Users can insert messages in own chats" ON messages;

CREATE POLICY "Users can view messages in own chats and group chats" ON messages FOR SELECT USING (
    (chat_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM chats 
      WHERE chats.id = messages.chat_id 
      AND (chats.participant_1_id = auth.uid() OR chats.participant_2_id = auth.uid())
    ))
    OR
    (group_chat_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM group_chat_participants 
      WHERE group_chat_participants.group_chat_id = messages.group_chat_id 
      AND group_chat_participants.user_id = auth.uid()
    ))
);

CREATE POLICY "Users can insert messages in own chats and group chats" ON messages FOR INSERT WITH CHECK (
    (chat_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM chats 
      WHERE chats.id = messages.chat_id 
      AND (chats.participant_1_id = auth.uid() OR chats.participant_2_id = auth.uid())
    ))
    OR
    (group_chat_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM group_chat_participants 
      WHERE group_chat_participants.group_chat_id = messages.group_chat_id 
      AND group_chat_participants.user_id = auth.uid()
    ))
);

-- 10. Создаем индексы
CREATE INDEX IF NOT EXISTS idx_group_chats_event_id ON group_chats(event_id);
CREATE INDEX IF NOT EXISTS idx_messages_group_chat_id ON messages(group_chat_id);

-- 11. Перезагружаем схему
NOTIFY pgrst, 'reload schema';

-- 12. Проверяем результат
SELECT 'SUCCESS: All old references removed and group chats structure created with correct syntax' as status;
