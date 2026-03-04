import type { Action, IAgentRuntime, Memory, State, HandlerOptions, HandlerCallback } from '@elizaos/core';
import { AxonService } from '../service.js';
import { USDC, CHAIN_NAMES, type Chain } from '@axonfi/sdk';

export const checkBalanceAction: Action = {
  name: 'AXON_CHECK_BALANCE',
  description:
    'Check the current token balances in the agent\'s Axon vault. Returns USDC balance by default, or specify a token.',
  similes: ['BALANCE', 'CHECK_BALANCE', 'HOW_MUCH', 'FUNDS', 'VAULT_BALANCE'],

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
      const usdcAddress = USDC[chainId];
      const chainName = CHAIN_NAMES[chainId] ?? `Chain ${chainId}`;

      const balance = await svc.client.getBalance(usdcAddress);
      const formatted = (Number(balance) / 1e6).toFixed(2);

      const info = await svc.client.getVaultInfo();
      const status = info.paused ? 'PAUSED' : 'active';

      const text = `Axon vault ${vaultAddress.slice(0, 6)}...${vaultAddress.slice(-4)} on ${chainName}: ${formatted} USDC. Status: ${status}.`;

      await callback?.({ text });
      return {
        success: true,
        data: { balance: formatted, status, chainName, vaultAddress },
      };
    } catch (err: any) {
      await callback?.({ text: `Failed to check balance: ${err.message}` });
      return { success: false, error: err.message };
    }
  },

  examples: [
    [
      { name: 'user', content: { text: "What's my vault balance?" } },
      { name: 'agent', content: { text: 'Checking vault balance...', action: 'AXON_CHECK_BALANCE' } },
    ],
    [
      { name: 'user', content: { text: 'How much USDC do I have?' } },
      { name: 'agent', content: { text: 'Let me check...', action: 'AXON_CHECK_BALANCE' } },
    ],
  ],
};
