// Debug script for scheduled trades
// Run this with: node debug-scheduled-trades.js

import { storage } from './server/storage.js';

async function debugScheduledTrades() {
  console.log('=== Debugging Scheduled Trades ===\n');

  try {
    // Get all scheduled trades
    const allScheduledTrades = await storage.getScheduledTradesByUserId(1); // Assuming user ID 1
    console.log(`Total scheduled trades: ${allScheduledTrades.length}`);

    // Get pending scheduled trades
    const pendingScheduledTrades = await storage.getPendingScheduledTrades();
    console.log(`Pending scheduled trades: ${pendingScheduledTrades.length}\n`);

    if (pendingScheduledTrades.length === 0) {
      console.log('No pending scheduled trades found.');
      return;
    }

    // Check each pending trade
    for (const trade of pendingScheduledTrades) {
      console.log(`\n--- Scheduled Trade ID: ${trade.id} ---`);
      console.log(`Trigger Type: ${trade.triggerType}`);
      console.log(`Status: ${trade.status}`);
      console.log(`Created: ${trade.createdAt}`);

      if (trade.triggerType === 'date') {
        console.log(`Scheduled Time: ${trade.scheduledTime}`);
        if (trade.scheduledTime) {
          const triggerDate = new Date(trade.scheduledTime);
          const now = new Date();
          const shouldTrigger = now >= triggerDate;
          console.log(`Trigger Date: ${triggerDate.toISOString()}`);
          console.log(`Current Time: ${now.toISOString()}`);
          console.log(`Should Trigger: ${shouldTrigger}`);
        } else {
          console.log('ERROR: No scheduled time set!');
        }
      } else if (trade.triggerType === 'price_range') {
        console.log(
          `Price Range: ${trade.targetPriceLow} - ${trade.targetPriceHigh}`
        );
      } else if (trade.triggerType === 'price_percentage') {
        console.log(`Percentage: ${trade.pricePercentage}%`);
        console.log(`Base Price: ${trade.basePriceSnapshot}`);
      }

      console.log(
        `Trade Details: ${trade.type} ${trade.side} ${trade.orderType}`
      );
      console.log(`Margin: ${trade.margin} sats, Leverage: ${trade.leverage}x`);
    }

    // Check if scheduler is running
    console.log('\n=== Scheduler Status ===');
    console.log(
      'To check if scheduler is running, look for these logs in your server:'
    );
    console.log('- "Starting scheduler..."');
    console.log('- "Checking scheduled trades..."');
    console.log('- "Found X pending scheduled trades"');
  } catch (error) {
    console.error('Error debugging scheduled trades:', error);
  }
}

// Run the debug function
debugScheduledTrades()
  .then(() => {
    console.log('\n=== Debug Complete ===');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Debug failed:', error);
    process.exit(1);
  });
