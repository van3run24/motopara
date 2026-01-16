// ОЧИСТКА КЭША БРАУЗЕРА ДЛЯ РЕШЕНИЯ ПРОБЛЕМЫ
// Выполнить это в консоли браузера на странице приложения

// 1. Полная очистка localStorage
localStorage.clear();

// 2. Очистка sessionStorage
sessionStorage.clear();

// 3. Перезагрузка страницы
console.log('Cache cleared! Reloading page...');
window.location.reload();

// 4. Альтернативно - жесткая перезагрузка без кэша
// window.location.href = window.location.href + '?t=' + Date.now();
