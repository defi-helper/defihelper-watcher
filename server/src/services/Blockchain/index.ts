import { Container, singleton } from '@services/Container';
import { ethers } from 'ethers';

function providerFactory(url: URL) {
  return () =>
    new ethers.providers.JsonRpcProvider({
      url: `${url.protocol}//${url.hostname}${url.pathname}`,
      user: url.username ? url.username : undefined,
      password: url.password ? url.password : undefined,
      timeout: 30000,
    });
}

export interface Config {
  ethMainNode: URL[];
  goerliNode: URL[];
  bscMainNode: URL[];
  polygonMainNode: URL[];
  moonriverMainNode: URL[];
  avalancheMainNode: URL[];
}

export class BlockchainContainer extends Container<Config> {
  readonly networks = {
    1: {
      id: 1,
      provider: singleton(providerFactory(this.parent.ethMainNode[0])),
      historySyncStep: 1000,
    },
    5: {
      id: 5,
      provider: singleton(providerFactory(this.parent.goerliNode[0])),
      historySyncStep: 1000,
    },
    56: {
      id: 56,
      provider: singleton(providerFactory(this.parent.bscMainNode[0])),
      historySyncStep: 1000,
    },
    137: {
      id: 137,
      provider: singleton(providerFactory(this.parent.polygonMainNode[0])),
      historySyncStep: 1000,
    },
    1285: {
      id: 1285,
      provider: singleton(providerFactory(this.parent.moonriverMainNode[0])),
      historySyncStep: 1000,
    },
    43114: {
      id: 43114,
      provider: singleton(providerFactory(this.parent.avalancheMainNode[0])),
      historySyncStep: 1000,
    },
  };

  readonly hasNetwork = (network: number): network is keyof BlockchainContainer['networks'] => {
    return Object.prototype.hasOwnProperty.call(this.networks, network);
  };

  readonly byNetwork = (network: number | string) => {
    const chainId = Number(network);
    if (!this.hasNetwork(chainId)) {
      throw new Error(`Undefined network ${network}`);
    }
    return this.networks[chainId];
  };

  readonly contract = (
    address: string,
    abi: ethers.ContractInterface,
    signerOrProvider?: ethers.Signer | ethers.providers.Provider,
  ): ethers.Contract => {
    return new ethers.Contract(address, abi, signerOrProvider);
  };
}
