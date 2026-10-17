import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { ethers } from 'ethers';
import deployedContracts from '../contracts/deployedContracts.json';

export const Web3Context = createContext();

const SUPPORTED_NETWORKS = {
  11155111: {
    name: 'Ethereum Sepolia Testnet',
    shortName: 'Sepolia',
    hex: '0xaa36a7',
    rpcUrls: ['https://ethereum-sepolia-rpc.publicnode.com', 'https://rpc.sepolia.org'],
    blockExplorer: 'https://sepolia.etherscan.io',
    nativeCurrency: { name: 'Sepolia ETH', symbol: 'ETH', decimals: 18 },
  },
  31337: {
    name: 'Hardhat Localhost',
    shortName: 'Localhost 31337',
    hex: '0x7a69',
    rpcUrls: ['http://127.0.0.1:8545'],
    blockExplorer: '',
    nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
  },
};

export const Web3Provider = ({ children }) => {
  const [account, setAccount] = useState('');
  const [chainId, setChainId] = useState(null);
  const [skillBalance, setSkillBalance] = useState('0');
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState('');
  const [contracts, setContracts] = useState({
    credentialNFT: null,
    rewardToken: null,
    registry: null,
  });

  // Determine target chain ID: default to Sepolia (11155111) or Hardhat (31337)
  const targetChainId = useMemo(() => {
    const envChain = import.meta.env.VITE_TARGET_CHAIN_ID;
    if (envChain) return Number(envChain);
    // If local contracts file is 31337, we allow 31337 or 11155111
    return deployedContracts.chainId || 11155111;
  }, []);

  const isCorrectNetwork = useMemo(() => {
    if (!chainId) return false;
    return chainId === targetChainId || chainId === 11155111 || chainId === 31337;
  }, [chainId, targetChainId]);

  // Read contract addresses (network-aware: strictly isolates Sepolia from Localhost)
  const contractAddresses = useMemo(() => {
    const activeChainId = chainId || targetChainId;
    const networkDeployment =
      deployedContracts.networks?.[activeChainId] ||
      (deployedContracts.chainId === activeChainId ? deployedContracts : null);

    if (activeChainId === 11155111) {
      const cred =
        import.meta.env.VITE_SEPOLIA_CREDENTIAL_NFT_ADDRESS ||
        import.meta.env.VITE_CREDENTIAL_NFT_ADDRESS ||
        networkDeployment?.contracts?.SkillCredentialNFT?.address ||
        '';
      const rew =
        import.meta.env.VITE_SEPOLIA_REWARD_TOKEN_ADDRESS ||
        import.meta.env.VITE_REWARD_TOKEN_ADDRESS ||
        networkDeployment?.contracts?.SkillRewardToken?.address ||
        '';
      const reg =
        import.meta.env.VITE_SEPOLIA_REGISTRY_ADDRESS ||
        import.meta.env.VITE_REGISTRY_ADDRESS ||
        networkDeployment?.contracts?.SkillProtocolRegistry?.address ||
        '';
      return {
        isConfigured: Boolean(reg),
        credentialNFT: cred,
        rewardToken: rew,
        registry: reg,
      };
    }

    // Default to Hardhat Localhost (31337)
    return {
      isConfigured: true,
      credentialNFT:
        networkDeployment?.contracts?.SkillCredentialNFT?.address ||
        deployedContracts.contracts?.SkillCredentialNFT?.address ||
        '0x5FbDB2315678afecb367f032d93F642f64180aa3',
      rewardToken:
        networkDeployment?.contracts?.SkillRewardToken?.address ||
        deployedContracts.contracts?.SkillRewardToken?.address ||
        '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
      registry:
        networkDeployment?.contracts?.SkillProtocolRegistry?.address ||
        deployedContracts.contracts?.SkillProtocolRegistry?.address ||
        '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
    };
  }, [chainId, targetChainId]);

  // Initialize read-only or signer contracts
  const initContracts = useCallback(
    async (signerOrProvider) => {
      try {
        if (!contractAddresses.isConfigured || !contractAddresses.registry) {
          setContracts({ credentialNFT: null, rewardToken: null, registry: null });
          return;
        }

        const credAbi = deployedContracts.contracts?.SkillCredentialNFT?.abi;
        const rewardAbi = deployedContracts.contracts?.SkillRewardToken?.abi;
        const regAbi = deployedContracts.contracts?.SkillProtocolRegistry?.abi;

        if (!credAbi || !rewardAbi || !regAbi) return;

        const credContract = new ethers.Contract(contractAddresses.credentialNFT, credAbi, signerOrProvider);
        const rewContract = new ethers.Contract(contractAddresses.rewardToken, rewardAbi, signerOrProvider);
        const regContract = new ethers.Contract(contractAddresses.registry, regAbi, signerOrProvider);

        setContracts({
          credentialNFT: credContract,
          rewardToken: rewContract,
          registry: regContract,
        });

        return { credContract, rewContract, regContract };
      } catch (err) {
        console.error('Failed to instantiate contracts:', err);
      }
    },
    [contractAddresses]
  );

  // Refresh user's SKILL token balance
  const refreshBalance = useCallback(
    async (targetAccount = account) => {
      if (!targetAccount || !contracts.rewardToken) return;
      try {
        const bal = await contracts.rewardToken.balanceOf(targetAccount);
        setSkillBalance(parseFloat(ethers.formatEther(bal)).toFixed(2));
      } catch (err) {
        console.debug('Could not read SKILL balance:', err.message);
      }
    },
    [account, contracts.rewardToken]
  );

  // Connect MetaMask or browser wallet
  const connectWallet = useCallback(async () => {
    if (!window.ethereum) {
      setError('Please install MetaMask or a Web3 compatible wallet to continue.');
      return false;
    }

    setIsConnecting(true);
    setError('');

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts authorized.');
      }

      const activeAccount = accounts[0];
      const network = await provider.getNetwork();
      const currentChainId = Number(network.chainId);

      setAccount(activeAccount);
      setChainId(currentChainId);

      const signer = await provider.getSigner();
      await initContracts(signer);

      setIsConnecting(false);
      return activeAccount;
    } catch (err) {
      console.error('Wallet connection error:', err);
      if (err.code === 4001) {
        setError('Wallet connection rejected by user.');
      } else {
        setError(err.message || 'Failed to connect wallet.');
      }
      setIsConnecting(false);
      return false;
    }
  }, [initContracts]);

  // Disconnect
  const disconnectWallet = useCallback(() => {
    setAccount('');
    setSkillBalance('0');
    setError('');
  }, []);

  // Switch network helper
  const switchNetwork = useCallback(
    async (targetId = targetChainId) => {
      if (!window.ethereum) return;
      const targetConfig = SUPPORTED_NETWORKS[targetId] || SUPPORTED_NETWORKS[11155111];
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: targetConfig.hex }],
        });
      } catch (switchError) {
        // If error code 4902, the network must be added
        if (switchError.code === 4902 && targetId === 11155111) {
          try {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId: targetConfig.hex,
                  chainName: targetConfig.name,
                  rpcUrls: targetConfig.rpcUrls,
                  nativeCurrency: targetConfig.nativeCurrency,
                  blockExplorerUrls: [targetConfig.blockExplorer],
                },
              ],
            });
          } catch (addError) {
            console.error('Failed to add Ethereum network:', addError);
          }
        } else {
          console.error('Failed to switch network:', switchError);
        }
      }
    },
    [targetChainId]
  );

  // Block explorer helper
  const getExplorerUrl = useCallback(
    (type = 'tx', hashOrAddress = '') => {
      const net = SUPPORTED_NETWORKS[chainId] || SUPPORTED_NETWORKS[11155111];
      if (!net || !net.blockExplorer) {
        return `https://sepolia.etherscan.io/${type}/${hashOrAddress}`;
      }
      return `${net.blockExplorer}/${type}/${hashOrAddress}`;
    },
    [chainId]
  );

  // Detect already connected account on mount
  useEffect(() => {
    if (window.ethereum) {
      const provider = new ethers.BrowserProvider(window.ethereum);
      provider
        .send('eth_accounts', [])
        .then(async (accounts) => {
          if (accounts && accounts.length > 0) {
            setAccount(accounts[0]);
            const network = await provider.getNetwork();
            setChainId(Number(network.chainId));
            const signer = await provider.getSigner();
            initContracts(signer);
          } else {
            // Setup robust read-only provider for public credential checking
            const isSepolia = (deployedContracts.chainId || 11155111) === 11155111;
            const rpcUrl = isSepolia
              ? (import.meta.env.VITE_SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com')
              : 'http://127.0.0.1:8545';
            const publicProvider = new ethers.JsonRpcProvider(rpcUrl);
            initContracts(publicProvider);
          }
        })
        .catch(console.error);

      // Event listeners
      const handleAccountsChanged = async (accounts) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          const signer = await provider.getSigner();
          initContracts(signer);
        } else {
          disconnectWallet();
        }
      };

      const handleChainChanged = (newChainHex) => {
        setChainId(parseInt(newChainHex, 16));
        window.location.reload();
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        if (window.ethereum.removeListener) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
          window.ethereum.removeListener('chainChanged', handleChainChanged);
        }
      };
    }
  }, [initContracts, disconnectWallet]);

  // Update balance when account or contracts change
  useEffect(() => {
    if (account && contracts.rewardToken) {
      refreshBalance(account);
    }
  }, [account, contracts.rewardToken, refreshBalance]);

  const value = {
    account,
    chainId,
    isConnecting,
    error,
    skillBalance,
    isCorrectNetwork,
    targetChainId,
    contracts,
    contractAddresses,
    networkName: SUPPORTED_NETWORKS[chainId]?.shortName || `Chain ID ${chainId || 'Unknown'}`,
    connectWallet,
    disconnectWallet,
    switchNetwork,
    refreshBalance,
    getExplorerUrl,
  };

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
};
