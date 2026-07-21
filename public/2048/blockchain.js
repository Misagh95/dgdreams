const GAME_ABI = ['function recordPlay(uint256 _score, uint256 _moves)'];

const STATE = {
  connected: false,
  account: null,
  provider: null,
  signer: null,
  walletNetwork: null,   // actual chain from MetaMask
  onCorrectNet: false,
  sessionTxCount: 0,
};

async function connectWallet() {
  if (typeof window.ethereum === 'undefined') {
    showNotif('error', 'MetaMask not installed');
    return false;
  }
  try {
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    STATE.account = accounts[0];
    STATE.provider = new ethers.providers.Web3Provider(window.ethereum);
    STATE.signer = STATE.provider.getSigner();
    STATE.connected = true;
    await refreshChainState();
    setupMetaMaskListeners();
    renderUI();
    showNotif('success', 'Wallet connected');
    // auto-switch to dropdown selection if needed
    const sel = document.getElementById('network-select');
    const targetId = Number(sel.value);
    if (targetId && targetId !== STATE.walletNetwork?.id) {
      const target = NETWORKS.find(n => n.id === targetId);
      if (target) {
        try { await switchTo(target); } catch (_) { /* user rejected, ignore */ }
      }
    }
    return true;
  } catch (e) {
    if (e.code !== 4001) console.error('[Web3] Connect error:', e);
    return false;
  }
}

function disconnectWallet() {
  STATE.connected = false;
  STATE.account = null;
  STATE.provider = null;
  STATE.signer = null;
  STATE.walletNetwork = null;
  STATE.onCorrectNet = false;
  STATE.sessionTxCount = 0;
  document.getElementById('session-tx').textContent = '0';
  document.getElementById('tx-count').textContent = '0';
  renderUI();
  showNotif('info', 'Wallet disconnected');
}

async function refreshChainState() {
  if (!STATE.provider) return;
  try {
    const network = await STATE.provider.getNetwork();
    const chainId = Number(network.chainId);
    STATE.walletNetwork = NETWORKS.find(n => n.id === chainId) || null;
    const sel = document.getElementById('network-select');
    const targetId = Number(sel.value);
    STATE.onCorrectNet = targetId ? chainId === targetId : true;
  } catch (e) {
    console.warn('[Web3] refreshChainState:', e);
  }
  renderUI();
}

function setupMetaMaskListeners() {
  window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
  window.ethereum.removeListener('chainChanged', handleChainChanged);
  window.ethereum.on('accountsChanged', handleAccountsChanged);
  window.ethereum.on('chainChanged', handleChainChanged);
}

function handleAccountsChanged(accs) {
  if (accs.length === 0) { disconnectWallet(); return; }
  STATE.account = accs[0];
  refreshChainState();
  renderUI();
}

function handleChainChanged() {
  setTimeout(refreshChainState, 600);
}

async function switchTo(net) {
  if (typeof window.ethereum === 'undefined') return false;
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0x' + net.id.toString(16) }],
    });
    STATE.walletNetwork = net;
    STATE.onCorrectNet = true;
    renderUI();
    return true;
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
        STATE.walletNetwork = net;
        STATE.onCorrectNet = true;
        renderUI();
        return true;
      } catch (e2) {
        console.warn('[Web3] addChain failed:', e2);
        throw e2;
      }
    }
    throw e;
  }
}

// ── Public: called from dropdown onchange ──
async function switchNetwork(net) {
  if (!STATE.connected) { showNotif('warn', 'Connect wallet first'); return; }
  showNotif('info', 'Switching to ' + net.name + '...');
  try {
    await switchTo(net);
    await refreshChainState();
    showNotif('success', 'Switched to ' + net.name);
  } catch (e) {
    if (e.code === 4001) {
      showNotif('warn', 'Switch cancelled');
    } else if (e.code === 4902) {
      showNotif('error', 'Could not add ' + net.name);
    } else {
      showNotif('error', 'Switch failed: ' + (e.shortMessage || e.message || 'error'));
    }
    await refreshChainState();
  }
}

// ── Public: called from game milestone hit ──
async function sendSyncTransaction() {
  if (!STATE.signer || !STATE.account) return false;
  let chainId, contractAddr;
  try {
    const hex = await window.ethereum.request({ method: 'eth_chainId' });
    chainId = Number(hex);
    const net = NETWORKS.find(n => n.id === chainId);
    contractAddr = net ? net.contract : null;
    if (!contractAddr) { showNotif('error', 'No Game2048 contract on this network'); return false; }
  } catch (e) { console.warn('[Web3] chainId error:', e); return false; }
  try {
    const c = new ethers.Contract(contractAddr, GAME_ABI, STATE.signer);
    const tx = await c.recordPlay(game ? game.score : 0, moveCount || 0);
    showNotif('info', 'Tx sent: ' + tx.hash.slice(0, 10) + '...');
    await tx.wait();
    STATE.sessionTxCount++;
    document.getElementById('session-tx').textContent = STATE.sessionTxCount;
    document.getElementById('tx-count').textContent = STATE.sessionTxCount;
    showNotif('success', 'Tx confirmed');
    return true;
  } catch (e) {
    if (e.code === 4001) { showNotif('warn', 'Tx rejected'); }
    else { showNotif('error', 'Tx failed: ' + (e.reason || e.message || 'error')); }
    return false;
  }
}

// ── UI ──
function renderUI() {
  const statusText = document.getElementById('status-text');
  const dot = document.getElementById('status-dot');
  const actions = document.getElementById('web3-actions');
  const connectBtn = document.getElementById('connect-btn');
  const notifSwitchBtn = document.getElementById('notif-switch-btn');
  const notifText = document.getElementById('notif-network-text');
  const sel = document.getElementById('network-select');

  if (STATE.connected) {
    statusText.textContent = STATE.account ? STATE.account.slice(0, 6) + '...' + STATE.account.slice(-4) : 'Connected';
    statusText.className = 'connected';
    dot.className = 'dot on';
    actions.innerHTML = '<button class="btn btn-secondary btn-sm" onclick="disconnectWallet()">Disconnect</button>';
    connectBtn.textContent = 'Connected';
    connectBtn.disabled = true;
  } else {
    statusText.textContent = 'Not connected';
    statusText.className = 'disconnected';
    dot.className = 'dot off';
    actions.innerHTML = '<button class="btn btn-primary" id="connect-btn" onclick="connectWallet()">Connect Wallet</button>';
    if (connectBtn) connectBtn.disabled = false;
  }

  // persistent notifications
  const showWalletNotif = !STATE.connected && typeof game !== 'undefined' && game !== null;
  document.getElementById('notif-wallet').classList.toggle('show', showWalletNotif);
  const wrongNet = STATE.connected && !STATE.onCorrectNet;
  document.getElementById('notif-network').classList.toggle('show', wrongNet);
  if (wrongNet) {
    const netName = NETWORKS.find(n => n.id === Number(sel.value));
    notifText.textContent = 'Wrong network. Switch to ' + (netName ? netName.name : 'selected') + '?';
    notifSwitchBtn.style.display = sel.value ? 'inline-block' : 'none';
  }
}

// ── Notification flash (transient, uses dedicated #notif-flash) ──
function showNotif(type, message) {
  const el = document.getElementById('notif-flash');
  if (!el) return;
  el.className = 'notification show notification-' + type;
  const span = el.querySelector('span');
  if (span) span.textContent = message;
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove('show'), 4000);
}
