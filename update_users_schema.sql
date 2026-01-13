-- Миграция для обновления таблицы users
-- Добавляем поле для отслеживания показа приветствия и делаем поля профиля опциональными

-- Добавляем поле для отслеживания приветствия
ALTER TABLE users ADD COLUMN has_seen_welcome BOOLEAN DEFAULT false;

-- Делаем поля профиля опциональными для новых пользователей
ALTER TABLE users ALTER COLUMN name DROP NOT NULL;
ALTER TABLE users ALTER COLUMN age DROP NOT NULL;

-- Добавляем проверку возраста >= 18
ALTER TABLE users ADD CONSTRAINT check_age CHECK (age IS NULL OR age >= 18);

-- Обновляем существующих пользователей (считаем что они уже видели приветствие)
UPDATE users SET has_seen_welcome = true WHERE has_seen_welcome IS NULL;
