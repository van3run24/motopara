import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "/",
  define: {
    // Фикс для проблемы с WebAssembly в React 19
    global: 'globalThis',
  },
  optimizeDeps: {
    // Исключаем проблемные зависимости из оптимизации
    include: ['react', 'react-dom'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Разделяем vendor чанки для избежания конфликтов
          vendor: ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
  server: {
    fs: {
      // Разрешаем доступ к файлам для разработки
      allow: ['..'],
    },
  },
})
