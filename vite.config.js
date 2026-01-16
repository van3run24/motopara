import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "/",
  esbuild: {
    // Упрощаем ESBuild для решения проблем с WebAssembly
    target: 'es2015',
    minify: false,
  },
})
