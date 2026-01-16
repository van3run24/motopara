-- Проверяем структуру таблицы messages
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'messages' 
AND column_name IN ('chat_id', 'group_chat_id')
ORDER BY column_name;
