# Настройка Environment Variables для Push Уведомлений

## Обязательные переменные в Supabase Dashboard → Settings → Edge Functions

### VAPID ключи для push уведомлений
```
VAPID_PUBLIC_KEY=BJjpNkIbnYXoftgL755_wE_IeooVx-pN-Pl_nZM7UpQ_TpUl1tNACNdPBr3q5MqzfdFxoLcW8aIQq8TE8a_ddbE
VAPID_PRIVATE_KEY=ВАШ_PRIVATE_KEY_СГЕНЕРИРОВАННЫЙ_НИЖЕ
VAPID_SUBJECT=mailto:support@motopara.ru
```

### Стандартные переменные Supabase (обычно уже есть)
```
SUPABASE_URL=https://ВАШ_ПРОЕКТ.supabase.co
SUPABASE_ANON_KEY=ВАШ_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=ВАШ_SERVICE_ROLE_KEY
```

## Как сгенерировать VAPID ключи

### Способ 1: Онлайн генератор
1. Перейдите на https://web-push-codelab.glitch.me/
2. Нажмите "Generate Key Pair"
3. Скопируйте Public Key и Private Key

### Способ 2: Node.js скрипт
Создайте файл `generate-vapid.js`:
```javascript
const webpush = require('web-push');
const vapidKeys = webpush.generateVAPIDKeys();
console.log('Public Key:', vapidKeys.publicKey);
console.log('Private Key:', vapidKeys.privateKey);
```

Запустите:
```bash
npm install web-push
node generate-vapid.js
```

## Развертывание Edge Functions

### 1. Установите Supabase CLI
```bash
npm install -g supabase
```

### 2. Войдите в Supabase
```bash
supabase login
```

### 3. Ссылка на проект
```bash
supabase link --project-ref ВАШ_ПРОЕКТ_ID
```

### 4. Развертывание функций
```bash
supabase functions deploy send-push
supabase functions deploy save-push-subscription
```

### 5. Настройка переменных окружения
```bash
supabase secrets set VAPID_PUBLIC_KEY="BJjpNkIbnYXoftgL755_wE_IeooVx-pN-Pl_nZM7UpQ_TpUl1tNACNdPBr3q5MqzfdFxoLcW8aIQq8TE8a_ddbE"
supabase secrets set VAPID_PRIVATE_KEY="ВАШ_PRIVATE_KEY"
supabase secrets set VAPID_SUBJECT="mailto:support@motopara.ru"
```

## Проверка работы

### 1. Проверка таблицы push_subscriptions
```sql
SELECT * FROM push_subscriptions;
```

### 2. Проверка Edge Function логов
В Supabase Dashboard → Edge Functions → выберите функцию → View Logs

### 3. Тестирование вручную
```bash
curl -X POST "https://ВАШ_ПРОЕКТ.supabase.co/functions/v1/send-push" \
  -H "Authorization: Bearer ВАШ_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Тестовое уведомление",
    "body": "Это тестовое push уведомление",
    "userId": "UUID_ПОЛЬЗОВАТЕЛЯ"
  }'
```

## Возможные проблемы и решения

### 1. Пользователь не дал разрешение
- Проверьте в браузере: chrome://settings/content/notifications
- Убедитесь что сайт разрешен для уведомлений

### 2. Service Worker не зарегистрирован
- Проверьте консоль браузера на ошибки при загрузке
- Убедитесь что sw.js доступен по корневому URL

### 3. VAPID ключи не настроены
- Проверьте логи Edge Functions
- Убедитесь что все 3 VAPID переменные установлены

### 4. Push подписка не сохраняется
- Проверьте RLS политики для таблицы push_subscriptions
- Убедитесь что пользователь авторизован

### 5. Уведомления не приходят на iOS
- iOS требует HTTPS
- Пользователь должен добавить сайт на главный экран
- Убедитесь что manifest.json настроен правильно

## Отладка

### В браузере
```javascript
// Проверка подписки
navigator.serviceWorker.ready.then(registration => {
  return registration.pushManager.getSubscription();
}).then(subscription => {
  console.log('Subscription:', subscription);
});

// Проверка разрешения
Notification.permission.then(permission => {
  console.log('Permission:', permission);
});
```

### В Service Worker
Добавьте логирование в sw.js для отладки push событий.
