import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useActiveTrades,
  useCloseTrade,
  useCloseAllTrades,
  useSyncTrades,
} from '@/hooks/use-trading';
import { Skeleton } from '@/components/ui/skeleton';
import { Edit, X, RefreshCw, Filter } from 'lucide-react';

type TradeStatusFilter = 'all' | 'open' | 'running' | 'closed';

export function ActivePositions() {
  const [statusFilter, setStatusFilter] = useState<TradeStatusFilter>('all');
  const { data: trades = [], isLoading } = useActiveTrades();
  const closeTrade = useCloseTrade();
  const closeAllTrades = useCloseAllTrades();

  // Create individual sync hooks for different trade types
  const syncOpenTrades = useSyncTrades(undefined, 'open');
  const syncRunningTrades = useSyncTrades(undefined, 'running');
  const syncClosedTrades = useSyncTrades(undefined, 'closed');
  const syncAllTrades = useSyncTrades(undefined, 'all');

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Active Positions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Filter trades based on selected status
  const filteredTrades = trades.filter((trade) => {
    if (statusFilter === 'all') return true;
    return trade.status === statusFilter;
  });

  const handleCloseTrade = (tradeId: number) => {
    closeTrade.mutate(tradeId);
  };

  const handleCloseAll = () => {
    closeAllTrades.mutate();
  };

  const getSideBadgeVariant = (side: string) => {
    return side === 'buy' ? 'default' : 'destructive';
  };

  const getSideBadgeClassName = (side: string) => {
    return side === 'buy'
      ? 'bg-green-600 text-white hover:bg-green-700'
      : 'bg-red-600 text-white hover:bg-red-700';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <CardTitle className="text-lg font-semibold text-gray-900">
              Active Positions
            </CardTitle>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <Select
                value={statusFilter}
                onValueChange={(value: TradeStatusFilter) =>
                  setStatusFilter(value)
                }
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="running">Running</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => syncOpenTrades.mutate()}
              disabled={syncOpenTrades.isPending}
            >
              <RefreshCw
                className={`h-4 w-4 mr-1 ${
                  syncOpenTrades.isPending ? 'animate-spin' : ''
                }`}
              />
              Open
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => syncRunningTrades.mutate()}
              disabled={syncRunningTrades.isPending}
            >
              <RefreshCw
                className={`h-4 w-4 mr-1 ${
                  syncRunningTrades.isPending ? 'animate-spin' : ''
                }`}
              />
              Running
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => syncClosedTrades.mutate()}
              disabled={syncClosedTrades.isPending}
            >
              <RefreshCw
                className={`h-4 w-4 mr-1 ${
                  syncClosedTrades.isPending ? 'animate-spin' : ''
                }`}
              />
              Closed
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => syncAllTrades.mutate()}
              disabled={syncAllTrades.isPending}
            >
              <RefreshCw
                className={`h-4 w-4 mr-1 ${
                  syncAllTrades.isPending ? 'animate-spin' : ''
                }`}
              />
              All
            </Button>
            {filteredTrades.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCloseAll}
                disabled={closeAllTrades.isPending}
              >
                Close All
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredTrades.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">
              {trades.length === 0
                ? 'No active positions'
                : `No ${
                    statusFilter === 'all' ? '' : statusFilter + ' '
                  }positions`}
            </p>
            <p className="text-sm text-gray-400">
              {trades.length === 0
                ? 'Create a new trade to see positions here'
                : 'Try selecting a different filter'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Side</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Entry Price</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>PnL</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTrades.map((trade) => (
                  <TableRow key={trade.id}>
                    <TableCell>
                      <Badge
                        variant={getSideBadgeVariant(trade.side)}
                        className={getSideBadgeClassName(trade.side)}
                      >
                        {trade.side === 'buy' ? 'Long' : 'Short'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          trade.status === 'running' ? 'default' : 'secondary'
                        }
                        className={
                          trade.status === 'running'
                            ? 'bg-green-600 text-white'
                            : trade.status === 'open'
                            ? 'bg-yellow-600 text-white'
                            : 'bg-gray-600 text-white'
                        }
                      >
                        {trade.status === 'running'
                          ? 'Running'
                          : trade.status === 'open'
                          ? 'Open'
                          : trade.status.charAt(0).toUpperCase() +
                            trade.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {trade.entryPrice
                        ? `$${parseFloat(trade.entryPrice).toLocaleString()}`
                        : 'Pending'}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {trade.quantity
                        ? `₿ ${parseFloat(trade.quantity).toFixed(4)}`
                        : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {trade.pnl ? (
                        <span
                          className={`font-mono text-sm ${
                            parseFloat(trade.pnl) >= 0
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}
                        >
                          {parseFloat(trade.pnl) >= 0 ? '+' : ''}
                          {parseFloat(trade.pnl).toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      ) : (
                        <span className="font-mono text-sm text-gray-500">
                          --
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCloseTrade(trade.id)}
                          disabled={closeTrade.isPending}
                        >
                          <X className="h-4 w-4" />
                        </Button>
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
