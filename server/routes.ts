import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTradeSchema } from "@shared/schema";
import { createLNMarketsService } from "./services/lnmarkets";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Market data endpoints
  app.get("/api/market/ticker", async (req, res) => {
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

      res.json(marketData);
    } catch (error) {
      console.error('Error fetching market ticker:', error);
      res.status(500).json({ message: "Failed to fetch market data" });
    }
  });

  // Update market data (called periodically)
  app.post("/api/market/update", async (req, res) => {
    try {
      // In a real implementation, this would be called by a background job
      // For now, we'll use environment variables for API credentials
      const apiKey = process.env.LN_MARKETS_API_KEY;
      const apiSecret = process.env.LN_MARKETS_API_SECRET;
      const apiPassphrase = process.env.LN_MARKETS_API_PASSPHRASE;

      if (!apiKey || !apiSecret || !apiPassphrase) {
        return res.status(400).json({ message: "LN Markets API credentials not configured" });
      }

      const lnMarkets = createLNMarketsService({
        apiKey,
        secret: apiSecret,
        passphrase: apiPassphrase,
      });

      const [ticker, market] = await Promise.all([
        lnMarkets.getFuturesTicker(),
        lnMarkets.getFuturesMarket()
      ]);

      const marketData = await storage.updateMarketData({
        symbol: 'BTC/USD',
        lastPrice: ticker.last,
        markPrice: market.mark_price,
        indexPrice: market.index,
        high24h: ticker.high,
        low24h: ticker.low,
        volume24h: ticker.volume,
        volumeUSD: (parseFloat(ticker.volume) * parseFloat(ticker.last)).toString(),
        openInterest: market.open_interest,
        fundingRate: market.funding_rate,
        priceChange24h: ticker.change,
        nextFundingTime: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8 hours from now
      });

      res.json(marketData);
    } catch (error) {
      console.error('Error updating market data:', error);
      res.status(500).json({ message: "Failed to update market data" });
    }
  });

  // User endpoints
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

        res.json({ message: "API credentials updated successfully" });
      } catch (apiError) {
        res.status(400).json({ message: "Invalid API credentials" });
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

  const httpServer = createServer(app);
  return httpServer;
}
