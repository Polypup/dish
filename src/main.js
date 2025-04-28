// Styles
import '/node_modules/vuetify/lib/styles/main.css'
import '/node_modules/@mdi/font/css/materialdesignicons.css'

// Vue and plugins
import { createApp } from '/node_modules/vue/dist/vue.esm-browser.js'
import { createVuetify } from '/node_modules/vuetify/lib/framework.js'
import { createPinia } from '/node_modules/pinia/dist/pinia.mjs'
import * as components from '/node_modules/vuetify/lib/components/index.js'
import * as directives from '/node_modules/vuetify/lib/directives/index.js'
import App from './App.vue'

const vuetify = createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        dark: false,
        colors: {
          primary: '#3F51B5',
          secondary: '#4CAF50',
          accent: '#FF4081',
          error: '#FF5252',
          info: '#2196F3',
          success: '#4CAF50',
          warning: '#FFC107',
          background: '#f5f5f5',
          surface: '#ffffff',
          'on-surface': '#212121'
        }
      },
      dark: {
        dark: true,
        colors: {
          primary: '#5C6BC0',
          secondary: '#66BB6A',
          accent: '#FF4081',
          error: '#FF5252',
          info: '#42A5F5',
          success: '#66BB6A',
          warning: '#FFC107',
          background: '#121212',
          surface: '#1E1E1E',
          'on-surface': '#EEEEEE'
        }
      }
    }
  }
})

const pinia = createPinia()

createApp(App)
  .use(vuetify)
  .use(pinia)
  .mount('#app')