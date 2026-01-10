-- ИСПРАВЛЕННЫЙ СКРИПТ (С УДАЛЕНИЕМ СВЯЗЕЙ)
-- Выполните этот скрипт в Supabase SQL Editor

-- 1. Удаляем сообщения (от этих пользователей или в их чатах)
DELETE FROM messages 
WHERE sender_id IN (SELECT id FROM users WHERE name IN ('Марина', 'Аня', 'Вика', 'Мария', 'Анна', 'Виктория'))
   OR chat_id IN (
       SELECT id FROM chats 
       WHERE participant_1_id IN (SELECT id FROM users WHERE name IN ('Марина', 'Аня', 'Вика', 'Мария', 'Анна', 'Виктория'))
          OR participant_2_id IN (SELECT id FROM users WHERE name IN ('Марина', 'Аня', 'Вика', 'Мария', 'Анна', 'Виктория'))
   );

-- 2. Удаляем лайки (от них или им)
DELETE FROM likes 
WHERE from_user_id IN (SELECT id FROM users WHERE name IN ('Марина', 'Аня', 'Вика', 'Мария', 'Анна', 'Виктория'))
   OR to_user_id IN (SELECT id FROM users WHERE name IN ('Марина', 'Аня', 'Вика', 'Мария', 'Анна', 'Виктория'));

-- 3. Удаляем чаты с их участием
DELETE FROM chats 
WHERE participant_1_id IN (SELECT id FROM users WHERE name IN ('Марина', 'Аня', 'Вика', 'Мария', 'Анна', 'Виктория'))
   OR participant_2_id IN (SELECT id FROM users WHERE name IN ('Марина', 'Аня', 'Вика', 'Мария', 'Анна', 'Виктория'));

-- 4. Удаляем события, созданные ими
DELETE FROM events 
WHERE created_by_id IN (SELECT id FROM users WHERE name IN ('Марина', 'Аня', 'Вика', 'Мария', 'Анна', 'Виктория'));

-- 5. Теперь безопасно удаляем самих пользователей
DELETE FROM users 
WHERE name IN ('Марина', 'Аня', 'Вика', 'Мария', 'Анна', 'Виктория');

-- 6. Добавляем колонку images для работы галереи (если её нет)
ALTER TABLE users ADD COLUMN IF NOT EXISTS images TEXT[];

-- 7. Переносим главное фото в галерею (чтобы не было пусто)
UPDATE users 
SET images = ARRAY[image] 
WHERE images IS NULL AND image IS NOT NULL;
