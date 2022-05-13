import { PublicKey } from '@solana/web3.js';
import { ENV as ChainID } from '@solana/spl-token-registry/dist/main/lib/tokenlist';

export const PROGRAM_IDS = [
  {
    name: 'mainnet-beta',
  },
  {
    name: 'testnet',
  },
  {
    name: 'devnet',
  },
  {
    name: 'localnet',
  },
];

export const setProgramIds = (envName: string) => {
  let instance = PROGRAM_IDS.find(env => env.name === envName);
  if (!instance) {
    return;
  }
};

export const programIds = () => {
  return {
    token: TOKEN_PROGRAM_ID,
    snowflakeSafe: SNOWFLAKE_SAFE_PROGRAM_ID,
    associatedToken: ASSOCIATED_TOKEN_PROGRAM_ID,
    memo: MEMO_PROGRAM_ID,
    system: SYSTEM_PROGRAM_ID,
    rent: RENT_PROGRAM_ID,
    clock: CLOCK_PROGRAM_ID,
    priceChecker: PRICE_CHECKER_PROGRAM_ID,
  };
};

export const DEFAULT_DEVELOPER_APP_ID = new PublicKey('11111111111111111111111111111111');
export const WRAPPED_SOL_MINT = new PublicKey('So11111111111111111111111111111111111111112');
export const SOL_MINT = new PublicKey('Ejmc1UB4EsES5oAaRN63SpoxMJidt3ZGBrqrZk49vjTZ');
export const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
export const SNOWFLAKE_SAFE_PROGRAM_ID = new PublicKey(
  'HAD4YK6z3mFEYaFd82Ln2aVTUp3rt1ifXBHbFLfoot83'
);
export const SYSTEM_PROGRAM_ID = new PublicKey('11111111111111111111111111111111');
export const MEMO_PROGRAM_ID = new PublicKey('Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo');
export const RENT_PROGRAM_ID = new PublicKey('SysvarRent111111111111111111111111111111111');
export const CLOCK_PROGRAM_ID = new PublicKey('SysvarC1ock11111111111111111111111111111111');
export const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
  'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'
);
export const PRICE_CHECKER_PROGRAM_ID = new PublicKey(
  '8BVA9L8pTTPxcrP7AS9M9957Qy8WUBSLmgh37vUvUdRe'
);
export const SNF_PROGRAM_SETTINGS_ID = new PublicKey(
  'APiJdtb25pQf1RCBxCoX2Q2trEjGPeXztJ2NztTQ8SYY'
);
export const DEVNET_USDC_TOKEN = new PublicKey('2G77xvdpBfDXLhSzrXCsSks3QCaSbhnYZF1ieWQzZpBp');
export const MAINNET_USDC_TOKEN = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
export const DEVNET_AIRDROP_PROGRAM = new PublicKey('9YMvXPKHH4azgTaAPeZLnTD6bbhjcDrMVsWrBApotm37');

export const EXTRA_DEVNET_TOKENS = [
  {
    chainId: ChainID.Devnet,
    address: DEVNET_USDC_TOKEN.toString(),
    symbol: 'USDC',
    name: 'USDC Snowflake',
    decimals: 9,
    logoURI:
      'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
    tags: [],
    extensions: {
      coingeckoId: 'solana',
    },
  },
];
