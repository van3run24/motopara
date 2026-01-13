# Настройка Push уведомлений в Supabase

## 🚀 Вариант 1: Supabase Edge Functions (рекомендую)

### Шаг 1: Создать Edge Function
```bash
supabase functions new send-push
```

### Шаг 2: Установить зависимости
```bash
cd supabase/functions/send-push
npm install @supabase/functions-js
```

### Шаг 3: Создать файл index.ts
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { method } = req
    
    if (method === 'POST') {
      const { title, body, userId } = await req.json()
      
      // Здесь будет логика отправки push уведомлений
      // Пока возвращаем успех для теста
      
      return new Response(
        JSON.stringify({ success: true, message: 'Push notification sent' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }
    
    return new Response('Method not allowed', { 
      headers: corsHeaders, 
      status: 405 
    })
    
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
```

### Шаг 4: Развернуть функцию
```bash
supabase functions deploy send-push
```

## 🔥 Вариант 2: Vercel Serverless Functions

### Шаг 1: Создать api/push/send.js
```javascript
// api/push/send.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { title, body, userId } = req.body
    
    // Логика отправки push уведомлений
    console.log('Sending push notification:', { title, body, userId })
    
    res.status(200).json({ success: true, message: 'Push notification sent' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}
```

### Шаг 2: Добавить в vercel.json
```json
{
  "functions": {
    "api/push/send.js": {
      "maxDuration": 10
    }
  }
}
```

## 📱 Вариант 3: Firebase Cloud Messaging (самый простой)

### Шаг 1: Создать Firebase проект
1. Зайти на https://console.firebase.google.com
2. Создать новый проект
3. Включить Cloud Messaging

### Шаг 2: Получить ключи
- **Server Key**: Настройки проекта → Cloud Messaging → Серверный ключ
- **Sender ID**: Настройки проекта → Cloud Messaging → Идентификатор отправителя

### Шаг 3: Добавить в Vercel environment variables
```
FCM_SERVER_KEY=your-fcm-server-key
FCM_SENDER_ID=your-fcm-sender-id
```

### Шаг 4: Создать api/push/send.js
```javascript
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { title, body, userId } = req.body
    
    // Получаем подписки из Supabase
    const subscriptions = await getSubscriptions(userId)
    
    // Отправляем через FCM
    const results = await sendFCMNotifications(subscriptions, {
      title,
      body,
      icon: '/favicons/android-chrome-192x192.png',
      click_action: 'https://your-domain.com'
    })
    
    res.status(200).json({ success: true, results })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

async function sendFCMNotifications(subscriptions, notification) {
  const results = []
  
  for (const subscription of subscriptions) {
    try {
      const response = await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
          'Authorization': `key=${process.env.FCM_SERVER_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: subscription.endpoint,
          notification,
          data: { url: 'https://your-domain.com' }
        })
      })
      
      results.push({ success: response.ok, endpoint: subscription.endpoint })
    } catch (error) {
      results.push({ success: false, error: error.message, endpoint: subscription.endpoint })
    }
  }
  
  return results
}
```

## 🎯 Что выбрать?

### **Firebase (рекомендую)**:
- ✅ Самый простой
- ✅ Бесплатно до 1.5М сообщений/месяц
- ✅ Надежный
- ✅ Хорошая документация

### **Supabase Edge Functions**:
- ✅ Интегрирован с Supabase
- ❌ Сложнее настраивать
- ❌ Требует VAPID ключи

### **Vercel Functions**:
- ✅ Легко деплоить
- ❌ Нужно настраивать VAPID или Firebase

## 📋 Следующие шаги:

1. **Выбери вариант** (рекомендую Firebase)
2. **Настрой environment variables** в Vercel
3. **Создай API endpoint**
4. **Протестируй отправку**
5. **Обнови MainApp** для вызова API

## 🔧 Вызов из MainApp:

```javascript
// Добавь в MainApp.jsx
const sendPushNotification = async (title, body, userId = null) => {
  try {
    const response = await fetch('/api/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title, body, userId })
    })
    
    const result = await response.json()
    console.log('Push notification result:', result)
  } catch (error) {
    console.error('Error sending push notification:', error)
  }
}

// Используй в мэтчах:
sendPushNotification('🏍️ Новый мэтч!', `У вас новый мэтч: ${likedUser.name}`, likedUser.id)
```

Выбирай Firebase - это самый надежный вариант! 🚀
