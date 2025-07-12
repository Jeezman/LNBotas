import { users, trades, marketData, type User, type InsertUser, type Trade, type InsertTrade, type MarketData, type InsertMarketData } from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;

  // Trade operations
  getTrade(id: number): Promise<Trade | undefined>;
  getTradesByUserId(userId: number): Promise<Trade[]>;
  getActiveTradesByUserId(userId: number): Promise<Trade[]>;
  createTrade(trade: InsertTrade): Promise<Trade>;
  updateTrade(id: number, updates: Partial<Trade>): Promise<Trade | undefined>;
  deleteTrade(id: number): Promise<boolean>;

  // Market data operations
  getMarketData(symbol: string): Promise<MarketData | undefined>;
  updateMarketData(data: InsertMarketData): Promise<MarketData>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private trades: Map<number, Trade>;
  private marketData: Map<string, MarketData>;
  private currentUserId: number;
  private currentTradeId: number;
  private currentMarketDataId: number;

  constructor() {
    this.users = new Map();
    this.trades = new Map();
    this.marketData = new Map();
    this.currentUserId = 1;
    this.currentTradeId = 1;
    this.currentMarketDataId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { 
      ...insertUser, 
      id,
      balance: null,
      balanceUSD: null,
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async getTrade(id: number): Promise<Trade | undefined> {
    return this.trades.get(id);
  }

  async getTradesByUserId(userId: number): Promise<Trade[]> {
    return Array.from(this.trades.values()).filter(
      (trade) => trade.userId === userId,
    );
  }

  async getActiveTradesByUserId(userId: number): Promise<Trade[]> {
    return Array.from(this.trades.values()).filter(
      (trade) => trade.userId === userId && trade.status === 'open',
    );
  }

  async createTrade(insertTrade: InsertTrade): Promise<Trade> {
    const id = this.currentTradeId++;
    const trade: Trade = {
      ...insertTrade,
      id,
      lnMarketsId: null,
      status: 'pending',
      entryPrice: null,
      exitPrice: null,
      pnl: null,
      pnlUSD: null,
      fee: null,
      liquidationPrice: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.trades.set(id, trade);
    return trade;
  }

  async updateTrade(id: number, updates: Partial<Trade>): Promise<Trade | undefined> {
    const trade = this.trades.get(id);
    if (!trade) return undefined;
    
    const updatedTrade = { 
      ...trade, 
      ...updates, 
      updatedAt: new Date() 
    };
    this.trades.set(id, updatedTrade);
    return updatedTrade;
  }

  async deleteTrade(id: number): Promise<boolean> {
    return this.trades.delete(id);
  }

  async getMarketData(symbol: string): Promise<MarketData | undefined> {
    return this.marketData.get(symbol);
  }

  async updateMarketData(data: InsertMarketData): Promise<MarketData> {
    const existing = this.marketData.get(data.symbol);
    const marketData: MarketData = {
      ...data,
      id: existing?.id || this.currentMarketDataId++,
      updatedAt: new Date(),
    };
    this.marketData.set(data.symbol, marketData);
    return marketData;
  }
}

export const storage = new MemStorage();
