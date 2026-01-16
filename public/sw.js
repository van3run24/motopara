const CACHE_NAME = 'motopara-v1';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json'
];

// Установка Service Worker и кэширование ресурсов
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

// Активация Service Worker и очистка старого кэша
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Перехват запросов и обслуживание из кэша
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Если запрос есть в кэше, возвращаем его
        if (response) {
          return response;
        }
        
        // Иначе делаем сетевой запрос
        return fetch(event.request).then(
          response => {
            // Проверяем, что ответ валидный
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Клонируем ответ, так как он может быть использован только один раз
            const responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          }
        );
      })
  );
});

// Push уведомления
self.addEventListener('push', event => {
  let options = {
    icon: '/favicons/android-chrome-192x192.png',
    badge: '/favicons/favicon-32x32.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Открыть приложение',
        icon: '/favicons/favicon-32x32.png'
      },
      {
        action: 'close',
        title: 'Закрыть',
        icon: '/favicons/favicon-32x32.png'
      }
    ]
  };

  try {
    // Пытаемся распарсить JSON payload от Edge Function
    if (event.data) {
      const payload = event.data.json();
      options = {
        ...options,
        title: payload.title || 'МОТОЗНАКОМСТВА',
        body: payload.body || 'Новое уведомление',
        icon: payload.icon || options.icon,
        badge: payload.badge || options.badge,
        tag: payload.tag || 'motopara-notification',
        data: {
          ...options.data,
          url: payload.data?.url || '/',
          ...payload.data
        }
      };
    }
  } catch (error) {
    // Если payload не JSON, используем текст
    console.log('Push payload parsing failed, using text:', error);
    options = {
      ...options,
      title: 'МОТОЗНАКОМСТВА',
      body: event.data ? event.data.text() : 'Новое уведомление'
    };
  }

  event.waitUntil(
    self.registration.showNotification(options.title, options)
  );
});

// Обработка кликов по уведомлениям
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/';
  
  if (event.action === 'close') {
    return;
  }
  
  // Ищем открытые вкладки приложения
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // Если есть открытая вкладка, фокусируемся на ней
        for (const client of clientList) {
          if (client.url === new URL(urlToOpen, self.location.origin).href && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Иначе открываем новую вкладку
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});
