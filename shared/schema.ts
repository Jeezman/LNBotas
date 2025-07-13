import { pgTable, text, serial, integer, boolean, decimal, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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
  status: text("status").notNull(), // 'open' | 'closed' | 'pending' | 'cancelled'
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
});

export const insertMarketDataSchema = createInsertSchema(marketData).omit({
  id: true,
  updatedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertTrade = z.infer<typeof insertTradeSchema>;
export type Trade = typeof trades.$inferSelect;
export type InsertMarketData = z.infer<typeof insertMarketDataSchema>;
export type MarketData = typeof marketData.$inferSelect;
