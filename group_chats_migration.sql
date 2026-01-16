-- Миграция для групповых чатов событий
-- Создание таблицы групповых чатов
CREATE TABLE group_chats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  created_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание таблицы участников групповых чатов
CREATE TABLE group_chat_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_chat_id UUID REFERENCES group_chats(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(group_chat_id, user_id)
);

-- Добавление group_chat_id в таблицу событий
ALTER TABLE events ADD COLUMN group_chat_id UUID REFERENCES group_chats(id) ON DELETE SET NULL;

-- Индексы для производительности
CREATE INDEX idx_group_chats_event_id ON group_chats(event_id);
CREATE INDEX idx_group_chats_created_by ON group_chats(created_by_id);
CREATE INDEX idx_group_chat_participants_chat_id ON group_chat_participants(group_chat_id);
CREATE INDEX idx_group_chat_participants_user_id ON group_chat_participants(user_id);

-- Включение RLS для новых таблиц
ALTER TABLE group_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_chat_participants ENABLE ROW LEVEL SECURITY;

-- RLS политики для group_chats
CREATE POLICY "Anyone can view group chats" ON group_chats
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create group chats" ON group_chats
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update own group chats" ON group_chats
  FOR UPDATE USING (created_by_id = auth.uid());

CREATE POLICY "Users can delete own group chats" ON group_chats
  FOR DELETE USING (created_by_id = auth.uid());

-- RLS политики для group_chat_participants
CREATE POLICY "Anyone can view group chat participants" ON group_chat_participants
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can join group chats" ON group_chat_participants
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can leave group chats" ON group_chat_participants
  FOR DELETE USING (user_id = auth.uid());

-- Триггер для обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_group_chats_updated_at 
    BEFORE UPDATE ON group_chats 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
