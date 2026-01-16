-- ПРОВЕРКА ТРИГГЕРОВ И ФУНКЦИЙ В SUPABASE
-- Этот скрипт покажет все триггеры и функции которые могут вызывать ошибку

-- Показать все триггеры в базе данных
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_timing,
    action_condition,
    action_orientation,
    action_statement
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- Показать все функции в базе данных
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public'
AND (routine_name LIKE '%event%' OR routine_name LIKE '%chat%')
ORDER BY routine_name;

-- Показать все внешние ключи которые могут ссылаться на event_chats
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
AND ccu.table_name = 'event_chats';

-- Проверить есть ли таблица event_chats
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
AND table_name = 'event_chats';

-- Очистить кэш Supabase
NOTIFY pgrst, 'reload schema';
