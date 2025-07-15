import { pgTable, serial, integer, text, timestamp, unique, numeric } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const deposits = pgTable("deposits", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	lnMarketsId: text("ln_markets_id"),
	address: text().notNull(),
	amount: integer(),
	receivedAmount: integer("received_amount"),
	status: text().notNull(),
	txHash: text("tx_hash"),
	confirmations: integer().default(0),
	expiresAt: timestamp("expires_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const marketData = pgTable("market_data", {
	id: serial().primaryKey().notNull(),
	symbol: text().notNull(),
	lastPrice: numeric("last_price", { precision: 18, scale:  2 }),
	markPrice: numeric("mark_price", { precision: 18, scale:  2 }),
	indexPrice: numeric("index_price", { precision: 18, scale:  2 }),
	high24H: numeric("high_24h", { precision: 18, scale:  2 }),
	low24H: numeric("low_24h", { precision: 18, scale:  2 }),
	volume24H: numeric("volume_24h", { precision: 18, scale:  8 }),
	volumeUsd: numeric("volume_usd", { precision: 18, scale:  2 }),
	openInterest: numeric("open_interest", { precision: 18, scale:  8 }),
	fundingRate: numeric("funding_rate", { precision: 10, scale:  6 }),
	nextFundingTime: timestamp("next_funding_time", { mode: 'string' }),
	priceChange24H: numeric("price_change_24h", { precision: 5, scale:  2 }),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("market_data_symbol_unique").on(table.symbol),
]);

export const trades = pgTable("trades", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	lnMarketsId: text("ln_markets_id"),
	type: text().notNull(),
	side: text().notNull(),
	orderType: text("order_type").notNull(),
	status: text().notNull(),
	entryPrice: numeric("entry_price", { precision: 18, scale:  2 }),
	exitPrice: numeric("exit_price", { precision: 18, scale:  2 }),
	margin: integer(),
	leverage: numeric({ precision: 5, scale:  2 }),
	quantity: numeric({ precision: 18, scale:  8 }),
	takeProfit: numeric("take_profit", { precision: 18, scale:  2 }),
	stopLoss: numeric("stop_loss", { precision: 18, scale:  2 }),
	pnl: numeric({ precision: 18, scale:  8 }),
	pnlUsd: numeric("pnl_usd", { precision: 18, scale:  2 }),
	fee: integer(),
	liquidationPrice: numeric("liquidation_price", { precision: 18, scale:  2 }),
	instrumentName: text("instrument_name"),
	settlement: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const users = pgTable("users", {
	id: serial().primaryKey().notNull(),
	username: text().notNull(),
	password: text().notNull(),
	apiKey: text("api_key"),
	apiSecret: text("api_secret"),
	apiPassphrase: text("api_passphrase"),
	balance: numeric({ precision: 18, scale:  8 }),
	balanceUsd: numeric("balance_usd", { precision: 18, scale:  2 }),
}, (table) => [
	unique("users_username_unique").on(table.username),
]);

export const scheduledTrades = pgTable("scheduled_trades", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	triggerType: text("trigger_type").notNull(),
	scheduledTime: timestamp("scheduled_time", { mode: 'string' }),
	targetPriceLow: numeric("target_price_low", { precision: 18, scale:  2 }),
	targetPriceHigh: numeric("target_price_high", { precision: 18, scale:  2 }),
	basePriceSnapshot: numeric("base_price_snapshot", { precision: 18, scale:  2 }),
	pricePercentage: numeric("price_percentage", { precision: 5, scale:  2 }),
	type: text().notNull(),
	side: text().notNull(),
	orderType: text("order_type").notNull(),
	margin: integer(),
	leverage: numeric({ precision: 5, scale:  2 }),
	quantity: numeric({ precision: 18, scale:  8 }),
	takeProfit: numeric("take_profit", { precision: 18, scale:  2 }),
	stopLoss: numeric("stop_loss", { precision: 18, scale:  2 }),
	instrumentName: text("instrument_name"),
	settlement: text(),
	status: text().notNull(),
	executedTradeId: integer("executed_trade_id"),
	errorMessage: text("error_message"),
	name: text(),
	description: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	lastCheckedAt: timestamp("last_checked_at", { mode: 'string' }),
	executedAt: timestamp("executed_at", { mode: 'string' }),
});
