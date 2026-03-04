# @axonfi/plugin-elizaos

ElizaOS plugin for [Axon](https://axonfi.xyz) — treasury and payment infrastructure for AI agents.

## Installation

```bash
npm install @axonfi/plugin-elizaos @axonfi/sdk
```

## Configuration

Add these environment variables (or character settings):

| Variable | Required | Description |
|----------|----------|-------------|
| `AXON_BOT_PRIVATE_KEY` | Yes | Bot's private key (EIP-712 signer) |
| `AXON_VAULT_ADDRESS` | Yes | Axon vault contract address |
| `AXON_CHAIN_ID` | Yes | Chain ID (8453=Base, 42161=Arbitrum, 84532=Base Sepolia) |
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

## License

MIT
