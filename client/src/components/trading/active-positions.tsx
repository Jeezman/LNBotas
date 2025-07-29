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
  useCancelAllOrders,
  useSyncTrades,
} from '@/hooks/use-trading';
import { Skeleton } from '@/components/ui/skeleton';
import { Edit, X, RefreshCw, Filter } from 'lucide-react';
import { CloseTradeModal } from './close-trade-modal';
import { CloseAllTradesModal } from './close-all-trades-modal';
import type { Trade } from '@/lib/api';

type TradeStatusFilter = 'all' | 'open' | 'running' | 'closed';

export function ActivePositions() {
  const [statusFilter, setStatusFilter] = useState<TradeStatusFilter>('all');
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [isCloseTradeModalOpen, setIsCloseTradeModalOpen] = useState(false);
  const [isCloseAllModalOpen, setIsCloseAllModalOpen] = useState(false);
  const [closeAllModalType, setCloseAllModalType] = useState<
    'close-all' | 'cancel-orders'
  >('close-all');

  const { data: trades = [], isLoading } = useActiveTrades();
  const closeTrade = useCloseTrade();
  const closeAllTrades = useCloseAllTrades();
  const cancelAllOrders = useCancelAllOrders();

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

  const handleCloseTradeClick = (trade: Trade) => {
    setSelectedTrade(trade);
    setIsCloseTradeModalOpen(true);
  };

  const handleCloseTradeConfirm = () => {
    if (selectedTrade) {
      closeTrade.mutate(selectedTrade.id, {
        onSettled: () => {
          setIsCloseTradeModalOpen(false);
          setSelectedTrade(null);
        },
      });
    }
  };

  const handleCloseAllClick = () => {
    setCloseAllModalType('close-all');
    setIsCloseAllModalOpen(true);
  };

  const handleCancelAllOrdersClick = () => {
    setCloseAllModalType('cancel-orders');
    setIsCloseAllModalOpen(true);
  };

  const handleCloseAllConfirm = () => {
    if (closeAllModalType === 'close-all') {
      closeAllTrades.mutate(undefined, {
        onSettled: () => setIsCloseAllModalOpen(false),
      });
    } else {
      cancelAllOrders.mutate(undefined, {
        onSettled: () => setIsCloseAllModalOpen(false),
      });
    }
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
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <CardTitle className="text-base lg:text-lg font-semibold text-gray-900">
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
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => syncOpenTrades.mutate()}
              disabled={syncOpenTrades.isPending}
              className="text-xs"
            >
              <RefreshCw
                className={`h-3 w-3 mr-1 ${
                  syncOpenTrades.isPending ? 'animate-spin' : ''
                }`}
              />
              <span className="hidden sm:inline">Open</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => syncRunningTrades.mutate()}
              disabled={syncRunningTrades.isPending}
              className="text-xs"
            >
              <RefreshCw
                className={`h-3 w-3 mr-1 ${
                  syncRunningTrades.isPending ? 'animate-spin' : ''
                }`}
              />
              <span className="hidden sm:inline">Running</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => syncClosedTrades.mutate()}
              disabled={syncClosedTrades.isPending}
              className="text-xs"
            >
              <RefreshCw
                className={`h-3 w-3 mr-1 ${
                  syncClosedTrades.isPending ? 'animate-spin' : ''
                }`}
              />
              <span className="hidden sm:inline">Closed</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => syncAllTrades.mutate()}
              disabled={syncAllTrades.isPending}
              className="text-xs"
            >
              <RefreshCw
                className={`h-3 w-3 mr-1 ${
                  syncAllTrades.isPending ? 'animate-spin' : ''
                }`}
              />
              <span className="hidden sm:inline">All</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredTrades.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No active positions found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs lg:text-sm">Side</TableHead>
                  <TableHead className="text-xs lg:text-sm">Margin</TableHead>
                  <TableHead className="text-xs lg:text-sm">Leverage</TableHead>
                  <TableHead className="text-xs lg:text-sm">
                    Entry Price
                  </TableHead>
                  <TableHead className="text-xs lg:text-sm">P/L</TableHead>
                  <TableHead className="text-xs lg:text-sm">Status</TableHead>
                  <TableHead className="text-xs lg:text-sm">Created</TableHead>
                  <TableHead className="text-xs lg:text-sm text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTrades.map((trade) => (
                  <TableRow key={trade.id}>
                    <TableCell className="text-xs lg:text-sm">
                      <Badge
                        variant={getSideBadgeVariant(trade.side)}
                        className={getSideBadgeClassName(trade.side)}
                      >
                        {trade.side === 'buy' ? 'Long' : 'Short'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs lg:text-sm font-mono">
                      {parseFloat(
                        trade.margin?.toString() ?? '0'
                      ).toLocaleString('en-US', {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })}{' '}
                      sats
                    </TableCell>
                    <TableCell className="text-xs lg:text-sm">
                      {trade.leverage}x
                    </TableCell>
                    <TableCell className="text-xs lg:text-sm">
                      {parseFloat(trade.entryPrice ?? '0').toLocaleString(
                        'en-US',
                        {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 2,
                        }
                      )}
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
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      ) : (
                        <span className="font-mono text-sm text-gray-500">
                          --
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs lg:text-sm">
                      <Badge
                        variant={
                          trade.status === 'running'
                            ? 'default'
                            : trade.status === 'open'
                            ? 'secondary'
                            : 'outline'
                        }
                        className="text-xs"
                      >
                        {trade.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs lg:text-sm">
                      {new Date(trade.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCloseTradeClick(trade)}
                          className="h-6 w-6 p-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {filteredTrades.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-2 mt-4">
            <Button
              variant="destructive"
              size="sm"
              onClick={handleCloseAllClick}
              className="text-xs"
            >
              Close All Positions
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancelAllOrdersClick}
              className="text-xs"
            >
              Cancel All Orders
            </Button>
          </div>
        )}

        <CloseTradeModal
          isOpen={isCloseTradeModalOpen}
          onClose={() => setIsCloseTradeModalOpen(false)}
          onConfirm={handleCloseTradeConfirm}
          trade={selectedTrade}
          isLoading={closeTrade.isPending}
        />

        <CloseAllTradesModal
          trades={filteredTrades}
          isOpen={isCloseAllModalOpen}
          onClose={() => setIsCloseAllModalOpen(false)}
          onConfirm={handleCloseAllConfirm}
          type={closeAllModalType}
          isLoading={closeAllTrades.isPending || cancelAllOrders.isPending}
        />
      </CardContent>
    </Card>
  );
}
