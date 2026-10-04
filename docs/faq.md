# FAQ

### What is DGDreams?

A **Web3 Space Terminal** — a multi-chain dashboard where you connect once and run daily on-chain missions across 20 networks, build streaks, mint soulbound NFTs and play with AI contracts.

### Do I need an account?

No. Your **wallet is your identity**. Connect with MetaMask and you're in.

### Which networks are supported?

20 total: Ethereum, Base, Arbitrum One, OP Mainnet, HyperEVM, Unichain, Tempo, Robinhood, Ink, Arc, BNB Chain and opBNB on mainnet, plus Sepolia, Base Sepolia, GIWA Sepolia, Arbitrum Sepolia, LitVM Liteforge, GenLayer Bradbury, ARC Testnet and SimpleChain.

### Do I need money to use it?

You need a bit of **native gas** on whichever network you're running tasks on — every write is a real on-chain transaction. **OP Mainnet and Arbitrum are the cheapest** by a wide margin; if you are trying the app for the first time, start there.

### Why can I only do each task once a day?

Fair play. Each action type is validated against **real UTC time** on-chain and limited to once per UTC day, so nobody can spam the same mission. The day changes at **00:00 UTC** for everyone, regardless of timezone.

### What is the 5-in-1 button?

One click runs GM and GN plus three contract deploys (a demo contract, a minimal ERC-20 and a minimal ERC-721) on the network you pick in that card. It reuses addresses it has already deployed, so a second run on the same network costs almost nothing.

### What are soulbound NFTs?

Permanent, **non-transferable** badges tied to your wallet that record your longest streak. Cross 7 days to mint Bronze and keep going to reach Legend.

### What is GenLayer?

An **AI-native blockchain** that runs Python Intelligent Contracts validated by AI validators. DGDreams uses it for time-proven daily tasks, an AI price oracle and a prediction market.

### Where is my data stored?

Task state lives **on-chain** (EVM or GenLayer). Off-chain data like metadata is stored in PostgreSQL via Drizzle ORM on the backend.

### How is my streak recorded?

Your streak is owned by your wallet, not by our database. `NikBase` records it on-chain against your address, and when the app stores a copy for the leaderboard it re-reads the value from the contract itself — so a number cannot be inflated by editing a request. Signing in is a free signature, never a transaction.

### I got a revert. What now?

Check that you have native gas for that network (on Arc mainnet the gas token is **USDC**), that the wallet is switched to the right chain, and that you haven't already run that task today (UTC).

### The Run all 5 button is greyed out

It stays disabled when the card cannot run yet. Most often the three deploy
artifacts failed to load, or the selected network has no `NikBase` deployed. The
card prints the reason directly underneath it.

### Can I contribute?

Absolutely — see [Contributing](./contributing).
