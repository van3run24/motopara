-- Добавляем колонку images, если её нет
ALTER TABLE users ADD COLUMN IF NOT EXISTS images TEXT[];

-- На всякий случай обновляем её из image, если она пустая
UPDATE users 
SET images = ARRAY[image] 
WHERE (images IS NULL OR array_length(images, 1) IS NULL) AND image IS NOT NULL;
