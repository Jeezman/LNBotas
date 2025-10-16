import { storage } from '../storage';
import { createLNMarketsService, type LNMarketsTrade } from './lnmarkets';
import type { TradeStatus, ScheduledSwap } from '../../shared/schema';
import { calendarTriggerSchema, recurringTriggerSchema, marketConditionTriggerSchema } from '../../shared/schema';

// Sync interval in milliseconds (5 minutes)
const SYNC_INTERVAL = 5 * 60 * 1000;

let syncIntervalId: NodeJS.Timeout | null = null;

async function syncUserBalance(userId: number): Promise<void> {
  try {
    const user = await storage.getUser(userId);
    if (!user || !user.apiKey || !user.apiSecret || !user.apiPassphrase) {
      return;
    }

    const lnMarkets = createLNMarketsService({
      apiKey: user.apiKey,
      secret: user.apiSecret,
      passphrase: user.apiPassphrase,
    });

    const balance = await lnMarkets.getBalance();

    // Get current market data for USD conversion
    const marketData = await storage.getMarketData('BTC/USD');
    const btcPrice = marketData?.lastPrice
      ? parseFloat(marketData.lastPrice)
      : 0;

    await storage.updateUser(userId, {
      balance: balance.balance,
      balanceUSD:
        btcPrice > 0
          ? (parseFloat(balance.balance) * 0.00000001 * btcPrice).toString()
          : '0.00',
    });

    console.log(`[SYNC SCHEDULER] Balance synced for user ${userId}: ${balance.balance} BTC`);
  } catch (error) {
    console.error(`[SYNC SCHEDULER] Failed to sync balance for user ${userId}:`, error);
  }
}

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
            let status: TradeStatus;
            if (lnTrade.closed) {
              status = 'closed';
            } else if (lnTrade.running) {
              status = 'running'; // Running trades are actively running
            } else if (lnTrade.open) {
              status = 'open'; // Open but not running = waiting for limit price
            } else if (lnTrade.canceled) {
              status = 'cancelled';
            } else {
              status = 'open';
            }

            await storage.updateTrade(existingTrade.id, {
              status: status,
              entryPrice: lnTrade.entry_price?.toString(),
              exitPrice: lnTrade.exit_price?.toString(),
              pnl: lnTrade.pl?.toString(),
              pnlUSD: null, // Not provided in response
              liquidationPrice: lnTrade.liquidation?.toString(),
              takeProfit: lnTrade.takeprofit
                ? lnTrade.takeprofit.toString()
                : null,
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
            let status: TradeStatus;
            if (lnTrade.closed) {
              status = 'closed';
            } else if (lnTrade.running) {
              status = 'running'; // Running trades are actively running
            } else if (lnTrade.open) {
              status = 'open'; // Open but not running = waiting for limit price
            } else if (lnTrade.canceled) {
              status = 'cancelled';
            } else {
              status = 'open';
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
              takeProfit: lnTrade.takeprofit
                ? lnTrade.takeprofit.toString()
                : null,
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

        // Sync balance for this user
        await syncUserBalance(user.id);

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

// Check and execute scheduled trades
async function checkScheduledTrades() {
  console.log('🔍 Checking scheduled trades...');

  try {
    const pendingScheduledTrades = await storage.getPendingScheduledTrades();
    console.log(
      `👀 Found ${pendingScheduledTrades.length} pending scheduled trades`
    );

    for (const scheduledTrade of pendingScheduledTrades) {
      console.log(`⚙️ Processing scheduled trade ${scheduledTrade.id}:`, {
        triggerType: scheduledTrade.triggerType,
        status: scheduledTrade.status,
        scheduledTime: scheduledTrade.scheduledTime,
        targetPriceLow: scheduledTrade.targetPriceLow,
        targetPriceHigh: scheduledTrade.targetPriceHigh,
        pricePercentage: scheduledTrade.pricePercentage,
        basePriceSnapshot: scheduledTrade.basePriceSnapshot,
      });

      try {
        const shouldTrigger = await checkScheduledTradeTrigger(scheduledTrade);

        if (shouldTrigger) {
          // Check if we've already triggered this recently (within last 5 minutes)
          // This prevents duplicate executions when trigger conditions remain true
          const lastChecked = scheduledTrade.lastCheckedAt ? new Date(scheduledTrade.lastCheckedAt) : null;
          const now = new Date();
          const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
          
          if (lastChecked && lastChecked > fiveMinutesAgo) {
            console.log(
              `⏸️ Scheduled trade ${scheduledTrade.id} already triggered recently (last check: ${lastChecked.toISOString()}), skipping...`
            );
            continue;
          }

          console.log(
            `📺 Scheduled trade ${scheduledTrade.id} should trigger - executing...`
          );
          
          // Update lastCheckedAt before execution to prevent duplicate triggers
          await storage.updateScheduledTrade(scheduledTrade.id, {
            lastCheckedAt: now,
          });
          
          await executeScheduledTrade(scheduledTrade);
        } else {
          console.log(
            `📺 Scheduled trade ${scheduledTrade.id} should not trigger yet`
          );
        }
      } catch (error) {
        console.error(
          `❌ Error processing scheduled trade ${scheduledTrade.id}:`,
          error
        );

        // Mark as failed
        await storage.updateScheduledTrade(scheduledTrade.id, {
          status: 'failed',
          errorMessage:
            error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  } catch (error) {
    console.error('❌ Error checking scheduled trades:', error);
  }
}

async function checkScheduledTradeTrigger(
  scheduledTrade: any
): Promise<boolean> {
  switch (scheduledTrade.triggerType) {
    case 'date':
      return checkDateTrigger(scheduledTrade);
    case 'price_range':
      return await checkPriceRangeTrigger(scheduledTrade);
    case 'price_percentage':
      return await checkPricePercentageTrigger(scheduledTrade);
    default:
      throw new Error(`Unknown trigger type: ${scheduledTrade.triggerType}`);
  }
}

function checkDateTrigger(scheduledTrade: any): boolean {
  if (!scheduledTrade.scheduledTime) {
    console.log(
      `📺 Scheduled trade ${scheduledTrade.id}: No scheduled time set`
    );
    return false;
  }
  const triggerDate = new Date(scheduledTrade.scheduledTime);
  const now = new Date();
  const shouldTrigger = now >= triggerDate;

  console.log(
    `📺 Scheduled trade ${scheduledTrade.id}: Checking date trigger`,
    {
      scheduledTime: scheduledTrade.scheduledTime,
      triggerDate: triggerDate.toISOString(),
      now: now.toISOString(),
      shouldTrigger,
    }
  );

  return shouldTrigger;
}

async function checkPriceRangeTrigger(scheduledTrade: any): Promise<boolean> {
  if (!scheduledTrade.targetPriceLow || !scheduledTrade.targetPriceHigh) {
    console.log(`📺 Scheduled trade ${scheduledTrade.id}: No price range set`);
    return false;
  }

  const marketData = await storage.getMarketData('BTC/USD');
  if (!marketData?.lastPrice) {
    throw new Error('No market data available');
  }

  const currentPrice = parseFloat(marketData.lastPrice);
  const shouldTrigger =
    currentPrice >= scheduledTrade.targetPriceLow &&
    currentPrice <= scheduledTrade.targetPriceHigh;

  console.log(
    `📺 Scheduled trade ${scheduledTrade.id}: Checking price range trigger`,
    {
      currentPrice,
      targetPriceLow: scheduledTrade.targetPriceLow,
      targetPriceHigh: scheduledTrade.targetPriceHigh,
      shouldTrigger,
    }
  );

  return shouldTrigger;
}

async function checkPricePercentageTrigger(
  scheduledTrade: any
): Promise<boolean> {
  if (!scheduledTrade.pricePercentage || !scheduledTrade.basePriceSnapshot) {
    console.log(
      `📺 Scheduled trade ${scheduledTrade.id}: No percentage or base price set`
    );
    return false;
  }

  const marketData = await storage.getMarketData('BTC/USD');
  if (!marketData?.lastPrice) {
    throw new Error('No market data available');
  }

  const currentPrice = parseFloat(marketData.lastPrice);
  const targetPrice =
    scheduledTrade.basePriceSnapshot *
    (1 + scheduledTrade.pricePercentage / 100);

  let shouldTrigger;
  if (scheduledTrade.pricePercentage > 0) {
    // Positive percentage - trigger when price goes up
    shouldTrigger = currentPrice >= targetPrice;
  } else {
    // Negative percentage - trigger when price goes down
    shouldTrigger = currentPrice <= targetPrice;
  }

  console.log(
    `📺 Scheduled trade ${scheduledTrade.id}: Checking percentage trigger`,
    {
      currentPrice,
      basePriceSnapshot: scheduledTrade.basePriceSnapshot,
      pricePercentage: scheduledTrade.pricePercentage,
      targetPrice,
      shouldTrigger,
    }
  );

  return shouldTrigger;
}

async function executeScheduledTrade(scheduledTrade: any) {
  console.log(`📺 Executing scheduled trade ${scheduledTrade.id}...`);

  try {
    // Get user's API credentials
    const user = await storage.getUser(scheduledTrade.userId);
    if (!user || !user.apiKey || !user.apiSecret || !user.apiPassphrase) {
      throw new Error('User API credentials not configured');
    }

    const lnMarkets = createLNMarketsService({
      apiKey: user.apiKey,
      secret: user.apiSecret,
      passphrase: user.apiPassphrase,
    });

    // Create the actual trade
    const tradeData = {
      userId: scheduledTrade.userId,
      type: scheduledTrade.type,
      side: scheduledTrade.side,
      orderType: scheduledTrade.orderType,
      status: 'open' as const,
      margin: scheduledTrade.margin,
      leverage: scheduledTrade.leverage,
      quantity: scheduledTrade.quantity,
      takeProfit: scheduledTrade.takeProfit,
      stopLoss: scheduledTrade.stopLoss,
      instrumentName: scheduledTrade.instrumentName,
      settlement: scheduledTrade.settlement,
    };

    // Create trade in local storage first
    const trade = await storage.createTrade(tradeData);

    try {
      if (scheduledTrade.type === 'futures') {
        const lnTradeRequest = {
          type:
            scheduledTrade.orderType === 'market'
              ? ('m' as const)
              : ('l' as const),
          side: scheduledTrade.side === 'buy' ? ('b' as const) : ('s' as const),
          margin: scheduledTrade.margin!,
          leverage: parseFloat(scheduledTrade.leverage!),
          takeprofit: scheduledTrade.takeProfit
            ? parseFloat(scheduledTrade.takeProfit)
            : undefined,
          stoploss: scheduledTrade.stopLoss
            ? parseFloat(scheduledTrade.stopLoss)
            : undefined,
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

        if (updatedTrade) {
          // Mark scheduled trade as triggered
          await storage.updateScheduledTrade(scheduledTrade.id, {
            status: 'triggered',
            executedAt: new Date(),
            executedTradeId: updatedTrade.id,
          });

          console.log(
            `📺 Scheduled trade ${scheduledTrade.id} executed successfully as trade ${updatedTrade.id}`
          );
        }
      } else if (scheduledTrade.type === 'options') {
        const lnTradeRequest = {
          side: 'b' as const,
          quantity: parseFloat(scheduledTrade.quantity!),
          settlement: scheduledTrade.settlement as 'physical' | 'cash',
          instrument_name: scheduledTrade.instrumentName!,
        };

        const lnTrade = await lnMarkets.createOptionsTrade(lnTradeRequest);

        const updatedTrade = await storage.updateTrade(trade.id, {
          lnMarketsId: lnTrade.id,
          status: 'open',
          entryPrice: lnTrade.price,
          fee: lnTrade.fee,
        });

        if (updatedTrade) {
          // Mark scheduled trade as triggered
          await storage.updateScheduledTrade(scheduledTrade.id, {
            status: 'triggered',
            executedAt: new Date(),
            executedTradeId: updatedTrade.id,
          });

          console.log(
            `📺 Scheduled trade ${scheduledTrade.id} executed successfully as trade ${updatedTrade.id}`
          );
        }
      } else {
        throw new Error('Invalid trade type');
      }
    } catch (lnError) {
      // Update trade status to failed and mark scheduled trade as failed
      await storage.updateTrade(trade.id, {
        status: 'cancelled',
      });

      await storage.updateScheduledTrade(scheduledTrade.id, {
        status: 'failed',
        errorMessage:
          lnError instanceof Error ? lnError.message : 'LN Markets error',
      });

      throw lnError;
    }
  } catch (error) {
    console.error(
      `❌ Failed to execute scheduled trade ${scheduledTrade.id}:`,
      error
    );

    // Mark scheduled trade as failed
    await storage.updateScheduledTrade(scheduledTrade.id, {
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });

    throw error;
  }
}

// Check and execute scheduled swaps
async function checkScheduledSwaps() {
  console.log('🔄 Checking scheduled swaps...');

  try {
    const activeScheduledSwaps = await storage.getActiveScheduledSwaps();
    console.log(
      `👀 Found ${activeScheduledSwaps.length} active scheduled swaps`
    );

    for (const scheduledSwap of activeScheduledSwaps) {
      console.log(`⚙️ Processing scheduled swap ${scheduledSwap.id}:`, {
        scheduleType: scheduledSwap.scheduleType,
        swapDirection: scheduledSwap.swapDirection,
        amount: scheduledSwap.amount,
        status: scheduledSwap.status,
        triggerConfig: scheduledSwap.triggerConfig,
      });

      try {
        const shouldTrigger = await checkScheduledSwapTrigger(scheduledSwap);

        if (shouldTrigger) {
          console.log(
            `✅ Scheduled swap ${scheduledSwap.id} SHOULD TRIGGER - executing...`
          );
          await executeScheduledSwap(scheduledSwap);
        } else {
          console.log(
            `⏳ Scheduled swap ${scheduledSwap.id} should not trigger yet`
          );
        }
      } catch (error) {
        console.error(
          `❌ Error processing scheduled swap ${scheduledSwap.id}:`,
          error
        );

        // Create failed execution record
        await storage.createSwapExecution({
          scheduledSwapId: scheduledSwap.id,
          swapId: null,
          executionTime: new Date(),
          status: 'failed',
          failureReason: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  } catch (error) {
    console.error('❌ Error checking scheduled swaps:', error);
  }
}

async function checkScheduledSwapTrigger(scheduledSwap: ScheduledSwap): Promise<boolean> {
  try {
    console.log(`🔍 Checking trigger for swap ${scheduledSwap.id} (${scheduledSwap.scheduleType})`);
    const triggerConfig = JSON.parse(scheduledSwap.triggerConfig);
    console.log(`🔍 Parsed trigger config:`, triggerConfig);

    let result: boolean;
    switch (scheduledSwap.scheduleType) {
      case 'calendar':
        result = checkCalendarTrigger(triggerConfig);
        break;
      case 'recurring':
        result = checkRecurringTrigger(triggerConfig);
        break;
      case 'market_condition':
        result = await checkMarketConditionTrigger(triggerConfig);
        break;
      default:
        throw new Error(`Unknown schedule type: ${scheduledSwap.scheduleType}`);
    }
    
    console.log(`🔍 Trigger check result for swap ${scheduledSwap.id}: ${result ? '✅ SHOULD TRIGGER' : '❌ NOT YET'}`);
    return result;
  } catch (error) {
    console.error(`❌ Error parsing trigger config for swap ${scheduledSwap.id}:`, error);
    return false;
  }
}

function checkCalendarTrigger(triggerConfig: any): boolean {
  try {
    const config = calendarTriggerSchema.parse(triggerConfig);
    const triggerDate = new Date(config.dateTime);
    const now = new Date();
    const shouldTrigger = now >= triggerDate;

    console.log('📅 Calendar trigger check:', {
      triggerDate: triggerDate.toISOString(),
      now: now.toISOString(),
      shouldTrigger,
    });

    return shouldTrigger;
  } catch (error) {
    console.error('Error in calendar trigger check:', error);
    return false;
  }
}

function checkRecurringTrigger(triggerConfig: any): boolean {
  try {
    const config = recurringTriggerSchema.parse(triggerConfig);
    const now = new Date();
    
    console.log('🔁 Recurring trigger check:', {
      interval: config.interval,
      targetHour: config.hour,
      targetMinute: config.minute,
      currentTime: now.toISOString(),
      currentHour: now.getHours(),
      currentMinute: now.getMinutes(),
      dayOfWeek: config.dayOfWeek,
      dayOfMonth: config.dayOfMonth,
      startDate: config.startDate,
      endDate: config.endDate,
    });
    
    // Check if we're within the date range (if specified)
    if (config.startDate && new Date(config.startDate) > now) {
      console.log('❌ Recurring trigger: Before start date');
      return false;
    }
    if (config.endDate && new Date(config.endDate) < now) {
      console.log('❌ Recurring trigger: After end date');
      return false;
    }

    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const targetHour = config.hour;
    const targetMinute = config.minute;

    // Check if we're at the right time of day (within 5 minute window)
    const timeDiffMinutes = Math.abs((currentHour * 60 + currentMinute) - (targetHour * 60 + targetMinute));
    if (timeDiffMinutes > 5) {
      console.log(`❌ Recurring trigger: Time difference ${timeDiffMinutes} minutes > 5 minute window`);
      return false;
    }

    switch (config.interval) {
      case 'daily':
        console.log('✅ Recurring trigger: Daily time match');
        return true; // If time matches, trigger daily
      case 'weekly':
        const currentDayOfWeek = now.getDay();
        const weeklyMatch = config.dayOfWeek === currentDayOfWeek;
        console.log(`🔁 Recurring trigger: Weekly - current day ${currentDayOfWeek}, target day ${config.dayOfWeek}, match: ${weeklyMatch}`);
        return weeklyMatch;
      case 'monthly':
        const currentDayOfMonth = now.getDate();
        const monthlyMatch = config.dayOfMonth === currentDayOfMonth;
        console.log(`🔁 Recurring trigger: Monthly - current day ${currentDayOfMonth}, target day ${config.dayOfMonth}, match: ${monthlyMatch}`);
        return monthlyMatch;
      default:
        console.log(`❌ Recurring trigger: Unknown interval "${config.interval}"`);
        return false;
    }
  } catch (error) {
    console.error('❌ Error in recurring trigger check:', error);
    return false;
  }
}

async function checkMarketConditionTrigger(triggerConfig: any): Promise<boolean> {
  try {
    const config = marketConditionTriggerSchema.parse(triggerConfig);
    
    // Get current market price
    const marketData = await storage.getMarketData('BTC/USD');
    if (!marketData?.lastPrice) {
      console.error('❌ Market condition trigger: No market data available');
      throw new Error('No market data available');
    }

    const currentPrice = parseFloat(marketData.lastPrice);
    
    console.log('📊 Market condition trigger check:', {
      condition: config.condition,
      currentPrice,
      targetPrice: config.targetPrice,
      minPrice: config.minPrice,
      maxPrice: config.maxPrice,
      percentage: config.percentage,
      basePrice: config.basePrice,
    });

    // Handle percentage-based conditions
    if (config.percentage !== undefined && config.basePrice !== undefined) {
      const targetPrice = config.basePrice * (1 + config.percentage / 100);
      const shouldTrigger = config.percentage > 0 
        ? currentPrice >= targetPrice  // Positive percentage - trigger when price goes up
        : currentPrice <= targetPrice; // Negative percentage - trigger when price goes down
      
      console.log('📊 Percentage trigger evaluation:', {
        basePrice: config.basePrice,
        percentage: config.percentage,
        targetPrice,
        currentPrice,
        shouldTrigger,
      });
      
      return shouldTrigger;
    }

    // Handle absolute price conditions
    switch (config.condition) {
      case 'above':
        if (!config.targetPrice) {
          console.log('❌ Market condition trigger: "above" condition missing targetPrice');
          return false;
        }
        const aboveResult = currentPrice >= config.targetPrice;
        console.log(`📊 Above trigger: ${currentPrice} >= ${config.targetPrice} = ${aboveResult}`);
        return aboveResult;
      case 'below':
        if (!config.targetPrice) {
          console.log('❌ Market condition trigger: "below" condition missing targetPrice');
          return false;
        }
        const belowResult = currentPrice <= config.targetPrice;
        console.log(`📊 Below trigger: ${currentPrice} <= ${config.targetPrice} = ${belowResult}`);
        return belowResult;
      case 'between':
        if (!config.minPrice || !config.maxPrice) {
          console.log('❌ Market condition trigger: "between" condition missing minPrice or maxPrice');
          return false;
        }
        const betweenResult = currentPrice >= config.minPrice && currentPrice <= config.maxPrice;
        console.log(`📊 Between trigger: ${config.minPrice} <= ${currentPrice} <= ${config.maxPrice} = ${betweenResult}`);
        return betweenResult;
      default:
        console.log(`❌ Market condition trigger: Unknown condition "${config.condition}"`);
        return false;
    }
  } catch (error) {
    console.error('❌ Error in market condition trigger check:', error);
    return false;
  }
}

async function executeScheduledSwap(scheduledSwap: ScheduledSwap) {
  console.log(`🔄 Executing scheduled swap ${scheduledSwap.id}...`);

  try {
    // Get user's API credentials
    const user = await storage.getUser(scheduledSwap.userId);
    if (!user || !user.apiKey || !user.apiSecret || !user.apiPassphrase) {
      throw new Error('User API credentials not configured');
    }

    // Create LN Markets service instance
    const lnMarketsService = createLNMarketsService({
      apiKey: user.apiKey,
      secret: user.apiSecret,
      passphrase: user.apiPassphrase,
      network: 'mainnet',
    });

    // Determine swap parameters
    const [fromAsset, toAsset] = scheduledSwap.swapDirection === 'btc_to_usd' 
      ? ['BTC', 'USD'] 
      : ['USD', 'BTC'];

    // Execute swap via LN Markets
    const swapRequest = {
      in_asset: fromAsset as 'BTC' | 'USD',
      out_asset: toAsset as 'BTC' | 'USD',
      in_amount: parseFloat(scheduledSwap.amount),
    };

    const swapResult = await lnMarketsService.executeSwap(swapRequest);

    // Get current BTC price as the exchange rate
    const marketTicker = await lnMarketsService.getFuturesTicker();
    const exchangeRate = marketTicker.lastPrice;

    // Store swap in database
    const swap = await storage.createSwap({
      userId: scheduledSwap.userId,
      fromAsset,
      toAsset,
      fromAmount: swapRequest.in_amount.toString(),
      toAmount: (swapResult.outAmount || 0).toString(),
      exchangeRate: exchangeRate.toString(),
      status: 'completed',
      fee: '0',
    });

    // Create successful execution record
    const swapExecution = await storage.createSwapExecution({
      scheduledSwapId: scheduledSwap.id,
      swapId: swap.id,
      executionTime: new Date(),
      status: 'success',
    });

    // For one-time schedules, mark as completed
    if (scheduledSwap.scheduleType === 'calendar' || scheduledSwap.scheduleType === 'market_condition') {
      await storage.updateScheduledSwap(scheduledSwap.id, {
        status: 'completed',
      });
      console.log(`✅ Marked scheduled swap ${scheduledSwap.id} as completed (${scheduledSwap.scheduleType})`);
    } else if (scheduledSwap.scheduleType === 'recurring') {
      console.log(`🔄 Keeping scheduled swap ${scheduledSwap.id} active for future executions (recurring)`);
    }

    // Sync user balance after swap
    await syncUserBalance(scheduledSwap.userId);

    console.log(
      `✅ Scheduled swap ${scheduledSwap.id} executed successfully as swap ${swap.id}`
    );

    return { swap, execution: swapExecution };
  } catch (error) {
    console.error(
      `❌ Failed to execute scheduled swap ${scheduledSwap.id}:`,
      error
    );

    // Create failed execution record
    await storage.createSwapExecution({
      scheduledSwapId: scheduledSwap.id,
      swapId: null,
      executionTime: new Date(),
      status: 'failed',
      failureReason: error instanceof Error ? error.message : 'Unknown error',
    });

    throw error;
  }
}

export function startPeriodicSync() {
  console.log('🔄 [SYNC SCHEDULER] Starting periodic sync service');

  // Run sync immediately on startup
  syncAllUserTrades();

  // Schedule periodic sync
  syncIntervalId = setInterval(syncAllUserTrades, SYNC_INTERVAL);

  console.log(
    `🔄 [SYNC SCHEDULER] Periodic sync scheduled every ${
      SYNC_INTERVAL / 60000
    } minutes`
  );
}

export function stopPeriodicSync() {
  if (syncIntervalId) {
    clearInterval(syncIntervalId);
    syncIntervalId = null;
    console.log('🔄 [SYNC SCHEDULER] Periodic sync stopped');
  }
}

// Start the scheduler
export function startScheduler() {
  console.log('🔄 Starting scheduler...');

  // Check scheduled trades every 30 seconds for responsive triggering
  setInterval(checkScheduledTrades, 30 * 1000);

  // Check scheduled swaps every 30 seconds for responsive triggering
  setInterval(checkScheduledSwaps, 30 * 1000);

  // Initial checks
  checkScheduledTrades();
  checkScheduledSwaps();

  console.log('🔄 Scheduler started - checking both scheduled trades and swaps every 30 seconds');
}
