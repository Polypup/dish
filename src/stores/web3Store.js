import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import Onboard from '@web3-onboard/core';
import injectedWallets from '@web3-onboard/injected-wallets';
import { ethers } from 'ethers';
import { BURN_LEADERBOARD_ABI, BURN_LEADERBOARD_ADDRESS } from '../contracts/BurnLeaderboardABI';

// Token burning interface - ERC20 with burn function
const tokenAbi = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint)",
  "function burn(uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function totalSupply() view returns (uint256)"
];

// Predefined token address
const FIXED_TOKEN_ADDRESS = '0x40146E96EE5297187022D1ca62A3169B5e45B0a4';

export const useWeb3Store = defineStore('web3', () => {
  // State
  const web3Onboard = ref(null);
  const currentWallet = ref(null);
  const connected = ref(false);
  const connecting = ref(false);
  const account = ref('');
  const chainId = ref('');
  const chainName = ref('');
  const walletLabel = ref('');
  const status = ref('');

  // Token info
  const tokenAddress = ref(FIXED_TOKEN_ADDRESS);
  const tokenContract = ref(null);
  const tokenName = ref('');
  const tokenSymbol = ref('');
  const tokenBalance = ref('0');
  const totalSupply = ref('0');
  
  // Leaderboard info
  const leaderboardContract = ref(null);
  const leaderboardAddress = computed(() => 
    chainId.value ? BURN_LEADERBOARD_ADDRESS[chainId.value] : null
  );
  
  // Leaderboard periods
  const leaderboardPeriods = {
    DAILY: 'daily',
    WEEKLY: 'weekly',
    MONTHLY: 'monthly',
    ALL_TIME: 'all_time'
  };
  
  // Active leaderboard period
  const currentLeaderboardPeriod = ref(leaderboardPeriods.ALL_TIME);
  
  // Leaderboard data for different periods
  const leaderboardData = ref([]);
  const dailyLeaderboardData = ref([]);
  const weeklyLeaderboardData = ref([]);
  const monthlyLeaderboardData = ref([]);
  
  // User stats
  const userRank = ref(0);
  const userBurnAmount = ref('0');
  const userDailyBurnAmount = ref('0');
  const userWeeklyBurnAmount = ref('0');
  const userMonthlyBurnAmount = ref('0');
  
  // Total burned amounts
  const totalBurnedAmount = ref('0');
  
  const loadingLeaderboard = ref(false);
  
  // Network info mapping
  const networkMap = {
    '0xa86a': 'Avalanche Mainnet',
    '0xa869': 'Avalanche Fuji Testnet'
  };
  
  // Initialize Onboard
  const initOnboard = async () => {
    const injected = injectedWallets();
    
    web3Onboard.value = Onboard({
      wallets: [injected],
      chains: [
        {
          id: '0xa86a', // Avalanche Mainnet
          token: 'AVAX',
          label: 'Avalanche Mainnet',
          rpcUrl: 'https://api.avax.network/ext/bc/C/rpc'
        },
        {
          id: '0xa869', // Avalanche Fuji Testnet
          token: 'AVAX',
          label: 'Avalanche Fuji Testnet',
          rpcUrl: 'https://api.avax-test.network/ext/bc/C/rpc'
        }
      ],
      appMetadata: {
        name: 'Token Burner App',
        description: 'An application to burn tokens on Avalanche blockchain',
        icon: '<svg>...</svg>', // Add your app icon here
      }
    });
    
    return web3Onboard.value;
  };
  
  // Check if connected to Avalanche network
  const checkAvalancheNetwork = async () => {
    if (!currentWallet.value) return false;
    
    const { chains } = currentWallet.value;
    const currentChainId = chains[0].id;
    
    // Check if current chain is Avalanche Mainnet or Fuji Testnet
    return currentChainId === '0xa86a' || currentChainId === '0xa869';
  };
  
  // Switch to Avalanche network
  const switchToAvalancheNetwork = async () => {
    if (!web3Onboard.value || !currentWallet.value) return false;
    
    try {
      status.value = 'Switching to Avalanche network...';
      
      // Try to switch to Avalanche Mainnet
      const success = await web3Onboard.value.setChain({ chainId: '0xa86a' });
      
      if (success) {
        status.value = 'Switched to Avalanche network';
        return true;
      } else {
        status.value = 'Failed to switch network';
        return false;
      }
    } catch (error) {
      console.error('Error switching network:', error);
      status.value = `Network switch error: ${error.message}`;
      return false;
    }
  };

  // Connect wallet
  const connectWallet = async () => {
    try {
      connecting.value = true;
      status.value = 'Connecting wallet...';
      
      if (!web3Onboard.value) {
        await initOnboard();
      }
      
      // Connect the wallet
      const wallets = await web3Onboard.value.connectWallet();
      
      if (wallets.length === 0) {
        status.value = 'Wallet connection canceled';
        connecting.value = false;
        return false;
      }
      
      // Get updated wallets from state (safer than using the returned wallets)
      const connectedWallets = web3Onboard.value.state.get().wallets;
      if (connectedWallets.length === 0) {
        status.value = 'Wallet connection error: No wallets in state';
        connecting.value = false;
        return false;
      }
      
      // Store the current wallet
      currentWallet.value = connectedWallets[0];
      const { accounts, chains } = currentWallet.value;
      
      if (accounts.length === 0) {
        status.value = 'No accounts available';
        connecting.value = false;
        return false;
      }
      
      // Store account and chain information
      account.value = accounts[0].address;
      chainId.value = chains[0].id;
      chainName.value = networkMap[chains[0].id] || `Chain ID: ${chains[0].id}`;
      walletLabel.value = currentWallet.value.label;
      
      // Check if user is on Avalanche network, if not, try to switch
      const isAvalanche = await checkAvalancheNetwork();
      if (!isAvalanche) {
        const switched = await switchToAvalancheNetwork();
        if (!switched) {
          status.value = 'Please switch to Avalanche network to use this app';
          connecting.value = false;
          return false;
        }
      }
      
      connected.value = true;
      status.value = 'Wallet connected';
      
      // Load token info
      await loadTokenInfo();
      
      // Initialize leaderboard contract and fetch data
      if (leaderboardAddress.value) {
        await initLeaderboardContract();
        await fetchLeaderboard();
      }
      
      connecting.value = false;
      return true;
    } catch (error) {
      console.error('Error connecting wallet:', error);
      status.value = `Connection error: ${error.message}`;
      connecting.value = false;
      return false;
    }
  };
  
  // Disconnect wallet
  const disconnectWallet = async () => {
    try {
      if (web3Onboard.value && currentWallet.value) {
        await web3Onboard.value.disconnectWallet({ label: currentWallet.value.label });
        
        // Reset state
        connected.value = false;
        account.value = '';
        chainId.value = '';
        chainName.value = '';
        walletLabel.value = '';
        currentWallet.value = null;
        tokenContract.value = null;
        tokenName.value = '';
        tokenSymbol.value = '';
        tokenBalance.value = '0';
        totalSupply.value = '0';
        
        status.value = 'Wallet disconnected';
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
      status.value = `Disconnect error: ${error.message}`;
      return false;
    }
  };
  
  // Load token information
  const loadTokenInfo = async () => {
    if (!tokenAddress.value || !account.value) return;
    
    try {
      status.value = 'Loading token info...';
      
      // Get the current wallets from the Onboard state
      const connectedWallets = web3Onboard.value.state.get().wallets;
      
      if (!connectedWallets || connectedWallets.length === 0) {
        status.value = 'No connected wallet found';
        return false;
      }
      
      // Create provider using the first wallet's provider
      const ethersProvider = new ethers.BrowserProvider(connectedWallets[0].provider);
      const signer = await ethersProvider.getSigner();
      
      // Create contract instance
      tokenContract.value = new ethers.Contract(
        tokenAddress.value,
        tokenAbi,
        signer
      );
      
      // Get token details using Promise.all for parallel requests
      const [symbol, name, decimals, rawBalance, rawTotalSupply] = await Promise.all([
        tokenContract.value.symbol(),
        tokenContract.value.name(),
        tokenContract.value.decimals(),
        tokenContract.value.balanceOf(account.value),
        tokenContract.value.totalSupply()
      ]);
      
      // Set token details
      tokenSymbol.value = symbol;
      tokenName.value = name;
      
      // Format balance and total supply with correct decimals
      tokenBalance.value = ethers.formatUnits(rawBalance, decimals);
      totalSupply.value = ethers.formatUnits(rawTotalSupply, decimals);
      
      status.value = `Loaded ${tokenName.value} (${tokenSymbol.value}) token`;
      return true;
    } catch (error) {
      console.error('Error loading token:', error);
      status.value = `Token error: ${error.message}`;
      tokenContract.value = null;
      tokenName.value = '';
      tokenSymbol.value = '';
      tokenBalance.value = '0';
      totalSupply.value = '0';
      return false;
    }
  };
  
  // Burn tokens
  const burnTokens = async (amount) => {
    if (!tokenContract.value || !amount || parseFloat(amount) <= 0) {
      status.value = 'Please enter a valid amount';
      return false;
    }
    
    try {
      status.value = 'Burning tokens...';
      
      // Get the current wallets from the Onboard state
      const connectedWallets = web3Onboard.value.state.get().wallets;
      
      if (!connectedWallets || connectedWallets.length === 0) {
        status.value = 'No connected wallet found';
        return false;
      }
      
      // Create provider using the first wallet's provider
      const ethersProvider = new ethers.BrowserProvider(connectedWallets[0].provider);
      const signer = await ethersProvider.getSigner();
      
      // Create a new instance of the contract with the current signer
      const contract = new ethers.Contract(
        tokenAddress.value,
        tokenAbi,
        signer
      );
      
      // Get token decimals for proper formatting
      const decimals = await contract.decimals();
      
      // Convert amount to token units
      const amountToSend = ethers.parseUnits(amount, decimals);
      
      // Burn the tokens
      const tx = await contract.burn(amountToSend);
      
      status.value = 'Transaction submitted, waiting for confirmation...';
      
      // Wait for transaction to be mined
      await tx.wait();
      
      // Refresh balance
      await loadTokenInfo();
      
      status.value = `Successfully burned ${amount} ${tokenSymbol.value}`;
      return true;
    } catch (error) {
      console.error('Error burning tokens:', error);
      status.value = `Burn error: ${error.message}`;
      return false;
    }
  };
  
  // Get native balance (AVAX) for current account
  const getNativeBalance = async () => {
    if (!account.value || !web3Onboard.value) return '0';
    
    try {
      // Get the current wallets from the Onboard state
      const connectedWallets = web3Onboard.value.state.get().wallets;
      
      if (!connectedWallets || connectedWallets.length === 0) {
        return '0';
      }
      
      // Create provider using the first wallet's provider
      const ethersProvider = new ethers.BrowserProvider(connectedWallets[0].provider);
      const balance = await ethersProvider.getBalance(account.value);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('Error getting native balance:', error);
      return '0';
    }
  };
  
  // Subscribe to updates when wallet or chain changes
  const subscribeToWalletEvents = () => {
    if (!web3Onboard.value) return;
    
    // Set up subscription for wallet updates
    const walletsSub = web3Onboard.value.state.select('wallets');
    const { unsubscribe } = walletsSub.subscribe(async (wallets) => {
      if (wallets.length === 0) {
        // All wallets disconnected
        connected.value = false;
        account.value = '';
        chainId.value = '';
        chainName.value = '';
        currentWallet.value = null;
        return;
      }
      
      const updatedWallet = wallets[0];
      const newChainId = updatedWallet.chains[0].id;
      const newAccount = updatedWallet.accounts[0]?.address;
      
      // Update account if changed
      if (newAccount !== account.value) {
        account.value = newAccount;
        
        // Reset contract instances to force reinitializing with new wallet
        leaderboardContract.value = null;
        tokenContract.value = null;
        
        // Reload token balance for new account and reinitialize contracts
        if (connected.value) {
          console.log('Account changed, reinitializing contracts for:', newAccount);
          await initLeaderboardContract();
          await loadTokenInfo();
          await fetchLeaderboard();
        }
      }
      
      // Update chain info if changed
      if (newChainId !== chainId.value) {
        chainId.value = newChainId;
        chainName.value = networkMap[newChainId] || `Chain ID: ${newChainId}`;
        
        // Check if we're on Avalanche network
        const isAvalanche = newChainId === '0xa86a' || newChainId === '0xa869';
        
        if (!isAvalanche) {
          status.value = 'Please switch to Avalanche network to use this app';
          
          // Attempt to switch networks automatically
          await switchToAvalancheNetwork();
        } else {
          // Reload token info since we're on a new chain and it's Avalanche
          if (connected.value) {
            await loadTokenInfo();
          }
        }
      }
      
      // Store the updated wallet
      currentWallet.value = updatedWallet;
    });
    
    // Return unsubscribe function for cleanup
    return unsubscribe;
  };
  
  // Computed property for the native token symbol
  const nativeTokenSymbol = computed(() => {
    return 'AVAX';
  });
  
  // Format address for display
  const formattedAddress = computed(() => {
    if (!account.value) return '';
    return `${account.value.substring(0, 6)}...${account.value.substring(account.value.length - 4)}`;
  });
  
  // Initialize the leaderboard contract
  const initLeaderboardContract = async () => {
    if (!web3Onboard.value || !leaderboardAddress.value) return null;
    
    try {
      // Get the current wallets from the Onboard state
      const connectedWallets = web3Onboard.value.state.get().wallets;
      
      if (!connectedWallets || connectedWallets.length === 0) {
        return null;
      }
      
      // Create provider using the first wallet's provider
      const ethersProvider = new ethers.BrowserProvider(connectedWallets[0].provider);
      const signer = await ethersProvider.getSigner();
      
      // Double-check that the signer address matches our current account
      const signerAddress = await signer.getAddress();
      if (signerAddress.toLowerCase() !== account.value.toLowerCase()) {
        console.warn('Signer address does not match current account, updating account');
        account.value = signerAddress;
      }
      
      // Create contract instance
      leaderboardContract.value = new ethers.Contract(
        leaderboardAddress.value,
        BURN_LEADERBOARD_ABI,
        signer
      );
      
      console.log('Initialized leaderboard contract with address:', await signer.getAddress());
      return leaderboardContract.value;
    } catch (error) {
      console.error('Error initializing leaderboard contract:', error);
      leaderboardContract.value = null;
      return null;
    }
  };
  
  // Fetch leaderboard data - public data accessible without wallet connection
  const fetchLeaderboard = async (period = null) => {
    if (!leaderboardAddress.value) {
      status.value = 'Leaderboard contract not available on this network';
      return;
    }
    
    // If period is provided, update the current period
    if (period) {
      currentLeaderboardPeriod.value = period;
    }
    
    try {
      loadingLeaderboard.value = true;
      
      // Create a read-only provider using public RPC
      let contract;
      
      // If user is connected, use their provider for consistency
      if (connected.value && leaderboardContract.value) {
        contract = leaderboardContract.value;
      } else {
        // Otherwise use a public RPC provider
        const rpcUrl = chainId.value === '0xa869' 
          ? 'https://api.avax-test.network/ext/bc/C/rpc'  // Fuji testnet
          : 'https://api.avax.network/ext/bc/C/rpc';       // Avalanche mainnet
        
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        contract = new ethers.Contract(
          leaderboardAddress.value,
          BURN_LEADERBOARD_ABI,
          provider
        );
      }
      
      // Fetch data individually with better error handling
      let allTimeData = [];
      let dailyData = [];
      let weeklyData = [];
      let monthlyData = [];
      let totalBurned = 0;
      let userRankData = 0;
      let userBurnAmountData = 0;
      let userDailyBurnAmountData = 0;
      let userWeeklyBurnAmountData = 0;
      let userMonthlyBurnAmountData = 0;
      
      try {
        allTimeData = await contract.getTotalLeaderboard();
      } catch (error) {
        console.error('Error fetching total leaderboard:', error);
        status.value = `Error fetching total leaderboard: ${error.message}`;
      }
      
      try {
        dailyData = await contract.getDailyLeaderboard();
      } catch (error) {
        console.error('Error fetching daily leaderboard:', error);
        status.value = `Error fetching daily leaderboard: ${error.message}`;
      }
      
      try {
        weeklyData = await contract.getWeeklyLeaderboard();
      } catch (error) {
        console.error('Error fetching weekly leaderboard:', error);
        status.value = `Error fetching weekly leaderboard: ${error.message}`;
      }
      
      try {
        monthlyData = await contract.getMonthlyLeaderboard();
      } catch (error) {
        console.error('Error fetching monthly leaderboard:', error);
        status.value = `Error fetching monthly leaderboard: ${error.message}`;
      }
      
      try {
        totalBurned = await contract.totalBurned();
      } catch (error) {
        console.error('Error fetching total burned:', error);
        status.value = `Error fetching total burned: ${error.message}`;
      }
      
      // Only fetch user-specific data if connected - now using the explicit contract functions
      if (connected.value && account.value) {
        try {
          // Check if the function exists before calling it
          if (typeof contract.getBurnedByAddress === 'function') {
            // Get user total burn amount
            userBurnAmountData = await contract.getBurnedByAddress(account.value);
          } else if (typeof contract.burnsByAddress === 'function') {
            // Try the mapping directly as a fallback
            userBurnAmountData = await contract.burnsByAddress(account.value);
          } else {
            console.log('getBurnedByAddress function not found, checking leaderboard data');
            // As a last resort, try to find the user in the leaderboard data
            for (const entry of leaderboardData.value) {
              if (entry.address.toLowerCase() === account.value.toLowerCase()) {
                userBurnAmountData = ethers.parseEther(entry.amount);
                break;
              }
            }
          }
        } catch (error) {
          console.error('Error fetching user burn amount:', error);
          userBurnAmountData = 0;
        }
        
        try {
          // Get user rank - if the function exists
          if (typeof contract.getRankOfAddress === 'function') {
            userRankData = await contract.getRankOfAddress(account.value);
          } else {
            // Calculate rank from leaderboard data
            userRankData = 0;
            for (let i = 0; i < leaderboardData.value.length; i++) {
              if (leaderboardData.value[i].address.toLowerCase() === account.value.toLowerCase()) {
                userRankData = i + 1; // 1-based ranking
                break;
              }
            }
          }
        } catch (error) {
          console.error('Error fetching user rank:', error);
          userRankData = 0;
        }
        
        try {
          // Get user daily burn amount - if the function exists
          if (typeof contract.getDailyBurnsByAddress === 'function') {
            userDailyBurnAmountData = await contract.getDailyBurnsByAddress(account.value);
          } else {
            // Calculate from daily leaderboard data
            userDailyBurnAmountData = 0;
            for (const entry of dailyLeaderboardData.value) {
              if (entry.address.toLowerCase() === account.value.toLowerCase()) {
                userDailyBurnAmountData = ethers.parseEther(entry.amount);
                break;
              }
            }
          }
        } catch (error) {
          console.error('Error fetching user daily burns:', error);
          userDailyBurnAmountData = 0;
        }
        
        try {
          // Get user weekly burn amount - if the function exists
          if (typeof contract.getWeeklyBurnsByAddress === 'function') {
            userWeeklyBurnAmountData = await contract.getWeeklyBurnsByAddress(account.value);
          } else {
            // Calculate from weekly leaderboard data
            userWeeklyBurnAmountData = 0;
            for (const entry of weeklyLeaderboardData.value) {
              if (entry.address.toLowerCase() === account.value.toLowerCase()) {
                userWeeklyBurnAmountData = ethers.parseEther(entry.amount);
                break;
              }
            }
          }
        } catch (error) {
          console.error('Error fetching user weekly burns:', error);
          userWeeklyBurnAmountData = 0;
        }
        
        try {
          // Get user monthly burn amount - if the function exists
          if (typeof contract.getMonthlyBurnsByAddress === 'function') {
            userMonthlyBurnAmountData = await contract.getMonthlyBurnsByAddress(account.value);
          } else {
            // Calculate from monthly leaderboard data
            userMonthlyBurnAmountData = 0;
            for (const entry of monthlyLeaderboardData.value) {
              if (entry.address.toLowerCase() === account.value.toLowerCase()) {
                userMonthlyBurnAmountData = ethers.parseEther(entry.amount);
                break;
              }
            }
          }
        } catch (error) {
          console.error('Error fetching user monthly burns:', error);
          userMonthlyBurnAmountData = 0;
        }
      }
      
      // Process leaderboard data with safety checks
      leaderboardData.value = Array.isArray(allTimeData) 
        ? allTimeData.map(item => ({
            address: item.burnerAddress,
            amount: ethers.formatEther(item.amountBurned)
          }))
        : [];
      
      dailyLeaderboardData.value = Array.isArray(dailyData)
        ? dailyData.map(item => ({
            address: item.burnerAddress,
            amount: ethers.formatEther(item.amountBurned)
          }))
        : [];
      
      weeklyLeaderboardData.value = Array.isArray(weeklyData)
        ? weeklyData.map(item => ({
            address: item.burnerAddress,
            amount: ethers.formatEther(item.amountBurned)
          }))
        : [];
      
      monthlyLeaderboardData.value = Array.isArray(monthlyData)
        ? monthlyData.map(item => ({
            address: item.burnerAddress,
            amount: ethers.formatEther(item.amountBurned)
          }))
        : [];
      
      // Update total burned amount
      totalBurnedAmount.value = ethers.formatEther(totalBurned);
      
      // Update user stats if connected
      if (connected.value && account.value) {
        // Set values from the data we fetched directly from the contract
        userRank.value = userRankData;
        userBurnAmount.value = ethers.formatEther(userBurnAmountData);
        userDailyBurnAmount.value = ethers.formatEther(userDailyBurnAmountData);
        userWeeklyBurnAmount.value = ethers.formatEther(userWeeklyBurnAmountData);
        userMonthlyBurnAmount.value = ethers.formatEther(userMonthlyBurnAmountData);
        
        // Log for debugging
        console.log('User burn amounts:', {
          all: userBurnAmount.value,
          daily: userDailyBurnAmount.value,
          weekly: userWeeklyBurnAmount.value,
          monthly: userMonthlyBurnAmount.value,
          rank: userRank.value
        });
      } else {
        // Reset user-specific data if not connected
        userRank.value = 0;
        userBurnAmount.value = '0';
        userDailyBurnAmount.value = '0';
        userWeeklyBurnAmount.value = '0';
        userMonthlyBurnAmount.value = '0';
      }
      
      loadingLeaderboard.value = false;
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      status.value = `Error fetching leaderboard: ${error.message}`;
      loadingLeaderboard.value = false;
    }
  };
  
  // Get the current active leaderboard data based on period
  const getCurrentLeaderboardData = computed(() => {
    switch(currentLeaderboardPeriod.value) {
      case leaderboardPeriods.DAILY:
        return dailyLeaderboardData.value;
      case leaderboardPeriods.WEEKLY:
        return weeklyLeaderboardData.value;
      case leaderboardPeriods.MONTHLY:
        return monthlyLeaderboardData.value;
      case leaderboardPeriods.ALL_TIME:
      default:
        return leaderboardData.value;
    }
  });
  
  // Get the current user burn amount based on period
  const getCurrentUserBurnAmount = computed(() => {
    switch(currentLeaderboardPeriod.value) {
      case leaderboardPeriods.DAILY:
        return userDailyBurnAmount.value;
      case leaderboardPeriods.WEEKLY:
        return userWeeklyBurnAmount.value;
      case leaderboardPeriods.MONTHLY:
        return userMonthlyBurnAmount.value;
      case leaderboardPeriods.ALL_TIME:
      default:
        return userBurnAmount.value;
    }
  });
  
  // Burn tokens using the leaderboard contract
  const burnTokensWithLeaderboard = async (amount) => {
    if (!amount || parseFloat(amount) <= 0) {
      status.value = 'Please enter a valid amount';
      return false;
    }
    
    if (!leaderboardAddress.value) {
      status.value = 'Leaderboard contract not available on this network';
      return false;
    }
    
    try {
      status.value = 'Preparing to burn tokens...';
      
      // Get the current wallets from the Onboard state
      const connectedWallets = web3Onboard.value.state.get().wallets;
      
      if (!connectedWallets || connectedWallets.length === 0) {
        status.value = 'No connected wallet found';
        return false;
      }
      
      // Always create fresh provider and signer
      const ethersProvider = new ethers.BrowserProvider(connectedWallets[0].provider);
      const signer = await ethersProvider.getSigner();
      
      // Double-check that the signer address matches our current account
      const signerAddress = await signer.getAddress();
      console.log('Current burn using address:', signerAddress);
      
      if (signerAddress.toLowerCase() !== account.value.toLowerCase()) {
        console.warn('Signer address does not match current account, updating account');
        account.value = signerAddress;
      }
      
      // Always create fresh contract instances with the current signer
      // Create token contract instance
      const tokenContract = new ethers.Contract(
        tokenAddress.value,
        tokenAbi,
        signer
      );
      
      // Create a fresh leaderboard contract instance with the current signer
      const leaderboardContractInstance = new ethers.Contract(
        leaderboardAddress.value,
        BURN_LEADERBOARD_ABI,
        signer
      );
      
      // Update stored contract
      leaderboardContract.value = leaderboardContractInstance;
      
      // Get token decimals for proper formatting
      const decimals = await tokenContract.decimals();
      
      // Convert amount to token units
      const amountToSend = ethers.parseUnits(amount, decimals);
      
      // First approve the leaderboard contract to spend tokens
      status.value = 'Approving tokens for burning...';
      const approveTx = await tokenContract.approve(leaderboardAddress.value, amountToSend);
      await approveTx.wait();
      
      // Now burn the tokens
      status.value = 'Burning tokens...';
      const burnTx = await leaderboardContractInstance.burnTokens(amountToSend);
      
      status.value = 'Transaction submitted, waiting for confirmation...';
      
      // Wait for transaction to be mined
      await burnTx.wait();
      
      // Refresh balances and leaderboard
      await loadTokenInfo();
      await fetchLeaderboard();
      
      status.value = `Successfully burned ${amount} ${tokenSymbol.value}`;
      return true;
    } catch (error) {
      console.error('Error burning tokens with leaderboard:', error);
      status.value = `Burn error: ${error.message}`;
      return false;
    }
  };

  return {
    // State
    web3Onboard,
    connected,
    connecting,
    account,
    chainId,
    chainName,
    walletLabel,
    status,
    
    // Token info
    tokenAddress,
    tokenName,
    tokenSymbol,
    tokenBalance,
    totalSupply,
    
    // Leaderboard info
    leaderboardAddress,
    leaderboardData,
    dailyLeaderboardData,
    weeklyLeaderboardData,
    monthlyLeaderboardData,
    getCurrentLeaderboardData,
    userRank,
    userBurnAmount,
    userDailyBurnAmount,
    userWeeklyBurnAmount,
    userMonthlyBurnAmount,
    getCurrentUserBurnAmount,
    totalBurnedAmount,
    loadingLeaderboard,
    leaderboardPeriods,
    currentLeaderboardPeriod,
    
    // Actions
    initOnboard,
    connectWallet,
    disconnectWallet,
    loadTokenInfo,
    burnTokens,
    burnTokensWithLeaderboard,
    getNativeBalance,
    subscribeToWalletEvents,
    checkAvalancheNetwork,
    switchToAvalancheNetwork,
    initLeaderboardContract,
    fetchLeaderboard,
    
    // Computed
    nativeTokenSymbol,
    formattedAddress
  };
});