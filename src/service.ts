import { Service, type IAgentRuntime } from '@elizaos/core';
import { AxonClient, type Chain } from '@axonfi/sdk';

export class AxonService extends Service {
  static serviceType = 'AXON';
  capabilityDescription = 'Enables gasless payments, token swaps, and DeFi interactions through Axon non-custodial vaults.';

  client!: AxonClient;

  static async start(runtime: IAgentRuntime): Promise<AxonService> {
    const svc = new AxonService(runtime);

    const botPrivateKey = runtime.getSetting('AXON_BOT_PRIVATE_KEY') as string;
    if (!botPrivateKey) throw new Error('AXON_BOT_PRIVATE_KEY is required');

    const vaultAddress = runtime.getSetting('AXON_VAULT_ADDRESS') as string;
    if (!vaultAddress) throw new Error('AXON_VAULT_ADDRESS is required');

    const chainId = runtime.getSetting('AXON_CHAIN_ID');
    if (!chainId) throw new Error('AXON_CHAIN_ID is required');

    svc.client = new AxonClient({
      botPrivateKey: botPrivateKey as `0x${string}`,
      vaultAddress: vaultAddress as `0x${string}`,
      chainId: Number(chainId) as Chain,
    });

    // Verify bot is registered and active on the vault
    const active = await svc.client.isActive();
    if (!active) {
      runtime.logger.warn(
        `Axon bot ${svc.client.botAddress} is NOT active on vault ${vaultAddress}. Payments will fail.`
      );
    } else {
      runtime.logger.info(
        `Axon plugin ready — bot ${svc.client.botAddress} on vault ${vaultAddress} (chain ${chainId})`
      );
    }

    return svc;
  }

  async stop(): Promise<void> {
    // AxonClient is stateless — nothing to clean up
  }
}
