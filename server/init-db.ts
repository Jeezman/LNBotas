import { db } from "./db";
import { users, marketData } from "@shared/schema";
import { eq } from "drizzle-orm";

export async function initializeDatabase() {
  try {
    // Check if demo user already exists
    const existingUser = await db.select().from(users).where(eq(users.username, 'demo_user'));
    
    if (existingUser.length === 0) {
      // Create demo user
      await db.insert(users).values({
        username: 'demo_user',
        password: 'demo_password',
        apiKey: null,
        apiSecret: null,
        apiPassphrase: null,
        balance: '0.00100000',
        balanceUSD: '43.75',
      });
      console.log('Demo user created successfully');
    }

    // Check if market data exists
    const existingMarketData = await db.select().from(marketData).where(eq(marketData.symbol, 'BTC/USD'));
    
    if (existingMarketData.length === 0) {
      // Create sample market data
      await db.insert(marketData).values({
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
        nextFundingTime: new Date(Date.now() + 6 * 60 * 60 * 1000),
      });
      console.log('Sample market data created successfully');
    }
    
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}