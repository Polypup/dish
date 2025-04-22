<script setup>
import { ref, computed } from 'vue';
import { useWeb3Store } from '../stores/web3Store';

const web3Store = useWeb3Store();
const amount = ref('');
// Track burning state locally in addition to web3Store status
const isBurning = ref(false);

// Combined loading state covers all transaction steps
const isLoading = computed(() => 
  isBurning.value || 
  web3Store.status.includes('Preparing') || 
  web3Store.status.includes('Approving') || 
  web3Store.status.includes('Burning') || 
  web3Store.status.includes('Transaction submitted') || 
  web3Store.status.includes('waiting for confirmation') || 
  web3Store.connecting
);
const isAvalancheNetwork = computed(() => 
  web3Store.chainId === '0xa86a' || web3Store.chainId === '0xa869'
);

// Burn tokens function
const burnTokens = async () => {
  if (!amount.value || parseFloat(amount.value) <= 0) {
    web3Store.status = 'Please enter a valid amount';
    return;
  }
  
  // Set burning state to true at the start
  isBurning.value = true;
  
  try {
    // Use leaderboard burn if available, otherwise fallback to direct burn
    let success;
    if (web3Store.leaderboardAddress) {
      success = await web3Store.burnTokensWithLeaderboard(amount.value);
    } else {
      success = await web3Store.burnTokens(amount.value);
    }
    
    if (success) {
      amount.value = '';
    }
  } catch (error) {
    console.error('Error during token burn:', error);
  } finally {
    // Set burning state to false when done, regardless of outcome
    isBurning.value = false;
  }
};
</script>

<template>
  <v-container fluid class="pa-2 pa-sm-3 pa-lg-4 fill-width">
    <v-card class="mx-auto" width="100%" elevation="3">
      <v-card-title class="text-center text-h4 py-4">
        <v-icon size="x-large" color="error" class="me-2">mdi-fire</v-icon>
        Dish Burner
      </v-card-title>
      
      <v-card-text>
        <v-form>
          <v-row>
            <v-col cols="12" v-if="web3Store.connected">
              <v-card variant="outlined" class="mb-4">
                <v-card-text>
                  <div class="d-flex flex-column">
                    <div class="d-flex justify-space-between align-center flex-wrap mb-4">
                      <div>
                        <div class="text-subtitle-1">Token:</div>
                        <div class="text-h6">
                          <div>
                            <v-chip
                              color="primary"
                              size="small"
                              label
                              class="me-2"
                            >
                              {{ web3Store.tokenSymbol || 'Loading...' }}
                            </v-chip>
                            <span class="text-body-1">{{ web3Store.tokenName }}</span>
                          </div>
                          <div class="mt-1">
                            <v-chip
                              v-if="web3Store.tokenAddress"
                              size="small"
                              class="text-caption"
                              variant="text"
                              @click="web3Store.tokenAddress && navigator.clipboard.writeText(web3Store.tokenAddress)"
                              title="Click to copy"
                            >
                              {{ web3Store.tokenAddress.substring(0, 6) }}...{{ web3Store.tokenAddress.substring(web3Store.tokenAddress.length - 4) }}
                              <template v-slot:append>
                                <v-icon size="small">mdi-content-copy</v-icon>
                              </template>
                            </v-chip>
                          </div>
                        </div>
                      </div>
                      <div>
                        <div class="text-subtitle-1">Your Balance:</div>
                        <div class="text-h6 d-flex align-center">
                          <span>{{ web3Store.tokenSymbol ? parseFloat(web3Store.tokenBalance).toFixed(4) : '0' }}</span>
                          <v-chip
                            class="ms-2"
                            color="success"
                            size="small"
                            label
                          >
                            {{ web3Store.tokenSymbol || '...' }}
                          </v-chip>
                        </div>
                      </div>
                    </div>
                    
                    <v-divider class="mb-3"></v-divider>
                    
                    <div class="d-flex justify-space-between align-center">
                      <div>
                        <div class="text-subtitle-2">Total Supply:</div>
                        <div class="text-body-1">
                          {{ parseFloat(web3Store.totalSupply).toLocaleString() }} {{ web3Store.tokenSymbol }}
                        </div>
                      </div>
                      
                      <v-btn 
                        v-if="web3Store.chainId === '0xa86a' || web3Store.chainId === '0xa869'"
                        :href="web3Store.chainId === '0xa86a' 
                          ? `https://snowtrace.io/token/${web3Store.tokenAddress}` 
                          : `https://testnet.snowtrace.io/token/${web3Store.tokenAddress}`"
                        target="_blank"
                        variant="text"
                        size="small"
                        prepend-icon="mdi-open-in-new"
                      >
                        View on Snowtrace
                      </v-btn>
                    </div>
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
            
            <v-col cols="12" sm="8">
              <v-text-field
                v-model="amount"
                label="Amount to Burn"
                placeholder="0.0"
                type="number"
                variant="outlined"
                :disabled="!web3Store.connected || !web3Store.tokenSymbol || isLoading"
                :loading="isLoading"
                hide-details="auto"
                class="mb-4"
                prepend-inner-icon="mdi-fire"
              ></v-text-field>
            </v-col>
            
            <v-col cols="12" sm="4" class="d-flex align-center">
              <v-btn
                block
                color="error"
                size="large"
                :loading="isLoading"
                :disabled="!web3Store.connected || !web3Store.tokenSymbol || !amount || isLoading"
                @click="burnTokens"
                class="mb-4"
                prepend-icon="mdi-fire"
              >
                Burn Dish
              </v-btn>
            </v-col>
          </v-row>
        </v-form>
        
        <v-alert
          v-if="web3Store.connected && !isAvalancheNetwork"
          type="warning"
          variant="tonal"
          class="mt-4"
          closable
        >
          This app only works on Avalanche blockchain. Please switch your network to Avalanche.
          <v-btn
            color="warning"
            variant="text"
            size="small"
            class="mt-2"
            @click="web3Store.switchToAvalancheNetwork"
          >
            Switch to Avalanche
          </v-btn>
        </v-alert>
        
        <v-alert
          v-if="web3Store.status"
          :type="web3Store.status.includes('error') || web3Store.status.includes('Error') ? 'error' : 
                 web3Store.status.includes('Success') ? 'success' : 'info'"
          variant="tonal"
          class="mt-4"
        >
          {{ web3Store.status }}
        </v-alert>
      </v-card-text>
      
      <v-card-actions v-if="!web3Store.connected" class="justify-center pb-6">
        <v-btn
          color="primary"
          size="large"
          :loading="web3Store.connecting"
          @click="web3Store.connectWallet"
          prepend-icon="mdi-wallet-outline"
        >
          Connect Wallet
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-container>
</template>