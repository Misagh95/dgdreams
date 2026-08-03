# FAQ

### What is DGDreams?

A **Web3 Space Terminal** — a multi-chain dashboard where you connect once and run daily on-chain missions across 14 networks, build streaks, mint soulbound NFTs and play with AI contracts.

### Do I need an account?

No. Your **wallet is your identity**. Connect with MetaMask and you're in.

### Which networks are supported?

14 total: Ethereum, Base, HyperEVM, Unichain, Tempo, Robinhood and Ink on mainnet, plus Sepolia, Base Sepolia, GIWA Sepolia, LitVM Liteforge, GenLayer Bradbury, ARC Testnet and SimpleChain.

### Do I need money to use it?

You need a bit of **native gas** on whichever network you're running tasks on — every write is a real on-chain transaction.

### Why can I only do each task once a day?

Fair play. Each action type is validated against **real UTC time** on-chain and limited to once per UTC day, so nobody can spam the same mission.

### What are soulbound NFTs?

Permanent, **non-transferable** badges tied to your wallet that record your longest streak. Cross 7 days to mint Bronze and keep going to reach Legend.

### What is GenLayer?

An **AI-native blockchain** that runs Python Intelligent Contracts validated by AI validators. DGDreams uses it for time-proven daily tasks, an AI price oracle and a prediction market.

### Where is my data stored?

Task state lives **on-chain** (EVM or GenLayer). Off-chain data like metadata is stored in PostgreSQL via Drizzle ORM on the backend.

### I got a revert. What now?

Check that you have native gas for that network, that the wallet is switched to the right chain, and that you haven't already run that task today (UTC).

### Can I contribute?

Absolutely — see [Contributing](./contributing).
