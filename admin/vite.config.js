import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  // 👇👇👇 这里是我帮你加的代理配置（关键！）
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:6061', // 你的后端地址
        changeOrigin: true,             // 允许跨域
         // 把 /api 去掉
      }
    }
  }
})
