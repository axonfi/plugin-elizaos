import type { Action, IAgentRuntime, Memory, State, HandlerOptions, HandlerCallback } from '@elizaos/core';
import { AxonService } from '../service.js';

export const handleX402Action: Action = {
  name: 'AXON_X402_PAYMENT',
  description:
    'Handle an HTTP 402 Payment Required response. Parses the x402 PAYMENT-REQUIRED header, funds the bot from the vault, signs a token authorization (EIP-3009 for USDC, Permit2 for other tokens), and returns a PAYMENT-SIGNATURE header for retrying the request.',
  similes: ['X402', 'PAYMENT_REQUIRED', 'HANDLE_402', 'PAY_402', 'X402_PAYMENT'],

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

    // Extract the PAYMENT-REQUIRED header value from the message
    const context = `Extract the x402 PAYMENT-REQUIRED header value from this message. Return JSON only, no markdown:
{"header": "the base64-encoded or JSON header value"}

The header is typically a base64-encoded JSON string. Look for base64 strings or JSON containing "accepts", "resource", "payTo", etc.

Message: "${message.content.text}"`;

    let headerValue: string;
    try {
      const response = await runtime.useModel('TEXT_SMALL' as any, {
        prompt: context,
        stopSequences: [],
      });
      const parsed = JSON.parse(response);
      headerValue = parsed.header;
    } catch {
      await callback?.({
        text: "I couldn't find an x402 PAYMENT-REQUIRED header in your message. Please provide the header value (base64 or JSON).",
      });
      return { success: false, error: 'Failed to extract x402 header' };
    }

    if (!headerValue) {
      await callback?.({
        text: 'No PAYMENT-REQUIRED header value found. Please provide the base64-encoded header from the 402 response.',
      });
      return { success: false, error: 'Empty header value' };
    }

    try {
      const result = await svc.client.x402.handlePaymentRequired({ 'PAYMENT-REQUIRED': headerValue }, 120_000, 5_000);

      const lines = [
        `x402 payment handled!`,
        `Status: ${result.fundingResult.status}`,
        `Amount: ${result.selectedOption.amount} (base units)`,
        `Merchant: ${result.selectedOption.payTo}`,
      ];
      if (result.fundingResult.txHash) {
        lines.push(`TX: ${result.fundingResult.txHash}`);
      }
      lines.push(`PAYMENT-SIGNATURE: ${result.paymentSignature}`);

      await callback?.({ text: lines.join('\n') });
      return { success: true, data: { ...result } as Record<string, unknown> };
    } catch (err: any) {
      await callback?.({ text: `x402 payment failed: ${err.message}` });
      return { success: false, error: err.message };
    }
  },

  examples: [
    [
      {
        name: 'user',
        content: {
          text: 'Handle this x402 payment: eyJ4NDAyVmVyc2lvbiI6MSwicmVzb3VyY2UiOnsidXJsIjoiaHR0cHM6Ly9hcGkuZXhhbXBsZS5jb20vZGF0YSJ9LCJhY2NlcHRzIjpbeyJwYXlUbyI6IjB4MTIzNCIsImFtb3VudCI6IjEwMDAwMDAiLCJhc3NldCI6IjB4YWFhIiwibmV0d29yayI6ImVpcDE1NTo4NDUzIn1dfQ==',
        },
      },
      { name: 'agent', content: { text: 'Processing x402 payment...', action: 'AXON_X402_PAYMENT' } },
    ],
    [
      {
        name: 'user',
        content: {
          text: 'I got a 402 response with this payment header: {"x402Version":1,"resource":{"url":"https://api.example.com/forecast"},"accepts":[{"payTo":"0xmerchant","amount":"500000","asset":"0xUSDC","network":"eip155:8453"}]}',
        },
      },
      { name: 'agent', content: { text: 'Handling x402 paywall...', action: 'AXON_X402_PAYMENT' } },
    ],
  ],
};
