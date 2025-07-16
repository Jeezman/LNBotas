import { createRestClient } from '@ln-markets/api';

export interface LNMarketsConfig {
  apiKey: string;
  secret: string;
  passphrase: string;
  network?: 'mainnet' | 'testnet';
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
  index: number;
  lastPrice: number;
  askPrice: number;
  bidPrice: number;
  carryFeeRate: number;
  carryFeeTimestamp: number;
  exchangesWeights: {
    bitmex: number;
    bybit: number;
    deribit: number;
    binance: number;
  };
}

export interface LNMarketsTrade {
  id: string;
  uid: string;
  type: 'm' | 'l'; // market or limit
  side: 'b' | 's'; // buy or sell
  opening_fee: number;
  closing_fee: number;
  maintenance_margin: number;
  quantity: number;
  margin: number;
  leverage: number;
  price: number;
  liquidation: number;
  stoploss: number;
  takeprofit: number;
  exit_price: number | null;
  pl: number;
  creation_ts: number;
  market_filled_ts: number | null;
  closed_ts: number | null;
  entry_price: number;
  entry_margin: number;
  open: boolean;
  running: boolean;
  canceled: boolean;
  closed: boolean;
  sum_carry_fees: number;
}

export interface UserInfo {
  uid: string;
  role: string;
  balance: number;
  username: string;
  login: string | null;
  synthetic_usd_balance: number;
  linkingpublickey: string;
  show_leaderboard: boolean;
  email: string;
  email_confirmed: boolean;
  use_taproot_addresses: boolean;
  account_type: string;
  auto_withdraw_enabled: boolean;
  auto_withdraw_lightning_address: string | null;
  totp_enabled: boolean;
  webauthn_enabled: boolean;
  fee_tier: number;
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

  constructor(config: LNMarketsConfig) {
    this.client = createRestClient({
      key: config.apiKey,
      secret: config.secret,
      passphrase: config.passphrase,
      network: config.network || 'mainnet',
    });
  }

  // User operations
  async getUserInfo(): Promise<UserInfo> {
    return this.client.userGet();
  }

  async getBalance(): Promise<{ balance: string }> {
    const userInfo = await this.client.userGet();
    console.log('LN Markets userInfo:', userInfo);
    return { balance: userInfo.balance.toString() };
  }

  // Futures operations
  async createFuturesTrade(trade: FuturesTradeRequest): Promise<any> {
    return this.client.futuresNewTrade(trade);
  }

  async getFuturesTrades(
    type: 'open' | 'closed' | 'running' = 'open'
  ): Promise<LNMarketsTrade[]> {
    // return this.client.futuresGetTrades({ type, from: 1714633904 });
    return this.client.futuresGetTrades({ type, from: 1751299710 });
  }

  async updateFuturesTrade(
    id: string,
    updates: { takeprofit?: number; stoploss?: number }
  ): Promise<any> {
    return this.client.futuresUpdateTrade({ id, ...updates });
  }

  async closeFuturesTrade(id: string): Promise<any> {
    // Use the dedicated library method for closing futures trades
    console.log('Closing futures trade with ID:', id);
    try {
      // Try different method names that might be available
      if (this.client.futuresCloseTrade) {
        const result = await this.client.futuresCloseTrade({ id });
        console.log('Futures trade close result:', result);
        return result;
      } else if (this.client.futuresClosePosition) {
        const result = await this.client.futuresClosePosition({ id });
        console.log('Futures position close result:', result);
        return result;
      } else {
        throw new Error('No suitable method found for closing futures trades');
      }
    } catch (error) {
      console.error('Error closing futures trade:', error);
      throw error;
    }
  }

  async closeAllFuturesTrades(): Promise<any> {
    return this.client.futuresCloseAllTrades();
  }

  async cancelAllFuturesOrders(): Promise<any> {
    return this.client.futuresCancelAllTrades();
  }

  async cancelFuturesOrder(id: string): Promise<any> {
    // Use the dedicated library method for cancelling individual futures orders
    console.log('Cancelling futures order with ID:', id);
    try {
      // Try different method names that might be available
      if (this.client.futuresCancelTrade) {
        const result = await this.client.futuresCancelTrade(id);
        console.log('Futures order cancel result:', result);
        return result;
      } else if (this.client.futuresCancelOrder) {
        const result = await this.client.futuresCancelOrder(id);
        console.log('Futures order cancel result:', result);
        return result;
      } else {
        throw new Error(
          'No suitable method found for cancelling futures orders'
        );
      }
    } catch (error) {
      console.error('Error cancelling futures order:', error);
      throw error;
    }
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

  // Note: futuresGetMarket() method is not available in the LN Markets API
  // Market data can be obtained through getFuturesTicker() method

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
  async generateDepositAddress(
    request: DepositRequest = {}
  ): Promise<DepositResponse> {
    try {
      console.log(
        'Calling LN Markets userDeposit API with amount:',
        request.amount
      );

      // Call the actual LN Markets userDeposit function
      const depositResponse = await this.client.userDeposit({
        amount: request.amount || 100000, // Default to 100k satoshis if not specified
      });

      console.log('LN Markets deposit response:', depositResponse);

      const crypto = await import('crypto');

      // Map the LN Markets response to our expected format
      const response: DepositResponse = {
        depositId:
          depositResponse.id ||
          depositResponse.depositId ||
          crypto.randomUUID(),
        paymentRequest:
          depositResponse.payment_request || depositResponse.paymentRequest,
        expiry: depositResponse.expiry || 90,
      };

      return response;
    } catch (error) {
      console.error(
        'Error generating deposit address via LN Markets API:',
        error
      );
      throw error;
    }
  }

  async getDepositHistory(): Promise<any[]> {
    try {
      console.log('Calling LN Markets userDepositHistory API');
      const depositHistory = await this.client.userDepositHistory({});
      console.log('LN Markets deposit history response:', depositHistory);
      return depositHistory || [];
    } catch (error) {
      console.error('Error fetching deposit history:', error);
      throw error;
    }
  }

  async getDepositStatus(depositId: string): Promise<any> {
    try {
      console.log('Fetching deposit status for ID:', depositId);
      // Get all deposits and find the specific one
      const deposits = await this.getDepositHistory();
      const deposit = deposits.find(
        (d) => d.id === depositId || d.deposit_id === depositId
      );

      if (!deposit) {
        console.log('Deposit not found in history:', depositId);
        return null;
      }

      console.log('Found deposit status:', deposit);
      return deposit;
    } catch (error) {
      console.error('Error fetching deposit status:', error);
      throw error;
    }
  }
}

export function createLNMarketsService(
  config: LNMarketsConfig
): LNMarketsService {
  return new LNMarketsService(config);
}
