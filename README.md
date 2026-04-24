# ◆ bondApp

A decentralised bond platform built on Ethereum. Issue, manage, and invest in tokenised bonds with on-chain escrow, automated coupon distribution, and KYC compliance.

---

## Stack

| Layer | Tech |
|---|---|
| Smart Contract | Solidity `^0.8.19` |
| Frontend | Vanilla HTML / CSS / JS |
| Web3 | ethers.js v5.7 |
| Wallet | MetaMask |

---

## Project Structure

```
multibond/
├── index.html        # Full UI — home + 3 dashboards
├── style.css         # Dark luxury design system
├── app.js            # Wallet connection, contract calls, UI logic
└── MultiBondPlatform.sol
```

---

## Setup

**1. Deploy the contract**
Deploy `MultiBondPlatform.sol` to your network (Hardhat, Remix, Foundry — your choice).

**2. Set the contract address**
In `app.js`, line 7:
```js
const CONTRACT_ADDRESS = "0xYourDeployedAddressHere";
```

**3. Open `index.html` in a browser with MetaMask installed.**

No build step. No dependencies to install.

---

## Pages & Roles

### 🏠 Home
Connect MetaMask, then choose your role.

### ⬡ Investor
- Browse all bonds on-chain
- View portfolio
- Redeem bonds at maturity

### ◈ Issuer
- Create new bonds (name, face value, coupon rate, maturity, intervals)
- Issue tokens to KYC-approved investors
- Deposit ETH into escrow
- Pay coupons (auto-distributed to all holders)

### ✦ Admin
- Approve KYC for investors per bond
- View all bonds platform-wide

---

## Contract Overview

| Function | Who | What |
|---|---|---|
| `createBond()` | Issuer | Registers a new bond |
| `approveKYC()` | Admin | Whitelists an investor |
| `issue()` | Issuer | Mints bond tokens to investor |
| `deposit()` | Issuer | Funds the escrow |
| `payCoupon()` | Issuer | Distributes coupon to all holders |
| `redeem()` | Investor | Redeems tokens after maturity |

---

## Notes

- Coupon rate is in **basis points** (100 bps = 1%)
- Maturity and intervals are **Unix timestamps / seconds**
- Face value and escrow amounts are in **wei**
- KYC must be approved before tokens can be issued to an investor
