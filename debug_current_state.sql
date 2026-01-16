-- Проверяем текущее состояние таблиц
SELECT 
    'events' as table_name,
    COUNT(*) as count,
    (SELECT MAX(created_at) FROM events) as latest_event
FROM events
UNION ALL
SELECT 
    'group_chats' as table_name,
    COUNT(*) as count,
    (SELECT MAX(created_at) FROM group_chats) as latest_chat
FROM group_chats
UNION ALL
SELECT 
    'group_chat_participants' as table_name,
    COUNT(*) as count,
    (SELECT MAX(joined_at) FROM group_chat_participants) as latest_participant
FROM group_chat_participants
ORDER BY table_name;

-- Проверяем структуру group_chats
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'group_chats'
ORDER BY ordinal_position;

-- Проверяем последние события с group_chat_id
SELECT id, title, group_chat_id, created_at
FROM events 
ORDER BY created_at DESC 
LIMIT 3;
