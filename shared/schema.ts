import { pgTable, text, serial, integer, boolean, decimal, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Trade status enum
export const tradeStatusEnum = z.enum(['open', 'running', 'closed', 'cancelled']);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  apiKey: text("api_key"),
  apiSecret: text("api_secret"),
  apiPassphrase: text("api_passphrase"),
  balance: decimal("balance", { precision: 18, scale: 8 }),
  balanceUSD: decimal("balance_usd", { precision: 18, scale: 2 }),
});

export const trades = pgTable("trades", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  lnMarketsId: text("ln_markets_id"),
  type: text("type").notNull(), // 'futures' | 'options'
  side: text("side").notNull(), // 'buy' | 'sell'
  orderType: text("order_type").notNull(), // 'market' | 'limit'
  status: text("status").notNull(), // 'open' | 'running' | 'closed' | 'cancelled'
  entryPrice: decimal("entry_price", { precision: 18, scale: 2 }),
  exitPrice: decimal("exit_price", { precision: 18, scale: 2 }),
  margin: integer("margin"), // in satoshis
  leverage: decimal("leverage", { precision: 5, scale: 2 }),
  quantity: decimal("quantity", { precision: 18, scale: 8 }),
  takeProfit: decimal("take_profit", { precision: 18, scale: 2 }),
  stopLoss: decimal("stop_loss", { precision: 18, scale: 2 }),
  pnl: decimal("pnl", { precision: 18, scale: 8 }),
  pnlUSD: decimal("pnl_usd", { precision: 18, scale: 2 }),
  fee: integer("fee"), // in satoshis
  liquidationPrice: decimal("liquidation_price", { precision: 18, scale: 2 }),
  instrumentName: text("instrument_name"), // for options
  settlement: text("settlement"), // for options: 'physical' | 'cash'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const marketData = pgTable("market_data", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull().unique(), // 'BTC/USD'
  lastPrice: decimal("last_price", { precision: 18, scale: 2 }),
  markPrice: decimal("mark_price", { precision: 18, scale: 2 }),
  indexPrice: decimal("index_price", { precision: 18, scale: 2 }),
  high24h: decimal("high_24h", { precision: 18, scale: 2 }),
  low24h: decimal("low_24h", { precision: 18, scale: 2 }),
  volume24h: decimal("volume_24h", { precision: 18, scale: 8 }),
  volumeUSD: decimal("volume_usd", { precision: 18, scale: 2 }),
  openInterest: decimal("open_interest", { precision: 18, scale: 8 }),
  fundingRate: decimal("funding_rate", { precision: 10, scale: 6 }),
  nextFundingTime: timestamp("next_funding_time"),
  priceChange24h: decimal("price_change_24h", { precision: 5, scale: 2 }),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const deposits = pgTable("deposits", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  lnMarketsId: text("ln_markets_id"), // LN Markets deposit ID
  address: text("address").notNull(), // Lightning Network address
  amount: integer("amount"), // requested amount in satoshis
  receivedAmount: integer("received_amount"), // actual received amount in satoshis
  status: text("status").notNull(), // 'pending' | 'confirmed' | 'failed' | 'expired'
  txHash: text("tx_hash"), // transaction hash if applicable
  confirmations: integer("confirmations").default(0),
  expiresAt: timestamp("expires_at"), // when the address expires
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  apiKey: true,
  apiSecret: true,
  apiPassphrase: true,
});

export const insertTradeSchema = createInsertSchema(trades).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
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

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertTrade = z.infer<typeof insertTradeSchema>;
export type Trade = typeof trades.$inferSelect;
export type InsertMarketData = z.infer<typeof insertMarketDataSchema>;
export type MarketData = typeof marketData.$inferSelect;
export type InsertDeposit = z.infer<typeof insertDepositSchema>;
export type Deposit = typeof deposits.$inferSelect;

export type TradeStatus = z.infer<typeof tradeStatusEnum>;

// Trade status transition validation
export function validateTradeStatusTransition(currentStatus: string | null, newStatus: TradeStatus): boolean {
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
export const updateTradeStatusSchema = z.object({
  status: tradeStatusEnum,
  currentStatus: z.string().optional(),
}).refine((data) => {
  return validateTradeStatusTransition(data.currentStatus ?? null, data.status);
}, {
  message: "Cancelled status can only be applied to trades that were in 'open' state",
  path: ['status'],
});
