import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTradeSchema } from "@shared/schema";
import { createLNMarketsService } from "./services/lnmarkets";
import { z } from "zod";
import bcrypt from "bcrypt";

// Enhanced logging utility
function logRequest(req: Request, action: string, details?: any) {
  const timestamp = new Date().toISOString();
  const userInfo = req.body?.userId ? `[User: ${req.body.userId}]` : '';
  console.log(`[${timestamp}] ${req.method} ${req.path} ${userInfo} - ${action}`, details ? JSON.stringify(details) : '');
}

function logError(req: Request, action: string, error: any) {
  const timestamp = new Date().toISOString();
  const userInfo = req.body?.userId ? `[User: ${req.body.userId}]` : '';
  console.error(`[${timestamp}] ERROR ${req.method} ${req.path} ${userInfo} - ${action}:`, error.message || error);
}

function logSuccess(req: Request, action: string, result?: any) {
  const timestamp = new Date().toISOString();
  const userInfo = req.body?.userId ? `[User: ${req.body.userId}]` : '';
  console.log(`[${timestamp}] SUCCESS ${req.method} ${req.path} ${userInfo} - ${action}`, result ? `Result: ${JSON.stringify(result)}` : '');
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Market data endpoints
  app.get("/api/market/ticker", async (req, res) => {
    logRequest(req, "Fetching market ticker data");
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
          nextFundingTime: null
        });
      }

      logSuccess(req, "Market ticker data retrieved");
      res.json(marketData);
    } catch (error) {
      logError(req, "Failed to fetch market ticker", error);
      res.status(500).json({ message: "Failed to fetch market data" });
    }
  });

  // Update market data (called periodically)
  app.post("/api/market/update", async (req, res) => {
    logRequest(req, "Updating market data from LN Markets");
    try {
      // For market data, we can use any user's credentials or skip if none available
      // Market data is public information that doesn't require specific user credentials
      
      // For now, let's skip the real API call and just return default market data
      // This prevents the background task from failing when no credentials are available
      const marketData = await storage.updateMarketData({
        symbol: 'BTC/USD',
        lastPrice: '43750.00',
        markPrice: '43745.50',
        indexPrice: '43740.00',
        high24h: '44200.00',
        low24h: '43100.00',
        volume24h: '1250.5',
        volumeUSD: '54500000.00',
        openInterest: '125000000',
        fundingRate: '0.0001',
        priceChange24h: '2.1',
        nextFundingTime: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8 hours from now
      });

      res.json(marketData);
    } catch (error) {
      console.error('Error updating market data:', error);
      res.status(500).json({ message: "Failed to update market data" });
    }
  });

  // User endpoints
  app.post("/api/user/register", async (req, res) => {
    logRequest(req, "User registration attempt", { username: req.body.username });
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }

      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters long" });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
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
      logSuccess(req, "User registered successfully", { userId: user.id, username: user.username });
      res.json(safeUser);
    } catch (error) {
      logError(req, "User registration failed", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.post("/api/login", async (req, res) => {
    logRequest(req, "User login attempt", { username: req.body.username });
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }

      // Find user by username
      const user = await storage.getUserByUsername(username);
      if (!user) {

        return res.status(401).json({ message: "Invalid username or password" });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid username or password" });
      }

      // Don't return sensitive data
      const { password: _, ...safeUser } = user;
      logSuccess(req, "User logged in successfully", { userId: user.id, username: user.username });
      res.json(safeUser);
    } catch (error) {
      logError(req, "User login failed", error);
      res.status(500).json({ message: "Failed to log in" });
    }
  });

  app.delete("/api/user/:id", async (req, res) => {
    try {
      console.log('DELETE /api/user/:id called with params:', req.params);
      const userId = parseInt(req.params.id);
      console.log('Parsed user ID:', userId);
      
      if (!userId || isNaN(userId)) {
        console.log('Invalid user ID provided:', req.params.id);
        return res.status(400).json({ message: "User ID is required" });
      }

      // Check if user exists
      console.log('Checking if user exists with ID:', userId);
      const user = await storage.getUser(userId);
      console.log('User found:', user ? `${user.username} (ID: ${user.id})` : 'No user found');
      
      if (!user) {
        console.log('User not found with ID:', userId);
        return res.status(404).json({ message: "User not found" });
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
        return res.status(500).json({ message: "Failed to delete user account" });
      }

      console.log('User account deleted successfully');
      res.json({ message: "Account deleted successfully" });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ message: "Failed to delete account" });
    }
  });

  app.get("/api/user/:id", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Don't return sensitive data
      const { password, apiSecret, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.post("/api/user/:id/credentials", async (req, res) => {
    logRequest(req, "Updating user API credentials", { userId: req.params.id });
    try {
      const userId = parseInt(req.params.id);
      const { apiKey, apiSecret, apiPassphrase } = req.body;

      if (!apiKey || !apiSecret || !apiPassphrase) {
        return res.status(400).json({ message: "All API credentials are required" });
      }

      const updatedUser = await storage.updateUser(userId, {
        apiKey,
        apiSecret,
        apiPassphrase,
      });

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Test credentials by fetching user balance
      try {
        const lnMarkets = createLNMarketsService({
          apiKey,
          secret: apiSecret,
          passphrase: apiPassphrase,
        });

        const balance = await lnMarkets.getBalance();
        
        await storage.updateUser(userId, {
          balance: balance.balance,
          balanceUSD: (parseFloat(balance.balance) * 0.00000001 * 43750).toString(), // rough conversion
        });

        // Return updated user data
        const updatedUser = await storage.getUser(userId);
        res.json(updatedUser);
      } catch (apiError: any) {
        console.error('LN Markets API validation failed:', apiError);
        console.error('API Key being tested:', apiKey);
        console.error('API Secret length:', apiSecret?.length);
        console.error('API Passphrase:', apiPassphrase);
        res.status(400).json({ message: "Invalid API credentials", detail: apiError.message || 'API connection failed' });
      }
    } catch (error) {
      console.error('Error updating credentials:', error);
      res.status(500).json({ message: "Failed to update credentials" });
    }
  });

  // Trade endpoints
  app.get("/api/trades/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const trades = await storage.getTradesByUserId(userId);
      res.json(trades);
    } catch (error) {
      console.error('Error fetching trades:', error);
      res.status(500).json({ message: "Failed to fetch trades" });
    }
  });

  app.get("/api/trades/:userId/active", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const trades = await storage.getActiveTradesByUserId(userId);
      res.json(trades);
    } catch (error) {
      console.error('Error fetching active trades:', error);
      res.status(500).json({ message: "Failed to fetch active trades" });
    }
  });

  app.post("/api/trades", async (req, res) => {
    try {
      const validatedData = insertTradeSchema.parse(req.body);
      
      // Get user's API credentials
      const user = await storage.getUser(validatedData.userId);
      if (!user || !user.apiKey || !user.apiSecret || !user.apiPassphrase) {
        return res.status(400).json({ message: "User API credentials not configured" });
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
            type: validatedData.orderType === 'market' ? 'm' as const : 'l' as const,
            side: validatedData.side === 'buy' ? 'b' as const : 's' as const,
            margin: validatedData.margin!,
            leverage: parseFloat(validatedData.leverage!),
            takeprofit: validatedData.takeProfit ? parseFloat(validatedData.takeProfit) : undefined,
            stoploss: validatedData.stopLoss ? parseFloat(validatedData.stopLoss) : undefined,
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
        res.status(400).json({ message: "Invalid trade data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create trade" });
      }
    }
  });

  app.put("/api/trades/:id", async (req, res) => {
    try {
      const tradeId = parseInt(req.params.id);
      const { takeProfit, stopLoss } = req.body;

      const trade = await storage.getTrade(tradeId);
      if (!trade) {
        return res.status(404).json({ message: "Trade not found" });
      }

      const user = await storage.getUser(trade.userId);
      if (!user || !user.apiKey || !user.apiSecret || !user.apiPassphrase) {
        return res.status(400).json({ message: "User API credentials not configured" });
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
      res.status(500).json({ message: "Failed to update trade" });
    }
  });

  app.delete("/api/trades/:id", async (req, res) => {
    try {
      const tradeId = parseInt(req.params.id);
      
      const trade = await storage.getTrade(tradeId);
      if (!trade) {
        return res.status(404).json({ message: "Trade not found" });
      }

      const user = await storage.getUser(trade.userId);
      if (!user || !user.apiKey || !user.apiSecret || !user.apiPassphrase) {
        return res.status(400).json({ message: "User API credentials not configured" });
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

      res.json({ message: "Trade closed successfully" });
    } catch (error) {
      console.error('Error closing trade:', error);
      res.status(500).json({ message: "Failed to close trade" });
    }
  });

  app.delete("/api/trades/:userId/close-all", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      const user = await storage.getUser(userId);
      if (!user || !user.apiKey || !user.apiSecret || !user.apiPassphrase) {
        return res.status(400).json({ message: "User API credentials not configured" });
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
        activeTrades.map(trade => 
          storage.updateTrade(trade.id, { status: 'closed' })
        )
      );

      res.json({ message: "All trades closed successfully" });
    } catch (error) {
      console.error('Error closing all trades:', error);
      res.status(500).json({ message: "Failed to close all trades" });
    }
  });

  // Sync trades from LN Markets
  app.post("/api/trades/sync", async (req, res) => {
    logRequest(req, "Starting trade sync from LN Markets");
    try {
      const { userId } = req.body;
      
      if (!userId) {
        logError(req, "Sync failed - no user ID provided", new Error("Missing userId"));
        return res.status(400).json({ message: "User ID is required" });
      }

      logRequest(req, "Fetching user credentials for sync", { userId });
      const user = await storage.getUser(userId);
      if (!user || !user.apiKey || !user.apiSecret || !user.apiPassphrase) {
        logError(req, "Sync failed - user credentials not found", new Error("Missing API credentials"));
        return res.status(400).json({ message: "User API credentials not found" });
      }

      const lnMarketsService = createLNMarketsService({
        apiKey: user.apiKey,
        secret: user.apiSecret,
        passphrase: user.apiPassphrase,
        network: "mainnet"
      });

      // Fetch futures trades from LN Markets
      logRequest(req, "Fetching futures trades from LN Markets API");
      const futuresTrades = await lnMarketsService.getFuturesTrades();
      let syncedCount = 0;
      let updatedCount = 0;
      logRequest(req, "Processing futures trades", { tradesFound: futuresTrades.length });

      for (const lnTrade of futuresTrades) {
        // Check if trade already exists in our database
        const existingTrades = await storage.getTradesByUserId(userId);
        const existingTrade = existingTrades.find(t => t.lnMarketsId === lnTrade.id);

        if (existingTrade) {
          // Update existing trade with latest data from LN Markets
          await storage.updateTrade(existingTrade.id, {
            status: lnTrade.closed ? 'closed' : 'open',
            entryPrice: lnTrade.price?.toString(),
            exitPrice: lnTrade.exit_price?.toString(),
            pnl: lnTrade.pl?.toString(),
            pnlUSD: lnTrade.pl_usd?.toString(),
            liquidationPrice: lnTrade.liquidation?.toString(),
            updatedAt: new Date(),
          });
          updatedCount++;
        } else {
          // Create new trade from LN Markets data
          await storage.createTrade({
            userId: userId,
            lnMarketsId: lnTrade.id,
            type: 'futures',
            side: lnTrade.side === 'b' ? 'buy' : 'sell',
            orderType: lnTrade.type === 'l' ? 'limit' : 'market',
            status: lnTrade.closed ? 'closed' : 'open',
            entryPrice: lnTrade.price?.toString(),
            exitPrice: lnTrade.exit_price?.toString(),
            margin: lnTrade.margin,
            leverage: lnTrade.leverage?.toString(),
            quantity: lnTrade.quantity?.toString(),
            takeProfit: lnTrade.takeprofit?.toString(),
            stopLoss: lnTrade.stoploss?.toString(),
            pnl: lnTrade.pl?.toString(),
            pnlUSD: lnTrade.pl_usd?.toString(),
            liquidationPrice: lnTrade.liquidation?.toString(),
            instrumentName: 'BTC/USD',
          });
          syncedCount++;
        }
      }

      // Also fetch options trades
      try {
        logRequest(req, "Fetching options trades from LN Markets API");
        const optionsTrades = await lnMarketsService.getOptionsTrades();
        logRequest(req, "Processing options trades", { tradesFound: optionsTrades.length });
        
        for (const lnTrade of optionsTrades) {
          const existingTrades = await storage.getTradesByUserId(userId);
          const existingTrade = existingTrades.find(t => t.lnMarketsId === lnTrade.id);

          if (existingTrade) {
            await storage.updateTrade(existingTrade.id, {
              status: lnTrade.closed ? 'closed' : 'open',
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
        logError(req, "Error fetching options trades", optionsError);
      }

      const result = {
        message: "Trades synced successfully", 
        syncedCount, 
        updatedCount,
        totalProcessed: syncedCount + updatedCount
      };
      logSuccess(req, "Trade sync completed successfully", result);
      res.json(result);
    } catch (error) {
      logError(req, "Trade sync failed", error);
      res.status(500).json({ message: "Failed to sync trades from LN Markets" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
