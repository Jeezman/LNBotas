CREATE TABLE "deposits" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"ln_markets_id" text,
	"address" text NOT NULL,
	"amount" integer,
	"received_amount" integer,
	"status" text NOT NULL,
	"tx_hash" text,
	"confirmations" integer DEFAULT 0,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "market_data" (
	"id" serial PRIMARY KEY NOT NULL,
	"symbol" text NOT NULL,
	"last_price" numeric(18, 2),
	"mark_price" numeric(18, 2),
	"index_price" numeric(18, 2),
	"high_24h" numeric(18, 2),
	"low_24h" numeric(18, 2),
	"volume_24h" numeric(18, 8),
	"volume_usd" numeric(18, 2),
	"open_interest" numeric(18, 8),
	"funding_rate" numeric(10, 6),
	"next_funding_time" timestamp,
	"price_change_24h" numeric(5, 2),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "market_data_symbol_unique" UNIQUE("symbol")
);
--> statement-breakpoint
CREATE TABLE "scheduled_trades" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"trigger_type" text NOT NULL,
	"trigger_value" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"type" text NOT NULL,
	"side" text NOT NULL,
	"order_type" text NOT NULL,
	"margin" integer,
	"leverage" numeric(5, 2),
	"quantity" numeric(18, 8),
	"take_profit" numeric(18, 2),
	"stop_loss" numeric(18, 2),
	"instrument_name" text,
	"settlement" text,
	"triggered_at" timestamp,
	"executed_trade_id" integer,
	"error_message" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "trades" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"ln_markets_id" text,
	"type" text NOT NULL,
	"side" text NOT NULL,
	"order_type" text NOT NULL,
	"status" text NOT NULL,
	"entry_price" numeric(18, 2),
	"exit_price" numeric(18, 2),
	"margin" integer,
	"leverage" numeric(5, 2),
	"quantity" numeric(18, 8),
	"take_profit" numeric(18, 2),
	"stop_loss" numeric(18, 2),
	"pnl" numeric(18, 8),
	"pnl_usd" numeric(18, 2),
	"fee" integer,
	"liquidation_price" numeric(18, 2),
	"instrument_name" text,
	"settlement" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"api_key" text,
	"api_secret" text,
	"api_passphrase" text,
	"balance" numeric(18, 8),
	"balance_usd" numeric(18, 2),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
