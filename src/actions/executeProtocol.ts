import type { Action, IAgentRuntime, Memory, State, HandlerOptions, HandlerCallback } from '@elizaos/core';
import { AxonService } from '../service.js';

export const executeProtocolAction: Action = {
  name: 'AXON_EXECUTE_PROTOCOL',
  description:
    "Execute a DeFi protocol interaction through the agent's Axon vault. Requires protocol address, calldata, token, and amount. This is an advanced action for structured DeFi calls (approve → call → revoke).",
  similes: ['EXECUTE', 'CALL_PROTOCOL', 'DEFI', 'INTERACT', 'PROTOCOL'],

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

    const context = `Extract DeFi protocol execution details from this message. Return JSON only, no markdown:
{"protocol": "0x... protocol contract address", "callData": "0x... encoded calldata", "token": "token symbol or address for approval", "amount": "numeric amount as string", "protocolName": "human-readable protocol name or null", "memo": "optional memo or null"}

If the message doesn't contain explicit calldata or protocol address, return {"error": "insufficient details"}.

Message: "${message.content.text}"`;

    let params: {
      protocol?: string;
      callData?: string;
      token?: string;
      amount?: string;
      protocolName?: string;
      memo?: string;
      error?: string;
    };
    try {
      const response = await runtime.useModel('TEXT_SMALL' as any, {
        prompt: context,
        stopSequences: [],
      });
      params = JSON.parse(response);
    } catch {
      await callback?.({
        text: "I couldn't parse the protocol execution details. This action requires: protocol address, calldata, token, and amount.",
      });
      return { success: false, error: 'Failed to parse execute params' };
    }

    if (params.error || !params.protocol || !params.callData || !params.token || !params.amount) {
      await callback?.({
        text: 'Protocol execution requires structured input: protocol address, encoded calldata, token, and amount. This is typically used programmatically rather than via natural language.',
      });
      return { success: false, error: 'Missing required fields for protocol execution' };
    }

    try {
      const result = await svc.client.execute({
        protocol: params.protocol as `0x${string}`,
        callData: params.callData as `0x${string}`,
        token: params.token as any,
        amount: params.amount,
        protocolName: params.protocolName ?? undefined,
        memo: params.memo ?? undefined,
      });

      if (result.status === 'approved') {
        await callback?.({
          text: `Protocol execution complete!${params.protocolName ? ` (${params.protocolName})` : ''}\nTx: ${result.txHash}`,
        });
      } else if (result.status === 'pending_review') {
        await callback?.({
          text: `Protocol execution is pending review (request ${result.requestId}).`,
        });
      } else {
        await callback?.({
          text: `Protocol execution rejected: ${result.reason ?? 'unknown reason'}`,
        });
      }

      return { success: result.status === 'approved', data: { ...result } as Record<string, unknown> };
    } catch (err: any) {
      await callback?.({ text: `Protocol execution failed: ${err.message}` });
      return { success: false, error: err.message };
    }
  },

  examples: [
    [
      { name: 'user', content: { text: 'Execute a deposit of 500 USDC into Aave at 0x1234...' } },
      { name: 'agent', content: { text: 'Processing protocol execution...', action: 'AXON_EXECUTE_PROTOCOL' } },
    ],
  ],
};
