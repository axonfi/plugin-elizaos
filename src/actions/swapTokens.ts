import type { Action, IAgentRuntime, Memory, State, HandlerOptions, HandlerCallback } from '@elizaos/core';
import { AxonService } from '../service.js';

export const swapTokensAction: Action = {
  name: 'AXON_SWAP_TOKENS',
  description:
    "Swap tokens within the agent's Axon vault (in-vault rebalancing). Specify source token, destination token, and amount to swap.",
  similes: ['SWAP', 'CONVERT', 'EXCHANGE', 'REBALANCE', 'SWAP_TOKENS'],

  validate: async (runtime: IAgentRuntime, _message: Memory) => {
    return runtime.getSetting('AXON_BOT_PRIVATE_KEY') !== null;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State | undefined,
    _options: HandlerOptions | undefined,
    callback: HandlerCallback | undefined,
  ) => {
    const svc = runtime.getService<AxonService>('AXON');
    if (!svc) {
      await callback?.({ text: 'Axon service is not available. Check plugin configuration.' });
      return { success: false, error: 'Axon service not found' };
    }

    const context = `Extract swap details from this message. Return JSON only, no markdown:
{"fromToken": "source token symbol or address", "toToken": "destination token symbol or address", "amount": "numeric amount as string"}

Message: "${message.content.text}"`;

    let params: { fromToken: string; toToken: string; amount: string };
    try {
      const response = await runtime.useModel('TEXT_SMALL' as any, {
        prompt: context,
        stopSequences: [],
      });
      params = JSON.parse(response);
    } catch {
      await callback?.({
        text: 'I couldn\'t parse the swap details. Please specify: source token, destination token, and amount. Example: "Swap 100 USDC to WETH"',
      });
      return { success: false, error: 'Failed to parse swap params' };
    }

    if (!params.fromToken || !params.toToken || !params.amount) {
      await callback?.({
        text: 'Missing swap details. Example: "Swap 100 USDC to WETH"',
      });
      return { success: false, error: 'Missing required fields' };
    }

    try {
      const result = await svc.client.swap({
        fromToken: params.fromToken as any,
        maxFromAmount: params.amount,
        toToken: params.toToken as any,
        minToAmount: '0',
      });

      if (result.status === 'approved') {
        await callback?.({
          text: `Swap complete! ${params.amount} ${params.fromToken} → ${params.toToken}\nTx: ${result.txHash}`,
        });
      } else if (result.status === 'pending_review') {
        await callback?.({
          text: `Swap is pending review (request ${result.requestId}).`,
        });
      } else {
        await callback?.({
          text: `Swap rejected: ${result.reason ?? 'unknown reason'}`,
        });
      }

      return { success: result.status === 'approved', data: { ...result } as Record<string, unknown> };
    } catch (err: any) {
      await callback?.({ text: `Swap failed: ${err.message}` });
      return { success: false, error: err.message };
    }
  },

  examples: [
    [
      { name: 'user', content: { text: 'Swap 100 USDC to WETH in my vault' } },
      { name: 'agent', content: { text: 'Swapping tokens...', action: 'AXON_SWAP_TOKENS' } },
    ],
    [
      { name: 'user', content: { text: 'Convert 0.05 WETH to USDC' } },
      { name: 'agent', content: { text: 'Processing swap...', action: 'AXON_SWAP_TOKENS' } },
    ],
  ],
};
