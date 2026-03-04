import type { Action, IAgentRuntime, Memory, State, HandlerOptions, HandlerCallback } from '@elizaos/core';
import { AxonService } from '../service.js';

export const sendPaymentAction: Action = {
  name: 'AXON_SEND_PAYMENT',
  description:
    'Send a token payment from the agent\'s Axon vault. Supports USDC (default), WETH, and other ERC-20 tokens. Specify recipient address, amount, and optionally token and memo.',
  similes: ['PAY', 'SEND', 'TRANSFER', 'SEND_PAYMENT', 'SEND_USDC', 'PAY_USDC'],

  validate: async (runtime: IAgentRuntime, _message: Memory) => {
    return runtime.getSetting('AXON_BOT_PRIVATE_KEY') !== null;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State | undefined,
    _options: HandlerOptions | undefined,
    callback: HandlerCallback | undefined,
  ) => {
    const svc = runtime.getService<AxonService>('AXON');
    if (!svc) {
      await callback?.({ text: 'Axon service is not available. Check plugin configuration.' });
      return { success: false, error: 'Axon service not found' };
    }

    // Use LLM to extract structured payment params from the message
    const context = `Extract payment details from this message. Return JSON only, no markdown:
{"to": "0x... recipient address", "amount": "numeric amount as string", "token": "token symbol or address (default USDC)", "memo": "optional memo or null"}

Message: "${message.content.text}"`;

    let params: { to: string; amount: string; token?: string; memo?: string };
    try {
      const response = await runtime.useModel('TEXT_SMALL' as any, {
        prompt: context,
        stopSequences: [],
      });
      params = JSON.parse(response);
    } catch {
      await callback?.({
        text: 'I couldn\'t parse the payment details. Please specify: recipient address, amount, and optionally token (default USDC).',
      });
      return { success: false, error: 'Failed to parse payment params' };
    }

    if (!params.to || !params.amount) {
      await callback?.({
        text: 'Missing recipient address or amount. Example: "Send 50 USDC to 0xabc..."',
      });
      return { success: false, error: 'Missing required fields' };
    }

    try {
      const result = await svc.client.pay({
        to: params.to as `0x${string}`,
        token: (params.token ?? 'USDC') as any,
        amount: params.amount,
        memo: params.memo ?? undefined,
      });

      if (result.status === 'approved') {
        await callback?.({
          text: `Payment sent! ${params.amount} ${params.token ?? 'USDC'} to ${params.to}\nTx: ${result.txHash}`,
        });
      } else if (result.status === 'pending_review') {
        await callback?.({
          text: `Payment is pending human review (request ${result.requestId}). The vault owner will be notified.`,
        });
      } else {
        await callback?.({
          text: `Payment rejected: ${result.reason ?? 'unknown reason'}`,
        });
      }

      return { success: result.status === 'approved', data: { ...result } as Record<string, unknown> };
    } catch (err: any) {
      await callback?.({ text: `Payment failed: ${err.message}` });
      return { success: false, error: err.message };
    }
  },

  examples: [
    [
      { name: 'user', content: { text: 'Send 50 USDC to 0x1234567890abcdef1234567890abcdef12345678' } },
      { name: 'agent', content: { text: 'Sending payment...', action: 'AXON_SEND_PAYMENT' } },
    ],
    [
      { name: 'user', content: { text: 'Pay 0.5 WETH to 0xabcdefabcdefabcdefabcdefabcdefabcdefabcd with memo "API invoice #42"' } },
      { name: 'agent', content: { text: 'Processing WETH payment...', action: 'AXON_SEND_PAYMENT' } },
    ],
  ],
};
