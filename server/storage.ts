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
    
    // Create demo user and sample data
    this.createDemoUser();
    this.createSampleMarketData();
  }

  private createDemoUser() {
    const demoUser: User = {
      id: 1,
      username: 'demo_user',
      password: 'demo_password',
      apiKey: null,
      apiSecret: null,
      apiPassphrase: null,
      balance: '0.00100000', // 0.001 BTC
      balanceUSD: '43.75', // Approximate USD value
    };
    this.users.set(1, demoUser);
    this.currentUserId = 2; // Start next user ID from 2
  }

  private createSampleMarketData() {
    const sampleMarketData: MarketData = {
      id: 1,
      symbol: 'BTC/USD',
      lastPrice: '43750.00',
      markPrice: '43748.50',
      indexPrice: '43751.25',
      high24h: '44200.00',
      low24h: '43100.00',
      volume24h: '1250.50000000',
      volumeUSD: '54706875.00',
      openInterest: '8500.25000000',
      fundingRate: '0.000125',
      priceChange24h: '1.85',
      nextFundingTime: new Date(Date.now() + 6 * 60 * 60 * 1000), // 6 hours from now
      updatedAt: new Date(),
    };
    this.marketData.set('BTC/USD', sampleMarketData);
    this.currentMarketDataId = 2;
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
      apiKey: insertUser.apiKey || null,
      apiSecret: insertUser.apiSecret || null,
      apiPassphrase: insertUser.apiPassphrase || null,
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
      userId: insertTrade.userId,
      type: insertTrade.type,
      side: insertTrade.side,
      orderType: insertTrade.orderType,
      margin: insertTrade.margin || null,
      leverage: insertTrade.leverage || null,
      quantity: insertTrade.quantity || null,
      takeProfit: insertTrade.takeProfit || null,
      stopLoss: insertTrade.stopLoss || null,
      instrumentName: insertTrade.instrumentName || null,
      settlement: insertTrade.settlement || null,
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
      symbol: data.symbol,
      lastPrice: data.lastPrice || null,
      markPrice: data.markPrice || null,
      indexPrice: data.indexPrice || null,
      high24h: data.high24h || null,
      low24h: data.low24h || null,
      volume24h: data.volume24h || null,
      volumeUSD: data.volumeUSD || null,
      openInterest: data.openInterest || null,
      fundingRate: data.fundingRate || null,
      priceChange24h: data.priceChange24h || null,
      nextFundingTime: data.nextFundingTime || null,
      id: existing?.id || this.currentMarketDataId++,
      updatedAt: new Date(),
    };
    this.marketData.set(data.symbol, marketData);
    return marketData;
  }
}

export const storage = new MemStorage();
