-- Миграция для добавления координат событиям
-- Выполнить в Supabase SQL Editor если таблица events уже существует

-- 1. Добавляем поле coordinates если его нет
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' 
        AND column_name = 'coordinates'
    ) THEN
        ALTER TABLE events ADD COLUMN coordinates POINT;
    END IF;
END $$;

-- 2. Обновляем индексы
DROP INDEX IF EXISTS idx_events_coordinates;
CREATE INDEX idx_events_coordinates ON events USING GIN (coordinates);

-- 3. Включаем PostGIS если не включен (для работы с POINT)
CREATE EXTENSION IF NOT EXISTS postgis;

-- 4. Геокодируем существующие события (опционально)
-- Это нужно выполнить вручную через приложение или скрипт
-- UPDATE events 
-- SET coordinates = ST_GeomFromText('POINT(37.6173 55.7558)', 4326)
-- WHERE address IS NOT NULL AND coordinates IS NULL;

COMMENT ON COLUMN events.coordinates IS 'Координаты события для отображения на карте (PostGIS POINT)';
