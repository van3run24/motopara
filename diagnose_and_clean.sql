-- ПРОВЕРКА ВНЕШНИХ КЛЮЧЕЙ И ССЫЛОК
-- Поиск всех FK которые могут ссылаться на event_chats

-- 1. Проверяем все внешние ключи
SELECT 
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND ccu.table_name = 'event_chats';

-- 2. Проверяем все таблицы которые могут ссылаться на event_chats
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
AND table_name = 'event_chats';

-- 3. Проверяем все RLS политики которые могут ссылаться на event_chats
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename = 'event_chats';

-- 4. Проверяем все триггеры
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_timing,
    action_condition,
    action_orientation
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
AND event_object_table = 'event_chats';

-- 5. Проверяем все функции
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public'
AND routine_definition LIKE '%event_chats%';

-- 6. Простое удаление таблицы (на всякий случай)
DROP TABLE IF EXISTS event_chats CASCADE;

-- 7. Сброс кэша
DISCARD PLANS;

-- 8. Перезагрузка
NOTIFY pgrst, 'reload schema';

SELECT 'Diagnostic complete' as status;
