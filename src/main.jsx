import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

// Регистрация Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('SW registered: ', registration);
        
        // Запрос разрешения на push уведомления и подписка
        if ('Notification' in window && 'PushManager' in window) {
          Notification.requestPermission().then(async permission => {
            if (permission === 'granted') {
              console.log('Notification permission granted');
              
              try {
                // Получаем или создаем подписку
                const subscription = await registration.pushManager.subscribe({
                  userVisibleOnly: true,
                  applicationServerKey: urlB64ToUint8Array('BJjpNkIbnYXoftgL755_wE_IeooVx-pN-Pl_nZM7UpQ_TpUl1tNACNdPBr3q5MqzfdFxoLcW8aIQq8TE8a_ddbE')
                });
                
                console.log('Push subscription:', subscription);
                
                // Сохраняем подписку в Supabase
                await savePushSubscription(subscription);
              } catch (err) {
                console.log('Push subscription error: ', err);
              }
            } else {
              console.log('Notification permission denied');
            }
          });
        }
      })
      .catch(registrationError => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

// Функция для конвертации VAPID ключа
function urlB64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Функция для сохранения подписки в Supabase
async function savePushSubscription(subscription) {
  try {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      console.log('User not logged in, skipping subscription save');
      return;
    }

    console.log('Saving push subscription for user:', userId);
    console.log('Subscription endpoint:', subscription.endpoint);

    const response = await fetch(`${process.env.REACT_APP_SUPABASE_URL}/functions/v1/save-push-subscription`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.REACT_APP_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        endpoint: subscription.endpoint,
        p256dhKey: subscription.keys.p256dh,
        authKey: subscription.keys.auth
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to save push subscription:', response.status, errorText);
      throw new Error(`Failed to save subscription: ${response.status}`);
    }

    const result = await response.json();
    console.log('Push subscription saved successfully:', result);
  } catch (error) {
    console.error('Error saving push subscription:', error);
    // Не показываем ошибку пользователю, так как это не критично
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
