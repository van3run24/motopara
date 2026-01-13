// Скрипт для генерации VAPID ключей
// Запусти: node generate_vapid_keys.js

import webpush from 'web-push';

if (!webpush.generateVAPIDKeys) {
  console.log('Сначала установи web-push:');
  console.log('npm install web-push');
  process.exit(1);
}

const vapidKeys = webpush.generateVAPIDKeys();

console.log('🔑 VAPID ключи сгенерированы:');
console.log('');
console.log('Public Key (для клиента):');
console.log(vapidKeys.publicKey);
console.log('');
console.log('Private Key (для сервера - ХРАНИ В СЕКРЕТЕ!):');
console.log(vapidKeys.privateKey);
console.log('');
console.log('Добавь их в:');
console.log('1. main.jsx - publicKey');
console.log('2. Supabase Edge Function - privateKey');
console.log('3. Environment Variables в Supabase Dashboard');
