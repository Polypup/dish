<script setup>
import { ref, onMounted, onUnmounted, watch, computed } from 'vue';
import { useWeb3Store } from '../stores/web3Store';
import { useThemeStore } from '../stores/themeStore';
import { useTheme } from 'vuetify';

const web3Store = useWeb3Store();
const themeStore = useThemeStore();
const theme = useTheme();
const nativeBalance = ref('0');
const loadingBalance = ref(false);

// Set the theme based on themeStore
watch(() => themeStore.isDark, (isDark) => {
  theme.global.name.value = isDark ? 'dark' : 'light';
}, { immediate: true });

// Toggle theme function for UI
const toggleTheme = () => {
  themeStore.toggleTheme();
};

// Theme icon
const themeIcon = computed(() => themeStore.isDark ? 'mdi-weather-sunny' : 'mdi-weather-night');

// Fetch the native token balance (ETH, MATIC, etc.)
const fetchNativeBalance = async () => {
  if (!web3Store.connected) return;
  
  try {
    loadingBalance.value = true;
    nativeBalance.value = await web3Store.getNativeBalance();
    loadingBalance.value = false;
  } catch (error) {
    console.error('Error fetching native balance:', error);
    nativeBalance.value = '0';
    loadingBalance.value = false;
  }
};

// Handle connect wallet button click
const handleConnect = async () => {
  await web3Store.connectWallet();
};

// Handle disconnect wallet button click
const handleDisconnect = async () => {
  await web3Store.disconnectWallet();
};

// Copy address to clipboard
const copyAddress = () => {
  if (web3Store.account) {
    navigator.clipboard.writeText(web3Store.account)
      .then(() => {
        console.log('Address copied to clipboard');
      })
      .catch((err) => {
        console.error('Failed to copy address:', err);
      });
  }
};

// Copy token address to clipboard
const copyTokenAddress = () => {
  if (web3Store.tokenAddress) {
    navigator.clipboard.writeText(web3Store.tokenAddress)
      .then(() => {
        console.log('Token address copied to clipboard');
      })
      .catch((err) => {
        console.error('Failed to copy token address:', err);
      });
  }
};

// Update balance when account changes
watch(() => web3Store.account, async () => {
  await fetchNativeBalance();
}, { immediate: true });

// Update balance when chain changes
watch(() => web3Store.chainId, async () => {
  await fetchNativeBalance();
});

// Fetch native balance when connected
watch(() => web3Store.connected, async (newConnected) => {
  if (newConnected) {
    await fetchNativeBalance();
  } else {
    nativeBalance.value = '0';
  }
}, { immediate: true });

onMounted(async () => {
  if (web3Store.connected) {
    await fetchNativeBalance();
  }
  
  // Set up subscriptions to Web3-Onboard events
  const unsubscribe = web3Store.subscribeToWalletEvents();
  
  // Clean up subscription when component is unmounted
  onUnmounted(() => {
    if (unsubscribe) unsubscribe();
  });
});
</script>

<template>
  <v-app-bar app elevation="1" :color="themeStore.isDark ? 'surface' : 'white'" density="comfortable" class="fill-width">
    <v-container fluid class="fill-width">
      <v-row align="center" no-gutters>
        <v-col cols="auto" class="d-flex align-center">
          <div class="d-flex align-center">
            <v-img src="/images/dimish.png" width="36" height="36" class="me-2 d-sm-block d-none"></v-img>
            <span class="text-h6 font-weight-bold d-sm-block d-none">Dimish</span>
            <span class="text-h6 font-weight-bold d-sm-none">DB</span>
          </div>
        </v-col>
        
        <v-spacer></v-spacer>
        
        <!-- Theme toggle -->
        <v-col cols="auto" class="d-flex align-center me-2">
          <v-btn
            icon
            @click="toggleTheme"
            :title="themeStore.isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'"
            class="theme-toggle-btn"
            color="primary"
          >
            <v-icon>{{ themeIcon }}</v-icon>
          </v-btn>
        </v-col>
        
        <v-col cols="auto" class="d-flex justify-end align-center flex-wrap">
          <div v-if="!web3Store.connected">
            <v-btn 
              color="primary" 
              @click="handleConnect"
              :loading="web3Store.connecting"
              prepend-icon="mdi-wallet"
            >
              Connect Wallet
            </v-btn>
          </div>
          
          <div v-else class="d-flex align-center wallet-info-container">
            <!-- AVAX Balance with Logo -->
            <v-chip
              class="me-2"
              color="grey-darken-1"
              variant="outlined"
              label
              title="AVAX Balance"
              :loading="loadingBalance"
            >
              <template v-slot:prepend>
                <v-avatar size="16" class="me-1">
                  <v-img src="/images/avax-logo.png" alt="AVAX Logo"></v-img>
                </v-avatar>
              </template>
              {{ parseFloat(nativeBalance).toFixed(4) }} AVAX
            </v-chip>
            
            <!-- Token Balance -->
            <v-chip
              v-if="web3Store.tokenSymbol"
              class="me-2"
              color="success"
              variant="outlined"
              label
              title="Token Balance"
            >
              {{ parseFloat(web3Store.tokenBalance).toFixed(4) }} {{ web3Store.tokenSymbol }}
            </v-chip>
            
            <v-menu location="bottom" :close-on-content-click="false">
              <template v-slot:activator="{ props }">
                <v-chip
                  v-bind="props"
                  class="wallet-address-chip"
                  color="secondary"
                  variant="elevated"
                  label
                  title="Click for options"
                >
                  <v-icon start icon="mdi-account-circle-outline"></v-icon>
                  <span class="d-none d-sm-block">{{ web3Store.formattedAddress }}</span>
                  <span class="d-sm-none">{{ web3Store.formattedAddress.substring(0, 4) }}...{{ web3Store.formattedAddress.substring(web3Store.formattedAddress.length - 2) }}</span>
                </v-chip>
              </template>
              <v-list class="pa-2">
                <v-list-item @click="copyAddress" class="mb-1">
                  <v-list-item-title>Copy Address</v-list-item-title>
                  <template v-slot:prepend>
                    <v-icon icon="mdi-content-copy"></v-icon>
                  </template>
                </v-list-item>
                <v-list-item @click="handleDisconnect" class="mb-1">
                  <v-list-item-title>Disconnect</v-list-item-title>
                  <template v-slot:prepend>
                    <v-icon icon="mdi-logout-variant"></v-icon>
                  </template>
                </v-list-item>
                <v-divider class="my-2"></v-divider>
                <v-btn
                  :href="`https://snowtrace.io/address/${web3Store.account}`" 
                  target="_blank"
                  variant="tonal"
                  color="primary"
                  block
                  class="mb-1"
                  size="small"
                  :disabled="web3Store.chainId !== '0xa86a'"
                  prepend-icon="mdi-open-in-new"
                >
                  View on Snowtrace
                </v-btn>
                <v-btn
                  :href="`https://testnet.snowtrace.io/address/${web3Store.account}`" 
                  target="_blank"
                  variant="tonal"
                  color="secondary"
                  block
                  size="small"
                  :disabled="web3Store.chainId !== '0xa869'"
                  prepend-icon="mdi-open-in-new"
                >
                  View on Testnet
                </v-btn>
              </v-list>
            </v-menu>
          </div>
        </v-col>
      </v-row>
    </v-container>
  </v-app-bar>
</template>

<style scoped>
.wallet-info-container {
  flex-wrap: wrap;
  gap: 4px;
}

.wallet-address-chip {
  cursor: pointer;
}

/* Custom styling for chips on mobile */
:deep(.v-chip) {
  margin-bottom: 4px;
}

/* Reduce font size on mobile */
:deep(.v-chip__content) {
  white-space: nowrap;
}

@media (max-width: 600px) {
  .wallet-info-container {
    justify-content: flex-end;
  }
  
  :deep(.v-chip) {
    padding: 0 8px;
  }
  
  :deep(.v-btn) {
    min-width: unset !important;
  }
}
</style>