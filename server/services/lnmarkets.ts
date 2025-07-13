import { createRestClient } from "@ln-markets/api";

export interface LNMarketsConfig {
  apiKey: string;
  secret: string;
  passphrase: string;
  network?: "mainnet" | "testnet";
}

export interface FuturesTradeRequest {
  type: "l" | "m"; // limit or market
  side: "b" | "s"; // buy or sell
  margin: number; // in satoshis
  leverage: number;
  quantity?: number;
  takeprofit?: number;
  stoploss?: number;
  price?: number; // required for limit orders
}

export interface OptionsTradeRequest {
  side: "b"; // buy only for options
  quantity: number;
  settlement: "physical" | "cash";
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

export interface DepositRequest {
  amount?: number; // amount in satoshis (optional for address generation)
}

export interface DepositResponse {
  depositId: string;
  paymentRequest: string;
  expiry: number;
}

export class LNMarketsService {
  private client: any;
  private config: LNMarketsConfig;

  constructor(config: LNMarketsConfig) {
    this.config = config;
    this.client = createRestClient({
      key: config.apiKey,
      secret: config.secret,
      passphrase: config.passphrase,
      network: config.network || "mainnet",
    });
  }

  // User operations
  async getUserInfo(): Promise<UserInfo> {
    return this.client.userGet();
  }

  async getBalance(): Promise<{ balance: string }> {
    const userInfo = await this.client.userGet();
    return { balance: userInfo.balance };
  }

  // Futures operations
  async createFuturesTrade(trade: FuturesTradeRequest): Promise<any> {
    return this.client.futuresNewTrade(trade);
  }

  async getFuturesTrades(
    type: "open" | "closed" | "pending" = "open",
  ): Promise<any[]> {
    return this.client.futuresGetTrades({ type });
  }

  async updateFuturesTrade(
    id: string,
    updates: { takeprofit?: number; stoploss?: number },
  ): Promise<any> {
    return this.client.futuresUpdateTrade({ id, ...updates });
  }

  async closeFuturesTrade(id: string): Promise<any> {
    return this.client.futuresCloseTrade({ id });
  }

  async closeAllFuturesTrades(): Promise<any> {
    return this.client.futuresCloseAllTrades();
  }

  async cancelAllFuturesOrders(): Promise<any> {
    return this.client.futuresCancelAllTrades();
  }

  // Options operations
  async createOptionsTrade(trade: OptionsTradeRequest): Promise<any> {
    return this.client.optionsNewTrade(trade);
  }

  async getOptionsTrades(): Promise<any[]> {
    return this.client.optionsGetTrades();
  }

  async closeOptionsTrade(id: string): Promise<any> {
    return this.client.optionsCloseTrade({ id });
  }

  async getOptionsInstruments(): Promise<any[]> {
    return this.client.optionsGetInstruments();
  }

  // Market data operations
  async getFuturesTicker(): Promise<MarketTicker> {
    return this.client.futuresGetTicker();
  }

  async getFuturesMarket(): Promise<any> {
    return this.client.futuresGetMarket();
  }

  async getPriceHistory(from?: number, to?: number): Promise<any[]> {
    return this.client.futuresGetPriceHistory({ from, to });
  }

  async getIndexHistory(from?: number, to?: number): Promise<any[]> {
    return this.client.futuresGetIndexHistory({ from, to });
  }

  async getCarryFees(): Promise<any[]> {
    return this.client.futuresGetCarryFees();
  }

  async getVolatility(): Promise<any> {
    return this.client.optionsGetVolatility();
  }

  // Deposit operations
  async generateDepositAddress(request: DepositRequest = {}): Promise<DepositResponse> {
    try {
      console.log('Calling LN Markets userDeposit API with amount:', request.amount);
      
      // Call the actual LN Markets userDeposit function
      const depositResponse = await this.client.userDeposit({
        amount: request.amount || 100000 // Default to 100k satoshis if not specified
      });
      
      console.log('LN Markets deposit response:', depositResponse);
      
      const crypto = await import('crypto');
      
      // Map the LN Markets response to our expected format
      const response: DepositResponse = {
        depositId: depositResponse.id || depositResponse.depositId || crypto.randomUUID(),
        paymentRequest: depositResponse.payment_request || depositResponse.paymentRequest,
        expiry: depositResponse.expiry || 90
      };
      
      return response;
    } catch (error) {
      console.error('Error generating deposit address via LN Markets API:', error);
      throw error;
    }
  }

  async getDepositHistory(): Promise<any[]> {
    try {
      return this.client.getDeposits();
    } catch (error) {
      console.error('Error fetching deposit history:', error);
      throw error;
    }
  }

  async getDepositStatus(depositId: string): Promise<any> {
    try {
      return this.client.getDeposit({ id: depositId });
    } catch (error) {
      console.error('Error fetching deposit status:', error);
      throw error;
    }
  }
}

export function createLNMarketsService(
  config: LNMarketsConfig,
): LNMarketsService {
  return new LNMarketsService(config);
}
