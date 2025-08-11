import {
  users,
  trades,
  marketData,
  deposits,
  withdrawals,
  scheduledTrades,
  swaps,
  scheduledSwaps,
  swapExecutions,
  type User,
  type InsertUser,
  type Trade,
  type InsertTrade,
  type MarketData,
  type InsertMarketData,
  type Deposit,
  type InsertDeposit,
  type Withdrawal,
  type InsertWithdrawal,
  type ScheduledTrade,
  type InsertScheduledTrade,
  type Swap,
  type InsertSwap,
  type ScheduledSwap,
  type InsertScheduledSwap,
  type SwapExecution,
  type InsertSwapExecution,
} from '@shared/schema';
import { db } from './db';
import { eq, and, or } from 'drizzle-orm';

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

  // Scheduled trade operations
  getScheduledTrade(id: number): Promise<ScheduledTrade | undefined>;
  getScheduledTradesByUserId(userId: number): Promise<ScheduledTrade[]>;
  getPendingScheduledTrades(): Promise<ScheduledTrade[]>;
  createScheduledTrade(
    scheduledTrade: InsertScheduledTrade
  ): Promise<ScheduledTrade>;
  updateScheduledTrade(
    id: number,
    updates: Partial<ScheduledTrade>
  ): Promise<ScheduledTrade | undefined>;
  deleteScheduledTrade(id: number): Promise<boolean>;

  // Market data operations
  getMarketData(symbol: string): Promise<MarketData | undefined>;
  updateMarketData(data: InsertMarketData): Promise<MarketData>;
  clearMarketData(symbol?: string): Promise<boolean>;

  // Deposit operations
  getDeposit(id: number): Promise<Deposit | undefined>;
  getDepositsByUserId(userId: number): Promise<Deposit[]>;
  getDepositByAddress(address: string): Promise<Deposit | undefined>;
  createDeposit(deposit: InsertDeposit): Promise<Deposit>;
  updateDeposit(
    id: number,
    updates: Partial<Deposit>
  ): Promise<Deposit | undefined>;
  deleteDeposit(id: number): Promise<boolean>;

  // Withdrawal operations
  getWithdrawal(id: number): Promise<Withdrawal | undefined>;
  getWithdrawalsByUserId(userId: number): Promise<Withdrawal[]>;
  getWithdrawalByPaymentHash(paymentHash: string): Promise<Withdrawal | undefined>;
  createWithdrawal(withdrawal: InsertWithdrawal): Promise<Withdrawal>;
  updateWithdrawal(
    id: number,
    updates: Partial<Withdrawal>
  ): Promise<Withdrawal | undefined>;
  deleteWithdrawal(id: number): Promise<boolean>;

  // Swap operations
  getSwap(id: number): Promise<Swap | undefined>;
  getSwapsByUserId(userId: number): Promise<Swap[]>;
  createSwap(swap: InsertSwap): Promise<Swap>;
  updateSwap(
    id: number,
    updates: Partial<Swap>
  ): Promise<Swap | undefined>;
  deleteSwap(id: number): Promise<boolean>;

  // Scheduled swap operations
  getScheduledSwap(id: number): Promise<ScheduledSwap | undefined>;
  getScheduledSwapsByUserId(userId: number): Promise<ScheduledSwap[]>;
  getActiveScheduledSwaps(): Promise<ScheduledSwap[]>;
  createScheduledSwap(scheduledSwap: InsertScheduledSwap): Promise<ScheduledSwap>;
  updateScheduledSwap(
    id: number,
    updates: Partial<ScheduledSwap>
  ): Promise<ScheduledSwap | undefined>;
  deleteScheduledSwap(id: number): Promise<boolean>;

  // Swap execution operations
  getSwapExecution(id: number): Promise<SwapExecution | undefined>;
  getSwapExecutionsByScheduledSwapId(scheduledSwapId: number): Promise<SwapExecution[]>;
  createSwapExecution(swapExecution: InsertSwapExecution): Promise<SwapExecution>;
  updateSwapExecution(
    id: number,
    updates: Partial<SwapExecution>
  ): Promise<SwapExecution | undefined>;
  deleteSwapExecution(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private trades: Map<number, Trade>;
  private scheduledTrades: Map<number, ScheduledTrade>;
  private marketData: Map<string, MarketData>;
  private deposits: Map<number, Deposit>;
  private withdrawals: Map<number, Withdrawal>;
  private swaps: Map<number, Swap>;
  private scheduledSwaps: Map<number, ScheduledSwap>;
  private swapExecutions: Map<number, SwapExecution>;
  private currentUserId: number;
  private currentTradeId: number;
  private currentScheduledTradeId: number;
  private currentMarketDataId: number;
  private currentDepositId: number;
  private currentWithdrawalId: number;
  private currentSwapId: number;
  private currentScheduledSwapId: number;
  private currentSwapExecutionId: number;

  constructor() {
    this.users = new Map();
    this.trades = new Map();
    this.scheduledTrades = new Map();
    this.marketData = new Map();
    this.deposits = new Map();
    this.withdrawals = new Map();
    this.swaps = new Map();
    this.scheduledSwaps = new Map();
    this.swapExecutions = new Map();
    this.currentUserId = 1;
    this.currentTradeId = 1;
    this.currentScheduledTradeId = 1;
    this.currentMarketDataId = 1;
    this.currentDepositId = 1;
    this.currentWithdrawalId = 1;
    this.currentSwapId = 1;
    this.currentScheduledSwapId = 1;
    this.currentSwapExecutionId = 1;

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
      (user) => user.username === username
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

  async updateUser(
    id: number,
    updates: Partial<User>
  ): Promise<User | undefined> {
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
      (trade) => trade.userId === userId
    );
  }

  async getActiveTradesByUserId(userId: number): Promise<Trade[]> {
    return Array.from(this.trades.values()).filter(
      (trade) =>
        trade.userId === userId &&
        (trade.status === 'open' || trade.status === 'running')
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
      limitPrice: insertTrade.limitPrice || null,
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

  async updateTrade(
    id: number,
    updates: Partial<Trade>
  ): Promise<Trade | undefined> {
    const trade = this.trades.get(id);
    if (!trade) return undefined;

    const updatedTrade = {
      ...trade,
      ...updates,
      updatedAt: new Date(),
    };
    this.trades.set(id, updatedTrade);
    return updatedTrade;
  }

  async deleteTrade(id: number): Promise<boolean> {
    return this.trades.delete(id);
  }

  // Scheduled trade operations
  async getScheduledTrade(id: number): Promise<ScheduledTrade | undefined> {
    return this.scheduledTrades.get(id);
  }

  async getScheduledTradesByUserId(userId: number): Promise<ScheduledTrade[]> {
    return Array.from(this.scheduledTrades.values()).filter(
      (scheduledTrade) => scheduledTrade.userId === userId
    );
  }

  async getPendingScheduledTrades(): Promise<ScheduledTrade[]> {
    return Array.from(this.scheduledTrades.values()).filter(
      (scheduledTrade) => scheduledTrade.status === 'pending'
    );
  }

  async createScheduledTrade(
    insertScheduledTrade: InsertScheduledTrade
  ): Promise<ScheduledTrade> {
    const id = this.currentScheduledTradeId++;
    const scheduledTrade: ScheduledTrade = {
      ...insertScheduledTrade,
      id,
      userId: insertScheduledTrade.userId,
      triggerType: insertScheduledTrade.triggerType,
      scheduledTime: insertScheduledTrade.scheduledTime || null,
      targetPriceLow: insertScheduledTrade.targetPriceLow || null,
      targetPriceHigh: insertScheduledTrade.targetPriceHigh || null,
      basePriceSnapshot: insertScheduledTrade.basePriceSnapshot || null,
      pricePercentage: insertScheduledTrade.pricePercentage || null,
      type: insertScheduledTrade.type,
      side: insertScheduledTrade.side,
      orderType: insertScheduledTrade.orderType,
      margin: insertScheduledTrade.margin || null,
      leverage: insertScheduledTrade.leverage || null,
      quantity: insertScheduledTrade.quantity || null,
      takeProfit: insertScheduledTrade.takeProfit || null,
      stopLoss: insertScheduledTrade.stopLoss || null,
      instrumentName: insertScheduledTrade.instrumentName || null,
      settlement: insertScheduledTrade.settlement || null,
      status: 'pending',
      executedTradeId: null,
      errorMessage: null,
      name: null,
      description: null,
      lastCheckedAt: null,
      executedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.scheduledTrades.set(id, scheduledTrade);
    return scheduledTrade;
  }

  async updateScheduledTrade(
    id: number,
    updates: Partial<ScheduledTrade>
  ): Promise<ScheduledTrade | undefined> {
    const scheduledTrade = this.scheduledTrades.get(id);
    if (!scheduledTrade) return undefined;

    const updatedScheduledTrade = {
      ...scheduledTrade,
      ...updates,
      updatedAt: new Date(),
    };
    this.scheduledTrades.set(id, updatedScheduledTrade);
    return updatedScheduledTrade;
  }

  async deleteScheduledTrade(id: number): Promise<boolean> {
    return this.scheduledTrades.delete(id);
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

  async clearMarketData(symbol?: string): Promise<boolean> {
    if (symbol) {
      // Clear specific symbol
      return this.marketData.delete(symbol);
    } else {
      // Clear all market data
      this.marketData.clear();
      return true;
    }
  }

  // Deposit operations
  async getDeposit(id: number): Promise<Deposit | undefined> {
    return this.deposits.get(id);
  }

  async getDepositsByUserId(userId: number): Promise<Deposit[]> {
    return Array.from(this.deposits.values()).filter(
      (deposit) => deposit.userId === userId
    );
  }

  async getDepositByAddress(address: string): Promise<Deposit | undefined> {
    return Array.from(this.deposits.values()).find(
      (deposit) => deposit.address === address
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

  async updateDeposit(
    id: number,
    updates: Partial<Deposit>
  ): Promise<Deposit | undefined> {
    const deposit = this.deposits.get(id);
    if (!deposit) return undefined;

    const updatedDeposit = {
      ...deposit,
      ...updates,
      updatedAt: new Date(),
    };
    this.deposits.set(id, updatedDeposit);
    return updatedDeposit;
  }

  async deleteDeposit(id: number): Promise<boolean> {
    return this.deposits.delete(id);
  }

  // Withdrawal operations
  async getWithdrawal(id: number): Promise<Withdrawal | undefined> {
    return this.withdrawals.get(id);
  }

  async getWithdrawalsByUserId(userId: number): Promise<Withdrawal[]> {
    return Array.from(this.withdrawals.values()).filter(
      (withdrawal) => withdrawal.userId === userId
    );
  }

  async getWithdrawalByPaymentHash(paymentHash: string): Promise<Withdrawal | undefined> {
    return Array.from(this.withdrawals.values()).find(
      (withdrawal) => withdrawal.paymentHash === paymentHash
    );
  }

  async createWithdrawal(insertWithdrawal: InsertWithdrawal): Promise<Withdrawal> {
    const id = this.currentWithdrawalId++;
    const withdrawal: Withdrawal = {
      id,
      userId: insertWithdrawal.userId,
      lnMarketsId: insertWithdrawal.lnMarketsId || null,
      type: insertWithdrawal.type || 'lightning',
      invoice: insertWithdrawal.invoice,
      paymentHash: insertWithdrawal.paymentHash || null,
      amount: insertWithdrawal.amount,
      amountUsd: insertWithdrawal.amountUsd || null,
      fee: insertWithdrawal.fee || 0,
      swapFee: insertWithdrawal.swapFee || 0,
      exchangeRate: insertWithdrawal.exchangeRate || null,
      status: insertWithdrawal.status || 'pending',
      errorMessage: insertWithdrawal.errorMessage || null,
      completedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.withdrawals.set(id, withdrawal);
    return withdrawal;
  }

  async updateWithdrawal(
    id: number,
    updates: Partial<Withdrawal>
  ): Promise<Withdrawal | undefined> {
    const withdrawal = this.withdrawals.get(id);
    if (!withdrawal) return undefined;
    const updated = { ...withdrawal, ...updates, updatedAt: new Date() };
    this.withdrawals.set(id, updated);
    return updated;
  }

  async deleteWithdrawal(id: number): Promise<boolean> {
    return this.withdrawals.delete(id);
  }

  // Swap operations
  async getSwap(id: number): Promise<Swap | undefined> {
    return this.swaps.get(id);
  }

  async getSwapsByUserId(userId: number): Promise<Swap[]> {
    return Array.from(this.swaps.values()).filter(swap => swap.userId === userId);
  }

  async createSwap(insertSwap: InsertSwap): Promise<Swap> {
    const swap: Swap = {
      id: this.currentSwapId++,
      ...insertSwap,
      lnMarketsId: insertSwap.lnMarketsId || null,
      exchangeRate: insertSwap.exchangeRate || null,
      status: insertSwap.status || 'pending',
      fee: insertSwap.fee || '0',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.swaps.set(swap.id, swap);
    return swap;
  }

  async updateSwap(
    id: number,
    updates: Partial<Swap>
  ): Promise<Swap | undefined> {
    const swap = this.swaps.get(id);
    if (!swap) return undefined;
    
    const updatedSwap: Swap = {
      ...swap,
      ...updates,
      updatedAt: new Date(),
    };
    this.swaps.set(id, updatedSwap);
    return updatedSwap;
  }

  async deleteSwap(id: number): Promise<boolean> {
    return this.swaps.delete(id);
  }

  // Scheduled swap operations
  async getScheduledSwap(id: number): Promise<ScheduledSwap | undefined> {
    return this.scheduledSwaps.get(id);
  }

  async getScheduledSwapsByUserId(userId: number): Promise<ScheduledSwap[]> {
    return Array.from(this.scheduledSwaps.values()).filter(
      (scheduledSwap) => scheduledSwap.userId === userId
    );
  }

  async getActiveScheduledSwaps(): Promise<ScheduledSwap[]> {
    return Array.from(this.scheduledSwaps.values()).filter(
      (scheduledSwap) => scheduledSwap.status === 'active'
    );
  }

  async createScheduledSwap(insertScheduledSwap: InsertScheduledSwap): Promise<ScheduledSwap> {
    const id = this.currentScheduledSwapId++;
    const scheduledSwap: ScheduledSwap = {
      id,
      userId: insertScheduledSwap.userId,
      scheduleType: insertScheduledSwap.scheduleType,
      swapDirection: insertScheduledSwap.swapDirection,
      amount: insertScheduledSwap.amount,
      triggerConfig: insertScheduledSwap.triggerConfig,
      status: insertScheduledSwap.status || 'active',
      name: insertScheduledSwap.name || null,
      description: insertScheduledSwap.description || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.scheduledSwaps.set(id, scheduledSwap);
    return scheduledSwap;
  }

  async updateScheduledSwap(
    id: number,
    updates: Partial<ScheduledSwap>
  ): Promise<ScheduledSwap | undefined> {
    const scheduledSwap = this.scheduledSwaps.get(id);
    if (!scheduledSwap) return undefined;

    const updatedScheduledSwap = {
      ...scheduledSwap,
      ...updates,
      updatedAt: new Date(),
    };
    this.scheduledSwaps.set(id, updatedScheduledSwap);
    return updatedScheduledSwap;
  }

  async deleteScheduledSwap(id: number): Promise<boolean> {
    return this.scheduledSwaps.delete(id);
  }

  // Swap execution operations
  async getSwapExecution(id: number): Promise<SwapExecution | undefined> {
    return this.swapExecutions.get(id);
  }

  async getSwapExecutionsByScheduledSwapId(scheduledSwapId: number): Promise<SwapExecution[]> {
    return Array.from(this.swapExecutions.values()).filter(
      (execution) => execution.scheduledSwapId === scheduledSwapId
    );
  }

  async createSwapExecution(insertSwapExecution: InsertSwapExecution): Promise<SwapExecution> {
    const id = this.currentSwapExecutionId++;
    const swapExecution: SwapExecution = {
      id,
      scheduledSwapId: insertSwapExecution.scheduledSwapId,
      swapId: insertSwapExecution.swapId || null,
      executionTime: insertSwapExecution.executionTime,
      status: insertSwapExecution.status,
      failureReason: insertSwapExecution.failureReason || null,
      createdAt: new Date(),
    };
    this.swapExecutions.set(id, swapExecution);
    return swapExecution;
  }

  async updateSwapExecution(
    id: number,
    updates: Partial<SwapExecution>
  ): Promise<SwapExecution | undefined> {
    const swapExecution = this.swapExecutions.get(id);
    if (!swapExecution) return undefined;

    const updatedSwapExecution = {
      ...swapExecution,
      ...updates,
    };
    this.swapExecutions.set(id, updatedSwapExecution);
    return updatedSwapExecution;
  }

  async deleteSwapExecution(id: number): Promise<boolean> {
    return this.swapExecutions.delete(id);
  }
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    return user || undefined;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(
    id: number,
    updates: Partial<User>
  ): Promise<User | undefined> {
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
    return db
      .select()
      .from(trades)
      .where(
        and(
          eq(trades.userId, userId),
          or(eq(trades.status, 'open'), eq(trades.status, 'running'))
        )
      );
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

  async updateTrade(
    id: number,
    updates: Partial<Trade>
  ): Promise<Trade | undefined> {
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

  // Scheduled trade operations
  async getScheduledTrade(id: number): Promise<ScheduledTrade | undefined> {
    const [scheduledTrade] = await db
      .select()
      .from(scheduledTrades)
      .where(eq(scheduledTrades.id, id));
    return scheduledTrade || undefined;
  }

  async getScheduledTradesByUserId(userId: number): Promise<ScheduledTrade[]> {
    return db
      .select()
      .from(scheduledTrades)
      .where(eq(scheduledTrades.userId, userId));
  }

  async getPendingScheduledTrades(): Promise<ScheduledTrade[]> {
    return db
      .select()
      .from(scheduledTrades)
      .where(eq(scheduledTrades.status, 'pending'));
  }

  async createScheduledTrade(
    insertScheduledTrade: InsertScheduledTrade
  ): Promise<ScheduledTrade> {
    const [scheduledTrade] = await db
      .insert(scheduledTrades)
      .values({
        ...insertScheduledTrade,
        status: 'pending',
        executedTradeId: null,
        errorMessage: null,
      })
      .returning();
    return scheduledTrade;
  }

  async updateScheduledTrade(
    id: number,
    updates: Partial<ScheduledTrade>
  ): Promise<ScheduledTrade | undefined> {
    const [scheduledTrade] = await db
      .update(scheduledTrades)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(scheduledTrades.id, id))
      .returning();
    return scheduledTrade || undefined;
  }

  async deleteScheduledTrade(id: number): Promise<boolean> {
    const result = await db
      .delete(scheduledTrades)
      .where(eq(scheduledTrades.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getMarketData(symbol: string): Promise<MarketData | undefined> {
    const [data] = await db
      .select()
      .from(marketData)
      .where(eq(marketData.symbol, symbol));
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
      const [inserted] = await db.insert(marketData).values(data).returning();
      return inserted;
    }
  }

  async clearMarketData(symbol?: string): Promise<boolean> {
    if (symbol) {
      // Clear specific symbol
      const result = await db
        .delete(marketData)
        .where(eq(marketData.symbol, symbol));
      return (result.rowCount || 0) > 0;
    } else {
      // Clear all market data
      const result = await db.delete(marketData);
      return (result.rowCount || 0) >= 0; // Returns true even if no rows deleted
    }
  }

  // Deposit operations
  async getDeposit(id: number): Promise<Deposit | undefined> {
    const [deposit] = await db
      .select()
      .from(deposits)
      .where(eq(deposits.id, id));
    return deposit || undefined;
  }

  async getDepositsByUserId(userId: number): Promise<Deposit[]> {
    return db.select().from(deposits).where(eq(deposits.userId, userId));
  }

  async getDepositByAddress(address: string): Promise<Deposit | undefined> {
    const [deposit] = await db
      .select()
      .from(deposits)
      .where(eq(deposits.address, address));
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

  async updateDeposit(
    id: number,
    updates: Partial<Deposit>
  ): Promise<Deposit | undefined> {
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

  // Withdrawal operations
  async getWithdrawal(id: number): Promise<Withdrawal | undefined> {
    const [withdrawal] = await db
      .select()
      .from(withdrawals)
      .where(eq(withdrawals.id, id));
    return withdrawal || undefined;
  }

  async getWithdrawalsByUserId(userId: number): Promise<Withdrawal[]> {
    return db.select().from(withdrawals).where(eq(withdrawals.userId, userId));
  }

  async getWithdrawalByPaymentHash(paymentHash: string): Promise<Withdrawal | undefined> {
    const [withdrawal] = await db
      .select()
      .from(withdrawals)
      .where(eq(withdrawals.paymentHash, paymentHash));
    return withdrawal || undefined;
  }

  async createWithdrawal(insertWithdrawal: InsertWithdrawal): Promise<Withdrawal> {
    const [withdrawal] = await db
      .insert(withdrawals)
      .values(insertWithdrawal)
      .returning();
    return withdrawal;
  }

  async updateWithdrawal(
    id: number,
    updates: Partial<Withdrawal>
  ): Promise<Withdrawal | undefined> {
    const [withdrawal] = await db
      .update(withdrawals)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(withdrawals.id, id))
      .returning();
    return withdrawal || undefined;
  }

  async deleteWithdrawal(id: number): Promise<boolean> {
    const result = await db.delete(withdrawals).where(eq(withdrawals.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Swap operations
  async getSwap(id: number): Promise<Swap | undefined> {
    const [swap] = await db
      .select()
      .from(swaps)
      .where(eq(swaps.id, id));
    return swap || undefined;
  }

  async getSwapsByUserId(userId: number): Promise<Swap[]> {
    return db.select().from(swaps).where(eq(swaps.userId, userId));
  }

  async createSwap(insertSwap: InsertSwap): Promise<Swap> {
    const [swap] = await db
      .insert(swaps)
      .values({
        ...insertSwap,
        status: insertSwap.status || 'pending',
        fee: insertSwap.fee || '0',
      })
      .returning();
    return swap;
  }

  async updateSwap(
    id: number,
    updates: Partial<Swap>
  ): Promise<Swap | undefined> {
    const [swap] = await db
      .update(swaps)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(swaps.id, id))
      .returning();
    return swap || undefined;
  }

  async deleteSwap(id: number): Promise<boolean> {
    const result = await db.delete(swaps).where(eq(swaps.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Scheduled swap operations
  async getScheduledSwap(id: number): Promise<ScheduledSwap | undefined> {
    const [scheduledSwap] = await db
      .select()
      .from(scheduledSwaps)
      .where(eq(scheduledSwaps.id, id));
    return scheduledSwap || undefined;
  }

  async getScheduledSwapsByUserId(userId: number): Promise<ScheduledSwap[]> {
    return db
      .select()
      .from(scheduledSwaps)
      .where(eq(scheduledSwaps.userId, userId));
  }

  async getActiveScheduledSwaps(): Promise<ScheduledSwap[]> {
    return db
      .select()
      .from(scheduledSwaps)
      .where(eq(scheduledSwaps.status, 'active'));
  }

  async createScheduledSwap(insertScheduledSwap: InsertScheduledSwap): Promise<ScheduledSwap> {
    const [scheduledSwap] = await db
      .insert(scheduledSwaps)
      .values({
        ...insertScheduledSwap,
        status: insertScheduledSwap.status || 'active',
      })
      .returning();
    return scheduledSwap;
  }

  async updateScheduledSwap(
    id: number,
    updates: Partial<ScheduledSwap>
  ): Promise<ScheduledSwap | undefined> {
    const [scheduledSwap] = await db
      .update(scheduledSwaps)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(scheduledSwaps.id, id))
      .returning();
    return scheduledSwap || undefined;
  }

  async deleteScheduledSwap(id: number): Promise<boolean> {
    const result = await db.delete(scheduledSwaps).where(eq(scheduledSwaps.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Swap execution operations
  async getSwapExecution(id: number): Promise<SwapExecution | undefined> {
    const [swapExecution] = await db
      .select()
      .from(swapExecutions)
      .where(eq(swapExecutions.id, id));
    return swapExecution || undefined;
  }

  async getSwapExecutionsByScheduledSwapId(scheduledSwapId: number): Promise<SwapExecution[]> {
    return db
      .select()
      .from(swapExecutions)
      .where(eq(swapExecutions.scheduledSwapId, scheduledSwapId));
  }

  async createSwapExecution(insertSwapExecution: InsertSwapExecution): Promise<SwapExecution> {
    const [swapExecution] = await db
      .insert(swapExecutions)
      .values(insertSwapExecution)
      .returning();
    return swapExecution;
  }

  async updateSwapExecution(
    id: number,
    updates: Partial<SwapExecution>
  ): Promise<SwapExecution | undefined> {
    const [swapExecution] = await db
      .update(swapExecutions)
      .set(updates)
      .where(eq(swapExecutions.id, id))
      .returning();
    return swapExecution || undefined;
  }

  async deleteSwapExecution(id: number): Promise<boolean> {
    const result = await db.delete(swapExecutions).where(eq(swapExecutions.id, id));
    return (result.rowCount || 0) > 0;
  }
}

export const storage = new DatabaseStorage();
