# Отладка проблем с Push уведомлениями

## Проблема: Пуш-уведомления приходят не всем пользователям

### Причины и решения:

#### 1. **Запрос разрешения на уведомления**
**Проблема:** Приложение запрашивало разрешение только при первом входе.
**Решение:** 
- Добавлена проверка всех состояний `Notification.permission`
- Добавлен повторный запрос при каждом входе
- Добавлено логирование статуса разрешений

#### 2. **Подписка на push уведомления**
**Проблема:** Функция подписки могла не работать, если `userData` еще не загружен.
**Решение:**
- Используется `userId` из `localStorage` если `userData` недоступен
- Добавлена повторная попытка подписки после загрузки профиля
- Добавлена обработка ошибок и повторная подписка

#### 3. **Service Worker регистрация**
**Проблема:** Service Worker мог не регистрироваться при некоторых условиях.
**Решение:**
- Добавлена отдельная проверка регистрации Service Worker
- Улучшена обработка ошибок регистрации

#### 4. **VAPID ключи и окружение**
**Проверь:**
- VAPID ключи настроены в Supabase Edge Functions
- Переменные окружения `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` установлены

### Что нужно проверить в Supabase:

#### 1. **Таблица push_subscriptions**
```sql
-- Проверить что таблица существует
SELECT * FROM push_subscriptions LIMIT 5;

-- Проверить подписки конкретных пользователей
SELECT * FROM push_subscriptions WHERE user_id = 'user-uuid';
```

#### 2. **Edge Function send-push**
```bash
# Проверить что функция развернута
supabase functions list

# Проверить логи функции
supabase functions logs send-push
```

#### 3. **VAPID ключи в окружении**
```bash
# Проверить переменные окружения
supabase secrets list
```

### Как отладить у конкретного пользователя:

#### 1. **В консоли браузера проверь:**
```javascript
// Статус разрешений
console.log('Notification permission:', Notification.permission);

// Service Worker
navigator.serviceWorker.getRegistrations().then(registrations => {
  console.log('Service Workers:', registrations);
});

// Push подписка
navigator.serviceWorker.ready.then(registration => {
  return registration.pushManager.getSubscription();
}).then(subscription => {
  console.log('Push subscription:', subscription);
});
```

#### 2. **В базе данных проверь:**
```sql
-- Есть ли подписка у пользователя
SELECT * FROM push_subscriptions WHERE user_id = 'user-uuid';

-- Когда была создана/обновлена подписка
SELECT user_id, created_at, updated_at FROM push_subscriptions;
```

#### 3. **В логах Supabase проверь:**
- Логи Edge Function `send-push`
- Логи операций с таблицей `push_subscriptions`

### Возможные причины неработающих уведомлений:

1. **Пользователь запретил уведомления** - `Notification.permission === 'denied'`
2. **Браузер не поддерживает push** - нет `PushManager`
3. **Нет подписки в базе** - ошибка при сохранении `push_subscriptions`
4. **Проблемы с VAPID ключами** - неверная конфигурация
5. **Проблемы с Service Worker** - не зарегистрирован или ошибка

### Тестирование:

#### 1. **Тестовое уведомление:**
```javascript
// В консоли отправить тестовое уведомление
fetch('https://your-project.supabase.co/functions/v1/send-push', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer your-anon-key',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: 'Тестовое уведомление',
    body: 'Это тестовое push уведомление',
    userId: 'user-uuid'
  })
});
```

#### 2. **Локальное уведомление:**
```javascript
// Проверить локальные уведомления
new Notification('Тест', {
  body: 'Локальное уведомление',
  icon: '/favicons/android-chrome-192x192.png'
});
```

### Что должно работать теперь:

1. **При входе** - приложение запрашивает разрешение (если еще не запрашивалось)
2. **При получении разрешения** - автоматически подписывает на push уведомления  
3. **При загрузке профиля** - повторная попытка подписки
4. **При мэтче/лайке/сообщении** - отправка push уведомления

### Если все еще не работает:

1. Проверь консоль браузера на ошибки
2. Проверь таблицу `push_subscriptions` в базе
3. Проверь логи Edge Function в Supabase
4. Убедись что VAPID ключи правильные
