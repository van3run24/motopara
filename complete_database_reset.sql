-- РАДИКАЛЬНАЯ ОЧИСТКА И ПЕРЕСОЗДАНИЕ БАЗЫ ДАННЫХ
-- ВНИМАНИЕ: Этот скрипт удалит ВСЕ данные и пересоздаст структуру

-- 1. Отключаем все триггеры
DROP TRIGGER IF EXISTS update_group_chats_updated_at ON group_chats;
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS event_chat_trigger ON events;

-- 2. Удаляем все функции
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS public.handle_event_chat() CASCADE;
DROP FUNCTION IF EXISTS public.mark_messages_read(p_chat_id UUID) CASCADE;

-- 3. Удаляем все политики
DROP POLICY IF EXISTS "Users can view all profiles" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can delete own profile" ON users;
DROP POLICY IF EXISTS "Users can view own chats" ON chats;
DROP POLICY IF EXISTS "Users can create chats" ON chats;
DROP POLICY IF EXISTS "Users can delete own chats" ON chats;
DROP POLICY IF EXISTS "Users can view messages in own chats" ON messages;
DROP POLICY IF EXISTS "Users can insert messages in own chats" ON messages;
DROP POLICY IF EXISTS "Users can view messages in own chats and group chats" ON messages;
DROP POLICY IF EXISTS "Users can insert messages in own chats and group chats" ON messages;
DROP POLICY IF EXISTS "Everyone can view events" ON events;
DROP POLICY IF EXISTS "Authenticated users can create events" ON events;
DROP POLICY IF EXISTS "Users can update own events" ON events;
DROP POLICY IF EXISTS "Users can delete own events" ON events;
DROP POLICY IF EXISTS "Users can insert likes" ON likes;
DROP POLICY IF EXISTS "Users can view own likes" ON likes;
DROP POLICY IF EXISTS "Users can view likes to them" ON likes;
DROP POLICY IF EXISTS "Anyone can view group chats" ON group_chats;
DROP POLICY IF EXISTS "Authenticated users can create group chats" ON group_chats;
DROP POLICY IF EXISTS "Users can update own group chats" ON group_chats;
DROP POLICY IF EXISTS "Users can delete own group chats" ON group_chats;
DROP POLICY IF EXISTS "Anyone can view group chat participants" ON group_chat_participants;
DROP POLICY IF EXISTS "Authenticated users can join group chats" ON group_chat_participants;
DROP POLICY IF EXISTS "Users can leave group chats" ON group_chat_participants;

-- 4. Удаляем все таблицы в правильном порядке (сначала дочерние)
DROP TABLE IF EXISTS group_chat_participants CASCADE;
DROP TABLE IF EXISTS group_chats CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS likes CASCADE;
DROP TABLE IF EXISTS chats CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 5. Пересоздаем структуру с нуля

-- Таблица пользователей
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  age INTEGER NOT NULL,
  city VARCHAR(100) NOT NULL,
  bike VARCHAR(100),
  gender VARCHAR(10) NOT NULL CHECK (gender IN ('male', 'female')),
  has_bike BOOLEAN DEFAULT false,
  about TEXT,
  temp VARCHAR(50),
  music VARCHAR(50),
  equip VARCHAR(50),
  goal VARCHAR(50),
  image TEXT,
  images TEXT[],
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  location_updated_at TIMESTAMP WITH TIME ZONE,
  has_seen_welcome BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица чатов
CREATE TABLE chats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  participant_1_id UUID REFERENCES users(id) ON DELETE CASCADE,
  participant_2_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_message TEXT,
  last_message_time TIMESTAMP WITH TIME ZONE,
  UNIQUE(participant_1_id, participant_2_id)
);

-- Таблица сообщений
CREATE TABLE messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
  group_chat_id UUID REFERENCES group_chats(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  text TEXT,
  image TEXT,
  type VARCHAR(20) DEFAULT 'text' CHECK (type IN ('text', 'image')),
  is_read BOOLEAN DEFAULT false,
  is_edited BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица событий
CREATE TABLE events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  city VARCHAR(100) NOT NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  address TEXT,
  link TEXT,
  created_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  group_chat_id UUID REFERENCES group_chats(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица лайков
CREATE TABLE likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  to_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  is_dislike BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(from_user_id, to_user_id)
);

-- Таблица групповых чатов
CREATE TABLE group_chats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  created_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица участников групповых чатов
CREATE TABLE group_chat_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_chat_id UUID REFERENCES group_chats(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(group_chat_id, user_id)
);

-- Индексы
CREATE INDEX idx_users_city ON users(city);
CREATE INDEX idx_users_gender ON users(gender);
CREATE INDEX idx_chats_participant_1 ON chats(participant_1_id);
CREATE INDEX idx_chats_participant_2 ON chats(participant_2_id);
CREATE INDEX idx_messages_chat_id ON messages(chat_id);
CREATE INDEX idx_messages_group_chat_id ON messages(group_chat_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_events_city ON events(city);
CREATE INDEX idx_events_date ON events(date);
CREATE INDEX idx_events_created_by ON events(created_by_id);
CREATE INDEX idx_likes_from ON likes(from_user_id);
CREATE INDEX idx_likes_to ON likes(to_user_id);
CREATE INDEX idx_group_chats_event_id ON group_chats(event_id);
CREATE INDEX idx_group_chats_created_by ON group_chats(created_by_id);
CREATE INDEX idx_group_chat_participants_chat_id ON group_chat_participants(group_chat_id);
CREATE INDEX idx_group_chat_participants_user_id ON group_chat_participants(user_id);

-- Включаем RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_chat_participants ENABLE ROW LEVEL SECURITY;

-- Политики для пользователей
CREATE POLICY "Users can view all profiles" ON users FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON users FOR INSERT WITH CHECK (auth.uid()::text = id::text);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid()::text = id::text);
CREATE POLICY "Users can delete own profile" ON users FOR DELETE USING (auth.uid()::text = id::text);

-- Политики для чатов
CREATE POLICY "Users can view own chats" ON chats FOR SELECT USING (participant_1_id = auth.uid() OR participant_2_id = auth.uid());
CREATE POLICY "Users can create chats" ON chats FOR INSERT WITH CHECK (participant_1_id = auth.uid() OR participant_2_id = auth.uid());
CREATE POLICY "Users can delete own chats" ON chats FOR DELETE USING (participant_1_id = auth.uid() OR participant_2_id = auth.uid());

-- Политики для сообщений
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

-- Политики для событий
CREATE POLICY "Everyone can view events" ON events FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create events" ON events FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can update own events" ON events FOR UPDATE USING (created_by_id = auth.uid());
CREATE POLICY "Users can delete own events" ON events FOR DELETE USING (created_by_id = auth.uid());

-- Политики для лайков
CREATE POLICY "Users can insert likes" ON likes FOR INSERT WITH CHECK (auth.uid() = from_user_id);
CREATE POLICY "Users can view own likes" ON likes FOR SELECT USING (auth.uid() = from_user_id);
CREATE POLICY "Users can view likes to them" ON likes FOR SELECT USING (auth.uid() = to_user_id);

-- Политики для групповых чатов
CREATE POLICY "Anyone can view group chats" ON group_chats FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create group chats" ON group_chats FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can update own group chats" ON group_chats FOR UPDATE USING (created_by_id = auth.uid());
CREATE POLICY "Users can delete own group chats" ON group_chats FOR DELETE USING (created_by_id = auth.uid());

-- Политики для участников групповых чатов
CREATE POLICY "Anyone can view group chat participants" ON group_chat_participants FOR SELECT USING (true);
CREATE POLICY "Authenticated users can join group chats" ON group_chat_participants FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can leave group chats" ON group_chat_participants FOR DELETE USING (user_id = auth.uid());

-- Функция для обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггеры для updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_group_chats_updated_at BEFORE UPDATE ON group_chats FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Перезагружаем схему
NOTIFY pgrst, 'reload schema';

SELECT 'Database completely reset and recreated successfully!' as status;
