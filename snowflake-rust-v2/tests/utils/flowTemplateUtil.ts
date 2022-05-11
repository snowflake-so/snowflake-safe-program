// import { RecurringUIOption, RETRY_WINDOW, TriggerType } from '../models/flow';
// import moment from 'moment';
// import { ENV } from './web3';
// import { ACTION_TYPES } from './flowActionUtil';
import { PublicKey } from '@solana/web3.js';
// import { SOL_MINT } from './ids';

// const defaultCron = '0 10 * * *';
// let defaultScheduleTime = moment().add(1, 'week'); // 1 week from now

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

export type BlankActionType = SnowflakeTemplateAction<{}>;
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

// export type SnowflakeTemplate<A> = Partial<{
//   name: string;
//   canAddAction: boolean;
//   showTrigger: boolean;
//   triggerType: TriggerType;
//   retryWindow: number;
//   cron: string;
//   recurring: keyof typeof RecurringUIOption;
//   nextExecutionTime: any;
//   remainingRuns: number;
//   actions: SnowflakeTemplateAction<A>[];
// }>;

// export const BLANK_TEMPLATE: SnowflakeTemplate<BlankActionType> = {
//   retryWindow: RETRY_WINDOW,
//   triggerType: TriggerType.None,
//   cron: defaultCron,
//   recurring: RecurringUIOption.No,
//   nextExecutionTime: defaultScheduleTime,
//   remainingRuns: -999,
//   actions: [],
// };

// export const RECURRING_PAYMENT_TEMPLATE : SnowflakeTemplate<PaymentActionType> = {
//   name: 'Recurring Payment',
//     retryWindow: RETRY_WINDOW,
//     triggerType: TriggerType.Time,
//     cron: '* * * * *',
//     showTrigger: true,
//     canAddAction: false,
//     recurring: RecurringUIOption.Yes,
//     remainingRuns: 2,
//     actions: [
//       {
//         actionCode: ACTION_TYPES.paymentAction.code,
//         instruction: '',
//         program: '',
//         token: { mint: SOL_MINT.toString(), ata: undefined },
//         recipient: {
//           wallet: undefined,
//           ata: undefined,
//         },
//         amount: 0,
//         accounts: [],
//       },
//     ],
// }

// export const WITHDRAW_TEMPLATE: SnowflakeTemplate<PaymentActionType> = {
//   name: 'Withdraw fund from safe',
//   triggerType: TriggerType.None,
//   retryWindow: RETRY_WINDOW,
//   canAddAction: false,
//   showTrigger: false,
//   actions: [
//     {
//       actionCode: ACTION_TYPES.withdrawAction.code,
//       instruction: '',
//       program: '',
//       token: { mint: SOL_MINT.toString(), ata: undefined },
//       recipient: {
//         wallet: undefined,
//         ata: undefined,
//       },
//       amount: 0,
//       accounts: [],
//     },
//   ],
// };

// export const BULK_PAYMENT_TEMPLATE: SnowflakeTemplate<PaymentActionType> = {
//   name: 'Bulk payment',
//   triggerType: TriggerType.None,
//   retryWindow: RETRY_WINDOW,
//   canAddAction: true,
//   showTrigger: false,
//   actions: [
//     {
//       actionCode: ACTION_TYPES.paymentAction.code,
//       instruction: '',
//       program: '',
//       token: { mint: SOL_MINT.toString(), ata: undefined },
//       recipient: {
//         wallet: undefined,
//         ata: undefined,
//       },
//       amount: undefined,
//       accounts: [],
//     },
//     {
//       actionCode: ACTION_TYPES.paymentAction.code,
//       instruction: '',
//       program: '',
//       token: { mint: SOL_MINT.toString(), ata: undefined },
//       recipient: {
//         wallet: undefined,
//         ata: undefined,
//       },
//       amount: undefined,
//       accounts: [],
//     },
//   ],
// };

// export const PAYMENT_TEMPLATE: SnowflakeTemplate<PaymentActionType> = {
//   name: 'Send fund from safe',
//   triggerType: TriggerType.None,
//   retryWindow: RETRY_WINDOW,
//   canAddAction: false,
//   showTrigger: false,
//   actions: [
//     {
//       actionCode: ACTION_TYPES.paymentAction.code,
//       instruction: '',
//       program: '',
//       token: { mint: SOL_MINT.toString(), ata: undefined },
//       recipient: {
//         wallet: undefined,
//         ata: undefined,
//       },
//       amount: 0,
//       accounts: [],
//     },
//   ],
// };

// export const SAMPLE_PROGRAM_CONDITION_TEMPLATE: SnowflakeTemplate<{}> = {
//   name: 'A sample program condition flow',
//   retryWindow: RETRY_WINDOW,
//   triggerType: TriggerType.ProgramCondition,
//   cron: defaultCron,
//   recurring: RecurringUIOption.No,
//   remainingRuns: 2,
//   actions: [
//     {
//       name: 'custom',
//       actionCode: ACTION_TYPES.customAction.code,
//       instruction: '74b89fceb3e0b22a',
//       program: 'ETwBdF9X2eABzmKmpT3ZFYyUtmve7UWWgzbERAyd4gAC',
//       accounts: [
//         {
//           pubkey: '5jo4Lh2Z9FGQ87sDhUBwZjNZdL15MwdeT5WUXKfwFSZY',
//           isSigner: false,
//           isWritable: false,
//         },
//       ],
//     },
//   ],
// };

// export enum TEMPLATE {
//   blank = 'blank',
//   deposit = 'deposit',
//   withdraw = 'withdraw',
//   payment = 'payment',
//   bulkPayment = 'bulkPayment',
//   recurringPayment = 'recurringPayment',
//   sampleProgramConditionFlow = 'sampleProgramConditionFlow',
//   oneOffScheduledCustomAction = 'oneOffScheduledCustomAction',
//   orcaDCA = 'orcaDCA',
//   pythOracleTrigger = 'pythOracleTrigger',
// }

// const DEVNET_FLOW_TEMPLATES = {
//   [TEMPLATE.blank]: BLANK_TEMPLATE,
//   [TEMPLATE.recurringPayment]: {
//     name: 'Recurring Payment',
//     retryWindow: RETRY_WINDOW,
//     triggerType: TriggerType.Time,
//     cron: '* * * * *',
//     recurring: RecurringUIOption.Yes,
//     remainingRuns: 2,
//     actions: [
//       {
//         actionCode: ACTION_TYPES.paymentAction.code,
//         instruction: '',
//         program: '',
//         token: { mint: SOL_MINT.toString(), ata: undefined },
//         recipient: {
//           wallet: undefined,
//           ata: undefined,
//         },
//         amount: 0,
//         accounts: [],
//       },
//     ],
//   },
//   [TEMPLATE.sampleProgramConditionFlow]: SAMPLE_PROGRAM_CONDITION_TEMPLATE,
//   [TEMPLATE.oneOffScheduledCustomAction]: {
//     name: 'A once-off time scheduled automation',
//     retryWindow: RETRY_WINDOW,
//     triggerType: TriggerType.Time,
//     cron: defaultCron,
//     recurring: RecurringUIOption.No,
//     nextExecutionTime: defaultScheduleTime,
//     remainingRuns: -999,
//     actions: [
//       {
//         name: 'custom',
//         actionCode: ACTION_TYPES.customAction.code,
//         instruction: '74b89fceb3e0b22a',
//         program: 'ETwBdF9X2eABzmKmpT3ZFYyUtmve7UWWgzbERAyd4gAC',
//         accounts: [
//           {
//             pubkey: '5jo4Lh2Z9FGQ87sDhUBwZjNZdL15MwdeT5WUXKfwFSZY',
//             isSigner: false,
//             isWritable: false,
//           },
//         ],
//       },
//     ],
//   },
//   [TEMPLATE.orcaDCA]: {
//     name: 'Orca Swap',
//     retryWindow: RETRY_WINDOW,
//     triggerType: TriggerType.None,
//     // cron: '0 8 * * *',
//     // recurring: RecurringUIOption.Yes,
//     // remainingRuns: 5,
//     actions: [
//       {
//         name: 'orca',
//         actionCode: ACTION_TYPES.orcaSwapAction.code,
//         amountIn: 10,
//       },
//     ],
//   },
//   [TEMPLATE.pythOracleTrigger]: {
//     name: 'Pyth oracle price triggerred action',
//     retryWindow: RETRY_WINDOW,
//     triggerType: TriggerType.ProgramCondition,
//     cron: defaultCron,
//     recurring: RecurringUIOption.No,
//     remainingRuns: 1,
//     actions: [
//       {
//         name: 'pyth',
//         actionCode: ACTION_TYPES.priceCheckAction.code,
//         priceAccount: 'A1WttWF7X3Rg6ZRpB2YQUFHCRh1kiXV8sKKLV3S9neJV',
//         condition: 1,
//         targetPrice: 6.5,
//       },
//     ],
//   },
// };

// const MAINNET_FLOW_TEMPLATES = {
//   [TEMPLATE.blank]: BLANK_TEMPLATE as SnowflakeTemplate<{}>,
//   [TEMPLATE.recurringPayment]: {
//     name: 'Recurring Payment',
//     retryWindow: RETRY_WINDOW,
//     triggerType: TriggerType.Time,
//     cron: '* * * * *',
//     recurring: 'Yes',
//     remainingRuns: 2,
//     actions: [],
//   } as SnowflakeTemplate<{}>,
//   [TEMPLATE.sampleProgramConditionFlow]: {
//     name: 'A sample program condition flow',
//     retryWindow: RETRY_WINDOW,
//     triggerType: TriggerType.ProgramCondition,
//     cron: defaultCron,
//     recurring: RecurringUIOption.No,
//     remainingRuns: 2,
//     actions: [
//       {
//         name: 'custom',
//         actionCode: ACTION_TYPES.customAction.code,
//         instruction: '74b89fceb3e0b22a',
//         program: 'ETwBdF9X2eABzmKmpT3ZFYyUtmve7UWWgzbERAyd4gAC',
//         accounts: [
//           {
//             pubkey: 'G8jGSAB6K5hQwTu6JEc9daTq3KJ9GNp189T2ipxQsaeb',
//             isSigner: false,
//             isWritable: false,
//           },
//         ],
//       },
//     ],
//   } as SnowflakeTemplate<{}>,
//   [TEMPLATE.oneOffScheduledCustomAction]: {
//     name: 'A once-off time scheduled automation',
//     retryWindow: RETRY_WINDOW,
//     triggerType: TriggerType.Time,
//     cron: defaultCron,
//     recurring: RecurringUIOption.No,
//     nextExecutionTime: defaultScheduleTime,
//     remainingRuns: -999,
//     actions: [
//       {
//         name: 'custom',
//         actionCode: ACTION_TYPES.customAction.code,
//         instruction: '74b89fceb3e0b22a',
//         program: 'ETwBdF9X2eABzmKmpT3ZFYyUtmve7UWWgzbERAyd4gAC',
//         accounts: [
//           {
//             pubkey: 'G8jGSAB6K5hQwTu6JEc9daTq3KJ9GNp189T2ipxQsaeb',
//             isSigner: false,
//             isWritable: false,
//           },
//         ],
//       },
//     ],
//   } as SnowflakeTemplate<{}>,
//   [TEMPLATE.orcaDCA]: {
//     name: 'Dollar cost average swap on Orca',
//     retryWindow: RETRY_WINDOW,
//     triggerType: TriggerType.Time,
//     cron: '0 8 * * *',
//     recurring: RecurringUIOption.Yes,
//     remainingRuns: 5,
//     actions: [
//       {
//         name: 'orca',
//         actionCode: ACTION_TYPES.orcaSwapAction.code,
//         amountIn: 10,
//       },
//     ],
//   } as SnowflakeTemplate<OrcaSwapActionType>,
//   [TEMPLATE.pythOracleTrigger]: {
//     name: 'Sample Pyth oracle price condition triggerred automation',
//     retryWindow: RETRY_WINDOW,
//     triggerType: TriggerType.ProgramCondition,
//     cron: defaultCron,
//     recurring: RecurringUIOption.No,
//     remainingRuns: 1,
//     actions: [
//       {
//         name: 'pyth',
//         actionCode: ACTION_TYPES.priceCheckAction.code,
//         priceAccount: 'H6ARHf6YXhGYeQfUzQNGk6rDNnLBQKrenN712K4AQJEG',
//         condition: 1,
//         targetPrice: 6.5,
//       },
//       {
//         name: 'orca',
//         actionCode: ACTION_TYPES.orcaSwapAction.code,
//         amountIn: 10,
//       },
//     ],
//   } as SnowflakeTemplate<PythOracleTriggerActionType>,
// };

// const DEFAULT_TEMPLATES = {
//   [TEMPLATE.blank]: BLANK_TEMPLATE,
//   [TEMPLATE.sampleProgramConditionFlow]: SAMPLE_PROGRAM_CONDITION_TEMPLATE,
//   [TEMPLATE.withdraw]: WITHDRAW_TEMPLATE,
//   [TEMPLATE.payment]: PAYMENT_TEMPLATE,
//   [TEMPLATE.bulkPayment]: BULK_PAYMENT_TEMPLATE,
//   [TEMPLATE.recurringPayment]: RECURRING_PAYMENT_TEMPLATE
// };

// const LOCALNET_FLOW_TEMPLATES = {};

// export const FLOW_TEMPLATES = {
//   [ENV.devnet]: Object.assign(DEVNET_FLOW_TEMPLATES, DEFAULT_TEMPLATES),
//   [ENV.localnet]: Object.assign(LOCALNET_FLOW_TEMPLATES, DEFAULT_TEMPLATES),
//   [ENV.mainnet]: Object.assign(MAINNET_FLOW_TEMPLATES, DEFAULT_TEMPLATES),
//   [ENV.localnet]: Object.assign(LOCALNET_FLOW_TEMPLATES, DEFAULT_TEMPLATES),
// };
