import { users, trades, marketData, deposits, type User, type InsertUser, type Trade, type InsertTrade, type MarketData, type InsertMarketData, type Deposit, type InsertDeposit } from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;

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

  // Deposit operations
  getDeposit(id: number): Promise<Deposit | undefined>;
  getDepositsByUserId(userId: number): Promise<Deposit[]>;
  getDepositByAddress(address: string): Promise<Deposit | undefined>;
  createDeposit(deposit: InsertDeposit): Promise<Deposit>;
  updateDeposit(id: number, updates: Partial<Deposit>): Promise<Deposit | undefined>;
  deleteDeposit(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private trades: Map<number, Trade>;
  private marketData: Map<string, MarketData>;
  private deposits: Map<number, Deposit>;
  private currentUserId: number;
  private currentTradeId: number;
  private currentMarketDataId: number;
  private currentDepositId: number;

  constructor() {
    this.users = new Map();
    this.trades = new Map();
    this.marketData = new Map();
    this.deposits = new Map();
    this.currentUserId = 1;
    this.currentTradeId = 1;
    this.currentMarketDataId = 1;
    this.currentDepositId = 1;
    
    // Create demo user
    this.createDemoUser();
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
      balanceUSD: '0.00', // USD value calculated dynamically
    };
    this.users.set(1, demoUser);
    this.currentUserId = 2; // Start next user ID from 2
  }


  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
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

  async deleteUser(id: number): Promise<boolean> {
    return this.users.delete(id);
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

  // Deposit operations
  async getDeposit(id: number): Promise<Deposit | undefined> {
    return this.deposits.get(id);
  }

  async getDepositsByUserId(userId: number): Promise<Deposit[]> {
    return Array.from(this.deposits.values()).filter(
      (deposit) => deposit.userId === userId,
    );
  }

  async getDepositByAddress(address: string): Promise<Deposit | undefined> {
    return Array.from(this.deposits.values()).find(
      (deposit) => deposit.address === address,
    );
  }

  async createDeposit(insertDeposit: InsertDeposit): Promise<Deposit> {
    const id = this.currentDepositId++;
    const deposit: Deposit = {
      id,
      userId: insertDeposit.userId,
      lnMarketsId: insertDeposit.lnMarketsId || null,
      address: insertDeposit.address,
      amount: insertDeposit.amount || null,
      receivedAmount: insertDeposit.receivedAmount || null,
      status: insertDeposit.status,
      txHash: insertDeposit.txHash || null,
      confirmations: 0,
      expiresAt: insertDeposit.expiresAt || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.deposits.set(id, deposit);
    return deposit;
  }

  async updateDeposit(id: number, updates: Partial<Deposit>): Promise<Deposit | undefined> {
    const deposit = this.deposits.get(id);
    if (!deposit) return undefined;
    
    const updatedDeposit = { 
      ...deposit, 
      ...updates, 
      updatedAt: new Date() 
    };
    this.deposits.set(id, updatedDeposit);
    return updatedDeposit;
  }

  async deleteDeposit(id: number): Promise<boolean> {
    return this.deposits.delete(id);
  }
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async deleteUser(id: number): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getTrade(id: number): Promise<Trade | undefined> {
    const [trade] = await db.select().from(trades).where(eq(trades.id, id));
    return trade || undefined;
  }

  async getTradesByUserId(userId: number): Promise<Trade[]> {
    return db.select().from(trades).where(eq(trades.userId, userId));
  }

  async getActiveTradesByUserId(userId: number): Promise<Trade[]> {
    return db.select().from(trades).where(and(eq(trades.userId, userId), eq(trades.status, 'open')));
  }

  async createTrade(insertTrade: InsertTrade): Promise<Trade> {
    const [trade] = await db
      .insert(trades)
      .values({
        ...insertTrade,
        status: 'pending',
      })
      .returning();
    return trade;
  }

  async updateTrade(id: number, updates: Partial<Trade>): Promise<Trade | undefined> {
    const [trade] = await db
      .update(trades)
      .set(updates)
      .where(eq(trades.id, id))
      .returning();
    return trade || undefined;
  }

  async deleteTrade(id: number): Promise<boolean> {
    const result = await db.delete(trades).where(eq(trades.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getMarketData(symbol: string): Promise<MarketData | undefined> {
    const [data] = await db.select().from(marketData).where(eq(marketData.symbol, symbol));
    return data || undefined;
  }

  async updateMarketData(data: InsertMarketData): Promise<MarketData> {
    // Check if market data already exists
    const existing = await this.getMarketData(data.symbol);
    
    if (existing) {
      // Update existing record
      const [updated] = await db
        .update(marketData)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(marketData.symbol, data.symbol))
        .returning();
      return updated;
    } else {
      // Insert new record
      const [inserted] = await db
        .insert(marketData)
        .values(data)
        .returning();
      return inserted;
    }
  }

  // Deposit operations
  async getDeposit(id: number): Promise<Deposit | undefined> {
    const [deposit] = await db.select().from(deposits).where(eq(deposits.id, id));
    return deposit || undefined;
  }

  async getDepositsByUserId(userId: number): Promise<Deposit[]> {
    return db.select().from(deposits).where(eq(deposits.userId, userId));
  }

  async getDepositByAddress(address: string): Promise<Deposit | undefined> {
    const [deposit] = await db.select().from(deposits).where(eq(deposits.address, address));
    return deposit || undefined;
  }

  async createDeposit(insertDeposit: InsertDeposit): Promise<Deposit> {
    const [deposit] = await db
      .insert(deposits)
      .values({
        ...insertDeposit,
        status: insertDeposit.status || 'pending',
        confirmations: 0,
      })
      .returning();
    return deposit;
  }

  async updateDeposit(id: number, updates: Partial<Deposit>): Promise<Deposit | undefined> {
    const [deposit] = await db
      .update(deposits)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(deposits.id, id))
      .returning();
    return deposit || undefined;
  }

  async deleteDeposit(id: number): Promise<boolean> {
    const result = await db.delete(deposits).where(eq(deposits.id, id));
    return (result.rowCount || 0) > 0;
  }
}

export const storage = new DatabaseStorage();
