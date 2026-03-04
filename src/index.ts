import type { Plugin } from '@elizaos/core';
import { AxonService } from './service.js';
import { sendPaymentAction } from './actions/sendPayment.js';
import { swapTokensAction } from './actions/swapTokens.js';
import { executeProtocolAction } from './actions/executeProtocol.js';
import { checkBalanceAction } from './actions/checkBalance.js';
import { vaultContextProvider } from './providers/vaultContext.js';

export const axonPlugin: Plugin = {
  name: 'plugin-axon',
  description:
    'Treasury and payment infrastructure for AI agents via AxonFi. Gasless payments, token swaps, and DeFi interactions through non-custodial vaults.',
  services: [AxonService as any],
  actions: [sendPaymentAction, swapTokensAction, executeProtocolAction, checkBalanceAction],
  providers: [vaultContextProvider],
};

export default axonPlugin;
export { AxonService } from './service.js';
export { sendPaymentAction } from './actions/sendPayment.js';
export { swapTokensAction } from './actions/swapTokens.js';
export { executeProtocolAction } from './actions/executeProtocol.js';
export { checkBalanceAction } from './actions/checkBalance.js';
export { vaultContextProvider } from './providers/vaultContext.js';
