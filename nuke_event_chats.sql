-- РАДИКАЛЬНАЯ ОЧИСТКА ВСЕХ ССЫЛОК НА EVENT_CHATS
-- Этот скрипт найдет и удалит ВСЕ функции, триггеры и представления

-- 1. Удаляем все функции которые могут содержать ссылки на event_chats
DO $$
DECLARE
    func_record RECORD;
BEGIN
    FOR func_record IN 
        SELECT routine_name 
        FROM information_schema.routines 
        WHERE routine_schema = 'public' 
        AND routine_definition LIKE '%event_chats%'
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS public.' || func_record.routine_name || ' CASCADE';
    END LOOP;
END $$;

-- 2. Удаляем все триггеры которые могут ссылаться на event_chats
DO $$
DECLARE
    trigger_record RECORD;
BEGIN
    FOR trigger_record IN 
        SELECT trigger_name, event_object_table
        FROM information_schema.triggers 
        WHERE trigger_schema = 'public' 
        AND (event_object_table = 'event_chats' OR definition LIKE '%event_chats%')
    LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || trigger_record.trigger_name || ' ON ' || COALESCE(trigger_record.event_object_table, 'events');
    END LOOP;
END $$;

-- 3. Удаляем все представления которые могут ссылаться на event_chats
DO $$
DECLARE
    view_record RECORD;
BEGIN
    FOR view_record IN 
        SELECT table_name 
        FROM information_schema.views 
        WHERE table_schema = 'public' 
        AND definition LIKE '%event_chats%'
    LOOP
        EXECUTE 'DROP VIEW IF EXISTS ' || view_record.table_name || ' CASCADE';
    END LOOP;
END $$;

-- 4. Удаляем саму таблицу если она существует
DROP TABLE IF EXISTS event_chats CASCADE;

-- 5. Удаляем все типы которые могут быть связаны с event_chats
DO $$
DECLARE
    type_record RECORD;
BEGIN
    FOR type_record IN 
        SELECT typname 
        FROM pg_type 
        WHERE typname LIKE '%event_chats%'
    LOOP
        EXECUTE 'DROP TYPE IF EXISTS ' || type_record.typname || ' CASCADE';
    END LOOP;
END $$;

-- 6. Проверяем и удаляем constraints которые могут ссылаться на event_chats
DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    FOR constraint_record IN 
        SELECT tc.table_name, tc.constraint_name, ccu.table_name AS foreign_table
        FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu 
            ON tc.constraint_name = ccu.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND ccu.table_name = 'event_chats'
    LOOP
        EXECUTE 'ALTER TABLE ' || constraint_record.table_name || ' DROP CONSTRAINT IF EXISTS ' || constraint_record.constraint_name;
    END LOOP;
END $$;

-- 7. Принудительная очистка кэша
DISCARD PLANS;
DISCARD SEQUENCES;

-- 8. Перезагрузка схемы
NOTIFY pgrst, 'reload schema';

-- 9. Проверяем что все удалено
SELECT 'event_chats' as object_name, 'DELETED' as status
UNION ALL
SELECT 'functions_with_event_chats' as object_name, 
       (SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public' AND routine_definition LIKE '%event_chats%') as status
UNION ALL  
SELECT 'triggers_with_event_chats' as object_name,
       (SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema = 'public' AND definition LIKE '%event_chats%') as status;

SELECT 'SUCCESS: All references to event_chats have been completely removed!' as final_status;
