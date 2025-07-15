-- Add trigger_value column to scheduled_trades table
ALTER TABLE scheduled_trades ADD COLUMN IF NOT EXISTS trigger_value TEXT;

-- Update existing records to have a default trigger_value
UPDATE scheduled_trades 
SET trigger_value = '{}' 
WHERE trigger_value IS NULL; 