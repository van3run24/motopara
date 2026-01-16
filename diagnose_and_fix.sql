-- Полная диагностика и очистка базы данных от старых ссылок на event_chats

-- 1. Проверяем существующие таблицы
SELECT table_name, table_schema 
FROM information_schema.tables 
WHERE table_name LIKE '%event%' OR table_name LIKE '%chat%'
ORDER BY table_name;

-- 2. Проверяем существующие функции
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND (routine_name LIKE '%event%' OR routine_name LIKE '%chat%')
ORDER BY routine_name;

-- 3. Проверяем существующие триггеры
SELECT trigger_name, event_manipulation, event_object_table 
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
AND (event_object_table LIKE '%event%' OR event_object_table LIKE '%chat%')
ORDER BY trigger_name;

-- 4. Проверяем RLS политики
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE (tablename LIKE '%event%' OR tablename LIKE '%chat%')
ORDER BY tablename, policyname;

-- 5. Удаляем все что связано с event_chats если существует
DROP FUNCTION IF EXISTS public.handle_event_chat() CASCADE;
DROP TRIGGER IF EXISTS event_chat_trigger ON events;
DROP POLICY IF EXISTS "Event chats policy" ON event_chats;
DROP POLICY IF EXISTS "Event chat participants policy" ON event_chat_participants;

-- 6. Проверяем внешние ключи
SELECT
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND (tc.table_name LIKE '%event%' OR tc.table_name LIKE '%chat%' OR ccu.table_name LIKE '%event%' OR ccu.table_name LIKE '%chat%')
ORDER BY tc.table_name;

-- Очистка кэша
NOTIFY pgrst, 'reload schema';
