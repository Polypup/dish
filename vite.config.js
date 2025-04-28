import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// Custom plugin to handle module paths
const moduleResolverPlugin = () => {
  return {
    name: 'module-resolver-plugin',
    resolveId(id) {
      if (id === 'vuetify/styles') {
        return { id: 'vuetify/styles/main.css', external: false };
      }
      return null;
    }
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    vue(),
    vueDevTools(),
    moduleResolverPlugin(),
  ],
  base: mode === 'production' ? '/dish/' : '/',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      'vuetify/styles': fileURLToPath(new URL('./node_modules/vuetify/styles/main.css', import.meta.url)),
      'vuetify/components': fileURLToPath(new URL('./node_modules/vuetify/components', import.meta.url)),
      'vuetify/directives': fileURLToPath(new URL('./node_modules/vuetify/directives', import.meta.url)),
      '@mdi/font/css/materialdesignicons.css': fileURLToPath(new URL('./node_modules/@mdi/font/css/materialdesignicons.css', import.meta.url))
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
