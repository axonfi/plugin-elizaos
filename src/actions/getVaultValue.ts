import type { Action, IAgentRuntime, Memory, State, HandlerOptions, HandlerCallback } from '@elizaos/core';
import { AxonService } from '../service.js';
import { CHAIN_NAMES, type Chain } from '@axonfi/sdk';

export const getVaultValueAction: Action = {
  name: 'AXON_GET_VAULT_VALUE',
  description: "Get the total USD value of all token holdings in the agent's Axon vault, with per-token breakdown.",
  similes: ['VAULT_VALUE', 'TOTAL_VALUE', 'PORTFOLIO', 'HOLDINGS', 'NET_WORTH', 'VAULT_WORTH'],

  validate: async (runtime: IAgentRuntime, _message: Memory) => {
    return runtime.getSetting('AXON_BOT_PRIVATE_KEY') !== null;
  },

  handler: async (
    runtime: IAgentRuntime,
    _message: Memory,
    _state: State | undefined,
    _options: HandlerOptions | undefined,
    callback: HandlerCallback | undefined,
  ) => {
    const svc = runtime.getService<AxonService>('AXON');
    if (!svc) {
      await callback?.({ text: 'Axon service is not available. Check plugin configuration.' });
      return { success: false, error: 'Axon service not found' };
    }

    try {
      const chainId = Number(runtime.getSetting('AXON_CHAIN_ID')) as Chain;
      const vaultAddress = runtime.getSetting('AXON_VAULT_ADDRESS') as string;
      const chainName = CHAIN_NAMES[chainId] ?? `Chain ${chainId}`;

      const result = await svc.client.getVaultValue();

      const tokenLines = result.tokens
        .map((t) => {
          const formatted = (Number(t.balance) / 10 ** t.decimals).toFixed(t.decimals <= 6 ? 2 : 4);
          return `  ${t.symbol}: ${formatted} ($${t.valueUsd.toFixed(2)})`;
        })
        .join('\n');

      const text =
        `Axon vault ${vaultAddress.slice(0, 6)}...${vaultAddress.slice(-4)} on ${chainName}\n` +
        `Total value: $${result.totalValueUsd.toFixed(2)}\n` +
        (tokenLines ? `\nHoldings:\n${tokenLines}` : 'No token holdings.');

      await callback?.({ text });
      return {
        success: true,
        data: {
          totalValueUsd: result.totalValueUsd,
          tokens: result.tokens,
          chainName,
          vaultAddress,
        },
      };
    } catch (err: any) {
      await callback?.({ text: `Failed to get vault value: ${err.message}` });
      return { success: false, error: err.message };
    }
  },

  examples: [
    [
      { name: 'user', content: { text: "What's my vault worth?" } },
      { name: 'agent', content: { text: 'Checking vault value...', action: 'AXON_GET_VAULT_VALUE' } },
    ],
    [
      { name: 'user', content: { text: 'Show me my total holdings in USD.' } },
      { name: 'agent', content: { text: 'Let me look that up...', action: 'AXON_GET_VAULT_VALUE' } },
    ],
  ],
};
