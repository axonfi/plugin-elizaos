import type { Provider, IAgentRuntime, Memory, State } from '@elizaos/core';
import { AxonService } from '../service.js';
import { USDC, CHAIN_NAMES, type Chain } from '@axonfi/sdk';

const CACHE_TTL_MS = 30_000;

let cachedText: string | null = null;
let cachedAt = 0;

export const vaultContextProvider: Provider = {
  name: 'AXON_VAULT_CONTEXT',
  description: 'Provides current Axon vault balance and status for agent context.',
  dynamic: false,
  position: 10,

  get: async (
    runtime: IAgentRuntime,
    _message: Memory,
    _state: State,
  ) => {
    const now = Date.now();
    if (cachedText && now - cachedAt < CACHE_TTL_MS) {
      return { text: cachedText };
    }

    const svc = runtime.getService<AxonService>('AXON');
    if (!svc) {
      return { text: 'Axon vault: not configured.' };
    }

    try {
      const chainId = Number(runtime.getSetting('AXON_CHAIN_ID')) as Chain;
      const vaultAddress = runtime.getSetting('AXON_VAULT_ADDRESS') as string;
      const usdcAddress = USDC[chainId];
      const chainName = CHAIN_NAMES[chainId] ?? `Chain ${chainId}`;

      const [balance, info] = await Promise.all([
        svc.client.getBalance(usdcAddress),
        svc.client.getVaultInfo(),
      ]);

      const formatted = (Number(balance) / 1e6).toFixed(2);
      const status = info.paused ? 'PAUSED' : 'active';
      const short = `${vaultAddress.slice(0, 6)}...${vaultAddress.slice(-4)}`;

      cachedText = `Axon vault ${short} on ${chainName}: ${formatted} USDC. Status: ${status}.`;
      cachedAt = now;

      return {
        text: cachedText,
        values: {
          axonVaultAddress: vaultAddress,
          axonChain: chainName,
          axonBalance: formatted,
          axonStatus: status,
        },
      };
    } catch {
      return { text: 'Axon vault: unable to fetch balance.' };
    }
  },
};
