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
  const leaderboardData = ref([]);
  const userRank = ref(0);
  const userBurnAmount = ref('0');
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
        
        // Reload token balance for new account
        if (connected.value) {
          await loadTokenInfo();
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
      
      // Create contract instance
      leaderboardContract.value = new ethers.Contract(
        leaderboardAddress.value,
        BURN_LEADERBOARD_ABI,
        signer
      );
      
      return leaderboardContract.value;
    } catch (error) {
      console.error('Error initializing leaderboard contract:', error);
      leaderboardContract.value = null;
      return null;
    }
  };
  
  // Fetch leaderboard data - public data accessible without wallet connection
  const fetchLeaderboard = async () => {
    if (!leaderboardAddress.value) {
      status.value = 'Leaderboard contract not available on this network';
      return;
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
      
      // Get leaderboard data
      const data = await contract.getLeaderboard();
      leaderboardData.value = data.map(item => ({
        address: item.burnerAddress,
        amount: ethers.formatEther(item.amountBurned)
      }));
      
      // Get total burned amount
      const total = await contract.totalBurned();
      totalBurnedAmount.value = ethers.formatEther(total);
      
      // If user is connected, get their rank and amount
      if (connected.value && account.value) {
        const [rank, amount] = await Promise.all([
          contract.getRankOfAddress(account.value),
          contract.getBurnedByAddress(account.value)
        ]);
        
        userRank.value = rank;
        userBurnAmount.value = ethers.formatEther(amount);
      } else {
        // Reset user-specific data if not connected
        userRank.value = 0;
        userBurnAmount.value = '0';
      }
      
      loadingLeaderboard.value = false;
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      status.value = `Error fetching leaderboard: ${error.message}`;
      loadingLeaderboard.value = false;
    }
  };
  
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
      
      // Initialize leaderboard contract if needed
      if (!leaderboardContract.value) {
        await initLeaderboardContract();
      }
      
      if (!leaderboardContract.value) {
        status.value = 'Failed to initialize leaderboard contract';
        return false;
      }
      
      // Get the current wallets from the Onboard state
      const connectedWallets = web3Onboard.value.state.get().wallets;
      
      if (!connectedWallets || connectedWallets.length === 0) {
        status.value = 'No connected wallet found';
        return false;
      }
      
      // Create provider using the first wallet's provider
      const ethersProvider = new ethers.BrowserProvider(connectedWallets[0].provider);
      const signer = await ethersProvider.getSigner();
      
      // Create token contract instance
      const tokenContract = new ethers.Contract(
        tokenAddress.value,
        tokenAbi,
        signer
      );
      
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
      const burnTx = await leaderboardContract.value.burnTokens(amountToSend);
      
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
    userRank,
    userBurnAmount,
    totalBurnedAmount,
    loadingLeaderboard,
    
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