-- Универсальный SQL для групповых чатов событий
-- Можно выполнять многократно без ошибок дублирования

-- ============================================
-- ТАБЛИЦЫ
-- ============================================

-- Таблица групповых чатов событий
CREATE TABLE IF NOT EXISTS event_chats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица участников группового чата
CREATE TABLE IF NOT EXISTS event_participants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    chat_id UUID REFERENCES event_chats(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(chat_id, user_id)
);

-- Таблица сообщений группового чата
CREATE TABLE IF NOT EXISTS event_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    chat_id UUID REFERENCES event_chats(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    text TEXT,
    type TEXT DEFAULT 'text' CHECK (type IN ('text', 'image', 'system')),
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_read BOOLEAN DEFAULT FALSE
);

-- ============================================
-- ИНДЕКСЫ
-- ============================================

CREATE INDEX IF NOT EXISTS idx_event_chats_event_id ON event_chats(event_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_chat_id ON event_participants(chat_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_user_id ON event_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_event_messages_chat_id ON event_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_event_messages_created_at ON event_messages(created_at);

-- ============================================
-- ПОЛЯ max_participants
-- ============================================

-- Добавляем поле max_participants если его нет
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'max_participants') THEN
        ALTER TABLE events ADD COLUMN max_participants INTEGER;
    END IF;
END $$;

-- ============================================
-- ФУНКЦИИ
-- ============================================

-- Функция для создания группового чата при создании события
CREATE OR REPLACE FUNCTION create_event_chat()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO event_chats (event_id, name)
    VALUES (NEW.id, 'Чат события: ' || NEW.title);
    
    -- Автоматически добавляем создателя события в чат и в участники
    INSERT INTO event_participants (chat_id, user_id)
    VALUES (
        (SELECT id FROM event_chats WHERE event_id = NEW.id LIMIT 1),
        NEW.created_by_id
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ТРИГГЕРЫ
-- ============================================

DROP TRIGGER IF EXISTS on_event_create_chat ON events;
CREATE TRIGGER on_event_create_chat
    AFTER INSERT ON events
    FOR EACH ROW
    EXECUTE FUNCTION create_event_chat();

-- ============================================
-- RLS ПОЛИТИКИ
-- ============================================

-- Включаем RLS
ALTER TABLE event_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_messages ENABLE ROW LEVEL SECURITY;

-- Удаляем существующие политики если есть
DROP POLICY IF EXISTS "Users can view event chats for events they can see" ON event_chats;
DROP POLICY IF EXISTS "Users can view event participants" ON event_participants;
DROP POLICY IF EXISTS "Users can join event chats" ON event_participants;
DROP POLICY IF EXISTS "Users can leave event chats" ON event_participants;
DROP POLICY IF EXISTS "Users can delete own event participants" ON event_participants;
DROP POLICY IF EXISTS "Users can view messages in joined event chats" ON event_messages;
DROP POLICY IF EXISTS "Users can send messages in joined event chats" ON event_messages;

-- Создаем политики для event_chats
CREATE POLICY "Users can view event chats for events they can see" ON event_chats
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id = event_chats.event_id 
            AND events.city = (
                SELECT city FROM auth.users WHERE auth.users.id = auth.uid()
            )
        )
    );

-- Создаем политики для event_participants
CREATE POLICY "Users can view event participants" ON event_participants
    FOR SELECT USING (
        chat_id IN (
            SELECT id FROM event_chats 
            WHERE event_chats.event_id IN (
                SELECT id FROM events 
                WHERE events.city = (
                    SELECT city FROM auth.users WHERE auth.users.id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "Users can join event chats" ON event_participants
    FOR INSERT WITH CHECK (
        user_id = auth.uid()
    );

CREATE POLICY "Users can leave event chats" ON event_participants
    FOR DELETE USING (
        user_id = auth.uid()
    );

CREATE POLICY "Users can delete own event participants" ON event_participants
    FOR DELETE USING (
        user_id = auth.uid()
    );

-- Создаем политики для event_messages
CREATE POLICY "Users can view messages in joined event chats" ON event_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM event_participants 
            WHERE event_participants.chat_id = event_messages.chat_id 
            AND event_participants.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can send messages in joined event chats" ON event_messages
    FOR INSERT WITH CHECK (
        sender_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM event_participants 
            WHERE event_participants.chat_id = event_messages.chat_id 
            AND event_participants.user_id = auth.uid()
        )
    );

-- ============================================
-- ОЧИСТКА КЭША СХЕМЫ
-- ============================================

-- Функция для очистки кэша схемы
CREATE OR REPLACE FUNCTION clear_schema_cache()
RETURNS void AS $$
BEGIN
    NOTIFY pg_stat_reset();
END;
$$ LANGUAGE plpgsql;

-- Вызываем функцию после создания всех таблиц
SELECT clear_schema_cache();
