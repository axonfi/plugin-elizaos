# @axonfi/plugin-elizaos

ElizaOS plugin for [Axon](https://axonfi.xyz) — treasury and payment infrastructure for AI agents.

## Installation

```bash
npm install @axonfi/plugin-elizaos @axonfi/sdk
```

## Prerequisites

Before using this plugin, you need an Axon vault with a registered bot:

1. **Deploy a vault** — Go to [app.axonfi.xyz](https://app.axonfi.xyz), connect your wallet, and deploy a vault on your target chain. The vault is a non-custodial smart contract — only you (the owner) can withdraw funds.

2. **Fund the vault** — Send USDC (or any ERC-20) to your vault address. Anyone can deposit directly to the contract.

3. **Register a bot** — In the dashboard, go to your vault → Bots → Add Bot. You can either:
   - **Generate a new keypair** (recommended) — the dashboard creates a key and downloads an encrypted keystore JSON file. You set the passphrase.
   - **Bring your own key** — paste an existing public key if you manage keys externally.

4. **Configure policies** — Set per-transaction caps, daily spending limits, velocity windows, and destination whitelists. The bot can only operate within these bounds.

5. **Get the bot key** — Your ElizaOS agent needs the bot's private key to sign payment intents. Decrypt the keystore or use the raw private key.

The vault owner's wallet stays secure — the bot key can only sign intents within the policies you configure, and can be revoked instantly from the dashboard.

## Configuration

Add these environment variables (or character settings):

| Variable | Required | Description |
|----------|----------|-------------|
| `AXON_BOT_PRIVATE_KEY` | Yes | Bot's private key (EIP-712 signer) |
| `AXON_VAULT_ADDRESS` | Yes | Axon vault contract address |
| `AXON_CHAIN_ID` | Yes | Chain ID — use `Chain.Base` (8453), `Chain.ArbitrumOne` (42161), or `Chain.BaseSepolia` (84532) from `@axonfi/sdk` |
| `AXON_RELAYER_URL` | No | Relayer URL (defaults to `https://relay.axonfi.xyz`) |

## Usage

```typescript
import { axonPlugin } from "@axonfi/plugin-elizaos";

const agent = new AgentRuntime({
  // ...
  plugins: [axonPlugin],
});
```

## Actions

| Action | Description | Example |
|--------|-------------|---------|
| `AXON_SEND_PAYMENT` | Send token payments | "Send 50 USDC to 0xabc..." |
| `AXON_SWAP_TOKENS` | In-vault token swaps | "Swap 100 USDC to WETH" |
| `AXON_EXECUTE_PROTOCOL` | DeFi protocol calls | Requires structured input |
| `AXON_CHECK_BALANCE` | Check vault balance | "What's my balance?" |

## Provider

**AXON_VAULT_CONTEXT** — Automatically injects vault balance and status into the agent's context on every message (cached 30s).

## How It Works

The plugin is a thin adapter between ElizaOS and `@axonfi/sdk`. Your bot signs EIP-712 intents — the Axon relayer validates, simulates, and submits transactions on-chain. The bot never needs ETH for gas.

```
Agent receives message → Action extracts params → SDK signs EIP-712 intent
→ Relayer validates + executes → txHash returned to conversation
```

## Links

- [Website](https://axonfi.xyz)
- [Dashboard](https://app.axonfi.xyz)
- [Documentation](https://axonfi.xyz/llms.txt)
- [npm — @axonfi/sdk](https://www.npmjs.com/package/@axonfi/sdk) (TypeScript SDK)
- [PyPI — axonfi](https://pypi.org/project/axonfi/) (Python SDK)
- [Smart Contracts](https://github.com/axonfi/contracts)
- [Examples](https://github.com/axonfi/examples)
- [Twitter/X — @axonfixyz](https://x.com/axonfixyz)

## License

MIT
