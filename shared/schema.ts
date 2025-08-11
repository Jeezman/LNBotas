import {
  pgTable,
  text,
  serial,
  integer,
  decimal,
  timestamp,
} from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

// Trade status enum
export const tradeStatusEnum = z.enum([
  'open',
  'running',
  'closed',
  'cancelled',
]);

// Scheduled trade trigger type enum
export const scheduledTradeTriggerTypeEnum = z.enum([
  'date',
  'price_range',
  'price_percentage',
]);

// Scheduled trade status enum
export const scheduledTradeStatusEnum = z.enum([
  'pending',
  'triggered',
  'cancelled',
  'failed',
]);

// Swap status enum
export const swapStatusEnum = z.enum([
  'pending',
  'completed',
  'failed',
  'cancelled',
]);

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  password: text('password').notNull(),
  apiKey: text('api_key'),
  apiSecret: text('api_secret'),
  apiPassphrase: text('api_passphrase'),
  balance: decimal('balance', { precision: 18, scale: 8 }),
  balanceUSD: decimal('balance_usd', { precision: 18, scale: 2 }),
});

export const trades = pgTable('trades', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  lnMarketsId: text('ln_markets_id'),
  type: text('type').notNull(), // 'futures' | 'options'
  side: text('side').notNull(), // 'buy' | 'sell'
  orderType: text('order_type').notNull(), // 'market' | 'limit'
  status: text('status').notNull(), // 'open' | 'running' | 'closed' | 'cancelled'
  entryPrice: decimal('entry_price', { precision: 18, scale: 2 }),
  exitPrice: decimal('exit_price', { precision: 18, scale: 2 }),
  limitPrice: decimal('limit_price', { precision: 18, scale: 2 }),
  margin: integer('margin'), // in satoshis
  leverage: decimal('leverage', { precision: 5, scale: 2 }),
  quantity: decimal('quantity', { precision: 18, scale: 8 }),
  takeProfit: decimal('take_profit', { precision: 18, scale: 2 }),
  stopLoss: decimal('stop_loss', { precision: 18, scale: 2 }),
  pnl: decimal('pnl', { precision: 18, scale: 8 }),
  pnlUSD: decimal('pnl_usd', { precision: 18, scale: 2 }),
  fee: integer('fee'), // in satoshis
  liquidationPrice: decimal('liquidation_price', { precision: 18, scale: 2 }),
  instrumentName: text('instrument_name'), // for options
  settlement: text('settlement'), // for options: 'physical' | 'cash'
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const marketData = pgTable('market_data', {
  id: serial('id').primaryKey(),
  symbol: text('symbol').notNull().unique(), // 'BTC/USD'
  lastPrice: decimal('last_price', { precision: 18, scale: 2 }),
  markPrice: decimal('mark_price', { precision: 18, scale: 2 }),
  indexPrice: decimal('index_price', { precision: 18, scale: 2 }),
  high24h: decimal('high_24h', { precision: 18, scale: 2 }),
  low24h: decimal('low_24h', { precision: 18, scale: 2 }),
  volume24h: decimal('volume_24h', { precision: 18, scale: 8 }),
  volumeUSD: decimal('volume_usd', { precision: 18, scale: 2 }),
  openInterest: decimal('open_interest', { precision: 18, scale: 8 }),
  fundingRate: decimal('funding_rate', { precision: 10, scale: 6 }),
  nextFundingTime: timestamp('next_funding_time'),
  priceChange24h: decimal('price_change_24h', { precision: 5, scale: 2 }),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const deposits = pgTable('deposits', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  lnMarketsId: text('ln_markets_id'), // LN Markets deposit ID
  address: text('address').notNull(), // Lightning Network address
  amount: integer('amount'), // requested amount in satoshis
  receivedAmount: integer('received_amount'), // actual received amount in satoshis
  status: text('status').notNull(), // 'pending' | 'confirmed' | 'failed' | 'expired'
  txHash: text('tx_hash'), // transaction hash if applicable
  confirmations: integer('confirmations').default(0),
  expiresAt: timestamp('expires_at'), // when the address expires
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const withdrawals = pgTable('withdrawals', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  lnMarketsId: text('ln_markets_id'), // LN Markets withdrawal ID
  type: text('type').notNull().default('lightning'), // 'lightning' | 'usd'
  invoice: text('invoice').notNull(), // Lightning invoice
  paymentHash: text('payment_hash'), // Payment hash from LN
  amount: integer('amount').notNull(), // amount in satoshis
  amountUsd: integer('amount_usd'), // amount in USD cents (for USD withdrawals)
  fee: integer('fee').default(0), // transaction fee in satoshis
  swapFee: integer('swap_fee').default(0), // swap fee for USD withdrawals
  exchangeRate: decimal('exchange_rate', { precision: 18, scale: 8 }), // BTC/USD rate used
  status: text('status').notNull().default('pending'), // 'pending' | 'completed' | 'failed'
  errorMessage: text('error_message'), // error message if failed
  completedAt: timestamp('completed_at'), // when withdrawal was completed
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const scheduledTrades = pgTable('scheduled_trades', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  triggerType: text('trigger_type').notNull(), // 'date' | 'price_range' | 'price_percentage'
  scheduledTime: timestamp('scheduled_time'), // for date triggers
  targetPriceLow: decimal('target_price_low', { precision: 18, scale: 2 }), // for price range triggers
  targetPriceHigh: decimal('target_price_high', { precision: 18, scale: 2 }), // for price range triggers
  basePriceSnapshot: decimal('base_price_snapshot', {
    precision: 18,
    scale: 2,
  }), // for percentage triggers
  pricePercentage: decimal('price_percentage', { precision: 5, scale: 2 }), // for percentage triggers
  status: text('status').notNull().default('pending'), // 'pending' | 'triggered' | 'cancelled' | 'failed'

  // Trade details (same as regular trades)
  type: text('type').notNull(), // 'futures' | 'options'
  side: text('side').notNull(), // 'buy' | 'sell'
  orderType: text('order_type').notNull(), // 'market' | 'limit'
  margin: integer('margin'), // in satoshis
  leverage: decimal('leverage', { precision: 5, scale: 2 }),
  quantity: decimal('quantity', { precision: 18, scale: 8 }),
  takeProfit: decimal('take_profit', { precision: 18, scale: 2 }),
  stopLoss: decimal('stop_loss', { precision: 18, scale: 2 }),
  instrumentName: text('instrument_name'), // for options
  settlement: text('settlement'), // for options: 'physical' | 'cash'

  // Execution tracking
  executedTradeId: integer('executed_trade_id'), // ID of the trade created when triggered
  errorMessage: text('error_message'),
  name: text('name'), // optional name for the scheduled trade
  description: text('description'), // optional description
  lastCheckedAt: timestamp('last_checked_at'), // when the trigger was last checked
  executedAt: timestamp('executed_at'), // when the trade was executed
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const swaps = pgTable('swaps', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  lnMarketsId: text('ln_markets_id'), // LN Markets swap ID if applicable
  fromAsset: text('from_asset').notNull(), // 'BTC' | 'USD'
  toAsset: text('to_asset').notNull(), // 'BTC' | 'USD'
  fromAmount: decimal('from_amount', { precision: 20, scale: 8 }).notNull(), // Amount in BTC or USD (decimal values)
  toAmount: decimal('to_amount', { precision: 20, scale: 8 }).notNull(), // Amount in BTC or USD (decimal values)
  exchangeRate: decimal('exchange_rate', { precision: 18, scale: 8 }), // Rate at execution
  fee: decimal('fee', { precision: 20, scale: 8 }).default('0'), // Fee in BTC or USD (decimal values)
  status: text('status').notNull().default('pending'), // 'pending' | 'completed' | 'failed' | 'cancelled'
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Scheduled swap schedule type enum
export const scheduledSwapScheduleTypeEnum = z.enum([
  'calendar',
  'recurring',
  'market_condition',
]);

// Scheduled swap status enum
export const scheduledSwapStatusEnum = z.enum([
  'active',
  'paused',
  'completed',
  'cancelled',
]);

// Swap execution status enum
export const swapExecutionStatusEnum = z.enum([
  'success',
  'failed',
  'cancelled',
]);

export const scheduledSwaps = pgTable('scheduled_swaps', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  scheduleType: text('schedule_type').notNull(), // 'calendar' | 'recurring' | 'market_condition'
  swapDirection: text('swap_direction').notNull(), // 'btc_to_usd' | 'usd_to_btc'
  amount: decimal('amount', { precision: 20, scale: 8 }).notNull(), // Amount to swap
  triggerConfig: text('trigger_config').notNull(), // JSON string with trigger configuration
  status: text('status').notNull().default('active'), // 'active' | 'paused' | 'completed' | 'cancelled'
  name: text('name'), // Optional name for the schedule
  description: text('description'), // Optional description
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const swapExecutions = pgTable('swap_executions', {
  id: serial('id').primaryKey(),
  scheduledSwapId: integer('scheduled_swap_id').notNull(),
  swapId: integer('swap_id'), // Links to successful swap record
  executionTime: timestamp('execution_time').notNull(),
  status: text('status').notNull(), // 'success' | 'failed' | 'cancelled'
  failureReason: text('failure_reason'), // Only populated if status is 'failed'
  createdAt: timestamp('created_at').defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  apiKey: true,
  apiSecret: true,
  apiPassphrase: true,
});

export const insertTradeSchema = createInsertSchema(trades)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    status: tradeStatusEnum,
  });

export const insertMarketDataSchema = createInsertSchema(marketData).omit({
  id: true,
  updatedAt: true,
});

export const insertDepositSchema = createInsertSchema(deposits).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWithdrawalSchema = createInsertSchema(withdrawals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
});

export const insertScheduledTradeSchema = createInsertSchema(scheduledTrades)
  .omit({
    id: true,
    status: true,
    executedTradeId: true,
    errorMessage: true,
    name: true,
    description: true,
    lastCheckedAt: true,
    executedAt: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    triggerType: scheduledTradeTriggerTypeEnum,
  });

export const insertSwapSchema = createInsertSchema(swaps)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    status: swapStatusEnum,
  });

export const insertScheduledSwapSchema = createInsertSchema(scheduledSwaps)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    scheduleType: scheduledSwapScheduleTypeEnum,
    status: scheduledSwapStatusEnum,
  });

export const insertSwapExecutionSchema = createInsertSchema(swapExecutions)
  .omit({
    id: true,
    createdAt: true,
  })
  .extend({
    status: swapExecutionStatusEnum,
  });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertTrade = z.infer<typeof insertTradeSchema>;
export type Trade = typeof trades.$inferSelect;
export type InsertMarketData = z.infer<typeof insertMarketDataSchema>;
export type MarketData = typeof marketData.$inferSelect;
export type InsertDeposit = z.infer<typeof insertDepositSchema>;
export type Deposit = typeof deposits.$inferSelect;
export type InsertWithdrawal = z.infer<typeof insertWithdrawalSchema>;
export type Withdrawal = typeof withdrawals.$inferSelect;

export type InsertScheduledTrade = z.infer<typeof insertScheduledTradeSchema>;
export type ScheduledTrade = typeof scheduledTrades.$inferSelect;
export type ScheduledTradeTriggerType = z.infer<
  typeof scheduledTradeTriggerTypeEnum
>;
export type ScheduledTradeStatus = z.infer<typeof scheduledTradeStatusEnum>;

export type InsertSwap = z.infer<typeof insertSwapSchema>;
export type Swap = typeof swaps.$inferSelect;
export type SwapStatus = z.infer<typeof swapStatusEnum>;

export type InsertScheduledSwap = z.infer<typeof insertScheduledSwapSchema>;
export type ScheduledSwap = typeof scheduledSwaps.$inferSelect;
export type ScheduledSwapScheduleType = z.infer<typeof scheduledSwapScheduleTypeEnum>;
export type ScheduledSwapStatus = z.infer<typeof scheduledSwapStatusEnum>;

export type InsertSwapExecution = z.infer<typeof insertSwapExecutionSchema>;
export type SwapExecution = typeof swapExecutions.$inferSelect;
export type SwapExecutionStatus = z.infer<typeof swapExecutionStatusEnum>;

// Trigger value schemas for different trigger types
export const dateTriggerSchema = z.object({
  dateTime: z.string(), // ISO string
});

export const priceRangeTriggerSchema = z.object({
  minPrice: z.number(),
  maxPrice: z.number(),
});

export const pricePercentageTriggerSchema = z.object({
  percentage: z.number(), // e.g., 5 for +5%, -5 for -5%
  basePrice: z.number(), // price when scheduled
});

// Trigger schemas for scheduled swaps
export const calendarTriggerSchema = z.object({
  dateTime: z.string(), // ISO string for specific date/time
  timezone: z.string().optional(), // Optional timezone
});

export const recurringTriggerSchema = z.object({
  interval: z.enum(['daily', 'weekly', 'monthly']),
  dayOfWeek: z.number().min(0).max(6).optional(), // For weekly (0 = Sunday)
  dayOfMonth: z.number().min(1).max(31).optional(), // For monthly
  hour: z.number().min(0).max(23).default(12), // Hour of day (24h format)
  minute: z.number().min(0).max(59).default(0), // Minute of hour
  startDate: z.string().optional(), // When to start the recurring schedule
  endDate: z.string().optional(), // When to end the recurring schedule
});

export const marketConditionTriggerSchema = z.object({
  condition: z.enum(['above', 'below', 'between']),
  targetPrice: z.number().optional(), // For 'above' or 'below'
  minPrice: z.number().optional(), // For 'between'
  maxPrice: z.number().optional(), // For 'between'
  percentage: z.number().optional(), // Alternative: percentage change from current price
  basePrice: z.number().optional(), // Base price for percentage calculation
});

export type TradeStatus = z.infer<typeof tradeStatusEnum>;

// Trade status transition validation
export function validateTradeStatusTransition(
  currentStatus: string | null,
  newStatus: TradeStatus
): boolean {
  // If no current status (new trade), allow any status
  if (!currentStatus) {
    return true;
  }

  // Cancelled status can only be applied to trades that were in 'open' state
  if (newStatus === 'cancelled' && currentStatus !== 'open') {
    return false;
  }

  return true;
}

// Schema for updating trade status with validation
export const updateTradeStatusSchema = z
  .object({
    status: tradeStatusEnum,
    currentStatus: z.string().optional(),
  })
  .refine(
    (data) => {
      return validateTradeStatusTransition(
        data.currentStatus ?? null,
        data.status
      );
    },
    {
      message:
        "Cancelled status can only be applied to trades that were in 'open' state",
      path: ['status'],
    }
  );
