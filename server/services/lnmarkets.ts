import { createHmac } from 'crypto';

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

export interface SwapRequest {
  in_asset: 'BTC' | 'USD';
  out_asset: 'BTC' | 'USD';
  in_amount?: number; // Amount in satoshis for BTC, cents for USD
  out_amount?: number; // Amount in satoshis for BTC, cents for USD
}

export interface SwapResponse {
  inAsset: string;
  outAsset: string;
  inAmount: number;
  outAmount: number;
}

export interface SwapHistoryItem {
  id: string;
  inAsset: string;
  outAsset: string;
  inAmount: number;
  outAmount: number;
  rate: number;
  timestamp: number;
}

export interface WithdrawalResponse {
  id: string;
  paymentHash: string;
  amount: number;
  fee: number;
  status: string;
  successTime: string;
}

export interface USDWithdrawalResponse extends WithdrawalResponse {
  usdAmount: number;
  btcAmount: number;
  exchangeRate: number;
  swapFee: number;
  totalFee: number;
}

export interface WithdrawalHistoryItem {
  id: string;
  amount: number;
  fee: number;
  invoice: string;
  payment_hash: string;
  status: string;
  created_ts: string;
  success_time?: string;
}

export interface WithdrawalEstimate {
  amount: number;
  fee: number;
  total: number;
  currency: 'BTC' | 'USD';
  usdAmount: number;
}

export class LNMarketsService {
  private config: LNMarketsConfig;
  private baseUrl: string;

  constructor(config: LNMarketsConfig) {
    this.config = config;
    this.baseUrl =
      config.network === 'testnet'
        ? 'https://api.testnet4.lnmarkets.com/v2'
        : 'https://api.lnmarkets.com/v2';
  }

  private generateSignature(
    timestamp: string,
    method: string,
    path: string,
    params: string = ''
  ): string {
    // LN Markets signature format: timestamp + method + path + params
    // path MUST include /v2 prefix (e.g., /v2/user not /user)
    // params: URLSearchParams for GET/DELETE, JSON for POST/PUT, empty string if no data
    const fullPath = `/v2${path}`;
    const message = timestamp + method.toUpperCase() + fullPath + params;

    console.log('⚙️  Signature generation:');
    console.log('📨 Message:', message);
    const signature = createHmac('sha256', this.config.secret)
      .update(message)
      .digest('base64');
    return signature;
  }

  private async makeRequest(
    method: string,
    path: string,
    data?: any
  ): Promise<any> {
    // LN Markets API expects timestamp in milliseconds since Unix Epoch
    // Must be within 30 seconds of API server time
    const timestamp = Date.now().toString();
    const upperMethod = method.toUpperCase();

    let params = '';
    let signaturePath = path;
    let requestPath = path;
    let requestBody: string | undefined;

    // Parse path to separate base path from existing query parameters
    const [basePath, existingQuery] = path.split('?');
    signaturePath = basePath; // Use base path for signature

    // Handle params based on HTTP method according to LN Markets API spec
    if (upperMethod.match(/^(GET|DELETE)$/)) {
      // For GET/DELETE: use existing query parameters for signature
      if (existingQuery) {
        params = existingQuery;
      } else if (data) {
        // Convert data to URLSearchParams only if no existing query parameters
        const searchParams = new URLSearchParams();
        Object.entries(data).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            searchParams.append(key, String(value));
          }
        });
        params = searchParams.toString();
        if (params) {
          requestPath = `${basePath}?${params}`;
        }
      }
      // No body for GET/DELETE
      requestBody = undefined;
    } else {
      // For POST/PUT: use JSON with no spaces
      if (data) {
        params = JSON.stringify(data);
        requestBody = params;
      }
    }

    const signature = this.generateSignature(
      timestamp,
      upperMethod,
      signaturePath,
      params
    );

    const url = `${this.baseUrl}${requestPath}`;
    const headers = {
      'LNM-ACCESS-KEY': this.config.apiKey,
      'LNM-ACCESS-SIGNATURE': signature,
      'LNM-ACCESS-PASSPHRASE': this.config.passphrase,
      'LNM-ACCESS-TIMESTAMP': timestamp,
      'Content-Type': 'application/json',
    };

    const requestOptions: RequestInit = {
      method: upperMethod,
      headers,
      ...(requestBody && { body: requestBody }),
    };

    console.log('🚀 Making request to:', url);

    const response = await fetch(url, requestOptions);

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('‼️ LNM - API Error Response:', errorBody);
      throw new Error(`HTTP ${response.status}: ${errorBody}`);
    }

    return response.json();
  }

  // User operations
  async getUserInfo(): Promise<UserInfo> {
    return this.makeRequest('GET', '/user');
  }

  async getBalance(): Promise<{ balance: string }> {
    const userInfo = await this.makeRequest('GET', '/user');
    return { balance: userInfo.balance.toString() };
  }

  // Futures operations
  async createFuturesTrade(trade: FuturesTradeRequest): Promise<any> {
    return this.makeRequest('POST', '/futures', trade);
  }

  async getFuturesTrades(
    type: 'open' | 'closed' | 'running' = 'open'
  ): Promise<LNMarketsTrade[]> {
    const params = new URLSearchParams();
    params.append('type', type);
    params.append('from', '1751299710');
    params.append('limit', '100');
    const url = `/futures?${params.toString()}`;
    return this.makeRequest('GET', url);
  }

  async updateFuturesTrade(
    id: string,
    updates: { takeprofit?: number; stoploss?: number }
  ): Promise<any> {
    if (!id || id === 'undefined' || id === 'null') {
      throw new Error('Invalid trade ID provided for updating futures trade');
    }

    // Build query parameters for valid updates only
    const params = new URLSearchParams();
    params.append('id', String(id));

    if (updates.takeprofit !== undefined && updates.takeprofit !== null) {
      params.append('takeprofit', updates.takeprofit.toString());
    }
    if (updates.stoploss !== undefined && updates.stoploss !== null) {
      params.append('stoploss', updates.stoploss.toString());
    }

    const url = `/futures?${params.toString()}`;
    return this.makeRequest('PUT', url);
  }

  async closeFuturesTrade(id: string): Promise<any> {
    console.log('Closing futures trade with ID:', id);

    if (!id || id === 'undefined' || id === 'null') {
      throw new Error('Invalid trade ID provided for closing futures trade');
    }

    // Ensure id is a string
    const tradeId = String(id);
    const url = `/futures?id=${encodeURIComponent(tradeId)}`;
    try {
      const result = await this.makeRequest('DELETE', url);
      console.log('Futures trade close result:', result);
      return result;
    } catch (error) {
      console.error('Error closing futures trade:', error);
      throw error;
    }
  }

  async closeAllFuturesTrades(): Promise<any> {
    return this.makeRequest('DELETE', '/futures/all');
  }

  async cancelAllFuturesOrders(): Promise<any> {
    return this.makeRequest('DELETE', '/futures/cancel-all');
  }

  async cancelFuturesOrder(id: string): Promise<any> {
    console.log('Cancelling futures order with ID:', id);

    if (!id || id === 'undefined' || id === 'null') {
      throw new Error('Invalid order ID provided for cancelling futures order');
    }

    try {
      const url = `/futures/cancel?id=${encodeURIComponent(String(id))}`;
      const result = await this.makeRequest('POST', url);
      console.log('Futures order cancel result:', result);
      return result;
    } catch (error) {
      console.error('Error cancelling futures order:', error);
      throw error;
    }
  }

  // Options operations
  async createOptionsTrade(trade: OptionsTradeRequest): Promise<any> {
    return this.makeRequest('POST', '/options', trade);
  }

  async getOptionsTrades(): Promise<any[]> {
    return this.makeRequest('GET', '/options');
  }

  async closeOptionsTrade(id: string): Promise<any> {
    if (!id || id === 'undefined' || id === 'null') {
      throw new Error('Invalid trade ID provided for closing options trade');
    }

    const url = `/options?id=${encodeURIComponent(String(id))}`;
    return this.makeRequest('DELETE', url);
  }

  async getOptionsInstruments(): Promise<any[]> {
    return this.makeRequest('GET', '/options/instruments');
  }

  // Market data operations
  async getFuturesTicker(): Promise<MarketTicker> {
    return this.makeRequest('GET', '/futures/ticker');
  }

  // Note: futuresGetMarket() method is not available in the LN Markets API
  // Market data can be obtained through getFuturesTicker() method

  async getPriceHistory(from?: number, to?: number): Promise<any[]> {
    const params = new URLSearchParams();
    if (from !== undefined && from !== null)
      params.append('from', from.toString());
    if (to !== undefined && to !== null) params.append('to', to.toString());
    const query = params.toString();
    return this.makeRequest(
      'GET',
      `/futures/history/price${query ? '?' + query : ''}`
    );
  }

  async getIndexHistory(from?: number, to?: number): Promise<any[]> {
    const params = new URLSearchParams();
    if (from !== undefined && from !== null)
      params.append('from', from.toString());
    if (to !== undefined && to !== null) params.append('to', to.toString());
    const query = params.toString();
    return this.makeRequest(
      'GET',
      `/futures/history/index${query ? '?' + query : ''}`
    );
  }

  async getCarryFees(): Promise<any[]> {
    const params = new URLSearchParams();
    params.append('from', '1751299710');
    params.append('to', Math.floor(Date.now() / 1000).toString());
    const url = `/futures/carry-fees?${params.toString()}`;
    return this.makeRequest('GET', url);
  }

  async getVolatility(): Promise<any> {
    // This endpoint doesn't exist in the current LN Markets API
    console.warn('getVolatility endpoint not available in LN Markets API');
    return [];
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
      const depositResponse = await this.makeRequest('POST', '/user/deposit', {
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
        '❌ Error generating deposit address via LN Markets API:',
        error
      );
      throw error;
    }
  }

  async getDepositHistory(): Promise<any[]> {
    try {
      console.log('🔄 Calling LN Markets userDepositHistory API');
      const depositHistory = await this.makeRequest(
        'GET',
        '/user/deposit-history'
      );
      return depositHistory || [];
    } catch (error) {
      console.error('❌ Error fetching deposit history:', error);
      throw error;
    }
  }

  async getDepositStatus(depositId: string): Promise<any> {
    try {
      console.log('🔄 Fetching deposit status for ID:', depositId);
      // Get all deposits and find the specific one
      const deposits = await this.getDepositHistory();
      const deposit = deposits.find(
        (d) => d.id === depositId || d.deposit_id === depositId
      );

      if (!deposit) {
        console.log('❌ Deposit not found in history:', depositId);
        return null;
      }

      console.log('✅ Found deposit status:', deposit);
      return deposit;
    } catch (error) {
      console.error('❌ Error fetching deposit status:', error);
      throw error;
    }
  }

  // Swap operations
  async executeSwap(swapRequest: SwapRequest): Promise<SwapResponse> {
    try {
      console.log('🔄 Executing swap via LN Markets API:', swapRequest);

      // Validate that exactly one amount is specified
      if (
        (swapRequest.in_amount && swapRequest.out_amount) ||
        (!swapRequest.in_amount && !swapRequest.out_amount)
      ) {
        throw new Error('Must specify exactly one of in_amount or out_amount');
      }

      // Validate asset pair
      if (swapRequest.in_asset === swapRequest.out_asset) {
        throw new Error('Cannot swap between the same asset');
      }

      const result = await this.makeRequest('POST', '/swap', swapRequest);
      console.log('✅ Swap execution result:', result);

      // Transform the response to match our interface
      const response: SwapResponse = {
        inAsset: result.in_asset || swapRequest.in_asset,
        outAsset: result.out_asset || swapRequest.out_asset,
        inAmount: result.in_amount || swapRequest.in_amount || 0,
        outAmount: result.out_amount || swapRequest.out_amount || 0,
      };

      return response;
    } catch (error) {
      console.error('❌ Error executing swap:', error);
      throw error;
    }
  }

  async getSwapHistory(
    from?: number,
    to?: number,
    limit?: number
  ): Promise<SwapHistoryItem[]> {
    try {
      console.log('🔄 Fetching swap history from LN Markets API');
      const params = new URLSearchParams();

      if (from !== undefined && from !== null) {
        params.append('from', from.toString());
      }
      if (to !== undefined && to !== null) {
        params.append('to', to.toString());
      }
      if (limit !== undefined && limit !== null) {
        params.append('limit', limit.toString());
      }

      const query = params.toString();
      const swapHistory = await this.makeRequest(
        'GET',
        `/swap${query ? '?' + query : ''}`
      );
      console.log('✅ Swap history response:', swapHistory);
      return swapHistory || [];
    } catch (error) {
      console.error('❌ Error fetching swap history:', error);
      throw error;
    }
  }

  // Withdrawal operations
  async withdraw(
    invoice: string,
    amount?: number
  ): Promise<WithdrawalResponse> {
    try {
      console.log('🔄 Processing Lightning withdrawal');

      // Validate invoice format (basic check)
      if (!invoice || !invoice.startsWith('lnbc')) {
        throw new Error('Invalid Lightning invoice format');
      }

      const withdrawRequest: any = { invoice };

      // If amount is specified, include it (for withdrawing specific amount)
      if (amount !== undefined && amount > 0) {
        withdrawRequest.amount = amount;
        withdrawRequest.unit = 'sat';
      }

      const result = await this.makeRequest(
        'POST',
        '/user/withdraw',
        withdrawRequest
      );
      console.log('✅ Withdrawal successful:', result);

      return {
        id: result.id,
        paymentHash: result.payment_hash || result.paymentHash,
        amount: result.amount,
        fee: result.fee,
        status: 'completed',
        successTime:
          result.success_time || result.successTime || new Date().toISOString(),
      };
    } catch (error) {
      console.error('❌ Error processing withdrawal:', error);
      throw error;
    }
  }

  async withdrawUSD(
    amountInCents: number,
    invoice: string
  ): Promise<USDWithdrawalResponse> {
    try {
      console.log('🔄 Processing USD withdrawal');
      console.log(`  Amount: $${(amountInCents / 100).toFixed(2)} USD`);

      // Validate inputs
      if (amountInCents <= 0) {
        throw new Error('Invalid withdrawal amount');
      }
      if (!invoice || !invoice.startsWith('lnbc')) {
        throw new Error('Invalid Lightning invoice format');
      }

      // Withdraw USD directly via Lightning
      // LN Markets handles USD balance internally
      const withdrawRequest: any = {
        invoice,
      };

      const result = await this.makeRequest(
        'POST',
        '/user/withdraw/usd',
        withdrawRequest
      );

      console.log('✅ USD Withdrawal successful:', result);

      return {
        id: result.id,
        paymentHash: result.payment_hash || result.paymentHash,
        amount: result.amount_sats || result.amount, // Amount in sats
        fee: result.fee || 0,
        status: 'completed',
        successTime:
          result.success_time || result.successTime || new Date().toISOString(),
        usdAmount: amountInCents,
        btcAmount: result.amount_sats || result.amount,
        exchangeRate: result.exchange_rate || 0,
        swapFee: 0,
        totalFee: result.fee || 0,
      };
    } catch (error) {
      console.error('❌ Error processing USD withdrawal:', error);
      throw error;
    }
  }

  async getWithdrawalHistory(
    from?: number,
    to?: number,
    limit?: number
  ): Promise<WithdrawalHistoryItem[]> {
    try {
      console.log('🔄 Fetching withdrawal history');
      const params = new URLSearchParams();

      if (from !== undefined && from !== null) {
        params.append('from', from.toString());
      }
      if (to !== undefined && to !== null) {
        params.append('to', to.toString());
      }
      if (limit !== undefined && limit !== null) {
        params.append('limit', limit.toString());
      }

      const query = params.toString();
      const withdrawals = await this.makeRequest(
        'GET',
        `/user/withdraw${query ? '?' + query : ''}`
      );

      console.log(
        '✅ Withdrawal history fetched:',
        withdrawals?.length || 0,
        'items'
      );
      return withdrawals || [];
    } catch (error) {
      console.error('❌ Error fetching withdrawal history:', error);
      throw error;
    }
  }

  async estimateWithdrawalFee(
    amount: number,
    currency: 'BTC' | 'USD' = 'BTC'
  ): Promise<WithdrawalEstimate> {
    try {
      console.log('🔄 Estimating withdrawal fee');

      let btcAmount = amount;
      let usdAmount = 0;

      // Estimate Lightning Network fee (typically 1-2% or minimum 1 sat)
      const estimatedFee = Math.max(1, Math.floor(btcAmount * 0.01));

      return {
        amount: btcAmount,
        fee: estimatedFee,
        total: btcAmount + estimatedFee,
        currency,
        usdAmount,
      };
    } catch (error) {
      console.error('❌ Error estimating withdrawal fee:', error);
      // Return a default estimate if API call fails
      return {
        amount,
        fee: Math.max(1, Math.floor(amount * 0.01)),
        total: amount + Math.max(1, Math.floor(amount * 0.01)),
        currency,
        usdAmount: 0,
      };
    }
  }
}

export function createLNMarketsService(
  config: LNMarketsConfig
): LNMarketsService {
  return new LNMarketsService(config);
}
