# Исправление системы дизлайков

## Проблема
При свайпе влево (дизлайк) пользователи появлялись снова после обновления страницы, потому что дизлайки не сохранялись в базу данных.

## Решение

### 1. Применить миграцию базы данных
Выполните SQL файл `add_dislike_column.sql` в Supabase Dashboard:

```sql
-- Add is_dislike column to likes table for tracking dislikes
ALTER TABLE public.likes ADD COLUMN IF NOT EXISTS is_dislike BOOLEAN DEFAULT FALSE;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_likes_is_dislike ON public.likes(is_dislike);

-- Update existing policies to handle dislikes
DROP POLICY IF EXISTS "Users can insert likes" ON public.likes;
CREATE POLICY "Users can insert likes" ON public.likes
FOR INSERT WITH CHECK (
  auth.uid() = from_user_id AND 
  (is_dislike IS NULL OR is_dislike = FALSE)
);

DROP POLICY IF EXISTS "Users can insert dislikes" ON public.likes;
CREATE POLICY "Users can insert dislikes" ON public.likes
FOR INSERT WITH CHECK (
  auth.uid() = from_user_id AND 
  is_dislike = TRUE
);

-- Combined policy for all inserts
DROP POLICY IF EXISTS "Users can manage own likes" ON public.likes;
CREATE POLICY "Users can manage own likes" ON public.likes
FOR ALL USING (auth.uid() = from_user_id);
```

### 2. Изменения в коде

#### SupabaseManager.jsx
- Добавлена функция `recordDislike()` для сохранения дизлайков
- Дизлайки записываются в таблицу `likes` с флагом `is_dislike: true`

#### MainApp.jsx
- Добавлена функция `handleDislike()` для обработки дизлайков
- Свайп влево теперь вызывает `handleDislike()` вместо `handleNext()`
- Кнопка "X" теперь также вызывает `handleDislike()`

### 3. Как это работает

1. **Свайп влево** → вызывается `handleDislike()`
2. **Запись в базу** → `recordDislike()` сохраняет дизлайк в таблицу `likes`
3. **Фильтрация** → при загрузке пользователей все записи из `likes` исключаются
4. **Результат** → дизлайкнутые пользователи больше не показываются

### 4. Проверка

После применения миграции:
1. Откройте приложение
2. Сделайте свайп влево на нескольких пользователях
3. Обновите страницу
4. Убедитесь, что дизлайкнутые пользователи не появляются снова

### 5. Обратная совместимость

Существующие лайки продолжат работать корректно. Новая колонка `is_dislike` имеет значение `FALSE` для всех существующих записей.
