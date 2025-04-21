<script setup>
import { onMounted } from 'vue';
import TokenBurner from './components/TokenBurner.vue';
import WalletHeader from './components/WalletHeader.vue';
import BurnLeaderboard from './components/BurnLeaderboard.vue';
import { useWeb3Store } from './stores/web3Store';
import { useThemeStore } from './stores/themeStore';

const web3Store = useWeb3Store();
const themeStore = useThemeStore(); // Initialize theme store

// Initialize the web3 store on app mount
onMounted(async () => {
  await web3Store.initOnboard();
  web3Store.subscribeToWalletEvents();
  
  // Set default chain ID to Avalanche for public data
  if (!web3Store.chainId) {
    web3Store.chainId = '0xa86a'; // Default to Avalanche Mainnet
  }
  
  // Fetch public leaderboard data even without wallet connection
  if (web3Store.leaderboardAddress) {
    await web3Store.fetchLeaderboard();
  }
});
</script>

<template>
  <v-app>
    <!-- Header Component -->
    <WalletHeader />
    
    <!-- Main Content -->
    <v-main>
      <v-container fluid class="fill-height pa-0 pa-sm-4" style="max-width: 2400px; margin: 0 auto;">
        <v-row class="fill-width">
          <!-- Use lg breakpoint for better large screen layout -->
          <v-col cols="12" lg="6" order="1" order-lg="1" class="px-0 px-lg-4">
            <TokenBurner />
          </v-col>
          
          <v-col cols="12" lg="6" order="2" order-lg="2" class="px-0 px-lg-4">
            <BurnLeaderboard />
          </v-col>
        </v-row>
      </v-container>
    </v-main>
    
    <!-- Footer -->
    <v-footer app padless :color="themeStore.isDark ? 'surface' : 'bg-grey-lighten-3'" class="fill-width">
      <v-container fluid class="fill-width">
        <v-row justify="center" align="center" class="text-center py-2">
          <v-col cols="12">
            <div :class="['text-caption', themeStore.isDark ? 'text-grey-lighten-1' : 'text-grey-darken-1']">
              Dish Burner — Track your burns and climb the leaderboard
            </div>
          </v-col>
        </v-row>
      </v-container>
    </v-footer>
  </v-app>
</template>

<style>
/* Global styles */
:root {
  --primary-color: #3F51B5;
  --secondary-color: #4CAF50;
  --accent-color: #FF4081;
  --error-color: #FF5252;
  --success-color: #4CAF50;
}

/* Fix for large screens */
html, body {
  width: 100%;
  margin: 0;
  padding: 0;
  overflow-x: hidden;
  transition: background-color 0.3s ease, color 0.3s ease;
}

.v-container.fill-height {
  min-height: calc(100vh - 128px); /* Account for header and footer */
}

.fill-width {
  width: 100%;
  margin: 0 !important;
}

@media (min-width: 1904px) {
  .v-container {
    max-width: 100% !important;
  }
}

/* Theme transition effects */
.v-application {
  transition: background-color 0.3s ease;
}

.v-card,
.v-app-bar,
.v-footer,
.v-text-field,
.v-btn:not(.v-btn--icon),
.v-chip {
  transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease !important;
}

.v-icon {
  transition: color 0.3s ease;
}

.theme-toggle-btn {
  position: relative;
  overflow: hidden;
}
</style>