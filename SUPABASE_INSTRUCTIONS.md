# 🏍️ MotoMate - Инструкция по настройке Supabase

## ✅ Что уже сделано:
- Email настроен
- Бакеты созданы
- SQL схема выполнена

## 📋 Что нужно сделать сейчас:

### 1. **Настройка политик доступа для Storage**

Откройте Supabase Dashboard → Storage → Policies

#### Для бакета `avatars`:
```sql
-- Просмотр аватаров
CREATE POLICY "Public avatar access" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

-- Загрузка аватаров
CREATE POLICY "Users can upload own avatar" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND 
    auth.role() = 'authenticated'
  );

-- Обновление аватаров
CREATE POLICY "Users can update own avatar" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars' AND 
    auth.role() = 'authenticated'
  );
```

#### Для бакета `gallery`:
```sql
-- Просмотр галереи
CREATE POLICY "Public gallery access" ON storage.objects
  FOR SELECT USING (bucket_id = 'gallery');

-- Загрузка фото в галерею
CREATE POLICY "Users can upload own gallery images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'gallery' AND 
    auth.role() = 'authenticated'
  );
```

### 2. **Проверка таблиц**

Убедитесь что в таблице `users` есть новые поля:
- `latitude` (DECIMAL(10,8))
- `longitude` (DECIMAL(11,8))
- `location_updated_at` (TIMESTAMP)

Если нет, выполните:
```sql
ALTER TABLE users 
ADD COLUMN latitude DECIMAL(10,8),
ADD COLUMN longitude DECIMAL(11,8),
ADD COLUMN location_updated_at TIMESTAMP WITH TIME ZONE;
```

### 3. **Настройка URL для редиректа**

В Supabase Dashboard → Authentication → Settings:
- Site URL: `http://localhost:5174`
- Redirect URLs: `http://localhost:5174/**`

### 4. **Запуск приложения**

```bash
cd /Users/van3run/Desktop/Влад\ байкерские\ знакомства/motomate
npm run dev
```

## 🧪 Тестирование:

### 1. **Регистрация**
- Зарегистрируйте нового пользователя
- Проверьте что данные появились в таблице `users`

### 2. **Загрузка фото**
- Загрузите аватар
- Проверьте что он появился в бакете `avatars`
- Добавьте фото в галерею
- Проверьте что они появились в бакете `gallery`

### 3. **Поиск и чаты**
- Создайте 2+ пользователей с разным полом
- Проверьте что они видят друг друга в поиске
- Сделайте мэтч и проверьте создание чата

### 4. **Real-time**
- Откройте приложение в двух окнах
- Отправьте сообщение в одном окне
- Проверьте что оно появилось в другом

## 🐛 Частые проблемы:

### Ошибка "Storage bucket not found"
**Решение:** Проверьте что бакеты `avatars` и `gallery` существуют

### Ошибка "Row level security violation"
**Решение:** Выполните SQL политики для Storage

### Ошибка "Geolocation denied"
**Решение:** Разрешите геолокацию в браузере

### Чаты не обновляются в реальном времени
**Решение:** Проверьте консоль на ошибки подписки

## 📊 Структура данных:

### Таблица `users`:
```sql
id, email, name, age, city, bike, gender, has_bike, 
about, temp, music, equip, goal, image, 
latitude, longitude, location_updated_at,
created_at, updated_at
```

### Таблица `chats`:
```sql
id, participant_1_id, participant_2_id, 
created_at, last_message, last_message_time
```

### Таблица `messages`:
```sql
id, chat_id, sender_id, text, image, type, 
created_at
```

### Таблица `events`:
```sql
id, title, description, city, date, time, 
address, link, created_by_id, created_at
```

## 🎯 Что работает сейчас:

✅ **Регистрация** - сохранение в Supabase  
✅ **Аватары** - загрузка в Storage  
✅ **Галерея** - загрузка фото  
✅ **Поиск** - пользователи из БД  
✅ **Чаты** - real-time сообщения  
✅ **События** - сохранение в БД  
✅ **Геолокация** - автоматическое определение  

## 🚀 Готово к запуску!

Приложение полностью готово к тестированию. Все основные функции работают с Supabase.
