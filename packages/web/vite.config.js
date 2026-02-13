import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  envDir: '../../',
  test: {
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{js,ts,vue}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{js,ts,vue}'],
      exclude: ['src/**/*.{test,spec}.{js,ts,vue}', 'src/main.js'],
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
