import { drizzle } from 'drizzle-orm/neon-serverless';
import { scheduledSwaps, users } from './shared/schema.ts';
import { eq } from 'drizzle-orm';

// Initialize database connection
const db = drizzle(process.env.DATABASE_URL);

async function debugScheduledSwaps() {
  try {
    console.log('🔍 Fetching all scheduled swaps...');
    
    // Get all scheduled swaps
    const swaps = await db.select().from(scheduledSwaps);
    
    console.log(`📊 Found ${swaps.length} scheduled swaps:`);
    
    for (const swap of swaps) {
      console.log(`\n🔄 Swap ID: ${swap.id}`);
      console.log(`👤 User ID: ${swap.userId}`);
      console.log(`📅 Schedule Type: ${swap.scheduleType}`);
      console.log(`↔️ Swap Direction: ${swap.swapDirection}`);
      console.log(`💰 Amount: ${swap.amount}`);
      console.log(`📋 Status: ${swap.status}`);
      console.log(`🎯 Trigger Config: ${swap.triggerConfig}`);
      console.log(`📝 Name: ${swap.name || 'N/A'}`);
      console.log(`📄 Description: ${swap.description || 'N/A'}`);
      console.log(`🕐 Created: ${swap.createdAt}`);
      console.log(`🕒 Updated: ${swap.updatedAt}`);
      
      // Parse and pretty print trigger config
      try {
        const triggerConfig = JSON.parse(swap.triggerConfig);
        console.log(`🎯 Parsed Trigger Config:`, JSON.stringify(triggerConfig, null, 2));
      } catch (error) {
        console.log(`❌ Failed to parse trigger config: ${error.message}`);
      }
    }
    
    // Get current market data for reference
    console.log('\n📈 Current Market Data:');
    try {
      const { storage } = await import('./server/storage.js');
      const marketData = await storage.getMarketData('BTC/USD');
      if (marketData) {
        console.log(`💲 Current BTC Price: $${marketData.lastPrice}`);
        console.log(`📊 Mark Price: $${marketData.markPrice}`);
        console.log(`📈 Index Price: $${marketData.indexPrice}`);
        console.log(`🕐 Last Updated: ${marketData.updatedAt}`);
      } else {
        console.log('❌ No market data available');
      }
    } catch (error) {
      console.log(`❌ Failed to fetch market data: ${error.message}`);
    }
    
  } catch (error) {
    console.error('❌ Error debugging scheduled swaps:', error);
  }
}

// Run the debug function
debugScheduledSwaps().then(() => {
  console.log('\n✅ Debug complete');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Debug failed:', error);
  process.exit(1);
});