import { storage } from '../storage';
import { createLNMarketsService, type LNMarketsTrade } from './lnmarkets';

// Sync interval in milliseconds (3  minutes)
const SYNC_INTERVAL = 3 * 60 * 1000;

let syncIntervalId: NodeJS.Timeout | null = null;

async function syncAllUserTrades() {
  console.log('[SYNC SCHEDULER] Starting periodic trade sync for all users');

  try {
    // Get all users with API credentials
    const allUsers = await storage.getAllUsers();
    const usersWithCredentials = allUsers.filter(
      (user) => user.apiKey && user.apiSecret && user.apiPassphrase
    );

    console.log(
      `[SYNC SCHEDULER] Found ${usersWithCredentials.length} users with API credentials`
    );

    let totalSynced = 0;
    let totalUpdated = 0;
    let successfulSyncs = 0;

    for (const user of usersWithCredentials) {
      try {
        console.log(
          `[SYNC SCHEDULER] Syncing trades for user ${user.username} (ID: ${user.id})`
        );

        const lnMarketsService = createLNMarketsService({
          apiKey: user.apiKey!,
          secret: user.apiSecret!,
          passphrase: user.apiPassphrase!,
          network: 'mainnet',
        });

        // Fetch and sync futures trades
        const futuresTrades = await lnMarketsService.getFuturesTrades();
        let userSynced = 0;
        let userUpdated = 0;

        for (const lnTrade of futuresTrades) {
          const existingTrades = await storage.getTradesByUserId(user.id);
          const existingTrade = existingTrades.find(
            (t) => t.lnMarketsId === lnTrade.id
          );

          if (existingTrade) {
            // Update existing trade with proper status mapping
            let status: string;
            if (lnTrade.closed) {
              status = 'closed';
            } else if (lnTrade.running) {
              status = 'open'; // Running trades are actively open
            } else if (lnTrade.open) {
              status = 'pending'; // Open but not running = waiting for limit price
            } else if (lnTrade.canceled) {
              status = 'cancelled';
            } else {
              status = 'pending';
            }

            await storage.updateTrade(existingTrade.id, {
              status: status,
              entryPrice: lnTrade.entry_price?.toString(),
              exitPrice: lnTrade.exit_price?.toString(),
              pnl: lnTrade.pl?.toString(),
              pnlUSD: null, // Not provided in response
              liquidationPrice: lnTrade.liquidation?.toString(),
              takeProfit: lnTrade.takeprofit ? lnTrade.takeprofit.toString() : null,
              stopLoss: lnTrade.stoploss ? lnTrade.stoploss.toString() : null,
              fee:
                lnTrade.opening_fee +
                lnTrade.closing_fee +
                lnTrade.sum_carry_fees,
              updatedAt: new Date(),
            });
            userUpdated++;
          } else {
            // Create new trade with proper status mapping
            let status: string;
            if (lnTrade.closed) {
              status = 'closed';
            } else if (lnTrade.running) {
              status = 'open'; // Running trades are actively open
            } else if (lnTrade.open) {
              status = 'pending'; // Open but not running = waiting for limit price
            } else if (lnTrade.canceled) {
              status = 'cancelled';
            } else {
              status = 'pending';
            }

            await storage.createTrade({
              userId: user.id,
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
              takeProfit: lnTrade.takeprofit ? lnTrade.takeprofit.toString() : null,
              stopLoss: lnTrade.stoploss ? lnTrade.stoploss.toString() : null,
              pnl: lnTrade.pl?.toString(),
              pnlUSD: null, // Not provided in response
              liquidationPrice: lnTrade.liquidation?.toString(),
              fee:
                lnTrade.opening_fee +
                lnTrade.closing_fee +
                lnTrade.sum_carry_fees,
              instrumentName: 'BTC/USD',
            });
            userSynced++;
          }
        }

        // Also sync options trades
        try {
          const optionsTrades = await lnMarketsService.getOptionsTrades();

          for (const lnTrade of optionsTrades) {
            const existingTrades = await storage.getTradesByUserId(user.id);
            const existingTrade = existingTrades.find(
              (t) => t.lnMarketsId === lnTrade.id
            );

            if (existingTrade) {
              await storage.updateTrade(existingTrade.id, {
                status: lnTrade.closed ? 'closed' : 'open',
                entryPrice: lnTrade.price?.toString(),
                exitPrice: lnTrade.exit_price?.toString(),
                pnl: lnTrade.pl?.toString(),
                pnlUSD: lnTrade.pl_usd?.toString(),
                updatedAt: new Date(),
              });
              userUpdated++;
            } else {
              await storage.createTrade({
                userId: user.id,
                lnMarketsId: lnTrade.id,
                type: 'options',
                side: 'buy',
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
              userSynced++;
            }
          }
        } catch (optionsError) {
          console.log(
            `[SYNC SCHEDULER] Options sync failed for user ${user.username}:`,
            optionsError
          );
        }

        totalSynced += userSynced;
        totalUpdated += userUpdated;
        successfulSyncs++;

        console.log(
          `[SYNC SCHEDULER] User ${user.username}: ${userSynced} new, ${userUpdated} updated`
        );
      } catch (userError) {
        console.error(
          `[SYNC SCHEDULER] Failed to sync trades for user ${user.username}:`,
          userError
        );
      }
    }

    console.log(
      `[SYNC SCHEDULER] Periodic sync completed: ${totalSynced} new trades, ${totalUpdated} updated trades across ${successfulSyncs} users`
    );
  } catch (error) {
    console.error('[SYNC SCHEDULER] Periodic sync failed:', error);
  }
}

export function startPeriodicSync() {
  console.log('[SYNC SCHEDULER] Starting periodic sync service');

  // Run sync immediately on startup
  syncAllUserTrades();

  // Schedule periodic sync
  syncIntervalId = setInterval(syncAllUserTrades, SYNC_INTERVAL);

  console.log(
    `[SYNC SCHEDULER] Periodic sync scheduled every ${
      SYNC_INTERVAL / 60000
    } minutes`
  );
}

export function stopPeriodicSync() {
  if (syncIntervalId) {
    clearInterval(syncIntervalId);
    syncIntervalId = null;
    console.log('[SYNC SCHEDULER] Periodic sync stopped');
  }
}
