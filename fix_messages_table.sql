-- Делаем chat_id nullable для групповых чатов
ALTER TABLE messages ALTER COLUMN chat_id DROP NOT NULL;

-- Проверяем что group_chat_id существует
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'group_chat_id') THEN
        ALTER TABLE messages ADD COLUMN group_chat_id UUID REFERENCES group_chats(id) ON DELETE CASCADE;
    END IF;
END $$;
