import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['**/*.test.js'],
    env: {
      NAMECOM_USER: 'test-user',
      NAMECOM_TOKEN: 'test-token',
      NAMECOM_DOMAIN: 'example.com',
      RECORD_ID: '12345',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['app.js', 'lib/**/*.js', 'middleware/**/*.js', 'routes/**/*.js'],
      exclude: ['**/*.test.js', 'index.js'],
    },
  },
})
