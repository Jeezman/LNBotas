-- Create withdrawals table for tracking Lightning and USD withdrawals
CREATE TABLE IF NOT EXISTS withdrawals (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  ln_markets_id TEXT, -- LN Markets withdrawal ID
  type TEXT NOT NULL DEFAULT 'lightning', -- 'lightning' | 'usd'
  invoice TEXT NOT NULL, -- Lightning invoice
  payment_hash TEXT, -- Payment hash from LN
  amount INTEGER NOT NULL, -- amount in satoshis
  amount_usd INTEGER, -- amount in USD cents (for USD withdrawals)
  fee INTEGER DEFAULT 0, -- transaction fee in satoshis
  swap_fee INTEGER DEFAULT 0, -- swap fee for USD withdrawals
  exchange_rate DECIMAL(18, 8), -- BTC/USD rate used
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'completed' | 'failed'
  error_message TEXT, -- error message if failed
  completed_at TIMESTAMP, -- when withdrawal was completed
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id ON withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_created_at ON withdrawals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_withdrawals_ln_markets_id ON withdrawals(ln_markets_id);

-- Add trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_withdrawals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_withdrawals_updated_at_trigger
  BEFORE UPDATE ON withdrawals
  FOR EACH ROW
  EXECUTE FUNCTION update_withdrawals_updated_at();

-- Add comment to table
COMMENT ON TABLE withdrawals IS 'Tracks all withdrawal transactions including Lightning and USD withdrawals';
COMMENT ON COLUMN withdrawals.type IS 'Type of withdrawal: lightning for direct BTC withdrawal, usd for USD->BTC swap and withdrawal';
COMMENT ON COLUMN withdrawals.amount IS 'Withdrawal amount in satoshis';
COMMENT ON COLUMN withdrawals.amount_usd IS 'Original USD amount in cents (only for USD withdrawals)';
COMMENT ON COLUMN withdrawals.exchange_rate IS 'BTC/USD exchange rate used for USD withdrawals';