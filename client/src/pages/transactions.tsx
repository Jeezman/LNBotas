import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { SwapHistoryTable } from '@/components/swap/swap-history-table';
import { WithdrawalModal } from '@/components/withdrawal-modal';
import { useWithdrawals } from '@/hooks/use-withdrawals';
import { 
  ArrowDownToLine, 
  ArrowUpDown, 
  TrendingUp, 
  Send,
  Download,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import { formatAmount } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import type { Trade, Withdrawal } from '@/lib/api';

export default function TransactionsPage() {
  const { user } = useAuth();
  const [isWithdrawalModalOpen, setIsWithdrawalModalOpen] = useState(false);
  
  // Fetch user data for balance
  const { data: userData } = useQuery({
    queryKey: ['/api/user', user?.id],
    queryFn: () => api.getUser(Number(user?.id)),
    enabled: !!user?.id,
  });

  const { data: userFullInfo } = useQuery({
    queryKey: ['/api/user/full-info', user?.id],
    queryFn: () => api.getUserFullInfo(Number(user?.id)),
    enabled: !!user?.id,
  });

  // Fetch all trades
  const { data: trades = [], isLoading: tradesLoading, refetch: refetchTrades } = useQuery({
    queryKey: ['/api/trades', user?.id],
    queryFn: () => api.getTrades(Number(user?.id)),
    enabled: !!user?.id,
  });

  // Fetch swaps
  const { data: swaps = [], isLoading: swapsLoading } = useQuery({
    queryKey: ['/api/swaps', user?.id],
    queryFn: () => api.getSwaps(Number(user?.id)),
    enabled: !!user?.id,
  });

  // Fetch withdrawals
  const { data: withdrawals = [], isLoading: withdrawalsLoading, refetch: refetchWithdrawals } = useWithdrawals(user?.id);

  // Fetch deposits (if API method exists)
  const deposits: any[] = []; // Placeholder until deposit API is added
  const depositsLoading = false;

  // Calculate statistics
  const totalTrades = trades.length;
  const totalSwaps = swaps.length;
  const totalWithdrawals = withdrawals.length;
  const totalDeposits = deposits.length;
  const totalTransactions = totalTrades + totalSwaps + totalWithdrawals + totalDeposits;

  // Calculate volumes
  const tradesVolume = trades.reduce((sum, trade) => {
    return sum + (Number(trade.quantity) || 0);
  }, 0);

  const swapsVolume = swaps.reduce((sum, swap) => {
    if (swap.fromAsset === 'BTC') {
      return sum + (Number(swap.fromAmount) || 0);
    }
    return sum;
  }, 0);

  const withdrawalsVolume = withdrawals.reduce((sum, withdrawal) => {
    return sum + (Number(withdrawal.amount) || 0);
  }, 0);

  const depositsVolume = deposits.reduce((sum: number, deposit: any) => {
    return sum + (Number(deposit.amount) || 0);
  }, 0);

  const totalVolume = tradesVolume + swapsVolume + withdrawalsVolume + depositsVolume;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'confirmed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  const btcBalance = userData?.balance ? parseFloat(userData.balance) : 0;
  const usdBalance = userFullInfo?.synthetic_usd_balance || 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
          <p className="text-muted-foreground">
            View all your trading activity, swaps, deposits, and withdrawals
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setIsWithdrawalModalOpen(true)}
            disabled={!userData || btcBalance === 0}
          >
            <Send className="mr-2 h-4 w-4" />
            Withdraw
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTransactions}</div>
            <p className="text-xs text-muted-foreground">
              Across all transaction types
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatAmount(totalVolume)} sats
            </div>
            <p className="text-xs text-muted-foreground">
              Combined transaction volume
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Withdrawals</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {withdrawals.filter(w => w.status === 'completed').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Completed withdrawals
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Deposits</CardTitle>
            <ArrowDownToLine className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {deposits.filter((d: any) => d.status === 'confirmed').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Confirmed deposits
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>
            Browse through your trades, swaps, deposits, and withdrawals
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="withdrawals" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="trades">
                Trades ({totalTrades})
              </TabsTrigger>
              <TabsTrigger value="swaps">
                Swaps ({totalSwaps})
              </TabsTrigger>
              <TabsTrigger value="withdrawals">
                Withdrawals ({totalWithdrawals})
              </TabsTrigger>
              <TabsTrigger value="deposits">
                Deposits ({totalDeposits})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="trades" className="mt-4">
              <div className="flex justify-end mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchTrades()}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
              </div>
              {tradesLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading trades...
                </div>
              ) : trades.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No trades found
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Side</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>P&L</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {trades.map((trade: Trade) => (
                        <TableRow key={trade.id}>
                          <TableCell className="font-medium">{trade.type}</TableCell>
                          <TableCell>
                            <Badge variant={trade.side === 'buy' ? 'default' : 'secondary'}>
                              {trade.side}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatAmount(Number(trade.quantity))}</TableCell>
                          <TableCell>${formatAmount(Number(trade.entryPrice || 0))}</TableCell>
                          <TableCell>
                            <Badge 
                              variant={
                                trade.status === 'open' ? 'default' : 
                                trade.status === 'closed' ? 'secondary' : 
                                'outline'
                              }
                            >
                              {trade.status}
                            </Badge>
                          </TableCell>
                          <TableCell className={Number(trade.pnl || 0) >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {formatAmount(Number(trade.pnl || 0))} sats
                          </TableCell>
                          <TableCell>
                            {trade.createdAt ? new Date(trade.createdAt).toLocaleDateString() : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="swaps" className="mt-4">
              {swapsLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading swaps...
                </div>
              ) : swaps.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No swaps found
                </div>
              ) : (
                <SwapHistoryTable showSyncButton={false} />
              )}
            </TabsContent>

            <TabsContent value="withdrawals" className="mt-4">
              <div className="flex justify-end mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchWithdrawals()}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
              </div>
              {withdrawalsLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading withdrawals...
                </div>
              ) : withdrawals.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No withdrawals found. Click the Withdraw button to make your first withdrawal.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Fee</TableHead>
                        <TableHead>Invoice</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {withdrawals.map((withdrawal: Withdrawal) => (
                        <TableRow key={withdrawal.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(withdrawal.status)}
                              <Badge 
                                variant={
                                  withdrawal.status === 'completed' ? 'default' : 
                                  withdrawal.status === 'pending' ? 'secondary' : 
                                  'destructive'
                                }
                              >
                                {withdrawal.status}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={withdrawal.type === 'lightning' ? 'outline' : 'default'}>
                              {withdrawal.type === 'lightning' ? 'Lightning' : 'USD'}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">
                            {withdrawal.type === 'usd' && withdrawal.amountUsd ? (
                              <div>
                                <div>${(withdrawal.amountUsd / 100).toFixed(2)} USD</div>
                                <div className="text-xs text-muted-foreground">
                                  {formatAmount(withdrawal.amount)} sats
                                </div>
                              </div>
                            ) : (
                              `${formatAmount(withdrawal.amount)} sats`
                            )}
                          </TableCell>
                          <TableCell>
                            {formatAmount((withdrawal.fee || 0) + (withdrawal.swapFee || 0))} sats
                          </TableCell>
                          <TableCell>
                            <div className="max-w-[200px] truncate font-mono text-xs">
                              {withdrawal.invoice}
                            </div>
                          </TableCell>
                          <TableCell>
                            {withdrawal.createdAt ? (
                              <div>
                                <div>{new Date(withdrawal.createdAt).toLocaleDateString()}</div>
                                <div className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(withdrawal.createdAt), { addSuffix: true })}
                                </div>
                              </div>
                            ) : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="deposits" className="mt-4">
              {depositsLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading deposits...
                </div>
              ) : deposits.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No deposits found. Deposit functionality coming soon.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Transaction ID</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deposits.map((deposit: any) => (
                        <TableRow key={deposit.id}>
                          <TableCell className="font-medium">
                            {formatAmount(Number(deposit.amount))} sats
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={
                                deposit.status === 'confirmed' ? 'default' : 
                                deposit.status === 'pending' ? 'secondary' : 
                                'outline'
                              }
                            >
                              {deposit.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {deposit.transactionId || '-'}
                          </TableCell>
                          <TableCell>
                            {deposit.createdAt ? new Date(deposit.createdAt).toLocaleDateString() : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Withdrawal Modal */}
      <WithdrawalModal
        isOpen={isWithdrawalModalOpen}
        onClose={() => setIsWithdrawalModalOpen(false)}
        userId={user?.id || 0}
        userBalance={btcBalance}
        userBalanceUSD={usdBalance}
        onSuccess={() => {
          refetchWithdrawals();
          // Also refetch user data to update balance
          userData && api.getUser(Number(user?.id));
        }}
      />
    </div>
  );
}