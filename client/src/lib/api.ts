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
}

export interface TradeRequest {
  userId: number;
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
};
