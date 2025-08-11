import { apiRequest } from './queryClient';

export interface MarketData {
  lastPrice: string | null;
  markPrice: string | null;
  indexPrice: string | null;
  high24h: string | null;
  low24h: string | null;
  volume24h: string | null;
  volumeUSD: string | null;
  openInterest: string | null;
  fundingRate: string | null;
  priceChange24h: string | null;
  nextFundingTime: string | null;
}

export interface Trade {
  id: number;
  userId: number;
  lnMarketsId: string | null;
  type: string;
  side: string;
  orderType: string;
  status: string;
  entryPrice: string | null;
  exitPrice: string | null;
  limitPrice: string | null;
  margin: number | null;
  leverage: string | null;
  quantity: string | null;
  takeProfit: string | null;
  stopLoss: string | null;
  pnl: string | null;
  pnlUSD: string | null;
  fee: number | null;
  liquidationPrice: string | null;
  instrumentName: string | null;
  settlement: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduledTrade {
  id: number;
  userId: number;
  triggerType: 'date' | 'price_range' | 'price_percentage';
  status: 'pending' | 'triggered' | 'cancelled' | 'failed';
  type: string;
  side: string;
  orderType: string;
  margin: number | null;
  leverage: string | null;
  quantity: string | null;
  takeProfit: string | null;
  stopLoss: string | null;
  instrumentName: string | null;
  settlement: string | null;
  scheduledTime: string | null;
  targetPriceLow: number | null;
  targetPriceHigh: number | null;
  basePriceSnapshot: number | null;
  pricePercentage: number | null;
  executedTradeId: number | null;
  errorMessage: string | null;
  name: string | null;
  description: string | null;
  lastCheckedAt: string | null;
  executedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: number;
  username: string;
  apiKey: string | null;
  balance: string | null;
  balanceUSD: string | null;
  // LN Markets extended fields
  uid?: string;
  synthetic_usd_balance?: number;
  use_taproot_addresses?: boolean;
  auto_withdraw_enabled?: boolean;
  auto_withdraw_lightning_address?: string | null;
  linkingpublickey?: string;
  role?: string;
  email?: string;
  email_confirmed?: boolean;
  show_leaderboard?: boolean;
  account_type?: string;
  totp_enabled?: boolean;
  webauthn_enabled?: boolean;
  fee_tier?: number;
}

export interface TradeRequest {
  userId: number;
  type: 'futures' | 'options';
  side: 'buy' | 'sell';
  orderType: 'market' | 'limit';
  status: 'open' | 'running' | 'closed' | 'cancelled';
  margin?: number;
  leverage?: string;
  limitPrice?: string;
  quantity?: string;
  takeProfit?: string;
  stopLoss?: string;
  instrumentName?: string;
  settlement?: 'physical' | 'cash';
  entryPrice?: string;
}

export interface ScheduledTradeRequest {
  userId: number;
  triggerType: 'date' | 'price_range' | 'price_percentage';
  triggerValue: string; // Raw value (date string, price range string, or percentage string)
  type: 'futures' | 'options';
  side: 'buy' | 'sell';
  orderType: 'market' | 'limit';
  margin?: number;
  leverage?: string;
  quantity?: string;
  takeProfit?: string;
  stopLoss?: string;
  instrumentName?: string;
  settlement?: 'physical' | 'cash';
}

export interface Swap {
  id: number;
  userId: number;
  lnMarketsId: string | null;
  fromAsset: string;
  toAsset: string;
  fromAmount: number;
  toAmount: number;
  exchangeRate: string | null;
  fee: number | null;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface SwapRequest {
  userId: number;
  fromAsset: 'BTC' | 'USD';
  toAsset: 'BTC' | 'USD';
  amount: number;
  specifyInput: boolean; // true for input amount, false for output amount
}

export interface SwapQuote {
  fromAmount: number;
  toAmount: number;
  exchangeRate: number;
  fee: number;
  fromSymbol: string;
  toSymbol: string;
  expiresAt: string;
}

export interface SwapSyncResult {
  message: string;
  syncedCount: number;
  updatedCount: number;
  totalProcessed: number;
}

export interface Withdrawal {
  id: number;
  userId: number;
  lnMarketsId: string | null;
  type: 'lightning' | 'usd';
  invoice: string;
  paymentHash: string | null;
  amount: number;
  amountUsd: number | null;
  fee: number | null;
  swapFee: number | null;
  exchangeRate: string | null;
  status: 'pending' | 'completed' | 'failed';
  errorMessage: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WithdrawalEstimate {
  amount: number;
  fee: number;
  total: number;
  currency: 'BTC' | 'USD';
  exchangeRate: number;
  usdAmount: number;
}

export const api = {
  // Market data
  getMarketTicker: async (): Promise<MarketData> => {
    const response = await apiRequest('GET', '/api/market/ticker');
    return response.json();
  },

  updateMarketData: async (): Promise<MarketData> => {
    const response = await apiRequest('POST', '/api/market/update');
    return response.json();
  },

  // User operations
  getUser: async (userId: number): Promise<User> => {
    const response = await apiRequest('GET', `/api/user/${userId}`);
    return response.json();
  },

  getUserFullInfo: async (userId: number): Promise<User> => {
    const response = await apiRequest('GET', `/api/user/${userId}/full-info`);
    return response.json();
  },

  updateUserCredentials: async (
    userId: number,
    credentials: { apiKey: string; apiSecret: string; apiPassphrase: string }
  ) => {
    const response = await apiRequest(
      'POST',
      `/api/user/${userId}/credentials`,
      credentials
    );
    return response.json();
  },

  // Trade operations
  getTrades: async (userId: number): Promise<Trade[]> => {
    const response = await apiRequest('GET', `/api/trades/${userId}`);
    return response.json();
  },

  getActiveTrades: async (userId: number): Promise<Trade[]> => {
    const response = await apiRequest('GET', `/api/trades/${userId}/active`);
    return response.json();
  },

  createTrade: async (trade: TradeRequest): Promise<Trade> => {
    const response = await apiRequest('POST', '/api/trades', trade);
    return response.json();
  },

  updateTrade: async (
    tradeId: number,
    updates: { takeProfit?: string; stopLoss?: string }
  ): Promise<Trade> => {
    const response = await apiRequest('PUT', `/api/trades/${tradeId}`, updates);
    return response.json();
  },

  closeTrade: async (tradeId: number) => {
    const response = await apiRequest('DELETE', `/api/trades/${tradeId}`);
    return response.json();
  },

  closeAllTrades: async (userId: number) => {
    const response = await apiRequest(
      'DELETE',
      `/api/trades/${userId}/close-all`
    );
    return response.json();
  },

  cancelAllOrders: async (userId: number) => {
    const response = await apiRequest(
      'DELETE',
      `/api/trades/${userId}/cancel-all-orders`
    );
    return response.json();
  },

  // Scheduled trade operations
  getScheduledTrades: async (userId: number): Promise<ScheduledTrade[]> => {
    const response = await apiRequest('GET', `/api/scheduled-trades/${userId}`);
    return response.json();
  },

  createScheduledTrade: async (
    scheduledTrade: ScheduledTradeRequest
  ): Promise<ScheduledTrade> => {
    const response = await apiRequest(
      'POST',
      '/api/scheduled-trades',
      scheduledTrade
    );
    return response.json();
  },

  updateScheduledTrade: async (
    scheduledTradeId: number,
    updates: Partial<ScheduledTrade>
  ): Promise<ScheduledTrade> => {
    const response = await apiRequest(
      'PUT',
      `/api/scheduled-trades/${scheduledTradeId}`,
      updates
    );
    return response.json();
  },

  deleteScheduledTrade: async (scheduledTradeId: number) => {
    const response = await apiRequest(
      'DELETE',
      `/api/scheduled-trades/${scheduledTradeId}`
    );
    return response.json();
  },

  // Swap operations
  getSwaps: async (userId: number): Promise<Swap[]> => {
    const response = await apiRequest('GET', `/api/swaps/${userId}`);
    return response.json();
  },

  executeSwap: async (swapRequest: SwapRequest): Promise<Swap> => {
    const response = await apiRequest('POST', '/api/swaps/execute', swapRequest);
    return response.json();
  },

  syncSwaps: async (userId: number): Promise<SwapSyncResult> => {
    const response = await apiRequest('POST', '/api/swaps/sync', { userId });
    return response.json();
  },

  // Withdrawal operations
  withdrawLightning: async (
    userId: number,
    amount: number,
    invoice: string
  ): Promise<Withdrawal> => {
    const response = await apiRequest('POST', '/api/withdrawals/lightning', {
      userId,
      amount,
      invoice,
    });
    return response.json();
  },

  withdrawUSD: async (
    userId: number,
    amountUSD: number,
    invoice: string
  ): Promise<Withdrawal> => {
    const response = await apiRequest('POST', '/api/withdrawals/usd', {
      userId,
      amountUSD,
      invoice,
    });
    return response.json();
  },

  getWithdrawals: async (userId: number): Promise<Withdrawal[]> => {
    const response = await apiRequest('GET', `/api/withdrawals/${userId}`);
    return response.json();
  },

  estimateWithdrawalFee: async (
    userId: number,
    amount: number,
    currency: 'BTC' | 'USD' = 'BTC'
  ): Promise<WithdrawalEstimate> => {
    const response = await apiRequest('POST', '/api/withdrawals/estimate', {
      userId,
      amount,
      currency,
    });
    return response.json();
  },
};
