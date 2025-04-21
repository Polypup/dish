import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

export const useThemeStore = defineStore('theme', () => {
  // Check if the user has a preference stored in localStorage
  const storedTheme = localStorage.getItem('dishBurnerTheme');
  
  // Check if user prefers dark mode based on system preference
  const prefersDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  // Initialize theme (use stored preference, or fallback to system preference)
  const isDark = ref(storedTheme ? storedTheme === 'dark' : prefersDarkMode);
  
  // Toggle theme function
  const toggleTheme = () => {
    isDark.value = !isDark.value;
    // Store the user preference
    localStorage.setItem('dishBurnerTheme', isDark.value ? 'dark' : 'light');
  };
  
  // Set specific theme
  const setTheme = (dark) => {
    isDark.value = dark;
    localStorage.setItem('dishBurnerTheme', isDark.value ? 'dark' : 'light');
  };
  
  // Listen for system preference changes
  if (window.matchMedia) {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', e => {
        // Only update if the user hasn't set a preference
        if (!localStorage.getItem('dishBurnerTheme')) {
          isDark.value = e.matches;
        }
      });
    }
  }
  
  // Watch for theme changes to update body class
  watch(isDark, (newValue) => {
    // Add appropriate class to body for global styling if needed
    if (newValue) {
      document.body.classList.add('dark-theme');
      document.body.classList.remove('light-theme');
    } else {
      document.body.classList.add('light-theme');
      document.body.classList.remove('dark-theme');
    }
  }, { immediate: true });
  
  return {
    isDark,
    toggleTheme,
    setTheme
  };
});