// ── Game2048 Contract ABI ──
// Place your deployed contract address in selectors.js or update NETWORKS[n].contract
const GAME_ABI = ['function recordPlay(uint256 _score, uint256 _moves)'];

// ── Blockchain State ──
const BLOCKCHAIN = {
  connected: false,
  account: null,
  provider: null,
  signer: null,
  currentNetwork: null,
  onCorrectNetwork: false,
  sessionTxCount: 0,

  async connectWallet() {
    if (typeof window.ethereum === 'undefined') {
      showNotification('error', 'MetaMask not installed. Please install MetaMask to continue.');
      return false;
    }
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      this.account = accounts[0];
      this.provider = new ethers.providers.Web3Provider(window.ethereum);
      this.signer = this.provider.getSigner();
      this.connected = true;
      console.log('[Web3] Connected:', this.account);
      await this.checkNetwork();
      this.setupListeners();
      updateDashboard();
      showNotification('success', 'Wallet connected');
      // Auto-switch to selected network if dropdown has a value
      const sel = document.getElementById('network-select');
      const targetId = Number(sel.value);
      if (targetId && targetId !== this.currentNetwork?.id) {
        const targetNet = NETWORKS.find(n => n.id === targetId);
        if (targetNet) await this.switchNetwork(targetNet);
      }
      return true;
    } catch (e) {
      if (e.code !== 4001) console.error('[Web3] Connection error:', e);
      return false;
    }
  },

  disconnectWallet() {
    this.connected = false;
    this.account = null;
    this.provider = null;
    this.signer = null;
    this.currentNetwork = null;
    this.onCorrectNetwork = false;
    this.sessionTxCount = 0;
    document.getElementById('session-tx').textContent = '0';
    document.getElementById('tx-count').textContent = '0';
    updateDashboard();
    showNotification('info', 'Wallet disconnected');
  },

  async checkNetwork() {
    if (!this.provider) return;
    try {
      const network = await this.provider.getNetwork();
      const chainId = Number(network.chainId);
      const sel = document.getElementById('network-select');
      const targetId = Number(sel.value);
      this.currentNetwork = NETWORKS.find(n => n.id === chainId) || null;
      this.onCorrectNetwork = targetId ? chainId === targetId : true;
      updateDashboard();
    } catch (e) { console.warn('[Web3] Network check failed:', e); }
  },

  setupListeners() {
    window.ethereum.removeListener('accountsChanged', this._handleAccounts);
    window.ethereum.removeListener('chainChanged', this._handleChain);
    this._handleAccounts = (accs) => {
      if (accs.length === 0) { this.disconnectWallet(); }
      else { this.account = accs[0]; this.checkNetwork(); updateDashboard(); }
    };
    this._handleChain = () => { setTimeout(() => this.checkNetwork(), 500); };
    window.ethereum.on('accountsChanged', this._handleAccounts);
    window.ethereum.on('chainChanged', this._handleChain);
  },

  async switchNetwork(net) {
    if (typeof window.ethereum === 'undefined') return;
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x' + net.id.toString(16) }],
      });
      this.currentNetwork = net;
      this.onCorrectNetwork = true;
      updateDashboard();
      showNotification('success', 'Switched to ' + net.name);
    } catch (e) {
      if (e.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x' + net.id.toString(16),
              chainName: net.name,
              rpcUrls: [net.rpc],
              nativeCurrency: { name: net.symbol, symbol: net.symbol, decimals: 18 },
              blockExplorerUrls: [net.explorer],
            }],
          });
          this.currentNetwork = net;
          this.onCorrectNetwork = true;
          updateDashboard();
          showNotification('success', 'Added & switched to ' + net.name);
        } catch (e2) { console.error(e2); }
      } else if (e.code !== 4001) { console.error(e); }
    }
    await this.checkNetwork();
  },

  async sendSyncTransaction() {
    if (!this.signer || !this.account) return false;
    // Get current chain ID directly from MetaMask at tx time
    let activeChainId, activeContract;
    try {
      const hexChainId = await window.ethereum.request({ method: 'eth_chainId' });
      activeChainId = Number(hexChainId);
      const net = NETWORKS.find(n => n.id === activeChainId);
      activeContract = net ? net.contract : null;
      if (!activeContract) {
        showNotification('error', 'No Game2048 contract on this network');
        return false;
      }
    } catch (e) {
      console.warn('[Web3] Failed to get chain:', e);
      return false;
    }
    try {
      const contract = new ethers.Contract(activeContract, GAME_ABI, this.signer);
      const tx = await contract.recordPlay(game ? game.score : 0, moveCount || 0);
      console.log('[Web3] Tx sent:', tx.hash, 'on chain', activeChainId);
      showNotification('info', 'Tx sent: ' + tx.hash.slice(0, 10) + '...');
      await tx.wait();
      this.sessionTxCount++;
      document.getElementById('session-tx').textContent = this.sessionTxCount;
      document.getElementById('tx-count').textContent = this.sessionTxCount;
      showNotification('success', 'Tx confirmed: ' + tx.hash.slice(0, 10) + '...');
      return true;
    } catch (e) {
      if (e.code === 4001) {
        showNotification('warn', 'Tx rejected in wallet');
      } else {
        showNotification('error', 'Tx failed: ' + (e.reason || e.message || 'unknown'));
        console.warn('[Web3] Tx error:', e);
      }
      return false;
    }
  },
};

// ── UI Updates ──
function updateDashboard() {
  const statusText = document.getElementById('status-text');
  const dot = document.getElementById('status-dot');
  const actions = document.getElementById('web3-actions');
  const connectBtn = document.getElementById('connect-btn');
  const sel = document.getElementById('network-select');

  if (BLOCKCHAIN.connected) {
    statusText.textContent = BLOCKCHAIN.account ? BLOCKCHAIN.account.slice(0, 6) + '...' + BLOCKCHAIN.account.slice(-4) : 'Connected';
    statusText.className = 'connected';
    dot.className = 'dot on';
    actions.innerHTML = `
      <button class="btn btn-secondary btn-sm" onclick="BLOCKCHAIN.disconnectWallet()">Disconnect</button>
    `;
    connectBtn.textContent = 'Connected';
    connectBtn.disabled = true;
  } else {
    statusText.textContent = 'Not connected';
    statusText.className = 'disconnected';
    dot.className = 'dot off';
    actions.innerHTML = `<button class="btn btn-primary" id="connect-btn" onclick="connectWallet()">Connect Wallet</button>`;
    connectBtn && (connectBtn.disabled = false);
  }

  if (BLOCKCHAIN.onCorrectNetwork && BLOCKCHAIN.currentNetwork) {
    sel.value = String(BLOCKCHAIN.currentNetwork.id);
  }
}

function connectWallet() { BLOCKCHAIN.connectWallet(); }

function sendSyncTransaction() { BLOCKCHAIN.sendSyncTransaction(); }

// ── Network Switch (called from dropdown or switch button) ──
async function switchNetwork(net) {
  if (!BLOCKCHAIN.connected) {
    showNotification('warn', 'Connect wallet first');
    return;
  }
  if (typeof window.ethereum === 'undefined') { showNotification('error', 'MetaMask not found'); return; }
  try {
    showNotification('info', 'Switching to ' + net.name + '...');
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0x' + net.id.toString(16) }],
    });
    BLOCKCHAIN.currentNetwork = net;
    BLOCKCHAIN.onCorrectNetwork = true;
    updateDashboard();
    showNotification('success', 'Switched to ' + net.name);
  } catch (e) {
    if (e.code === 4902) {
      try {
        showNotification('info', 'Adding ' + net.name + ' to MetaMask...');
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: '0x' + net.id.toString(16),
            chainName: net.name,
            rpcUrls: [net.rpc],
            nativeCurrency: { name: net.symbol, symbol: net.symbol, decimals: 18 },
            blockExplorerUrls: [net.explorer],
          }],
        });
        BLOCKCHAIN.currentNetwork = net;
        BLOCKCHAIN.onCorrectNetwork = true;
        updateDashboard();
        showNotification('success', 'Added & switched to ' + net.name);
      } catch (e2) {
        showNotification('error', 'Failed to add ' + net.name);
        console.error(e2);
      }
    } else if (e.code === 4001) {
      showNotification('warn', 'Switch cancelled');
    } else {
      showNotification('error', 'Switch failed: ' + (e.message || 'unknown'));
      console.error(e);
    }
  }
  await BLOCKCHAIN.checkNetwork();
}

// ── Notification System ──
function showNotification(type, message) {
  const map = { info: 'notif-wallet', warn: 'notif-wallet', success: 'notif-wallet', error: 'notif-network' };
  const id = map[type] || 'notif-wallet';
  const el = document.getElementById(id);
  if (!el) return;
  el.className = 'notification show notification-' + type;
  el.querySelector('span').textContent = message;
  setTimeout(() => el.classList.remove('show'), 4000);
}
