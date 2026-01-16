-- Обновление существующего поля max_participants для удаления значения по умолчанию
-- Выполните этот SQL если уже добавили поле с DEFAULT 50

-- Удаляем значение по умолчанию
ALTER TABLE events ALTER COLUMN max_participants DROP DEFAULT;

-- Делаем поле nullable (если еще не nullable)
ALTER TABLE events ALTER COLUMN max_participants DROP NOT NULL;

-- Обновляем существующие записи с 50 на NULL (убираем ограничение)
UPDATE events SET max_participants = NULL WHERE max_participants = 50;

-- Проверяем результат
SELECT 
    id, 
    title, 
    max_participants,
    CASE 
        WHEN max_participants IS NULL THEN 'Без ограничений'
        ELSE max_participants::text 
    END as participants_info
FROM events 
ORDER BY created_at DESC 
LIMIT 5;
