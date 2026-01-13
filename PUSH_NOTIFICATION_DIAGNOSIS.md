# Диагностика Push уведомлений

## 🔍 Статус проверки

### ✅ Что настроено правильно:
1. **Service Worker** - `/public/sw.js` присутствует и обрабатывает push события
2. **Web App Manifest** - `/public/favicons/site.webmanifest` настроен для PWA
3. **Edge Function** - `/supabase/functions/send-push/index.ts` существует
4. **Таблица push_subscriptions** - создана с RLS политиками
5. **VAPID ключи** - сгенерированы и добавлены в код

### ⚠️ Найденные проблемы:

#### 1. Разные VAPID ключи в коде
- `main.jsx`: `BJjpNkIbnYXoftgL755_wE_IeooVx-pN-Pl_nZM7UpQ_TpUl1tNACNdPBr3q5MqzfdFxoLcW8aIQq8TE8a_ddbE`
- `MainApp.jsx`: `BLc1xPvF8jHq3xL8f9k2mN4p7r6sT5uV8wX2yZ1aQ3bC4dE5fG6hI7jK8lM9nO0p`

**Решение:** Использовать одинаковый ключ везде

#### 2. Environment Variables в Supabase
Нужно проверить настроены ли:
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY` 
- `VAPID_SUBJECT`

## 🔧 Как исправить:

### 1. Унифицировать VAPID ключи
Замените ключ в `MainApp.jsx` на тот же что в `main.jsx`:

```javascript
applicationServerKey: urlB64ToUint8Array('BJjpNkIbnYXoftgL755_wE_IeooVx-pN-Pl_nZM7UpQ_TpUl1tNACNdPBr3q5MqzfdFxoLcW8aIQq8TE8a_ddbE')
```

### 2. Настроить Environment Variables в Supabase:
1. Откройте Supabase Dashboard
2. Перейдите в Settings → Functions
3. Добавьте variables:
   - `VAPID_PUBLIC_KEY`: `BJjpNkIbnYXoftgL755_wE_IeooVx-pN-Pl_nZM7UpQ_TpUl1tNACNdPBr3q5MqzfdFxoLcW8aIQq8TE8a_ddbE`
   - `VAPID_PRIVATE_KEY`: `[ваш приватный ключ]`
   - `VAPID_SUBJECT`: `mailto:your-email@example.com`

### 3. Тестирование:
```javascript
// В консоли браузера
navigator.serviceWorker.ready.then(reg => {
  return reg.pushManager.getSubscription();
}).then(sub => {
  console.log('Subscription:', sub);
});
```

## 📋 Порядок действий:
1. Исправить VAPID ключ в MainApp.jsx
2. Настроить environment variables в Supabase
3. Деплой Edge Functions
4. Тестировать подписку и отправку уведомлений
