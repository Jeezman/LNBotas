import type { Express, Request, Response } from 'express';
import { createServer, type Server } from 'http';
import { storage } from './storage';
import { insertTradeSchema, insertDepositSchema, validateTradeStatusTransition, updateTradeStatusSchema, type TradeStatus } from '@shared/schema';
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
      let marketTicker: MarketTicker,
        futuresMarket: any = null;

      try {
        logRequest(req, 'Calling LN Markets getFuturesTicker API');
        marketTicker = await lnMarketsService.getFuturesTicker();
        logRequest(req, 'LN Markets ticker data received', { marketTicker });
      } catch (tickerError) {
        logError(req, 'Failed to fetch ticker data', tickerError);
        throw tickerError;
      }

      // Note: getFuturesMarket() method is not available in LN Markets API
      // We'll use ticker data only for now
      logRequest(
        req,
        'Using ticker data only (getFuturesMarket not available)'
      );
      futuresMarket = null;

      // Calculate volume in USD using available data
      const lastPrice = marketTicker.lastPrice;
      // Note: LN Markets response doesn't include volume24h, using placeholder
      const volumeUSD = '0.00';

      // Map LN Markets data to our schema
      const marketDataUpdate = {
        symbol: 'BTC/USD',
        lastPrice: marketTicker.lastPrice.toString(),
        markPrice:
          futuresMarket?.mark_price?.toString() ||
          marketTicker.lastPrice.toString(), // Fallback to last price
        indexPrice:
          futuresMarket?.index_price?.toString() ||
          marketTicker.index.toString(), // Use index from ticker
        high24h: null, // Not available in current response
        low24h: null, // Not available in current response
        volume24h: null, // Not available in current response
        volumeUSD: volumeUSD,
        openInterest: futuresMarket?.open_interest?.toString() || null,
        fundingRate:
          futuresMarket?.funding_rate?.toString() ||
          marketTicker.carryFeeRate.toString(),
        priceChange24h: null, // Not available in current response
        nextFundingTime: futuresMarket?.next_funding_time
          ? new Date(futuresMarket.next_funding_time * 1000)
          : new Date(marketTicker.carryFeeTimestamp), // Use carry fee timestamp
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
            price: validatedData.orderType === 'limit' ? undefined : undefined, // Price would be set from client if needed
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

        if (trade.type === 'futures') {
          await lnMarkets.closeFuturesTrade(trade.lnMarketsId);
        } else {
          await lnMarkets.closeOptionsTrade(trade.lnMarketsId);
        }
      }

      await storage.updateTrade(tradeId, {
        status: 'closed',
      });

      res.json({ message: 'Trade closed successfully' });
    } catch (error) {
      console.error('Error closing trade:', error);
      res.status(500).json({ message: 'Failed to close trade' });
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
        const [openTrades, runningTrades] = await Promise.all([
          lnMarketsService.getFuturesTrades('open'),
          lnMarketsService.getFuturesTrades('running'),
          // lnMarketsService.getFuturesTrades('closed')
        ]);
        futuresTrades = [...openTrades, ...runningTrades];
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

  const httpServer = createServer(app);
  return httpServer;
}
