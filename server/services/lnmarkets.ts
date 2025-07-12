import { createHmac } from 'crypto';

export interface LNMarketsConfig {
  apiKey: string;
  secret: string;
  passphrase: string;
  baseUrl?: string;
}

export interface FuturesTradeRequest {
  type: 'l' | 'm'; // limit or market
  side: 'b' | 's'; // buy or sell
  margin: number; // in satoshis
  leverage: number;
  quantity?: number;
  takeprofit?: number;
  stoploss?: number;
  price?: number; // required for limit orders
}

export interface OptionsTradeRequest {
  side: 'b'; // buy only for options
  quantity: number;
  settlement: 'physical' | 'cash';
  instrument_name: string;
}

export interface MarketTicker {
  last: string;
  bid: string;
  ask: string;
  high: string;
  low: string;
  volume: string;
  change: string;
}

export interface UserInfo {
  balance: string;
  account_type: string;
  username: string;
}

export class LNMarketsService {
  private config: LNMarketsConfig;

  constructor(config: LNMarketsConfig) {
    this.config = {
      ...config,
      baseUrl: config.baseUrl || 'https://api.lnmarkets.com/v2',
    };
  }

  private createSignature(timestamp: string, method: string, path: string, params: string = ''): string {
    const message = `${timestamp}${method}${path}${params}`;
    return createHmac('sha256', this.config.secret)
      .update(message)
      .digest('base64');
  }

  private async makeRequest(method: string, endpoint: string, data?: any): Promise<any> {
    const timestamp = Date.now().toString();
    const path = `/v2${endpoint}`;
    const params = data ? JSON.stringify(data) : '';
    
    const signature = this.createSignature(timestamp, method, path, params);
    
    const headers: Record<string, string> = {
      'LNM-ACCESS-KEY': this.config.apiKey,
      'LNM-ACCESS-SIGNATURE': signature,
      'LNM-ACCESS-TIMESTAMP': timestamp,
      'LNM-ACCESS-PASSPHRASE': this.config.passphrase,
      'Content-Type': 'application/json',
    };

    const url = `${this.config.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`LN Markets API error: ${response.status} ${error}`);
    }

    return response.json();
  }

  // User operations
  async getUserInfo(): Promise<UserInfo> {
    return this.makeRequest('GET', '/user');
  }

  async getBalance(): Promise<{ balance: string }> {
    return this.makeRequest('GET', '/user/balance');
  }

  // Futures operations
  async createFuturesTrade(trade: FuturesTradeRequest): Promise<any> {
    return this.makeRequest('POST', '/futures', trade);
  }

  async getFuturesTrades(type: 'open' | 'closed' | 'pending' = 'open'): Promise<any[]> {
    return this.makeRequest('GET', `/futures?type=${type}`);
  }

  async updateFuturesTrade(id: string, updates: { takeprofit?: number; stoploss?: number }): Promise<any> {
    return this.makeRequest('PUT', `/futures?id=${id}`, updates);
  }

  async closeFuturesTrade(id: string): Promise<any> {
    return this.makeRequest('DELETE', `/futures?id=${id}`);
  }

  async closeAllFuturesTrades(): Promise<any> {
    return this.makeRequest('DELETE', '/futures/close-all');
  }

  async cancelAllFuturesOrders(): Promise<any> {
    return this.makeRequest('DELETE', '/futures/cancel-all');
  }

  // Options operations
  async createOptionsTrade(trade: OptionsTradeRequest): Promise<any> {
    return this.makeRequest('POST', '/options', trade);
  }

  async getOptionsTrades(): Promise<any[]> {
    return this.makeRequest('GET', '/options');
  }

  async closeOptionsTrade(id: string): Promise<any> {
    return this.makeRequest('DELETE', `/options?id=${id}`);
  }

  async getOptionsInstruments(): Promise<any[]> {
    return this.makeRequest('GET', '/options/instruments');
  }

  // Market data operations
  async getFuturesTicker(): Promise<MarketTicker> {
    return this.makeRequest('GET', '/futures/ticker');
  }

  async getFuturesMarket(): Promise<any> {
    return this.makeRequest('GET', '/futures/market');
  }

  async getPriceHistory(from?: number, to?: number): Promise<any[]> {
    let endpoint = '/futures/history/price';
    const params = new URLSearchParams();
    if (from) params.append('from', from.toString());
    if (to) params.append('to', to.toString());
    if (params.toString()) endpoint += `?${params.toString()}`;
    
    return this.makeRequest('GET', endpoint);
  }

  async getIndexHistory(from?: number, to?: number): Promise<any[]> {
    let endpoint = '/futures/history/index';
    const params = new URLSearchParams();
    if (from) params.append('from', from.toString());
    if (to) params.append('to', to.toString());
    if (params.toString()) endpoint += `?${params.toString()}`;
    
    return this.makeRequest('GET', endpoint);
  }

  async getCarryFees(): Promise<any[]> {
    return this.makeRequest('GET', '/futures/carry-fees');
  }

  async getVolatility(): Promise<any> {
    return this.makeRequest('GET', '/options/volatility');
  }
}

export function createLNMarketsService(config: LNMarketsConfig): LNMarketsService {
  return new LNMarketsService(config);
}
