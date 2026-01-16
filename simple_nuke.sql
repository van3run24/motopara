-- МАКСИМАЛЬНО ПРОСТОЙ И НАДЕЖНЫЙ СКРИПТ
-- Только удаление event_chats без сложных проверок

-- 1. Удаляем таблицу если она существует
DROP TABLE IF EXISTS event_chats CASCADE;

-- 2. Удаляем связанную таблицу участников
DROP TABLE IF EXISTS event_chat_participants CASCADE;

-- 3. Удаляем все возможные функции
DROP FUNCTION IF EXISTS public.handle_event_chat() CASCADE;
DROP FUNCTION IF EXISTS public.event_chat_participants_count() CASCADE;
DROP FUNCTION IF EXISTS public.get_event_chat_messages() CASCADE;

-- 4. Удаляем все возможные триггеры
DROP TRIGGER IF EXISTS event_chat_trigger ON events;
DROP TRIGGER IF EXISTS update_event_chat_timestamp ON event_chats;

-- 5. Удаляем все возможные представления
DROP VIEW IF EXISTS event_chat_summary CASCADE;
DROP VIEW IF EXISTS event_chat_participants_view CASCADE;

-- 6. Очищаем кэш
RESET PLANS;

-- 7. Перезагружаем схему Supabase
NOTIFY pgrst, 'reload schema';

-- 8. Простая проверка
SELECT 'event_chats table and all related objects have been removed' as result;
