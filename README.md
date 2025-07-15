# LNBotas - Lightning Network Trading Bot

A comprehensive trading bot for Lightning Network markets with automated trading capabilities.

## Features

### Scheduled Trading

LNBotas now supports scheduled trading with three different trigger types:

#### 1. Date/Time Trigger

Schedule trades to execute at a specific date and time.

- Format: `2025-07-28 11:30 PM`
- Example: Set a trade to execute on July 28th, 2025 at 11:30 PM

#### 2. Price Range Trigger

Schedule trades to execute when the price falls within a specific range.

- Format: `115000 - 116000`
- Example: Execute when BTC price is between $115,000 and $116,000

#### 3. Price Percentage Trigger

Schedule trades to execute when the price changes by a specific percentage from the current price.

- Format: `+5` or `-5`
- Example: Execute when BTC price increases by 5% or decreases by 5% from current price

### How to Use Scheduled Trading

1. **Navigate to the Dashboard**: The scheduled trading interface is available on the main dashboard.

2. **Create a Scheduled Trade**:

   - Select your trigger type (Date, Price Range, or Price Percentage)
   - Configure the trigger parameters
   - Set up your trade details (margin, leverage, side, etc.)
   - Click "Schedule Trade"

3. **Monitor Scheduled Trades**:

   - View all your scheduled trades in the "Scheduled Trades" section
   - See the status of each trade (pending, triggered, cancelled, failed)
   - Delete pending trades if needed

4. **Automatic Execution**:
   - The system checks for triggered conditions every minute
   - When conditions are met, trades are automatically executed
   - You'll receive notifications when trades are triggered

### Trade Types Supported

- **Futures Trading**: Long and short positions with leverage
- **Options Trading**: Call and put options (coming soon)

### Risk Management

- Set take profit and stop loss levels
- Configure leverage settings
- Monitor position sizes and liquidation prices

## Installation

```bash
npm install
npm run dev
```

## Configuration

1. Set up your LN Markets API credentials in the settings
2. Configure your trading parameters
3. Start scheduling trades

## API Endpoints

### Scheduled Trades

- `GET /api/scheduled-trades/:userId` - Get user's scheduled trades
- `POST /api/scheduled-trades` - Create a new scheduled trade
- `PUT /api/scheduled-trades/:id` - Update a scheduled trade
- `DELETE /api/scheduled-trades/:id` - Delete a scheduled trade

## Security

- All API credentials are encrypted
- Scheduled trades are validated before execution
- Failed trades are logged with error messages

## Support

For issues or questions, please check the documentation or create an issue in the repository.
