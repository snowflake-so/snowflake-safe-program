import { PublicKey } from '@solana/web3.js';

export type SnowflakeTemplateAction<ExtendedAction> = {
  name?: string;
  actionCode: number;
  instruction: any;
  program: string;
  accounts: {
    pubkey: string | PublicKey;
    isSigner: boolean;
    isWritable: boolean;
  }[];
} & ExtendedAction;

export type BlankActionType = SnowflakeTemplateAction<Record<string, unknown>>;
export type PaymentActionType = SnowflakeTemplateAction<{
  token: {
    mint: string;
    ata: any;
  };
  recipient: {
    wallet: string;
    ata: any;
  };
  amount: number;
}>;

export type OrcaSwapActionType = SnowflakeTemplateAction<{
  amountIn: number;
  selectedPoolId: string;
  inputToken: any;
  minimumAmountOut: number;
}>;
export type PythOracleTriggerActionType = SnowflakeTemplateAction<{
  priceAccount: any;
  targetPrice: any;
  condition: any;
}>;
export type SaberPoolWithdrawActionType = SnowflakeTemplateAction<{
  amount: number;
  selectedPoolId: string;
}>;

