-- ВРЕМЕННОЕ ОТКЛЮЧЕНИЕ RLS ДЛЯ ТЕСТИРОВАНИЯ
-- ВНИМАНИЕ: Использовать только для отладки!

-- Отключаем RLS для всех таблиц
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE chats DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE events DISABLE ROW LEVEL SECURITY;
ALTER TABLE likes DISABLE ROW LEVEL SECURITY;
ALTER TABLE group_chats DISABLE ROW LEVEL SECURITY;
ALTER TABLE group_chat_participants DISABLE ROW LEVEL SECURITY;

-- Проверяем результат
SELECT 'RLS temporarily disabled for debugging' as status;
