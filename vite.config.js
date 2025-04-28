import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  base: mode === 'production' ? '/dish/' : '/',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      'vue': fileURLToPath(new URL('./node_modules/vue/dist/vue.esm-browser.js', import.meta.url)),
      'vuetify': fileURLToPath(new URL('./node_modules/vuetify', import.meta.url)),
      'pinia': fileURLToPath(new URL('./node_modules/pinia/dist/pinia.mjs', import.meta.url)),
      '@mdi/font/css/materialdesignicons.css': fileURLToPath(new URL('./node_modules/@mdi/font/css/materialdesignicons.css', import.meta.url))
    }
  },
  optimizeDeps: {
    esbuildOptions: {
      // Enable top-level await and other modern features
      target: 'es2020'
    }
  },
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          'web3-onboard': ['@web3-onboard/core', '@web3-onboard/injected-wallets'],
          'ethers': ['ethers']
        }
      }
    }
  }
}))