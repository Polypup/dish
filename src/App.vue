<script setup>
import { onMounted, computed } from 'vue';
import TokenBurner from './components/TokenBurner.vue';
import WalletHeader from './components/WalletHeader.vue';
import BurnLeaderboard from './components/BurnLeaderboard.vue';
import { useWeb3Store } from './stores/web3Store';
import { useThemeStore } from './stores/themeStore';

const web3Store = useWeb3Store();
const themeStore = useThemeStore(); // Initialize theme store

// Get base URL for assets
const baseUrl = computed(() => import.meta.env.BASE_URL);

// Copy token address to clipboard with proper error handling
const copyTokenAddress = () => {
  if (!web3Store.tokenAddress) return;
  
  try {
    if (window && window.navigator && window.navigator.clipboard && window.navigator.clipboard.writeText) {
      window.navigator.clipboard.writeText(web3Store.tokenAddress)
        .then(() => {
          console.log('Token address copied to clipboard');
        })
        .catch(err => {
          console.error('Failed to copy text with Clipboard API:', err);
          fallbackCopyTextToClipboard(web3Store.tokenAddress);
        });
    } else {
      // If Clipboard API not available, use fallback
      fallbackCopyTextToClipboard(web3Store.tokenAddress);
    }
  } catch (err) {
    console.error('Error accessing clipboard:', err);
    fallbackCopyTextToClipboard(web3Store.tokenAddress);
  }
};

// Fallback clipboard function
const fallbackCopyTextToClipboard = (text) => {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  
  // Make the textarea out of viewport
  textArea.style.position = "fixed";
  textArea.style.left = "-999999px";
  textArea.style.top = "-999999px";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    document.execCommand('copy');
    console.log('Fallback: Copied token address to clipboard');
  } catch (err) {
    console.error('Fallback: Could not copy text: ', err);
  }

  document.body.removeChild(textArea);
};

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
    <v-footer :app="$vuetify.display.mdAndUp" padless :color="themeStore.isDark ? 'surface' : 'bg-grey-lighten-3'" class="fill-width">
      <v-container fluid class="fill-width">
        <v-row justify="center" align="center" class="py-2">
          <v-col cols="12" md="6" class="text-center text-md-start">
            <div :class="['text-caption', themeStore.isDark ? 'text-grey-lighten-1' : 'text-grey-darken-1']">
              Dish Burner — Track your burns and climb the leaderboard
            </div>
            <div v-if="web3Store.tokenAddress" class="mt-1">
              <v-chip
                size="x-small"
                color="secondary"
                variant="outlined"
                class="token-address-chip"
                @click="copyTokenAddress"
                title="Click to copy token address"
              >
                <v-icon start size="x-small">mdi-token</v-icon>
                Token: {{ web3Store.tokenAddress.substring(0, 6) }}...{{ web3Store.tokenAddress.substring(web3Store.tokenAddress.length - 4) }}
                <v-icon end size="x-small">mdi-content-copy</v-icon>
              </v-chip>
            </div>
          </v-col>
          
          <v-col cols="12" md="6" class="text-center text-md-end">
            <div class="d-flex justify-center justify-md-end gap-3">
              <!-- Arena Social Link -->
              <a href="https://arena.social/DimishAvax" target="_blank" rel="noopener noreferrer" class="social-link" title="Arena">
                <v-img :src="baseUrl + 'images/arena.png'" alt="Arena" width="32" height="32" class="social-icon" />
              </a>
              
              <!-- Twitter Link -->
              <a href="https://twitter.com/DimishAvax" target="_blank" rel="noopener noreferrer" class="social-link" title="Twitter">
                <v-img :src="baseUrl + 'images/twitter.png'" alt="Twitter" width="32" height="32" class="social-icon" />
              </a>
              
              <!-- Discord Link -->
              <a href="https://discord.gg/NGxtnM9cTu" target="_blank" rel="noopener noreferrer" class="social-link" title="Discord">
                <v-img :src="baseUrl + 'images/discord.png'" alt="Discord" width="32" height="32" class="social-icon" />
              </a>
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
  min-height: calc(100vh - 128px); /* Account for header and footer on desktop */
}

@media (max-width: 959px) {
  .v-container.fill-height {
    min-height: unset; /* Remove fixed height on mobile since footer is not sticky */
  }
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

/* Social link styles */
.social-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease;
  border-radius: 50%;
  padding: 4px;
}

.social-link:hover {
  transform: scale(1.15);
  background-color: rgba(var(--v-theme-primary), 0.1);
}

.social-icon {
  transition: filter 0.3s ease;
}

.v-theme--dark .social-icon {
  filter: brightness(0.9);
}

.token-address-chip {
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.token-address-chip:hover {
  background-color: rgba(var(--v-theme-secondary), 0.15);
}
</style>