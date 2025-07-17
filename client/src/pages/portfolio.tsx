import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Wallet, ArrowUpDown } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useSwaps } from '@/hooks/use-swaps';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { SwapInterface } from '@/components/swap/swap-interface';
import { SwapHistoryTable } from '@/components/swap/swap-history-table';

export default function PortfolioPage() {
  const { user } = useAuth();
  const { data: swaps = [] } = useSwaps(user?.id);
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
  const { data: marketData } = useQuery({
    queryKey: ['/api/market/ticker'],
    queryFn: () => api.getMarketTicker(),
    refetchInterval: 30000,
  });

  const btcBalance = userData?.balance ? parseFloat(userData.balance) : 0; // Already in satoshis
  const usdBalance = userFullInfo?.synthetic_usd_balance ? userFullInfo.synthetic_usd_balance * 100 : 0; // Convert to cents
  const marketPrice = marketData?.lastPrice ? parseFloat(marketData.lastPrice) : 0;

  // Calculate swap statistics
  const completedSwaps = swaps.filter(swap => swap.status === 'completed');
  const totalSwapVolume = completedSwaps.reduce((sum, swap) => {
    // Calculate volume in USD
    if (swap.fromAsset === 'BTC') {
      const btcAmount = swap.fromAmount / 100000000;
      return sum + (btcAmount * marketPrice);
    } else {
      return sum + (swap.fromAmount);
    }
  }, 0);

  const recentSwaps = swaps.slice(0, 3);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Portfolio</h1>
        <p className="text-muted-foreground">
          Manage your Bitcoin and USD balances with seamless swapping
        </p>
      </div>

      {/* Portfolio Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">BTC Balance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">
              {btcBalance.toLocaleString()} sats
            </div>
            <p className="text-xs text-muted-foreground">
              ~${((btcBalance / 100000000) * marketPrice).toLocaleString()}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Synthetic USD Balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">
              ${(usdBalance / 100).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              ~{Math.round(((usdBalance / 100) / marketPrice) * 100000000).toLocaleString()} sats
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Swaps</CardTitle>
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{swaps.length}</div>
            <p className="text-xs text-muted-foreground">
              {completedSwaps.length} completed
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Swap Volume</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalSwapVolume}
            </div>
            <p className="text-xs text-muted-foreground">
              Total swap volume
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Swap Interface */}
        <SwapInterface 
          btcBalance={btcBalance}
          usdBalance={usdBalance}
          marketPrice={marketPrice}
        />

        {/* Recent Swaps */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Swaps</CardTitle>
            <CardDescription>
              Your most recent swap transactions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentSwaps.length === 0 ? (
              <div className="text-center py-8">
                <ArrowUpDown className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">No recent swaps</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentSwaps.map((swap) => (
                  <div
                    key={swap.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 text-sm">
                        <span className="font-mono">{swap.fromAsset}</span>
                        <ArrowUpDown className="h-3 w-3 text-gray-400" />
                        <span className="font-mono">{swap.toAsset}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(swap.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-mono">
                        {swap.fromAsset === 'BTC' 
                          ? `${swap.fromAmount.toLocaleString()} sats`
                          : `$${(swap.fromAmount).toFixed(2)}`
                        }
                      </div>
                      <div className="text-xs text-muted-foreground">
                        → {swap.toAsset === 'BTC' 
                          ? `${swap.toAmount.toLocaleString()} sats`
                          : `$${(swap.toAmount).toFixed(2)}`
                        }
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Full Swap History */}
      <SwapHistoryTable />
    </div>
  );
}