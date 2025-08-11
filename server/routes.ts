import type { Express, Request, Response } from 'express';
import { createServer, type Server } from 'http';
import { storage } from './storage';
import {
  insertTradeSchema,
  insertDepositSchema,
  validateTradeStatusTransition,
  updateTradeStatusSchema,
  type TradeStatus,
  insertScheduledTradeSchema,
  dateTriggerSchema,
  priceRangeTriggerSchema,
  pricePercentageTriggerSchema,
  insertScheduledSwapSchema,
  insertSwapExecutionSchema,
  calendarTriggerSchema,
  recurringTriggerSchema,
  marketConditionTriggerSchema,
} from '@shared/schema';
import {
  createLNMarketsService,
  type MarketTicker,
  type LNMarketsTrade,
} from './services/lnmarkets';
import { z } from 'zod';
import bcrypt from 'bcrypt';

// Enhanced logging utility
function logRequest(req: Request, action: string, details?: any) {
  const timestamp = new Date().toISOString();
  const userInfo = req.body?.userId ? `[User: ${req.body.userId}]` : '';
  console.log(
    `[${timestamp}] ${req.method} ${req.path} ${userInfo} - ${action}`,
    details ? JSON.stringify(details) : ''
  );
}

function logError(req: Request, action: string, error: any) {
  const timestamp = new Date().toISOString();
  const userInfo = req.body?.userId ? `[User: ${req.body.userId}]` : '';
  console.error(
    `[${timestamp}] ERROR ${req.method} ${req.path} ${userInfo} - ${action}:`,
    error.message || error
  );
}

function logSuccess(req: Request, action: string, result?: any) {
  const timestamp = new Date().toISOString();
  const userInfo = req.body?.userId ? `[User: ${req.body.userId}]` : '';
  console.log(
    `[${timestamp}] SUCCESS ${req.method} ${req.path} ${userInfo} - ${action}`,
    result ? `Result: ${JSON.stringify(result)}` : ''
  );
}

async function syncUserBalance(userId: number): Promise<void> {
  try {
    const user = await storage.getUser(userId);
    if (!user || !user.apiKey || !user.apiSecret || !user.apiPassphrase) {
      return;
    }

    const lnMarkets = createLNMarketsService({
      apiKey: user.apiKey,
      secret: user.apiSecret,
      passphrase: user.apiPassphrase,
    });

    const balance = await lnMarkets.getBalance();

    // Get current market data for USD conversion
    const marketData = await storage.getMarketData('BTC/USD');
    const btcPrice = marketData?.lastPrice
      ? parseFloat(marketData.lastPrice)
      : 0;

    await storage.updateUser(userId, {
      balance: balance.balance,
      balanceUSD:
        btcPrice > 0
          ? (parseFloat(balance.balance) * 0.00000001 * btcPrice).toString()
          : '0.00',
    });

    console.log(`Balance synced for user ${userId}: ${balance.balance} BTC`);
  } catch (error) {
    console.error(`Failed to sync balance for user ${userId}:`, error);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Market data endpoints
  app.get('/api/market/ticker', async (req, res) => {
    logRequest(req, 'Fetching market ticker data');
    try {
      // Get latest market data from storage or fetch from LN Markets
      const marketData = await storage.getMarketData('BTC/USD');

      if (!marketData) {
        // If no cached data, return empty state
        return res.json({
          lastPrice: null,
          markPrice: null,
          indexPrice: null,
          high24h: null,
          low24h: null,
          volume24h: null,
          volumeUSD: null,
          openInterest: null,
          fundingRate: null,
          priceChange24h: null,
          nextFundingTime: null,
        });
      }

      logSuccess(req, 'Market ticker data retrieved');
      logRequest(req, 'Market ticker data retrieved >>>>>> ', marketData);
      res.json(marketData);
    } catch (error) {
      logError(req, 'Failed to fetch market ticker', error);
      res.status(500).json({ message: 'Failed to fetch market data' });
    }
  });

  // Update market data (called periodically)
  app.post('/api/market/update', async (req, res) => {
    logRequest(req, 'Updating market data from LN Markets');
    try {
      // Get any user with valid API credentials to fetch public market data
      const allUsers = await storage.getAllUsers();
      const userWithCredentials = allUsers.find(
        (user) => user.apiKey && user.apiSecret && user.apiPassphrase
      );

      if (!userWithCredentials) {
        logRequest(
          req,
          'No users with API credentials found, using cached data'
        );
        // Return existing cached data if no credentials available
        const existingData = await storage.getMarketData('BTC/USD');
        if (existingData) {
          return res.json(existingData);
        }

        // If no cached data either, return error
        return res.status(503).json({
          message: 'No API credentials available for market data update',
        });
      }

      logRequest(req, 'Fetching real market data from LN Markets API', {
        user: userWithCredentials.username,
      });

      // Create LN Markets service instance
      const lnMarketsService = createLNMarketsService({
        apiKey: userWithCredentials.apiKey!,
        secret: userWithCredentials.apiSecret!,
        passphrase: userWithCredentials.apiPassphrase!,
        network: 'mainnet',
      });

      // Fetch market data from LN Markets API
      let marketTicker: any,
        futuresMarket: any = null;

      try {
        logRequest(req, 'Calling LN Markets getFuturesTicker API');
        marketTicker = await lnMarketsService.getFuturesTicker();
        logRequest(req, 'LN Markets ticker data received', { marketTicker });
      } catch (tickerError) {
        logError(req, 'Failed to fetch ticker data', tickerError);
        throw tickerError;
      }

      // Validate required fields are present
      if (!marketTicker || typeof marketTicker !== 'object') {
        throw new Error('Invalid market ticker response from LN Markets API');
      }

      // Note: getFuturesMarket() method is not available in LN Markets API
      // We'll use ticker data only for now
      logRequest(
        req,
        'Using ticker data only (getFuturesMarket not available)'
      );
      futuresMarket = null;

      // Safely extract values with fallbacks
      const lastPrice =
        marketTicker.lastPrice ||
        marketTicker.last_price ||
        marketTicker.price ||
        0;
      const indexPrice =
        marketTicker.index || marketTicker.index_price || lastPrice;
      const carryFeeRate =
        marketTicker.carryFeeRate || marketTicker.carry_fee_rate || 0;
      const carryFeeTimestamp =
        marketTicker.carryFeeTimestamp ||
        marketTicker.carry_fee_timestamp ||
        Date.now();

      // Validate critical fields
      if (!lastPrice || typeof lastPrice !== 'number') {
        throw new Error(
          `Invalid lastPrice in market ticker response: ${JSON.stringify(
            marketTicker
          )}`
        );
      }

      // Note: LN Markets response doesn't include volume24h, using placeholder
      const volumeUSD = '0.00';

      // Map LN Markets data to our schema
      const marketDataUpdate = {
        symbol: 'BTC/USD',
        lastPrice: lastPrice.toString(),
        markPrice:
          futuresMarket?.mark_price?.toString() || lastPrice.toString(), // Fallback to last price
        indexPrice:
          futuresMarket?.index_price?.toString() || indexPrice.toString(), // Use index from ticker
        high24h: null, // Not available in current response
        low24h: null, // Not available in current response
        volume24h: null, // Not available in current response
        volumeUSD: volumeUSD,
        openInterest: futuresMarket?.open_interest?.toString() || null,
        fundingRate:
          futuresMarket?.funding_rate?.toString() || carryFeeRate.toString(),
        priceChange24h: null, // Not available in current response
        nextFundingTime: futuresMarket?.next_funding_time
          ? new Date(futuresMarket.next_funding_time * 1000)
          : new Date(carryFeeTimestamp), // Use carry fee timestamp
      };

      logRequest(req, 'Updating market data in database', marketDataUpdate);
      const marketData = await storage.updateMarketData(marketDataUpdate);

      logSuccess(req, 'Market data updated successfully from LN Markets API');
      res.json(marketData);
    } catch (error) {
      logError(req, 'Failed to update market data from LN Markets', error);

      // Try to return cached data as fallback
      try {
        const cachedData = await storage.getMarketData('BTC/USD');
        if (cachedData) {
          logRequest(req, 'Returning cached market data due to API error');
          return res.json(cachedData);
        }
      } catch (cacheError) {
        logError(req, 'Failed to fetch cached market data', cacheError);
      }

      res.status(500).json({ message: 'Failed to update market data' });
    }
  });

  // Clear market data cache
  app.delete('/api/market/cache', async (req, res) => {
    logRequest(req, 'Clearing market data cache');
    try {
      const { symbol } = req.query;
      const symbolToClose = symbol as string | undefined;

      const success = await storage.clearMarketData(symbolToClose);

      if (success) {
        const message = symbolToClose
          ? `Market data cache cleared for ${symbolToClose}`
          : 'All market data cache cleared';
        logSuccess(req, message);
        res.json({
          message,
          cleared: symbolToClose || 'all',
        });
      } else {
        logRequest(req, 'No market data found to clear');
        res.json({
          message: 'No market data found to clear',
          cleared: 'none',
        });
      }
    } catch (error) {
      logError(req, 'Failed to clear market data cache', error);
      res.status(500).json({ message: 'Failed to clear market data cache' });
    }
  });

  // User endpoints
  app.post('/api/user/register', async (req, res) => {
    logRequest(req, 'User registration attempt', {
      username: req.body.username,
    });
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res
          .status(400)
          .json({ message: 'Username and password are required' });
      }

      if (password.length < 6) {
        return res
          .status(400)
          .json({ message: 'Password must be at least 6 characters long' });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
      }

      // Hash the password before storing
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      const user = await storage.createUser({
        username,
        password: hashedPassword,
        apiKey: null,
        apiSecret: null,
        apiPassphrase: null,
      });

      // Don't return sensitive data
      const { password: _, ...safeUser } = user;
      logSuccess(req, 'User registered successfully', {
        userId: user.id,
        username: user.username,
      });
      res.json(safeUser);
    } catch (error) {
      logError(req, 'User registration failed', error);
      res.status(500).json({ message: 'Failed to create user' });
    }
  });

  app.post('/api/login', async (req, res) => {
    logRequest(req, 'User login attempt', { username: req.body.username });
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res
          .status(400)
          .json({ message: 'Username and password are required' });
      }

      // Find user by username
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res
          .status(401)
          .json({ message: 'Invalid username or password' });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res
          .status(401)
          .json({ message: 'Invalid username or password' });
      }

      // Don't return sensitive data
      const { password: _, ...safeUser } = user;
      logSuccess(req, 'User logged in successfully', {
        userId: user.id,
        username: user.username,
      });
      res.json(safeUser);
    } catch (error) {
      logError(req, 'User login failed', error);
      res.status(500).json({ message: 'Failed to log in' });
    }
  });

  app.delete('/api/user/:id', async (req, res) => {
    try {
      console.log('DELETE /api/user/:id called with params:', req.params);
      const userId = parseInt(req.params.id);
      console.log('Parsed user ID:', userId);

      if (!userId || isNaN(userId)) {
        console.log('Invalid user ID provided:', req.params.id);
        return res.status(400).json({ message: 'User ID is required' });
      }

      // Check if user exists
      console.log('Checking if user exists with ID:', userId);
      const user = await storage.getUser(userId);
      console.log(
        'User found:',
        user ? `${user.username} (ID: ${user.id})` : 'No user found'
      );

      if (!user) {
        console.log('User not found with ID:', userId);
        return res.status(404).json({ message: 'User not found' });
      }

      // Delete all user's trades first (foreign key constraint)
      console.log('Fetching user trades for deletion...');
      const userTrades = await storage.getTradesByUserId(userId);
      console.log(`Found ${userTrades.length} trades to delete`);

      for (const trade of userTrades) {
        console.log('Deleting trade ID:', trade.id);
        await storage.deleteTrade(trade.id);
      }
      console.log('All user trades deleted');

      // Delete the user account
      console.log('Deleting user account...');
      const success = await storage.deleteUser(userId);
      console.log('Delete user result:', success);

      if (!success) {
        console.error('Failed to delete user account - storage returned false');
        return res
          .status(500)
          .json({ message: 'Failed to delete user account' });
      }

      console.log('User account deleted successfully');
      res.json({ message: 'Account deleted successfully' });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ message: 'Failed to delete account' });
    }
  });

  app.get('/api/user/:id', async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Don't return sensitive data
      const { password, apiSecret, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ message: 'Failed to fetch user' });
    }
  });

  app.post('/api/user/:id/credentials', async (req, res) => {
    logRequest(req, 'Updating user API credentials', { userId: req.params.id });
    try {
      const userId = parseInt(req.params.id);
      const { apiKey, apiSecret, apiPassphrase } = req.body;

      if (!apiKey || !apiSecret || !apiPassphrase) {
        return res
          .status(400)
          .json({ message: 'All API credentials are required' });
      }

      const updatedUser = await storage.updateUser(userId, {
        apiKey,
        apiSecret,
        apiPassphrase,
      });

      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Test credentials by fetching user balance
      try {
        const lnMarkets = createLNMarketsService({
          apiKey,
          secret: apiSecret,
          passphrase: apiPassphrase,
        });

        const balance = await lnMarkets.getBalance();

        // Get current market data for USD conversion
        const marketData = await storage.getMarketData('BTC/USD');
        const btcPrice = marketData?.lastPrice
          ? parseFloat(marketData.lastPrice)
          : 0;

        await storage.updateUser(userId, {
          balance: balance.balance,
          balanceUSD:
            btcPrice > 0
              ? (parseFloat(balance.balance) * 0.00000001 * btcPrice).toString()
              : '0.00', // USD conversion using real market data
        });

        // Return updated user data
        const updatedUser = await storage.getUser(userId);
        res.json(updatedUser);
      } catch (apiError: any) {
        console.error('LN Markets API validation failed:', apiError);
        console.error('API Key being tested:', apiKey);
        console.error('API Secret length:', apiSecret?.length);
        console.error('API Passphrase:', apiPassphrase);
        res.status(400).json({
          message: 'Invalid API credentials',
          detail: apiError.message || 'API connection failed',
        });
      }
    } catch (error) {
      console.error('Error updating credentials:', error);
      res.status(500).json({ message: 'Failed to update credentials' });
    }
  });

  // Balance sync endpoint
  app.post('/api/user/:id/sync-balance', async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      if (!user.apiKey || !user.apiSecret || !user.apiPassphrase) {
        return res.status(400).json({
          message: 'User API credentials not configured',
        });
      }

      const lnMarkets = createLNMarketsService({
        apiKey: user.apiKey,
        secret: user.apiSecret,
        passphrase: user.apiPassphrase,
      });

      const balance = await lnMarkets.getBalance();

      // Get current market data for USD conversion
      const marketData = await storage.getMarketData('BTC/USD');
      const btcPrice = marketData?.lastPrice
        ? parseFloat(marketData.lastPrice)
        : 0;

      await storage.updateUser(userId, {
        balance: balance.balance,
        balanceUSD:
          btcPrice > 0
            ? (parseFloat(balance.balance) * 0.00000001 * btcPrice).toString()
            : '0.00',
      });

      // Return updated user data
      const updatedUser = await storage.getUser(userId);
      res.json(updatedUser);
    } catch (error: any) {
      console.error('Error syncing balance:', error);
      res.status(500).json({
        message: 'Failed to sync balance',
        detail: error.message || 'Balance sync failed',
      });
    }
  });

  // User full info endpoint
  app.get('/api/user/:id/full-info', async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      if (!user.apiKey || !user.apiSecret || !user.apiPassphrase) {
        return res.status(400).json({
          message: 'User API credentials not configured',
        });
      }

      const lnMarkets = createLNMarketsService({
        apiKey: user.apiKey,
        secret: user.apiSecret,
        passphrase: user.apiPassphrase,
      });

      const userInfo = await lnMarkets.getUserInfo();

      // Return user info with database fields merged
      const fullUserInfo = {
        ...user,
        uid: userInfo.uid,
        synthetic_usd_balance: userInfo.synthetic_usd_balance,
        use_taproot_addresses: userInfo.use_taproot_addresses,
        auto_withdraw_enabled: userInfo.auto_withdraw_enabled,
        auto_withdraw_lightning_address:
          userInfo.auto_withdraw_lightning_address,
        linkingpublickey: userInfo.linkingpublickey,
        role: userInfo.role,
        email: userInfo.email,
        email_confirmed: userInfo.email_confirmed,
        show_leaderboard: userInfo.show_leaderboard,
        account_type: userInfo.account_type,
        totp_enabled: userInfo.totp_enabled,
        webauthn_enabled: userInfo.webauthn_enabled,
        fee_tier: userInfo.fee_tier,
      };

      res.json(fullUserInfo);
    } catch (error: any) {
      console.error('Error fetching user full info:', error);
      res.status(500).json({
        message: 'Failed to fetch user information',
        detail: error.message || 'User info fetch failed',
      });
    }
  });

  // Trade endpoints
  app.get('/api/trades/:userId', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const trades = await storage.getTradesByUserId(userId);
      res.json(trades);
    } catch (error) {
      console.error('Error fetching trades:', error);
      res.status(500).json({ message: 'Failed to fetch trades' });
    }
  });

  app.get('/api/trades/:userId/active', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const trades = await storage.getActiveTradesByUserId(userId);
      res.json(trades);
    } catch (error) {
      console.error('Error fetching active trades:', error);
      res.status(500).json({ message: 'Failed to fetch active trades' });
    }
  });

  app.post('/api/trades', async (req, res) => {
    try {
      const validatedData = insertTradeSchema.parse(req.body);

      // Get user's API credentials
      const user = await storage.getUser(validatedData.userId);
      if (!user || !user.apiKey || !user.apiSecret || !user.apiPassphrase) {
        return res
          .status(400)
          .json({ message: 'User API credentials not configured' });
      }

      const lnMarkets = createLNMarketsService({
        apiKey: user.apiKey,
        secret: user.apiSecret,
        passphrase: user.apiPassphrase,
      });

      // Create trade in local storage first
      const trade = await storage.createTrade(validatedData);

      try {
        if (validatedData.type === 'futures') {
          const lnTradeRequest = {
            type:
              validatedData.orderType === 'market'
                ? ('m' as const)
                : ('l' as const),
            side:
              validatedData.side === 'buy' ? ('b' as const) : ('s' as const),
            margin: validatedData.margin!,
            leverage: parseFloat(validatedData.leverage!),
            takeprofit: validatedData.takeProfit
              ? parseFloat(validatedData.takeProfit)
              : undefined,
            stoploss: validatedData.stopLoss
              ? parseFloat(validatedData.stopLoss)
              : undefined,
            price:
              validatedData.orderType === 'limit' && validatedData.limitPrice
                ? parseFloat(validatedData.limitPrice)
                : undefined,
          };

          const lnTrade = await lnMarkets.createFuturesTrade(lnTradeRequest);

          // Update trade with LN Markets response
          const updatedTrade = await storage.updateTrade(trade.id, {
            lnMarketsId: lnTrade.id,
            status: 'open',
            entryPrice: lnTrade.price,
            liquidationPrice: lnTrade.liquidation,
            fee: lnTrade.fee,
          });

          res.json(updatedTrade);
        } else if (validatedData.type === 'options') {
          const lnTradeRequest = {
            side: 'b' as const,
            quantity: parseFloat(validatedData.quantity!),
            settlement: validatedData.settlement as 'physical' | 'cash',
            instrument_name: validatedData.instrumentName!,
          };

          const lnTrade = await lnMarkets.createOptionsTrade(lnTradeRequest);

          const updatedTrade = await storage.updateTrade(trade.id, {
            lnMarketsId: lnTrade.id,
            status: 'open',
            entryPrice: lnTrade.price,
            fee: lnTrade.fee,
          });

          res.json(updatedTrade);
        } else {
          throw new Error('Invalid trade type');
        }
      } catch (lnError) {
        // Update trade status to failed and return error
        await storage.updateTrade(trade.id, {
          status: 'cancelled',
        });

        throw lnError;
      }
    } catch (error) {
      console.error('Error creating trade:', error);
      if (error instanceof z.ZodError) {
        res
          .status(400)
          .json({ message: 'Invalid trade data', errors: error.errors });
      } else {
        res.status(500).json({ message: 'Failed to create trade' });
      }
    }
  });

  app.put('/api/trades/:id', async (req, res) => {
    try {
      const tradeId = parseInt(req.params.id);
      const { takeProfit, stopLoss } = req.body;

      const trade = await storage.getTrade(tradeId);
      if (!trade) {
        return res.status(404).json({ message: 'Trade not found' });
      }

      const user = await storage.getUser(trade.userId);
      if (!user || !user.apiKey || !user.apiSecret || !user.apiPassphrase) {
        return res
          .status(400)
          .json({ message: 'User API credentials not configured' });
      }

      if (trade.lnMarketsId) {
        const lnMarkets = createLNMarketsService({
          apiKey: user.apiKey,
          secret: user.apiSecret,
          passphrase: user.apiPassphrase,
        });

        await lnMarkets.updateFuturesTrade(trade.lnMarketsId, {
          takeprofit: takeProfit ? parseFloat(takeProfit) : undefined,
          stoploss: stopLoss ? parseFloat(stopLoss) : undefined,
        });
      }

      const updatedTrade = await storage.updateTrade(tradeId, {
        takeProfit: takeProfit || trade.takeProfit,
        stopLoss: stopLoss || trade.stopLoss,
      });

      res.json(updatedTrade);
    } catch (error) {
      console.error('Error updating trade:', error);
      res.status(500).json({ message: 'Failed to update trade' });
    }
  });

  app.delete('/api/trades/:id', async (req, res) => {
    try {
      const tradeId = parseInt(req.params.id);
      logRequest(req, 'Closing trade', { tradeId });

      const trade = await storage.getTrade(tradeId);
      if (!trade) {
        logError(
          req,
          'Trade not found',
          new Error(`Trade ${tradeId} not found`)
        );
        return res.status(404).json({ message: 'Trade not found' });
      }

      logRequest(req, 'Trade found', {
        tradeId: trade.id,
        lnMarketsId: trade.lnMarketsId,
        type: trade.type,
        status: trade.status,
        fullTrade: trade,
      });

      const user = await storage.getUser(trade.userId);
      if (!user || !user.apiKey || !user.apiSecret || !user.apiPassphrase) {
        logError(
          req,
          'User API credentials not configured',
          new Error('Missing API credentials')
        );
        return res
          .status(400)
          .json({ message: 'User API credentials not configured' });
      }

      logRequest(req, 'User credentials found', { userId: user.id });

      if (trade.lnMarketsId) {
        const lnMarkets = createLNMarketsService({
          apiKey: user.apiKey,
          secret: user.apiSecret,
          passphrase: user.apiPassphrase,
        });

        logRequest(req, 'Calling LN Markets API', {
          tradeId: trade.lnMarketsId,
          type: trade.type,
          status: trade.status,
        });

        if (trade.type === 'futures') {
          if (trade.status === 'running') {
            // Close running position
            logRequest(req, 'Closing futures trade', {
              tradeId: trade.lnMarketsId,
              tradeIdType: typeof trade.lnMarketsId,
              tradeIdValue: JSON.stringify(trade.lnMarketsId),
            });
            await lnMarkets.closeFuturesTrade(trade.lnMarketsId);
            logSuccess(req, 'Futures trade closed successfully');
          } else if (trade.status === 'open') {
            // Cancel open order (limit order)
            logRequest(req, 'Cancelling futures order', {
              tradeId: trade.lnMarketsId,
            });
            await lnMarkets.cancelFuturesOrder(trade.lnMarketsId);
            logSuccess(req, 'Futures order cancelled successfully');
          }
        } else {
          logRequest(req, 'Closing options trade', {
            tradeId: trade.lnMarketsId,
          });
          await lnMarkets.closeOptionsTrade(trade.lnMarketsId);
          logSuccess(req, 'Options trade closed successfully');
        }
      } else {
        logRequest(req, 'No LN Markets ID found, skipping API call');
      }

      // Update status based on the original trade status
      const newStatus = trade.status === 'open' ? 'cancelled' : 'closed';
      await storage.updateTrade(tradeId, {
        status: newStatus,
      });

      const message =
        trade.status === 'open'
          ? 'Order cancelled successfully'
          : 'Trade closed successfully';

      logSuccess(req, 'Trade status updated in database', { newStatus });
      res.json({ message });
    } catch (error) {
      logError(req, 'Error closing trade', error);
      console.error('Error closing trade:', error);
      res.status(500).json({
        message: 'Failed to close trade',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  app.delete('/api/trades/:userId/close-all', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);

      const user = await storage.getUser(userId);
      if (!user || !user.apiKey || !user.apiSecret || !user.apiPassphrase) {
        return res
          .status(400)
          .json({ message: 'User API credentials not configured' });
      }

      const lnMarkets = createLNMarketsService({
        apiKey: user.apiKey,
        secret: user.apiSecret,
        passphrase: user.apiPassphrase,
      });

      await lnMarkets.closeAllFuturesTrades();

      // Update all open trades to closed
      const activeTrades = await storage.getActiveTradesByUserId(userId);
      await Promise.all(
        activeTrades.map((trade) =>
          storage.updateTrade(trade.id, { status: 'closed' })
        )
      );

      res.json({ message: 'All trades closed successfully' });
    } catch (error) {
      console.error('Error closing all trades:', error);
      res.status(500).json({ message: 'Failed to close all trades' });
    }
  });

  app.delete('/api/trades/:userId/cancel-all-orders', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);

      const user = await storage.getUser(userId);
      if (!user || !user.apiKey || !user.apiSecret || !user.apiPassphrase) {
        return res
          .status(400)
          .json({ message: 'User API credentials not configured' });
      }

      const lnMarkets = createLNMarketsService({
        apiKey: user.apiKey,
        secret: user.apiSecret,
        passphrase: user.apiPassphrase,
      });

      await lnMarkets.cancelAllFuturesOrders();

      // Update all open orders to cancelled
      const activeTrades = await storage.getActiveTradesByUserId(userId);
      await Promise.all(
        activeTrades
          .filter((trade) => trade.status === 'open')
          .map((trade) =>
            storage.updateTrade(trade.id, { status: 'cancelled' })
          )
      );

      res.json({ message: 'All open orders cancelled successfully' });
    } catch (error) {
      console.error('Error cancelling all orders:', error);
      res.status(500).json({ message: 'Failed to cancel all orders' });
    }
  });

  // Sync trades from LN Markets
  app.post('/api/trades/sync', async (req, res) => {
    logRequest(req, 'Starting trade sync from LN Markets');
    try {
      const { userId, tradeType = 'all' } = req.body;

      if (!userId) {
        logError(
          req,
          'Sync failed - no user ID provided',
          new Error('Missing userId')
        );
        return res.status(400).json({ message: 'User ID is required' });
      }

      logRequest(req, 'Fetching user credentials for sync', {
        userId,
        tradeType,
      });
      const user = await storage.getUser(userId);
      if (!user || !user.apiKey || !user.apiSecret || !user.apiPassphrase) {
        logError(
          req,
          'Sync failed - user credentials not found',
          new Error('Missing API credentials')
        );
        return res
          .status(400)
          .json({ message: 'User API credentials not found' });
      }

      const lnMarketsService = createLNMarketsService({
        apiKey: user.apiKey,
        secret: user.apiSecret,
        passphrase: user.apiPassphrase,
        network: 'mainnet',
      });

      // Fetch futures trades from LN Markets based on trade type
      logRequest(
        req,
        `Fetching ${tradeType} futures trades from LN Markets API`
      );
      let futuresTrades = [];

      if (tradeType === 'all') {
        // Fetch all trade types
        const [openTrades, runningTrades, closedTrades] = await Promise.all([
          lnMarketsService.getFuturesTrades('open'),
          lnMarketsService.getFuturesTrades('running'),
          lnMarketsService.getFuturesTrades('closed'),
        ]);
        futuresTrades = [...openTrades, ...runningTrades, ...closedTrades];
      } else {
        // Fetch specific trade type
        futuresTrades = await lnMarketsService.getFuturesTrades(
          tradeType as 'open' | 'running' | 'closed'
        );
      }
      let syncedCount = 0;
      let updatedCount = 0;
      logRequest(req, 'Processing futures trades', {
        trades: futuresTrades,
        tradesFound: futuresTrades.length,
      });

      for (const lnTrade of futuresTrades) {
        // Check if trade already exists in our database
        const existingTrades = await storage.getTradesByUserId(userId);
        const existingTrade = existingTrades.find(
          (t) => t.lnMarketsId === lnTrade.id
        );

        if (existingTrade) {
          // Update existing trade with latest data from LN Markets
          // Determine status based on LN Markets flags
          let newStatus: TradeStatus;
          if (lnTrade.closed) {
            newStatus = 'closed';
          } else if (lnTrade.running) {
            newStatus = 'running'; // Running trades are actively running
          } else if (lnTrade.open) {
            newStatus = 'open'; // Open but not running = waiting for limit price
          } else if (lnTrade.canceled) {
            newStatus = 'cancelled';
          } else {
            newStatus = 'open';
          }

          logRequest(
            req,
            `Updating trade ${existingTrade.id} from ${existingTrade.status} to ${newStatus}`,
            {
              lnMarketsId: lnTrade.id,
              closed: lnTrade.closed,
              running: lnTrade.running,
              open: lnTrade.open,
              canceled: lnTrade.canceled,
            }
          );

          await storage.updateTrade(existingTrade.id, {
            status: newStatus,
            entryPrice: lnTrade.entry_price?.toString(),
            exitPrice: lnTrade.exit_price?.toString(),
            pnl: lnTrade.pl?.toString(),
            pnlUSD: null, // Not provided in response, will calculate separately
            liquidationPrice: lnTrade.liquidation?.toString(),
            takeProfit: lnTrade.takeprofit
              ? lnTrade.takeprofit.toString()
              : null,
            stopLoss: lnTrade.stoploss ? lnTrade.stoploss.toString() : null,
            fee:
              lnTrade.opening_fee +
              lnTrade.closing_fee +
              lnTrade.sum_carry_fees,
            updatedAt: new Date(),
          });
          updatedCount++;
        } else {
          // Create new trade from LN Markets data
          // Determine status based on LN Markets flags
          let status: TradeStatus;
          if (lnTrade.closed) {
            status = 'closed';
          } else if (lnTrade.running) {
            status = 'running'; // Running trades are actively running
          } else if (lnTrade.open) {
            status = 'open'; // Open but not running = waiting for limit price
          } else if (lnTrade.canceled) {
            status = 'cancelled';
          } else {
            status = 'open';
          }

          await storage.createTrade({
            userId: userId,
            lnMarketsId: lnTrade.id,
            type: 'futures',
            side: lnTrade.side === 'b' ? 'buy' : 'sell',
            orderType: lnTrade.type === 'l' ? 'limit' : 'market',
            status: status,
            entryPrice: lnTrade.entry_price?.toString(),
            exitPrice: lnTrade.exit_price?.toString(),
            margin: lnTrade.margin,
            leverage: lnTrade.leverage?.toString(),
            quantity: lnTrade.quantity?.toString(),
            takeProfit: lnTrade.takeprofit
              ? lnTrade.takeprofit.toString()
              : null,
            stopLoss: lnTrade.stoploss ? lnTrade.stoploss.toString() : null,
            pnl: lnTrade.pl?.toString(),
            pnlUSD: null, // Not provided in response, will calculate separately
            liquidationPrice: lnTrade.liquidation?.toString(),
            fee:
              lnTrade.opening_fee +
              lnTrade.closing_fee +
              lnTrade.sum_carry_fees,
            instrumentName: 'BTC/USD',
          });
          syncedCount++;
        }
      }

      // Also fetch options trades
      try {
        logRequest(req, 'Fetching options trades from LN Markets API');
        const optionsTrades = await lnMarketsService.getOptionsTrades();
        logRequest(req, 'Processing options trades', {
          tradesFound: optionsTrades.length,
        });

        for (const lnTrade of optionsTrades) {
          const existingTrades = await storage.getTradesByUserId(userId);
          const existingTrade = existingTrades.find(
            (t) => t.lnMarketsId === lnTrade.id
          );

          if (existingTrade) {
            const newStatus = lnTrade.closed ? 'closed' : 'open';
            logRequest(
              req,
              `Updating options trade ${existingTrade.id} from ${existingTrade.status} to ${newStatus}`,
              {
                lnMarketsId: lnTrade.id,
                closed: lnTrade.closed,
                exitPrice: lnTrade.exit_price,
              }
            );

            await storage.updateTrade(existingTrade.id, {
              status: newStatus,
              entryPrice: lnTrade.price?.toString(),
              exitPrice: lnTrade.exit_price?.toString(),
              pnl: lnTrade.pl?.toString(),
              pnlUSD: lnTrade.pl_usd?.toString(),
              updatedAt: new Date(),
            });
            updatedCount++;
          } else {
            await storage.createTrade({
              userId: userId,
              lnMarketsId: lnTrade.id,
              type: 'options',
              side: 'buy', // Options are always buy
              orderType: 'market',
              status: lnTrade.closed ? 'closed' : 'open',
              entryPrice: lnTrade.price?.toString(),
              exitPrice: lnTrade.exit_price?.toString(),
              quantity: lnTrade.quantity?.toString(),
              pnl: lnTrade.pl?.toString(),
              pnlUSD: lnTrade.pl_usd?.toString(),
              instrumentName: lnTrade.instrument,
              settlement: lnTrade.settlement,
            });
            syncedCount++;
          }
        }
      } catch (optionsError) {
        logError(req, 'Error fetching options trades', optionsError);
      }

      // Sync balance after trade sync
      await syncUserBalance(userId);

      const result = {
        message: `${
          tradeType.charAt(0).toUpperCase() + tradeType.slice(1)
        } trades synced successfully`,
        tradeType,
        syncedCount,
        updatedCount,
        totalProcessed: syncedCount + updatedCount,
        trades: futuresTrades,
      };
      logSuccess(req, 'Trade sync completed successfully', result);
      res.json(result);
    } catch (error) {
      logError(req, 'Trade sync failed', error);
      res
        .status(500)
        .json({ message: 'Failed to sync trades from LN Markets' });
    }
  });

  // Deposit endpoints
  app.post('/api/deposits/generate', async (req, res) => {
    logRequest(req, 'Generating deposit address', {
      userId: req.body.userId,
      amount: req.body.amount,
    });
    try {
      const { userId, amount } = req.body;

      if (!userId) {
        logError(
          req,
          'Deposit generation failed - no user ID',
          new Error('Missing userId')
        );
        return res.status(400).json({ message: 'User ID is required' });
      }

      const user = await storage.getUser(userId);
      if (!user || !user.apiKey || !user.apiSecret || !user.apiPassphrase) {
        logError(
          req,
          'Deposit generation failed - user credentials not found',
          new Error('Missing API credentials')
        );
        return res
          .status(400)
          .json({ message: 'User API credentials not found' });
      }

      const lnMarketsService = createLNMarketsService({
        apiKey: user.apiKey,
        secret: user.apiSecret,
        passphrase: user.apiPassphrase,
        network: 'mainnet',
      });

      // Generate deposit address via LN Markets API
      logRequest(req, 'Calling LN Markets API to generate deposit address');
      const depositResponse = await lnMarketsService.generateDepositAddress({
        amount,
      });

      // Calculate expiry time
      const expiresAt = new Date(
        Date.now() + depositResponse.expiry * 60 * 1000
      ); // expiry is in minutes

      // Store deposit in database
      const deposit = await storage.createDeposit({
        userId,
        lnMarketsId: depositResponse.depositId,
        address: depositResponse.paymentRequest,
        amount: amount || null,
        status: 'pending',
        expiresAt,
      });

      logSuccess(req, 'Deposit address generated successfully', {
        depositId: deposit.id,
        paymentRequest: depositResponse.paymentRequest,
        amount,
        expiry: depositResponse.expiry,
      });

      res.json({
        id: deposit.id,
        address: depositResponse.paymentRequest,
        amount: amount,
        status: deposit.status,
        expiresAt: deposit.expiresAt,
        expiry: depositResponse.expiry,
      });
    } catch (error) {
      logError(req, 'Deposit address generation failed', error);
      res.status(500).json({ message: 'Failed to generate deposit address' });
    }
  });

  app.get('/api/deposits/:userId', async (req, res) => {
    logRequest(req, 'Fetching user deposits', { userId: req.params.userId });
    try {
      const userId = parseInt(req.params.userId);
      const deposits = await storage.getDepositsByUserId(userId);
      logSuccess(req, 'User deposits retrieved', { count: deposits.length });
      res.json(deposits);
    } catch (error) {
      logError(req, 'Failed to fetch user deposits', error);
      res.status(500).json({ message: 'Failed to fetch deposits' });
    }
  });

  // Check specific deposit status from LN Markets
  app.post('/api/deposits/:depositId/check', async (req, res) => {
    logRequest(req, 'Checking deposit status', {
      depositId: req.params.depositId,
    });
    try {
      const depositId = parseInt(req.params.depositId);
      const userId = req.body.userId;

      if (!userId) {
        logError(
          req,
          'Deposit status check failed - no user ID',
          new Error('Missing userId')
        );
        return res.status(400).json({ message: 'User ID is required' });
      }

      // Get the deposit from our database
      const deposit = await storage.getDeposit(depositId);
      if (!deposit || deposit.userId !== userId) {
        logError(
          req,
          'Deposit not found',
          new Error('Deposit not found or access denied')
        );
        return res.status(404).json({ message: 'Deposit not found' });
      }

      const user = await storage.getUser(userId);
      if (!user || !user.apiKey || !user.apiSecret || !user.apiPassphrase) {
        logError(
          req,
          'Deposit status check failed - user credentials missing',
          new Error('Missing API credentials')
        );
        return res
          .status(400)
          .json({ message: 'User API credentials not found' });
      }

      const lnMarketsService = createLNMarketsService({
        apiKey: user.apiKey,
        secret: user.apiSecret,
        passphrase: user.apiPassphrase,
        network: 'mainnet',
      });

      // Check status from LN Markets if we have an LN Markets ID
      if (deposit.lnMarketsId) {
        logRequest(req, 'Fetching deposit status from LN Markets API');
        const lnMarketsStatus = await lnMarketsService.getDepositStatus(
          deposit.lnMarketsId
        );

        if (lnMarketsStatus) {
          // Update our database with the latest status
          const updatedDeposit = await storage.updateDeposit(depositId, {
            status: lnMarketsStatus.success ? 'completed' : 'failed',
            receivedAmount:
              lnMarketsStatus.received_amount ||
              (lnMarketsStatus.success ? lnMarketsStatus.amount : null),
            txHash: lnMarketsStatus.payment_hash,
            confirmations: lnMarketsStatus.success ? 6 : 0,
          });

          logSuccess(req, 'Deposit status updated from LN Markets', {
            status: lnMarketsStatus.success ? 'completed' : 'failed',
            amount: lnMarketsStatus.amount,
          });
          res.json(updatedDeposit);
        } else {
          logSuccess(
            req,
            'Deposit status retrieved from database (not found in LN Markets)'
          );
          res.json(deposit);
        }
      } else {
        logSuccess(
          req,
          'Deposit status retrieved from database (no LN Markets ID)'
        );
        res.json(deposit);
      }
    } catch (error) {
      logError(req, 'Deposit status check failed', error);
      res.status(500).json({ message: 'Failed to check deposit status' });
    }
  });

  app.post('/api/deposits/sync', async (req, res) => {
    logRequest(req, 'Starting deposit sync from LN Markets');
    try {
      const { userId } = req.body;

      if (!userId) {
        logError(
          req,
          'Deposit sync failed - no user ID',
          new Error('Missing userId')
        );
        return res.status(400).json({ message: 'User ID is required' });
      }

      const user = await storage.getUser(userId);
      if (!user || !user.apiKey || !user.apiSecret || !user.apiPassphrase) {
        logError(
          req,
          'Deposit sync failed - user credentials missing',
          new Error('Missing API credentials')
        );
        return res
          .status(400)
          .json({ message: 'User API credentials not found' });
      }

      const lnMarketsService = createLNMarketsService({
        apiKey: user.apiKey,
        secret: user.apiSecret,
        passphrase: user.apiPassphrase,
        network: 'mainnet',
      });

      // Fetch deposit history from LN Markets
      logRequest(req, 'Fetching deposit history from LN Markets API');
      const depositHistory = await lnMarketsService.getDepositHistory();
      let syncedCount = 0;
      let updatedCount = 0;

      logRequest(req, 'Processing deposit history', {
        depositsFound: depositHistory.length,
      });

      for (const lnDeposit of depositHistory) {
        // Check if deposit already exists in our database
        const existingDeposits = await storage.getDepositsByUserId(userId);
        const existingDeposit = existingDeposits.find(
          (d) => d.lnMarketsId === lnDeposit.id
        );

        if (existingDeposit) {
          // Update existing deposit with latest data from LN Markets
          await storage.updateDeposit(existingDeposit.id, {
            status: lnDeposit.success ? 'completed' : 'failed',
            receivedAmount:
              lnDeposit.received_amount ||
              (lnDeposit.success ? lnDeposit.amount : null),
            txHash: lnDeposit.payment_hash,
            confirmations: lnDeposit.success ? 6 : 0,
          });
          updatedCount++;
        } else {
          // Create new deposit from LN Markets data
          // Note: LN Markets deposit history doesn't include address field, using payment_hash as identifier
          await storage.createDeposit({
            userId: userId,
            lnMarketsId: lnDeposit.id,
            address:
              lnDeposit.payment_hash ||
              lnDeposit.address ||
              `lnm_${lnDeposit.id}`, // Use payment hash as address fallback
            amount: lnDeposit.amount,
            receivedAmount:
              lnDeposit.received_amount ||
              (lnDeposit.success ? lnDeposit.amount : null),
            status: lnDeposit.success ? 'completed' : 'failed',
            txHash: lnDeposit.payment_hash,
            confirmations: lnDeposit.success ? 6 : 0, // Assume confirmed if successful
            expiresAt: lnDeposit.expires_at
              ? new Date(lnDeposit.expires_at)
              : null,
          });
          syncedCount++;
        }
      }

      // Sync balance after deposit sync
      await syncUserBalance(userId);

      const result = {
        message: 'Deposits synced successfully',
        syncedCount,
        updatedCount,
        totalProcessed: syncedCount + updatedCount,
      };

      logSuccess(req, 'Deposit sync completed successfully', result);
      res.json(result);
    } catch (error) {
      logError(req, 'Deposit sync failed', error);
      res
        .status(500)
        .json({ message: 'Failed to sync deposits from LN Markets' });
    }
  });

  // Withdrawal endpoints
  app.post('/api/withdrawals/lightning', async (req, res) => {
    logRequest(req, 'Processing Lightning withdrawal', {
      userId: req.body.userId,
      amount: req.body.amount,
    });
    try {
      const { userId, amount, invoice } = req.body;

      if (!userId || !invoice) {
        logError(
          req,
          'Withdrawal failed - missing parameters',
          new Error('Missing userId or invoice')
        );
        return res
          .status(400)
          .json({ message: 'User ID and invoice are required' });
      }

      const user = await storage.getUser(userId);
      if (!user || !user.apiKey || !user.apiSecret || !user.apiPassphrase) {
        logError(
          req,
          'Withdrawal failed - user credentials missing',
          new Error('Missing API credentials')
        );
        return res
          .status(400)
          .json({ message: 'User API credentials not found' });
      }

      // Check user balance
      if (amount && amount > parseFloat(user.balance || '0')) {
        logError(
          req,
          'Withdrawal failed - insufficient balance',
          new Error('Insufficient balance')
        );
        return res.status(400).json({ message: 'Insufficient balance' });
      }

      const lnMarketsService = createLNMarketsService({
        apiKey: user.apiKey,
        secret: user.apiSecret,
        passphrase: user.apiPassphrase,
        network: 'mainnet',
      });

      // Process withdrawal via LN Markets
      const withdrawalResult = await lnMarketsService.withdraw(invoice, amount);

      // Store withdrawal in database
      const withdrawal = await storage.createWithdrawal({
        userId,
        lnMarketsId: withdrawalResult.id,
        type: 'lightning',
        invoice,
        paymentHash: withdrawalResult.paymentHash,
        amount: withdrawalResult.amount,
        fee: withdrawalResult.fee,
        status: 'completed',
      });

      // Update user balance
      await syncUserBalance(userId);

      logSuccess(req, 'Lightning withdrawal successful', {
        withdrawalId: withdrawal.id,
        amount: withdrawalResult.amount,
      });

      res.json(withdrawal);
    } catch (error) {
      logError(req, 'Lightning withdrawal failed', error);
      res.status(500).json({
        message: 'Failed to process withdrawal',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  app.post('/api/withdrawals/usd', async (req, res) => {
    logRequest(req, '🔄 Processing USD withdrawal', {
      userId: req.body.userId,
      amountUSD: req.body.amountUSD,
    });
    try {
      const { userId, amountUSD, invoice } = req.body;

      if (!userId || !amountUSD || !invoice) {
        logError(
          req,
          'USD withdrawal failed - missing parameters',
          new Error('Missing required parameters')
        );
        return res.status(400).json({
          message: 'User ID, USD amount, and invoice are required',
        });
      }

      const user = await storage.getUser(userId);
      if (!user || !user.apiKey || !user.apiSecret || !user.apiPassphrase) {
        logError(
          req,
          'USD withdrawal failed - user credentials missing',
          new Error('Missing API credentials')
        );
        return res
          .status(400)
          .json({ message: 'User API credentials not found' });
      }

      const lnMarketsService = createLNMarketsService({
        apiKey: user.apiKey,
        secret: user.apiSecret,
        passphrase: user.apiPassphrase,
        network: 'mainnet',
      });

      // Process USD withdrawal (swap + withdrawal)
      const withdrawalResult = await lnMarketsService.withdrawUSD(
        amountUSD,
        invoice
      );

      // Store withdrawal in database
      const withdrawal = await storage.createWithdrawal({
        userId,
        lnMarketsId: withdrawalResult.id,
        type: 'usd',
        invoice,
        paymentHash: withdrawalResult.paymentHash,
        amount: withdrawalResult.btcAmount,
        amountUsd: withdrawalResult.usdAmount,
        fee: withdrawalResult.fee,
        swapFee: withdrawalResult.swapFee,
        exchangeRate: withdrawalResult.exchangeRate.toString(),
        status: 'completed',
      });

      // Update user balance
      await syncUserBalance(userId);

      logSuccess(req, 'USD withdrawal successful', {
        withdrawalId: withdrawal.id,
        amountUSD: withdrawalResult.usdAmount,
        amountBTC: withdrawalResult.btcAmount,
      });

      res.json(withdrawal);
    } catch (error) {
      logError(req, '❌ USD withdrawal failed', error);
      res.status(500).json({
        message: 'Failed to process USD withdrawal',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  app.get('/api/withdrawals/:userId', async (req, res) => {
    logRequest(req, 'Fetching withdrawal history', {
      userId: req.params.userId,
    });
    try {
      const userId = parseInt(req.params.userId);
      const withdrawals = await storage.getWithdrawalsByUserId(userId);

      logSuccess(req, 'Withdrawal history fetched', {
        count: withdrawals.length,
      });

      res.json(withdrawals);
    } catch (error) {
      logError(req, 'Failed to fetch withdrawal history', error);
      res.status(500).json({ message: 'Failed to fetch withdrawals' });
    }
  });

  app.post('/api/withdrawals/estimate', async (req, res) => {
    logRequest(req, 'Estimating withdrawal fee', {
      amount: req.body.amount,
      currency: req.body.currency,
    });
    try {
      const { userId, amount, currency } = req.body;

      if (!userId || !amount) {
        return res
          .status(400)
          .json({ message: 'User ID and amount are required' });
      }

      const user = await storage.getUser(userId);
      if (!user || !user.apiKey || !user.apiSecret || !user.apiPassphrase) {
        return res
          .status(400)
          .json({ message: 'User API credentials not found' });
      }

      const lnMarketsService = createLNMarketsService({
        apiKey: user.apiKey,
        secret: user.apiSecret,
        passphrase: user.apiPassphrase,
        network: 'mainnet',
      });

      const estimate = await lnMarketsService.estimateWithdrawalFee(
        amount,
        currency || 'BTC'
      );

      logSuccess(req, 'Withdrawal fee estimated', estimate);

      res.json(estimate);
    } catch (error) {
      logError(req, 'Failed to estimate withdrawal fee', error);
      res.status(500).json({
        message: 'Failed to estimate withdrawal fee',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Scheduled trade routes
  app.get('/api/scheduled-trades/:userId', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const scheduledTrades = await storage.getScheduledTradesByUserId(userId);
      res.json(scheduledTrades);
    } catch (error) {
      console.error('Error fetching scheduled trades:', error);
      res.status(500).json({ message: 'Failed to fetch scheduled trades' });
    }
  });

  app.post('/api/scheduled-trades', async (req, res) => {
    try {
      const validatedData = insertScheduledTradeSchema.parse(req.body);

      // Validate and process trigger data based on trigger type
      let scheduledTradeData = { ...validatedData };

      try {
        switch (validatedData.triggerType) {
          case 'date':
            if (!req.body.triggerValue) {
              return res.status(400).json({
                message: 'Date and time is required for date trigger',
              });
            }
            const dateTime = new Date(req.body.triggerValue);
            if (isNaN(dateTime.getTime())) {
              return res.status(400).json({
                message: 'Invalid date format',
              });
            }
            scheduledTradeData.scheduledTime = dateTime;
            break;
          case 'price_range':
            if (!req.body.triggerValue) {
              return res.status(400).json({
                message: 'Price range is required',
              });
            }
            const [minPrice, maxPrice] = req.body.triggerValue
              .split('-')
              .map((p: string) => parseFloat(p.trim()));
            if (isNaN(minPrice) || isNaN(maxPrice) || minPrice >= maxPrice) {
              return res.status(400).json({
                message:
                  'Invalid price range. Use format: min - max (e.g., 115000 - 116000)',
              });
            }
            scheduledTradeData.targetPriceLow = minPrice.toString();
            scheduledTradeData.targetPriceHigh = maxPrice.toString();
            break;
          case 'price_percentage':
            if (!req.body.triggerValue) {
              return res.status(400).json({
                message: 'Percentage is required',
              });
            }
            const percentage = parseFloat(req.body.triggerValue);
            if (isNaN(percentage)) {
              return res.status(400).json({
                message: 'Invalid percentage. Use format: +5 or -5',
              });
            }
            scheduledTradeData.pricePercentage = percentage.toString();

            // Get current market price for basePriceSnapshot
            const marketData = await storage.getMarketData('BTC/USD');
            if (!marketData?.lastPrice) {
              return res.status(400).json({
                message: 'No market data available for percentage trigger',
              });
            }
            scheduledTradeData.basePriceSnapshot = parseFloat(
              marketData.lastPrice
            ).toString();
            break;
          default:
            return res.status(400).json({
              message: 'Invalid trigger type',
            });
        }
      } catch (parseError) {
        return res.status(400).json({
          message: 'Invalid trigger value format',
          error:
            parseError instanceof Error ? parseError.message : 'Unknown error',
        });
      }

      // Create scheduled trade
      const scheduledTrade = await storage.createScheduledTrade(
        scheduledTradeData
      );
      res.json(scheduledTrade);
    } catch (error) {
      console.error('Error creating scheduled trade:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({
          message: 'Invalid scheduled trade data',
          errors: error.errors,
        });
      } else {
        res.status(500).json({ message: 'Failed to create scheduled trade' });
      }
    }
  });

  app.put('/api/scheduled-trades/:id', async (req, res) => {
    try {
      const scheduledTradeId = parseInt(req.params.id);
      const updates = req.body;

      const scheduledTrade = await storage.getScheduledTrade(scheduledTradeId);
      if (!scheduledTrade) {
        return res.status(404).json({ message: 'Scheduled trade not found' });
      }

      // Only allow updates if the scheduled trade is still pending
      if (scheduledTrade.status !== 'pending') {
        return res.status(400).json({
          message: 'Cannot update scheduled trade that is not pending',
        });
      }

      const updatedScheduledTrade = await storage.updateScheduledTrade(
        scheduledTradeId,
        updates
      );
      res.json(updatedScheduledTrade);
    } catch (error) {
      console.error('Error updating scheduled trade:', error);
      res.status(500).json({ message: 'Failed to update scheduled trade' });
    }
  });

  app.delete('/api/scheduled-trades/:id', async (req, res) => {
    try {
      const scheduledTradeId = parseInt(req.params.id);

      const scheduledTrade = await storage.getScheduledTrade(scheduledTradeId);
      if (!scheduledTrade) {
        return res.status(404).json({ message: 'Scheduled trade not found' });
      }

      // Only allow deletion if the scheduled trade is still pending
      if (scheduledTrade.status !== 'pending') {
        return res.status(400).json({
          message: 'Cannot delete scheduled trade that is not pending',
        });
      }

      const deleted = await storage.deleteScheduledTrade(scheduledTradeId);
      if (deleted) {
        res.json({ message: 'Scheduled trade deleted successfully' });
      } else {
        res.status(404).json({ message: 'Scheduled trade not found' });
      }
    } catch (error) {
      console.error('Error deleting scheduled trade:', error);
      res.status(500).json({ message: 'Failed to delete scheduled trade' });
    }
  });

  // Swap endpoints
  app.get('/api/swaps/:userId', async (req, res) => {
    logRequest(req, 'Fetching user swaps', { userId: req.params.userId });
    try {
      const userId = parseInt(req.params.userId);
      const swaps = await storage.getSwapsByUserId(userId);
      logSuccess(req, 'User swaps retrieved', { count: swaps.length });
      res.json(swaps);
    } catch (error) {
      logError(req, 'Failed to fetch user swaps', error);
      res.status(500).json({ message: 'Failed to fetch swaps' });
    }
  });

  app.post('/api/swaps/execute', async (req, res) => {
    logRequest(req, 'Executing swap', req.body);
    try {
      const { userId, fromAsset, toAsset, amount, specifyInput } = req.body;

      if (!userId || !fromAsset || !toAsset || !amount) {
        return res.status(400).json({
          message: 'userId, fromAsset, toAsset, and amount are required',
        });
      }

      // Validate asset types
      if (
        !['BTC', 'USD'].includes(fromAsset) ||
        !['BTC', 'USD'].includes(toAsset)
      ) {
        return res.status(400).json({
          message: 'Only BTC and USD assets are supported',
        });
      }

      if (fromAsset === toAsset) {
        return res.status(400).json({
          message: 'Cannot swap between the same asset',
        });
      }

      // Get user's API credentials
      const user = await storage.getUser(userId);
      if (!user || !user.apiKey || !user.apiSecret || !user.apiPassphrase) {
        return res.status(400).json({
          message: 'User API credentials not configured',
        });
      }

      // Create LN Markets service instance
      const lnMarketsService = createLNMarketsService({
        apiKey: user.apiKey,
        secret: user.apiSecret,
        passphrase: user.apiPassphrase,
        network: 'mainnet',
      });

      // Prepare swap request
      const swapRequest = {
        in_asset: fromAsset as 'BTC' | 'USD',
        out_asset: toAsset as 'BTC' | 'USD',
        [specifyInput ? 'in_amount' : 'out_amount']: amount,
      };

      // Execute swap via LN Markets
      const swapResult = await lnMarketsService.executeSwap(swapRequest);

      // Handle the API response structure
      let inAmount: number;
      let outAmount: number;

      if (specifyInput) {
        // User specified input amount
        inAmount = amount;
        outAmount = swapResult.outAmount || 0;
      } else {
        // User specified output amount
        outAmount = amount;
        inAmount = swapResult.inAmount || 0;
      }

      // Validate amounts
      if (!inAmount || !outAmount) {
        throw new Error('Invalid swap result: missing amount data');
      }

      // Get current BTC price in USD as the exchange rate
      const marketTicker = await lnMarketsService.getFuturesTicker();
      const exchangeRate = marketTicker.lastPrice;

      // Store swap in database
      const swap = await storage.createSwap({
        userId,
        fromAsset,
        toAsset,
        fromAmount: inAmount.toString(),
        toAmount: outAmount.toString(),
        exchangeRate: exchangeRate.toString(),
        status: 'completed',
        fee: '0', // LN Markets doesn't charge explicit fees for swaps
      });

      // Sync user balance after swap
      await syncUserBalance(userId);

      logSuccess(req, 'Swap executed successfully', {
        swapId: swap.id,
        fromAmount: inAmount,
        toAmount: outAmount,
        rate: exchangeRate,
      });

      res.json(swap);
    } catch (error) {
      logError(req, 'Swap execution failed', error);
      res.status(500).json({
        message: 'Failed to execute swap',
        detail: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  app.post('/api/swaps/sync', async (req, res) => {
    logRequest(req, 'Starting swap sync from LN Markets');
    try {
      const { userId } = req.body;

      if (!userId) {
        logError(
          req,
          'Swap sync failed - no user ID',
          new Error('Missing userId')
        );
        return res.status(400).json({ message: 'User ID is required' });
      }

      const user = await storage.getUser(userId);
      if (!user || !user.apiKey || !user.apiSecret || !user.apiPassphrase) {
        logError(
          req,
          'Swap sync failed - user credentials missing',
          new Error('Missing API credentials')
        );
        return res
          .status(400)
          .json({ message: 'User API credentials not found' });
      }

      const lnMarketsService = createLNMarketsService({
        apiKey: user.apiKey,
        secret: user.apiSecret,
        passphrase: user.apiPassphrase,
        network: 'mainnet',
      });

      // Fetch swap history from LN Markets
      logRequest(req, 'Fetching swap history from LN Markets API');
      const swapHistory = await lnMarketsService.getSwapHistory();
      let syncedCount = 0;
      let updatedCount = 0;

      logRequest(req, 'Processing swap history', {
        swapsFound: swapHistory.length,
      });

      for (const lnSwap of swapHistory) {
        // Check if swap already exists in our database
        const existingSwaps = await storage.getSwapsByUserId(userId);
        const existingSwap = existingSwaps.find(
          (s) => s.lnMarketsId === lnSwap.id
        );

        if (existingSwap) {
          // Update existing swap - swaps are typically final, so minimal updates needed
          await storage.updateSwap(existingSwap.id, {
            status: 'completed', // LN Markets swaps in history are completed
            updatedAt: new Date(),
          });
          updatedCount++;
        } else {
          // Create new swap from LN Markets data
          const exchangeRate = lnSwap.outAmount / lnSwap.inAmount;
          await storage.createSwap({
            userId,
            lnMarketsId: lnSwap.id,
            fromAsset: lnSwap.inAsset,
            toAsset: lnSwap.outAsset,
            fromAmount: lnSwap.inAmount.toString(),
            toAmount: lnSwap.outAmount.toString(),
            exchangeRate: exchangeRate.toString(),
            status: 'completed',
            fee: '0', // LN Markets doesn't charge explicit fees for swaps
          });
          syncedCount++;
        }
      }

      // Sync balance after swap sync
      await syncUserBalance(userId);

      const result = {
        message: 'Swaps synced successfully',
        syncedCount,
        updatedCount,
        totalProcessed: syncedCount + updatedCount,
      };

      logSuccess(req, 'Swap sync completed successfully', result);
      res.json(result);
    } catch (error) {
      logError(req, 'Swap sync failed', error);
      res.status(500).json({ message: 'Failed to sync swaps from LN Markets' });
    }
  });

  // Scheduled swap endpoints
  app.get('/api/scheduled-swaps/:userId', async (req, res) => {
    logRequest(req, 'Fetching user scheduled swaps', {
      userId: req.params.userId,
    });
    try {
      const userId = parseInt(req.params.userId);
      const scheduledSwaps = await storage.getScheduledSwapsByUserId(userId);
      logSuccess(req, 'User scheduled swaps retrieved', {
        count: scheduledSwaps.length,
      });
      res.json(scheduledSwaps);
    } catch (error) {
      logError(req, 'Failed to fetch user scheduled swaps', error);
      res.status(500).json({ message: 'Failed to fetch scheduled swaps' });
    }
  });

  app.post('/api/scheduled-swaps', async (req, res) => {
    logRequest(req, 'Creating scheduled swap', req.body);
    try {
      const {
        userId,
        scheduleType,
        swapDirection,
        amount,
        triggerConfig,
        name,
        description,
      } = req.body;

      // Validate required fields
      if (
        !userId ||
        !scheduleType ||
        !swapDirection ||
        !amount ||
        !triggerConfig
      ) {
        return res.status(400).json({
          message:
            'userId, scheduleType, swapDirection, amount, and triggerConfig are required',
        });
      }

      // Validate schedule type
      if (
        !['calendar', 'recurring', 'market_condition'].includes(scheduleType)
      ) {
        return res.status(400).json({
          message:
            'Invalid schedule type. Must be calendar, recurring, or market_condition',
        });
      }

      // Validate swap direction
      if (!['btc_to_usd', 'usd_to_btc'].includes(swapDirection)) {
        return res.status(400).json({
          message: 'Invalid swap direction. Must be btc_to_usd or usd_to_btc',
        });
      }

      // Validate trigger configuration based on schedule type
      let parsedTriggerConfig;
      try {
        switch (scheduleType) {
          case 'calendar':
            parsedTriggerConfig = calendarTriggerSchema.parse(triggerConfig);
            break;
          case 'recurring':
            parsedTriggerConfig = recurringTriggerSchema.parse(triggerConfig);
            break;
          case 'market_condition':
            parsedTriggerConfig =
              marketConditionTriggerSchema.parse(triggerConfig);
            break;
          default:
            throw new Error('Invalid schedule type');
        }
      } catch (validationError) {
        return res.status(400).json({
          message: 'Invalid trigger configuration',
          error:
            validationError instanceof Error
              ? validationError.message
              : 'Unknown error',
        });
      }

      // Check if user exists
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Create scheduled swap
      const scheduledSwap = await storage.createScheduledSwap({
        userId,
        scheduleType,
        swapDirection,
        amount: amount.toString(),
        triggerConfig: JSON.stringify(parsedTriggerConfig),
        name: name || null,
        description: description || null,
        status: 'active',
      });

      logSuccess(req, 'Scheduled swap created successfully', {
        scheduledSwapId: scheduledSwap.id,
        scheduleType,
        swapDirection,
        amount,
      });

      res.json(scheduledSwap);
    } catch (error) {
      logError(req, 'Failed to create scheduled swap', error);
      res.status(500).json({
        message: 'Failed to create scheduled swap',
        detail: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  app.put('/api/scheduled-swaps/:id', async (req, res) => {
    logRequest(req, 'Updating scheduled swap', {
      id: req.params.id,
      updates: req.body,
    });
    try {
      const scheduledSwapId = parseInt(req.params.id);
      const { name, description, status, triggerConfig } = req.body;

      // Get existing scheduled swap
      const existingScheduledSwap = await storage.getScheduledSwap(
        scheduledSwapId
      );
      if (!existingScheduledSwap) {
        return res.status(404).json({ message: 'Scheduled swap not found' });
      }

      // Only allow updates if the scheduled swap is active or paused
      if (!['active', 'paused'].includes(existingScheduledSwap.status)) {
        return res.status(400).json({
          message:
            'Cannot update scheduled swap that is completed or cancelled',
        });
      }

      // Validate trigger configuration if provided
      let parsedTriggerConfig;
      if (triggerConfig) {
        try {
          switch (existingScheduledSwap.scheduleType) {
            case 'calendar':
              parsedTriggerConfig = calendarTriggerSchema.parse(triggerConfig);
              break;
            case 'recurring':
              parsedTriggerConfig = recurringTriggerSchema.parse(triggerConfig);
              break;
            case 'market_condition':
              parsedTriggerConfig =
                marketConditionTriggerSchema.parse(triggerConfig);
              break;
            default:
              throw new Error('Invalid schedule type');
          }
        } catch (validationError) {
          return res.status(400).json({
            message: 'Invalid trigger configuration',
            error:
              validationError instanceof Error
                ? validationError.message
                : 'Unknown error',
          });
        }
      }

      // Update scheduled swap
      const updatedScheduledSwap = await storage.updateScheduledSwap(
        scheduledSwapId,
        {
          name: name !== undefined ? name : existingScheduledSwap.name,
          description:
            description !== undefined
              ? description
              : existingScheduledSwap.description,
          status: status !== undefined ? status : existingScheduledSwap.status,
          triggerConfig: parsedTriggerConfig
            ? JSON.stringify(parsedTriggerConfig)
            : existingScheduledSwap.triggerConfig,
        }
      );

      logSuccess(req, 'Scheduled swap updated successfully', {
        scheduledSwapId,
      });
      res.json(updatedScheduledSwap);
    } catch (error) {
      logError(req, 'Failed to update scheduled swap', error);
      res.status(500).json({
        message: 'Failed to update scheduled swap',
        detail: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  app.delete('/api/scheduled-swaps/:id', async (req, res) => {
    logRequest(req, 'Deleting scheduled swap', { id: req.params.id });
    try {
      const scheduledSwapId = parseInt(req.params.id);

      // Get existing scheduled swap
      const existingScheduledSwap = await storage.getScheduledSwap(
        scheduledSwapId
      );
      if (!existingScheduledSwap) {
        return res.status(404).json({ message: 'Scheduled swap not found' });
      }

      // Only allow deletion if the scheduled swap is active or paused
      if (!['active', 'paused'].includes(existingScheduledSwap.status)) {
        return res.status(400).json({
          message:
            'Cannot delete scheduled swap that is completed or cancelled',
        });
      }

      // Mark as cancelled instead of deleting
      await storage.updateScheduledSwap(scheduledSwapId, {
        status: 'cancelled',
      });

      logSuccess(req, 'Scheduled swap cancelled successfully', {
        scheduledSwapId,
      });
      res.json({ message: 'Scheduled swap cancelled successfully' });
    } catch (error) {
      logError(req, 'Failed to cancel scheduled swap', error);
      res.status(500).json({
        message: 'Failed to cancel scheduled swap',
        detail: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  app.get('/api/scheduled-swaps/:id/executions', async (req, res) => {
    logRequest(req, 'Fetching scheduled swap executions', {
      id: req.params.id,
    });
    try {
      const scheduledSwapId = parseInt(req.params.id);
      const executions = await storage.getSwapExecutionsByScheduledSwapId(
        scheduledSwapId
      );
      logSuccess(req, 'Scheduled swap executions retrieved', {
        count: executions.length,
      });
      res.json(executions);
    } catch (error) {
      logError(req, 'Failed to fetch scheduled swap executions', error);
      res.status(500).json({ message: 'Failed to fetch executions' });
    }
  });

  app.post('/api/scheduled-swaps/:id/execute', async (req, res) => {
    logRequest(req, 'Manually executing scheduled swap', { id: req.params.id });
    try {
      const scheduledSwapId = parseInt(req.params.id);

      // Get scheduled swap
      const scheduledSwap = await storage.getScheduledSwap(scheduledSwapId);
      if (!scheduledSwap) {
        return res.status(404).json({ message: 'Scheduled swap not found' });
      }

      // Check if scheduled swap is active
      if (scheduledSwap.status !== 'active') {
        return res.status(400).json({
          message: 'Cannot execute scheduled swap that is not active',
        });
      }

      // Get user's API credentials
      const user = await storage.getUser(scheduledSwap.userId);
      if (!user || !user.apiKey || !user.apiSecret || !user.apiPassphrase) {
        return res.status(400).json({
          message: 'User API credentials not configured',
        });
      }

      // Create LN Markets service instance
      const lnMarketsService = createLNMarketsService({
        apiKey: user.apiKey,
        secret: user.apiSecret,
        passphrase: user.apiPassphrase,
        network: 'mainnet',
      });

      try {
        // Determine swap parameters
        const [fromAsset, toAsset] =
          scheduledSwap.swapDirection === 'btc_to_usd'
            ? ['BTC', 'USD']
            : ['USD', 'BTC'];

        // Execute swap via LN Markets
        const swapRequest = {
          in_asset: fromAsset as 'BTC' | 'USD',
          out_asset: toAsset as 'BTC' | 'USD',
          in_amount: parseFloat(scheduledSwap.amount),
        };

        const swapResult = await lnMarketsService.executeSwap(swapRequest);

        // Get current BTC price as the exchange rate
        const marketTicker = await lnMarketsService.getFuturesTicker();
        const exchangeRate = marketTicker.lastPrice;

        // Store swap in database
        const swap = await storage.createSwap({
          userId: scheduledSwap.userId,
          fromAsset,
          toAsset,
          fromAmount: swapRequest.in_amount.toString(),
          toAmount: (swapResult.outAmount || 0).toString(),
          exchangeRate: exchangeRate.toString(),
          status: 'completed',
          fee: '0',
        });

        // Create swap execution record
        const swapExecution = await storage.createSwapExecution({
          scheduledSwapId: scheduledSwap.id,
          swapId: swap.id,
          executionTime: new Date(),
          status: 'success',
        });

        // Sync user balance after swap
        await syncUserBalance(scheduledSwap.userId);

        logSuccess(req, 'Scheduled swap executed successfully', {
          scheduledSwapId: scheduledSwap.id,
          swapId: swap.id,
          executionId: swapExecution.id,
        });

        res.json({
          message: 'Scheduled swap executed successfully',
          swap,
          execution: swapExecution,
        });
      } catch (swapError) {
        // Create failed execution record
        const swapExecution = await storage.createSwapExecution({
          scheduledSwapId: scheduledSwap.id,
          swapId: null,
          executionTime: new Date(),
          status: 'failed',
          failureReason:
            swapError instanceof Error ? swapError.message : 'Unknown error',
        });

        logError(req, 'Scheduled swap execution failed', swapError);
        res.status(500).json({
          message: 'Scheduled swap execution failed',
          execution: swapExecution,
          error:
            swapError instanceof Error ? swapError.message : 'Unknown error',
        });
      }
    } catch (error) {
      logError(req, 'Failed to execute scheduled swap', error);
      res.status(500).json({
        message: 'Failed to execute scheduled swap',
        detail: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
