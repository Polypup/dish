import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// We don't need this custom plugin anymore
// Using direct imports instead

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  base: mode === 'production' ? '/dish/' : '/',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
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
