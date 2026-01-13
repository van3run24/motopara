# Настройка Environment Variables для Push уведомлений

## 📋 Что нужно настроить в Supabase Dashboard:

### 1. Откройте Supabase Dashboard
1. Перейдите в ваш проект
2. Settings → Functions

### 2. Добавьте Environment Variables:

```
VAPID_PUBLIC_KEY=BJjpNkIbnYXoftgL755_wE_IeooVx-pN-Pl_nZM7UpQ_TpUl1tNACNdPBr3q5MqzfdFxoLcW8aIQq8TE8a_ddbE
VAPID_PRIVATE_KEY=[ВАШ_ПРИВАТНЫЙ_КЛЮЧ]
VAPID_SUBJECT=mailto:your-email@example.com
```

### 3. Где взять приватный ключ?

Если у вас нет приватного ключа, сгенерируйте новую пару:

```bash
node generate_vapid_keys.js
```

Или используйте онлайн генератор VAPID ключей.

### 4. Деплой Edge Functions

После настройки variables:

```bash
# Установите Supabase CLI если еще не установлен
npm install -g supabase

# Деплой функций
supabase functions deploy send-push
supabase functions deploy save-push-subscription
```

### 5. Проверка работы

После деплоя проверьте в браузерной консоли:

```javascript
// Проверка подписки
navigator.serviceWorker.ready.then(reg => {
  return reg.pushManager.getSubscription();
}).then(sub => {
  console.log('Push subscription:', sub);
});

// Тестовое уведомление
fetch('https://ikztmdltejodcgxgwzbq.supabase.co/functions/v1/send-push', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_ANON_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: 'Тест',
    body: 'Тестовое уведомление',
    userId: 'YOUR_USER_ID'
  })
})
```

## 🔍 Возможные проблемы:

### 1. "VAPID keys not configured"
- Решение: Добавьте все три variables в Supabase Dashboard

### 2. "Push subscription failed"
- Решение: Проверьте что сайт открыт по HTTPS (обязательно для push)

### 3. "No subscription found"
- Решение: Убедитесь что пользователь дал разрешение на уведомления

### 4. Edge Function не работает
- Решение: Проверьте логи в Supabase Dashboard → Functions → Logs
