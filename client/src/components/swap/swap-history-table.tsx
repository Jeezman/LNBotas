import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, ArrowUpDown } from 'lucide-react';
import { useSwaps, useSyncSwaps } from '@/hooks/use-swaps';
import { useAuth } from '@/hooks/use-auth';
import { formatDistanceToNow } from 'date-fns';
import type { Swap } from '@/lib/api';

interface SwapHistoryTableProps {
  showSyncButton?: boolean;
}

export function SwapHistoryTable({ showSyncButton = true }: SwapHistoryTableProps) {
  const { user } = useAuth();
  const { data: swaps = [], isLoading } = useSwaps(user?.id);
  const syncSwaps = useSyncSwaps();

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'pending':
        return 'outline';
      case 'failed':
        return 'destructive';
      case 'cancelled':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const formatAssetAmount = (asset: string, amount: number) => {
    if (asset === 'BTC') {
      // Show satoshis directly
      return `${amount.toLocaleString()} sats`;
    } else {
      // Convert cents to USD
      return `$${(amount).toFixed(2)}`;
    }
  };

  const formatExchangeRate = (rate: string | null) => {
    if (!rate) return '—';
    const numRate = parseFloat(rate);
    return `$${numRate.toLocaleString()}`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ArrowUpDown className="h-5 w-5" />
              Swap History
            </CardTitle>
            <CardDescription>
              View your swap transaction history ({swaps.length} swaps)
            </CardDescription>
          </div>
          {showSyncButton && (
            <Button
              onClick={() => syncSwaps.mutate(user?.id)}
              disabled={syncSwaps.isPending}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${syncSwaps.isPending ? 'animate-spin' : ''}`} />
              {syncSwaps.isPending ? 'Syncing...' : 'Sync from LN Markets'}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {swaps.length === 0 ? (
          <div className="text-center py-8">
            <ArrowUpDown className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-muted-foreground mb-2">No swaps found</p>
            <p className="text-sm text-muted-foreground">
              Your swap transactions will appear here once you execute your first swap.
            </p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Exchange Rate</TableHead>
                  <TableHead>Fee</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {swaps.map((swap: Swap) => (
                  <TableRow key={swap.id}>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(swap.status)}>
                        {swap.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono">
                          {swap.fromAsset}
                        </Badge>
                        <span className="font-mono text-sm">
                          {formatAssetAmount(swap.fromAsset, swap.fromAmount)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono">
                          {swap.toAsset}
                        </Badge>
                        <span className="font-mono text-sm">
                          {formatAssetAmount(swap.toAsset, swap.toAmount)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {formatExchangeRate(swap.exchangeRate)}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {swap.fee ? `${swap.fee.toLocaleString()} sats` : '—'}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {formatDistanceToNow(new Date(swap.createdAt), { addSuffix: true })}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}