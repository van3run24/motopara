# Инструкция по установке групповых чатов для событий

## Что было реализовано

✅ **Автоматическое создание группового чата** при создании события  
✅ **Кнопка "Присоединиться к чату"** в карточках событий  
✅ **Полноценный групповой чат** с интерфейсом как в Telegram  
✅ **Отображение имен** над сообщениями (только для первого сообщения подряд)  
✅ **Управление участниками** и безопасное присоединение  

## Установка базы данных

### 1. Примените основную миграцию

Выполните SQL из файла `group_chats_migration.sql` в вашей Supabase базе данных:

```sql
-- Миграция для групповых чатов событий
-- Создание таблицы групповых чатов
CREATE TABLE group_chats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  created_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание таблицы участников групповых чатов
CREATE TABLE group_chat_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_chat_id UUID REFERENCES group_chats(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(group_chat_id, user_id)
);

-- Добавление group_chat_id в таблицу событий
ALTER TABLE events ADD COLUMN group_chat_id UUID REFERENCES group_chats(id) ON DELETE SET NULL;

-- Индексы для производительности
CREATE INDEX idx_group_chats_event_id ON group_chats(event_id);
CREATE INDEX idx_group_chats_created_by ON group_chats(created_by_id);
CREATE INDEX idx_group_chat_participants_chat_id ON group_chat_participants(group_chat_id);
CREATE INDEX idx_group_chat_participants_user_id ON group_chat_participants(user_id);

-- Включение RLS для новых таблиц
ALTER TABLE group_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_chat_participants ENABLE ROW LEVEL SECURITY;

-- RLS политики для group_chats
CREATE POLICY "Anyone can view group chats" ON group_chats
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create group chats" ON group_chats
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update own group chats" ON group_chats
  FOR UPDATE USING (created_by_id = auth.uid());

CREATE POLICY "Users can delete own group chats" ON group_chats
  FOR DELETE USING (created_by_id = auth.uid());

-- RLS политики для group_chat_participants
CREATE POLICY "Anyone can view group chat participants" ON group_chat_participants
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can join group chats" ON group_chat_participants
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can leave group chats" ON group_chat_participants
  FOR DELETE USING (user_id = auth.uid());

-- Триггер для обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_group_chats_updated_at 
    BEFORE UPDATE ON group_chats 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 2. Примените миграцию для сообщений

Выполните SQL из файла `messages_group_chat_migration.sql`:

```sql
-- Добавление group_chat_id в таблицу messages
ALTER TABLE messages ADD COLUMN group_chat_id UUID REFERENCES group_chats(id) ON DELETE CASCADE;

-- Создание индекса для group_chat_id
CREATE INDEX idx_messages_group_chat_id ON messages(group_chat_id);

-- Обновление RLS политики для сообщений, чтобы поддерживать групповые чаты
DROP POLICY IF EXISTS "Users can view messages in own chats" ON messages;
DROP POLICY IF EXISTS "Users can insert messages in own chats" ON messages;

-- Новая политика для просмотра сообщений (личные и групповые чаты)
CREATE POLICY "Users can view messages in own chats and group chats" ON messages
  FOR SELECT USING (
    -- Личные чаты
    EXISTS (
      SELECT 1 FROM chats 
      WHERE chats.id = messages.chat_id 
      AND (chats.participant_1_id = auth.uid() OR chats.participant_2_id = auth.uid())
    )
    OR
    -- Групповые чаты
    EXISTS (
      SELECT 1 FROM group_chat_participants 
      WHERE group_chat_participants.group_chat_id = messages.group_chat_id 
      AND group_chat_participants.user_id = auth.uid()
    )
  );

-- Новая политика для отправки сообщений (личные и групповые чаты)
CREATE POLICY "Users can insert messages in own chats and group chats" ON messages
  FOR INSERT WITH CHECK (
    -- Личные чаты
    (chat_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM chats 
      WHERE chats.id = messages.chat_id 
      AND (chats.participant_1_id = auth.uid() OR chats.participant_2_id = auth.uid())
    ))
    OR
    -- Групповые чаты
    (group_chat_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM group_chat_participants 
      WHERE group_chat_participants.group_chat_id = messages.group_chat_id 
      AND group_chat_participants.user_id = auth.uid()
    ))
  );
```

## Как это работает

### При создании события:
1. Автоматически создается групповой чат
2. Создатель события автоматически добавляется в участники
3. Чат привязывается к событию через `group_chat_id`

### При нажатии "Присоединиться к чату":
1. Проверяется, не состоит ли пользователь уже в чате
2. Если не состоит - пользователь добавляется в участники
3. Открывается окно группового чата

### В групповом чате:
1. **Имена над сообщениями**: Показываются только для первого сообщения от пользователя подряд
2. **Счетчик участников**: Отображается количество участников в шапке чата
3. **Полноценный функционал**: Отправка текста, фото, эмодзи
4. **Безопасность**: Только участники могут видеть и писать в чате

## Файлы которые были изменены

- `src/supabaseService.js` - добавлен `groupChatService`
- `src/components/MainApp.jsx` - добавлены состояния и UI для групповых чатов
- `group_chats_migration.sql` - миграция для новых таблиц
- `messages_group_chat_migration.sql` - обновление таблицы messages

## Тестирование

1. Создайте новое событие
2. Убедитесь, что в карточке события появилась кнопка "Присоединиться к чату"
3. Нажмите на кнопку - должно открыться окно чата
4. Отправьте сообщение - имя должно отобразиться над первым сообщением
5. Создайте еще одно сообщение подряд - имя не должно дублироваться

Готово! 🎉
