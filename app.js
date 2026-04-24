/* ═══════════════════════════════════════════════════
   MULTIBOND — APP.JS
   ═══════════════════════════════════════════════════ */

// ─── CONTRACT CONFIG ─────────────────────────────────
// !! Replace with your deployed contract address !!
const CONTRACT_ADDRESS = "0x9d857a501799E1F749D9c53eEEb0Aa224B42CD35";

const ABI = [
  // createBond
  {
    "inputs": [
      {"internalType":"string","name":"_name","type":"string"},
      {"internalType":"uint256","name":"_faceValue","type":"uint256"},
      {"internalType":"uint256","name":"_couponRateBps","type":"uint256"},
      {"internalType":"uint256","name":"_maturity","type":"uint256"},
      {"internalType":"uint256","name":"_couponInterval","type":"uint256"},
      {"internalType":"uint256","name":"_gracePeriod","type":"uint256"}
    ],
    "name":"createBond","outputs":[],"stateMutability":"nonpayable","type":"function"
  },
  // approveKYC
  {
    "inputs":[{"internalType":"uint256","name":"bondId","type":"uint256"},{"internalType":"address","name":"user","type":"address"}],
    "name":"approveKYC","outputs":[],"stateMutability":"nonpayable","type":"function"
  },
  // issue
  {
    "inputs":[
      {"internalType":"uint256","name":"bondId","type":"uint256"},
      {"internalType":"address","name":"investor","type":"address"},
      {"internalType":"uint256","name":"amount","type":"uint256"}
    ],
    "name":"issue","outputs":[],"stateMutability":"nonpayable","type":"function"
  },
  // deposit
  {
    "inputs":[{"internalType":"uint256","name":"bondId","type":"uint256"}],
    "name":"deposit","outputs":[],"stateMutability":"payable","type":"function"
  },
  // payCoupon
  {
    "inputs":[{"internalType":"uint256","name":"bondId","type":"uint256"}],
    "name":"payCoupon","outputs":[],"stateMutability":"nonpayable","type":"function"
  },
  // redeem
  {
    "inputs":[{"internalType":"uint256","name":"bondId","type":"uint256"}],
    "name":"redeem","outputs":[],"stateMutability":"nonpayable","type":"function"
  },
  // bondCounter
  {
    "inputs":[],"name":"bondCounter",
    "outputs":[{"internalType":"uint256","name":"","type":"uint256"}],
    "stateMutability":"view","type":"function"
  },
  // bonds (public mapping getter)
  {
    "inputs":[{"internalType":"uint256","name":"","type":"uint256"}],
    "name":"bonds",
    "outputs":[
      {"internalType":"string","name":"name","type":"string"},
      {"internalType":"uint256","name":"faceValue","type":"uint256"},
      {"internalType":"uint256","name":"couponRateBps","type":"uint256"},
      {"internalType":"uint256","name":"maturity","type":"uint256"},
      {"internalType":"uint256","name":"couponInterval","type":"uint256"},
      {"internalType":"uint256","name":"gracePeriod","type":"uint256"},
      {"internalType":"uint256","name":"totalSupply","type":"uint256"},
      {"internalType":"uint256","name":"escrowBalance","type":"uint256"},
      {"internalType":"uint256","name":"lastCouponTime","type":"uint256"},
      {"internalType":"uint256","name":"trustScore","type":"uint256"},
      {"internalType":"uint8","name":"status","type":"uint8"},
      {"internalType":"address","name":"issuer","type":"address"}
    ],
    "stateMutability":"view","type":"function"
  },
  // admin
  {
    "inputs":[],"name":"admin",
    "outputs":[{"internalType":"address","name":"","type":"address"}],
    "stateMutability":"view","type":"function"
  }
];

// ─── STATE ───────────────────────────────────────────
let provider, signer, contract, account;

// ─── UTILS ───────────────────────────────────────────
const STATUS_LABELS = ["Active", "Redeemed", "Defaulted"];

function shortAddr(addr) {
  if (!addr) return "—";
  return addr.slice(0, 6) + "…" + addr.slice(-4);
}

function fmtWei(wei) {
  try { return parseFloat(ethers.utils.formatEther(wei)).toFixed(4) + " ETH"; }
  catch { return wei?.toString() + " wei"; }
}

function fmtTimestamp(ts) {
  if (!ts || ts == 0) return "—";
  const d = new Date(parseInt(ts) * 1000);
  return d.toLocaleDateString("en-GB", { day:"numeric", month:"short", year:"numeric" });
}

function setStatus(elId, msg, type = "") {
  const el = document.getElementById(elId);
  if (!el) return;
  el.textContent = msg;
  el.className = "tx-status " + type;
}

function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 3000);
}

// ─── NAVIGATION ──────────────────────────────────────
function showPage(id) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById("page-" + id).classList.add("active");
}

function goHome() { showPage("home"); }

// Sidebar tabs
document.querySelectorAll(".snav").forEach(link => {
  link.addEventListener("click", () => {
    const tabId = link.dataset.tab;
    const dashboard = link.closest(".dashboard");
    dashboard.querySelectorAll(".snav").forEach(l => l.classList.remove("active"));
    dashboard.querySelectorAll(".tab-pane").forEach(p => p.classList.remove("active"));
    link.classList.add("active");
    document.getElementById(tabId)?.classList.add("active");
  });
});

// Role card clicks
document.querySelectorAll(".role-card").forEach(card => {
  card.addEventListener("click", () => {
    const role = card.dataset.role;
    if (!account) { showToast("Please connect your wallet first."); return; }
    showPage(role);
    updateWalletPills();
    if (role === "investor") App.investor.loadBonds();
    if (role === "issuer")   App.issuer.loadBonds();
    if (role === "admin")    App.admin.init();
  });
});

// ─── WALLET CONNECTION ───────────────────────────────
async function connectWallet() {
  if (!window.ethereum) {
    showToast("MetaMask not found. Please install it.");
    return false;
  }
  try {
    provider = new ethers.providers.Web3Provider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    signer = provider.getSigner();
    account = await signer.getAddress();
    contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

    // Update UI
    const network = await provider.getNetwork();
    document.getElementById("wallet-status-home").textContent = "✓ Connected: " + shortAddr(account);
    document.getElementById("network-display").textContent = network.name || network.chainId;
    document.getElementById("contract-addr-display").textContent = shortAddr(CONTRACT_ADDRESS);

    const btn = document.getElementById("btn-connect-home");
    btn.querySelector(".connect-dot").classList.add("connected");
    btn.innerHTML = `<span class="connect-dot connected"></span>${shortAddr(account)}`;

    showToast("Wallet connected: " + shortAddr(account));
    return true;
  } catch (err) {
    showToast("Connection failed: " + (err.message || err));
    return false;
  }
}

document.getElementById("btn-connect-home").addEventListener("click", connectWallet);

function updateWalletPills() {
  const pill = shortAddr(account) || "Not connected";
  ["investor-wallet-pill", "issuer-wallet-pill", "admin-wallet-pill"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = pill;
  });
}

// Listen for account/chain changes
if (window.ethereum) {
  window.ethereum.on("accountsChanged", () => location.reload());
  window.ethereum.on("chainChanged",    () => location.reload());
}

// ─── BOND CARD BUILDER ───────────────────────────────
async function fetchAllBonds() {
  const count = await contract.bondCounter();
  const bonds = [];
  for (let i = 0; i < count.toNumber(); i++) {
    try {
      const b = await contract.bonds(i);
      bonds.push({ id: i, ...b });
    } catch {}
  }
  return bonds;
}

function buildBondCard(bond) {
  const statusLabel = STATUS_LABELS[bond.status] || "Unknown";
  return `
    <div class="bond-card">
      <div class="bond-card-id">BOND #${bond.id}</div>
      <div class="bond-card-name">${bond.name}</div>
      <div class="bond-card-row"><span>Face Value</span><span>${fmtWei(bond.faceValue)}</span></div>
      <div class="bond-card-row"><span>Coupon Rate</span><span>${(bond.couponRateBps / 100).toFixed(2)}%</span></div>
      <div class="bond-card-row"><span>Maturity</span><span>${fmtTimestamp(bond.maturity)}</span></div>
      <div class="bond-card-row"><span>Total Supply</span><span>${bond.totalSupply?.toString()}</span></div>
      <div class="bond-card-row"><span>Escrow</span><span>${fmtWei(bond.escrowBalance)}</span></div>
      <div class="bond-card-row"><span>Issuer</span><span>${shortAddr(bond.issuer)}</span></div>
      <div class="bond-card-row"><span>Trust Score</span><span>${bond.trustScore?.toString()}</span></div>
      <span class="bond-status ${statusLabel}">${statusLabel}</span>
    </div>
  `;
}

function renderBonds(gridId, bonds) {
  const el = document.getElementById(gridId);
  if (!bonds || bonds.length === 0) {
    el.innerHTML = '<div class="empty-state">No bonds found.</div>';
    return;
  }
  el.innerHTML = bonds.map(buildBondCard).join("");
}

// ─── APP MODULES ─────────────────────────────────────
const App = {

  // ──────────── INVESTOR
  investor: {
    async loadBonds() {
      try {
        const bonds = await fetchAllBonds();
        renderBonds("inv-bonds-grid", bonds);
      } catch (e) {
        document.getElementById("inv-bonds-grid").innerHTML =
          '<div class="empty-state">Error loading bonds: ' + e.message + '</div>';
      }
    },

    async loadPortfolio() {
      if (!account) { showToast("Connect wallet first."); return; }
      try {
        const count = await contract.bondCounter();
        const held = [];
        // We can't read balanceOf from public mapping getter for nested struct,
        // so we look at all bonds and note which ones are active.
        // For a full implementation, emit events and index them.
        for (let i = 0; i < count.toNumber(); i++) {
          const b = await contract.bonds(i);
          held.push({ id: i, ...b });
        }
        renderBonds("inv-portfolio-grid", held);
        document.getElementById("inv-stat-held").textContent = held.length;
      } catch (e) {
        document.getElementById("inv-portfolio-grid").innerHTML =
          '<div class="empty-state">Error: ' + e.message + '</div>';
      }
    },

    async redeem() {
      const bondId = document.getElementById("inv-redeem-id").value;
      if (bondId === "") { showToast("Enter a Bond ID."); return; }
      setStatus("inv-redeem-status", "Sending transaction…", "pending");
      try {
        const tx = await contract.redeem(parseInt(bondId));
        setStatus("inv-redeem-status", "Waiting for confirmation…", "pending");
        await tx.wait();
        setStatus("inv-redeem-status", "✓ Redeemed successfully!", "success");
        showToast("Bond redeemed.");
      } catch (e) {
        setStatus("inv-redeem-status", "✗ " + (e.reason || e.message), "error");
      }
    }
  },

  // ──────────── ISSUER
  issuer: {
    async createBond() {
      const name     = document.getElementById("iss-c-name").value.trim();
      const face     = document.getElementById("iss-c-face").value;
      const rate     = document.getElementById("iss-c-rate").value;
      const maturity = document.getElementById("iss-c-maturity").value;
      const interval = document.getElementById("iss-c-interval").value;
      const grace    = document.getElementById("iss-c-grace").value;

      if (!name || !face || !rate || !maturity || !interval || !grace) {
        showToast("Please fill all fields.");
        return;
      }
      setStatus("iss-create-status", "Sending transaction…", "pending");
      try {
        const tx = await contract.createBond(
          name,
          ethers.BigNumber.from(face),
          parseInt(rate),
          parseInt(maturity),
          parseInt(interval),
          parseInt(grace)
        );
        setStatus("iss-create-status", "Waiting for confirmation…", "pending");
        await tx.wait();
        setStatus("iss-create-status", "✓ Bond created!", "success");
        showToast("Bond created successfully.");
      } catch (e) {
        setStatus("iss-create-status", "✗ " + (e.reason || e.message), "error");
      }
    },

    async loadBonds() {
      try {
        const all = await fetchAllBonds();
        const mine = all.filter(b =>
          b.issuer && b.issuer.toLowerCase() === account?.toLowerCase()
        );
        renderBonds("iss-bonds-grid", mine);
        document.getElementById("iss-stat-bonds").textContent = mine.length;
        const totalEscrow = mine.reduce((acc, b) => {
          try { return acc + parseFloat(ethers.utils.formatEther(b.escrowBalance)); } catch { return acc; }
        }, 0);
        document.getElementById("iss-stat-escrow").textContent = totalEscrow.toFixed(4) + " ETH";
      } catch (e) {
        document.getElementById("iss-bonds-grid").innerHTML =
          '<div class="empty-state">Error: ' + e.message + '</div>';
      }
    },

    async issue() {
      const bondId = document.getElementById("iss-i-bondid").value;
      const addr   = document.getElementById("iss-i-addr").value.trim();
      const amount = document.getElementById("iss-i-amount").value;
      if (!bondId || !addr || !amount) { showToast("Fill all fields."); return; }
      setStatus("iss-issue-status", "Sending transaction…", "pending");
      try {
        const tx = await contract.issue(parseInt(bondId), addr, parseInt(amount));
        await tx.wait();
        setStatus("iss-issue-status", "✓ Tokens issued!", "success");
        showToast("Tokens issued to " + shortAddr(addr));
      } catch (e) {
        setStatus("iss-issue-status", "✗ " + (e.reason || e.message), "error");
      }
    },

    async deposit() {
      const bondId = document.getElementById("iss-e-bondid").value;
      const ethAmt = document.getElementById("iss-e-amount").value;
      if (!bondId || !ethAmt) { showToast("Fill all fields."); return; }
      setStatus("iss-escrow-status", "Sending transaction…", "pending");
      try {
        const tx = await contract.deposit(parseInt(bondId), {
          value: ethers.utils.parseEther(ethAmt)
        });
        await tx.wait();
        setStatus("iss-escrow-status", "✓ Deposited " + ethAmt + " ETH!", "success");
        showToast("Escrow deposit confirmed.");
      } catch (e) {
        setStatus("iss-escrow-status", "✗ " + (e.reason || e.message), "error");
      }
    },

    async payCoupon() {
      const bondId = document.getElementById("iss-p-bondid").value;
      if (bondId === "") { showToast("Enter a Bond ID."); return; }
      setStatus("iss-coupon-status", "Sending transaction…", "pending");
      try {
        const tx = await contract.payCoupon(parseInt(bondId));
        await tx.wait();
        setStatus("iss-coupon-status", "✓ Coupon paid!", "success");
        showToast("Coupon distributed to all holders.");
      } catch (e) {
        setStatus("iss-coupon-status", "✗ " + (e.reason || e.message), "error");
      }
    }
  },

  // ──────────── ADMIN
  admin: {
    async init() {
      try {
        const adminAddr = await contract.admin();
        document.getElementById("adm-stat-addr").textContent = adminAddr;
        if (adminAddr.toLowerCase() !== account?.toLowerCase()) {
          showToast("⚠ Warning: You are not the admin.");
        }
      } catch (e) {}
    },

    async approveKYC() {
      const bondId = document.getElementById("adm-k-bondid").value;
      const addr   = document.getElementById("adm-k-addr").value.trim();
      if (!bondId || !addr) { showToast("Fill all fields."); return; }
      setStatus("adm-kyc-status", "Sending transaction…", "pending");
      try {
        const tx = await contract.approveKYC(parseInt(bondId), addr);
        await tx.wait();
        setStatus("adm-kyc-status", "✓ KYC approved for " + shortAddr(addr), "success");
        showToast("KYC approved.");
      } catch (e) {
        setStatus("adm-kyc-status", "✗ " + (e.reason || e.message), "error");
      }
    },

    async loadBonds() {
      try {
        const bonds = await fetchAllBonds();
        renderBonds("adm-bonds-grid", bonds);
      } catch (e) {
        document.getElementById("adm-bonds-grid").innerHTML =
          '<div class="empty-state">Error: ' + e.message + '</div>';
      }
    }
  }
};
