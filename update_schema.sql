-- Добавляем колонку interests для хранения интересов (массив объектов)
ALTER TABLE users ADD COLUMN IF NOT EXISTS interests JSONB;

-- На всякий случай обновляем permissions (хотя они обычно наследуются)
GRANT ALL ON users TO authenticated;
GRANT ALL ON users TO service_role;
