<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useWeb3Store } from '../stores/web3Store';
import { ethers } from 'ethers';

const web3Store = useWeb3Store();

// Loading state
const isLoading = computed(() => web3Store.loadingLeaderboard);

// Period options for tab selection
const periodOptions = [
  { value: web3Store.leaderboardPeriods.DAILY, title: 'Daily' },
  { value: web3Store.leaderboardPeriods.WEEKLY, title: 'Weekly' },
  { value: web3Store.leaderboardPeriods.MONTHLY, title: 'Monthly' },
  { value: web3Store.leaderboardPeriods.ALL_TIME, title: 'All Time' }
];

// Change leaderboard period
const changePeriod = async (period) => {
  // Show loading state
  web3Store.loadingLeaderboard = true;
  try {
    await web3Store.fetchLeaderboard(period);
  } catch (error) {
    console.error('Error changing leaderboard period:', error);
  } finally {
    web3Store.loadingLeaderboard = false;
  }
};

// Get data for the current period
const currentLeaderboardData = computed(() => web3Store.getCurrentLeaderboardData);
const currentUserBurnAmount = computed(() => web3Store.getCurrentUserBurnAmount);

// Format addresses for display
function formatAddress(address) {
  if (!address) return '';
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

// Format numbers with commas
function formatNumber(number) {
  // Handle null, undefined, or NaN values
  if (number === null || number === undefined || isNaN(number) || number === '') {
    return '0';
  }
  
  // Convert to number if it's a string
  const value = typeof number === 'string' ? parseFloat(number) : number;
  
  // Format with commas
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4
  });
}

// Get rank class for the row
function getRankClass(index) {
  if (index === 0) return 'rank-first';
  if (index === 1) return 'rank-second';
  if (index === 2) return 'rank-third';
  return '';
}

// Check if an address is the current user
function isCurrentUser(address) {
  return web3Store.account && web3Store.account.toLowerCase() === address.toLowerCase();
}

// Get highlight class if it's the current user
function getHighlightClass(address) {
  return isCurrentUser(address) ? 'current-user' : '';
}

// Fetch the leaderboard data
async function fetchLeaderboard() {
  if (web3Store.connected && web3Store.leaderboardAddress) {
    await web3Store.fetchLeaderboard();
  }
}

// Refresh the leaderboard
async function refreshLeaderboard() {
  await fetchLeaderboard();
}

// Watch for changes in connection state or network
watch(() => web3Store.connected, async (newValue) => {
  // Fetch leaderboard regardless of connection state to update user stats
  if (web3Store.leaderboardAddress) {
    await fetchLeaderboard();
  }
});

watch(() => web3Store.chainId, async (newValue) => {
  if (newValue && web3Store.leaderboardAddress) {
    // Initialize contract only if connected
    if (web3Store.connected) {
      await web3Store.initLeaderboardContract();
    }
    await fetchLeaderboard();
  }
});

// Load leaderboard on mount regardless of connection state
onMounted(async () => {
  if (web3Store.leaderboardAddress) {
    await fetchLeaderboard();
  }
});
</script>

<template>
  <v-container fluid class="pa-2 pa-sm-3 pa-lg-4 fill-width">
    <v-card class="mx-auto" width="100%" elevation="3">
    <v-card-title class="text-center text-h5 py-4">
      <v-icon size="large" color="error" class="me-2">mdi-fire</v-icon>
      <span>
        {{ 
          web3Store.currentLeaderboardPeriod === web3Store.leaderboardPeriods.DAILY ? 'Daily' :
          web3Store.currentLeaderboardPeriod === web3Store.leaderboardPeriods.WEEKLY ? 'Weekly' :
          web3Store.currentLeaderboardPeriod === web3Store.leaderboardPeriods.MONTHLY ? 'Monthly' :
          'All Time'
        }} Burn Leaderboard
      </span>
    </v-card-title>
    
    <v-card-text>
      <div v-if="!web3Store.leaderboardAddress" class="text-center pa-4">
        <v-alert color="warning" variant="tonal" icon="mdi-alert-circle-outline">
          Leaderboard not available on this network
        </v-alert>
      </div>
      
      <div v-else>
        <!-- Summary Stats -->
        <v-row class="mb-4">
          <v-col cols="12" sm="4">
            <v-card variant="outlined" class="text-center">
              <v-card-title class="text-subtitle-1">Total Burned</v-card-title>
              <v-card-text class="text-h6">
                {{ formatNumber(web3Store.totalBurnedAmount) }} {{ web3Store.tokenSymbol || 'Tokens' }}
              </v-card-text>
            </v-card>
          </v-col>
          
          <v-col cols="12" sm="4">
            <v-card variant="outlined" class="text-center">
              <v-card-title class="text-subtitle-1">Your Burns</v-card-title>
              <v-card-text v-if="!web3Store.connected" class="text-subtitle-2 text-grey">
                Connect wallet to view
              </v-card-text>
              <v-card-text v-else class="text-h6">
                {{ formatNumber(currentUserBurnAmount || '0') }} {{ web3Store.tokenSymbol || 'Tokens' }}
                <div class="text-caption text-left mt-2" v-if="currentUserBurnAmount === '0'">
                  <div>All-time: {{ formatNumber(web3Store.userBurnAmount) }}</div>
                  <div>Daily: {{ formatNumber(web3Store.userDailyBurnAmount) }}</div>
                  <div>Weekly: {{ formatNumber(web3Store.userWeeklyBurnAmount) }}</div>
                  <div>Monthly: {{ formatNumber(web3Store.userMonthlyBurnAmount) }}</div>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
          
          <v-col cols="12" sm="4">
            <v-card variant="outlined" class="text-center">
              <v-card-title class="text-subtitle-1">Your Rank</v-card-title>
              <v-card-text v-if="!web3Store.connected" class="text-subtitle-2 text-grey">
                Connect wallet to view
              </v-card-text>
              <v-card-text v-else class="text-h6">
                {{ web3Store.userRank === 0 ? 'Not Ranked' : `#${web3Store.userRank}` }}
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
        
        <!-- Time Period Tabs -->
        <v-card variant="outlined" class="mb-4">
          <v-tabs
            v-model="web3Store.currentLeaderboardPeriod"
            bg-color="background"
            slider-color="primary"
            @update:model-value="changePeriod"
            centered
          >
            <v-tab
              v-for="option in periodOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.title }}
            </v-tab>
          </v-tabs>
        </v-card>
        
        <!-- Leaderboard Table -->
        <v-data-table
          :headers="[
            { title: 'Rank', align: 'center', key: 'rank', width: '80px' },
            { title: 'Address', align: 'start', key: 'address' },
            { title: 'Amount Burned', align: 'end', key: 'amount' }
          ]"
          :items="currentLeaderboardData.map((item, index) => ({
            rank: index + 1,
            address: formatAddress(item.address),
            rawAddress: item.address,
            amount: `${formatNumber(item.amount)} ${web3Store.tokenSymbol}`,
            rawAmount: item.amount
          }))"
          :loading="isLoading"
          density="compact"
          :hover="true"
          class="elevation-1"
        >
          <template v-slot:item="{ item }">
            <tr :class="getHighlightClass(item.rawAddress)">
              <td class="text-center">
                <div :class="getRankClass(item.rank - 1)">
                  <span v-if="item.rank <= 3" class="rank-emoji">
                    {{ item.rank === 1 ? '🥇' : item.rank === 2 ? '🥈' : '🥉' }}
                  </span>
                  <span v-else>{{ item.rank }}</span>
                </div>
              </td>
              <td class="address-cell">
                {{ item.address }}
                <v-chip v-if="isCurrentUser(item.rawAddress)" size="x-small" color="primary" class="ms-2">You</v-chip>
              </td>
              <td class="text-end font-weight-bold">{{ item.amount }}</td>
            </tr>
          </template>
          
          <template v-slot:bottom>
            <div class="d-flex justify-end pa-2">
              <v-btn
                color="primary"
                variant="text"
                size="small"
                prepend-icon="mdi-refresh"
                @click="refreshLeaderboard"
                :loading="isLoading"
              >
                Refresh Leaderboard
              </v-btn>
            </div>
          </template>
          
          <template v-slot:no-data>
            <div class="text-center pa-4">
              <p v-if="isLoading">Loading leaderboard data...</p>
              <div v-else-if="web3Store.status && web3Store.status.includes('Error')">
                <v-alert type="error" density="compact" variant="tonal">
                  {{ web3Store.status }}
                </v-alert>
                <div class="mt-3">
                  <v-btn color="primary" prepend-icon="mdi-refresh" @click="refreshLeaderboard">
                    Retry
                  </v-btn>
                </div>
              </div>
              <p v-else>No burn data available yet. Be the first to burn tokens!</p>
            </div>
          </template>
        </v-data-table>
      </div>
    </v-card-text>
    </v-card>
  </v-container>
</template>

<style scoped>
.rank-first {
  color: gold;
  font-weight: bold;
}

.rank-second {
  color: silver;
  font-weight: bold;
}

.rank-third {
  color: #cd7f32; /* Bronze */
  font-weight: bold;
}

.rank-emoji {
  font-size: 1.2rem;
}

.current-user {
  background-color: rgba(var(--v-theme-primary), 0.1) !important;
}

.address-cell {
  display: flex;
  align-items: center;
}
</style>