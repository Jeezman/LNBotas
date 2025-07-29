import { useState } from 'react';
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { RefreshCw, ArrowUpDown } from 'lucide-react';
import { useSwaps, useSyncSwaps } from '@/hooks/use-swaps';
import { useAuth } from '@/hooks/use-auth';
import { formatDistanceToNow } from 'date-fns';
import { usePagination } from '@/hooks/usePagination';
import { TablePaginationControls } from '@/components/ui/table-pagination-controls';
import {
  TableRowSkeleton,
  SwapHistorySkeletonConfig,
} from '@/components/ui/table-row-skeleton';
import type { Swap } from '@/lib/api';

interface SwapHistoryTableProps {
  showSyncButton?: boolean;
}

export function SwapHistoryTable({
  showSyncButton = true,
}: SwapHistoryTableProps) {
  const { user } = useAuth();
  const { data: swaps = [], isLoading } = useSwaps(user?.id);
  const syncSwaps = useSyncSwaps();
  const [paginationLoading, setPaginationLoading] = useState(false);

  // Sort swaps by creation date (newest first) and apply pagination
  const sortedSwaps = swaps.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const pagination = usePagination({
    data: sortedSwaps,
    defaultItemsPerPage: 20,
    storageKey: 'swap-history-items-per-page',
    enableUrlSync: true,
    urlPrefix: 'swaps',
  });

  // Handle pagination with loading states
  const handlePageChange = (page: number) => {
    setPaginationLoading(true);
    setTimeout(() => {
      pagination.setPage(page);
      setPaginationLoading(false);
    }, 300);
  };

  const handleItemsPerPageChange = (count: number | 'all') => {
    setPaginationLoading(true);
    setTimeout(() => {
      pagination.setItemsPerPage(count);
      setPaginationLoading(false);
    }, 300);
  };

  const handleNavigation = (action: () => void) => {
    setPaginationLoading(true);
    setTimeout(() => {
      action();
      setPaginationLoading(false);
    }, 300);
  };

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
      return `$${amount}`;
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
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-base lg:text-lg">
              <ArrowUpDown className="h-4 w-4 lg:h-5 lg:w-5" />
              Swap History
            </CardTitle>
            <CardDescription className="text-sm lg:text-base">
              View your swap transaction history ({swaps.length} total swaps)
            </CardDescription>
          </div>
          {showSyncButton && (
            <Button
              onClick={() => syncSwaps.mutate(user?.id)}
              disabled={syncSwaps.isPending}
              variant="outline"
              size="sm"
              className="flex items-center gap-2 text-xs lg:text-sm w-full lg:w-auto"
            >
              <RefreshCw
                className={`h-3 w-3 lg:h-4 lg:w-4 ${
                  syncSwaps.isPending ? 'animate-spin' : ''
                }`}
              />
              <span className="hidden sm:inline">
                {syncSwaps.isPending ? 'Syncing...' : 'Sync from LN Markets'}
              </span>
              <span className="sm:hidden">
                {syncSwaps.isPending ? 'Syncing...' : 'Sync'}
              </span>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Top pagination controls */}
        {swaps.length > 0 && (
          <TablePaginationControls
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            itemsPerPage={pagination.itemsPerPage}
            totalItems={pagination.totalItems}
            startIndex={pagination.startIndex}
            endIndex={pagination.endIndex}
            isFirstPage={pagination.isFirstPage}
            isLastPage={pagination.isLastPage}
            onPageChange={handlePageChange}
            onItemsPerPageChange={handleItemsPerPageChange}
            onFirstPage={() => handleNavigation(pagination.goToFirstPage)}
            onLastPage={() => handleNavigation(pagination.goToLastPage)}
            onNextPage={() => handleNavigation(pagination.goToNextPage)}
            onPreviousPage={() => handleNavigation(pagination.goToPreviousPage)}
            isLoading={paginationLoading}
            itemLabel="swaps"
          />
        )}
        {swaps.length === 0 ? (
          <div className="text-center py-8">
            <ArrowUpDown className="h-10 w-10 lg:h-12 lg:w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-muted-foreground mb-2 text-sm lg:text-base">
              No swaps found
            </p>
            <p className="text-xs lg:text-sm text-muted-foreground">
              Your swap transactions will appear here once you execute your
              first swap.
            </p>
          </div>
        ) : (
          <div className="rounded-md border overflow-hidden">
            <div className="overflow-x-auto mobile-scroll">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs lg:text-sm">Status</TableHead>
                    <TableHead className="text-xs lg:text-sm">From</TableHead>
                    <TableHead className="text-xs lg:text-sm">To</TableHead>
                    <TableHead className="text-xs lg:text-sm hidden sm:table-cell">
                      Exchange Rate
                    </TableHead>
                    <TableHead className="text-xs lg:text-sm hidden md:table-cell">
                      Fee
                    </TableHead>
                    <TableHead className="text-xs lg:text-sm">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginationLoading ? (
                    <TableRowSkeleton
                      columns={SwapHistorySkeletonConfig}
                      rows={
                        pagination.itemsPerPage === 'all'
                          ? Math.min(swaps.length, 20)
                          : pagination.itemsPerPage
                      }
                    />
                  ) : (
                    pagination.paginatedData.map((swap: Swap) => (
                      <TableRow key={swap.id}>
                        <TableCell className="text-xs lg:text-sm">
                          <Badge
                            variant={getStatusBadgeVariant(swap.status)}
                            className="text-xs"
                          >
                            {swap.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs lg:text-sm">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                            <Badge
                              variant="outline"
                              className="font-mono text-xs w-fit"
                            >
                              {swap.fromAsset}
                            </Badge>
                            <span className="font-mono text-xs lg:text-sm">
                              {formatAssetAmount(
                                swap.fromAsset,
                                swap.fromAmount
                              )}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs lg:text-sm">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                            <Badge
                              variant="outline"
                              className="font-mono text-xs w-fit"
                            >
                              {swap.toAsset}
                            </Badge>
                            <span className="font-mono text-xs lg:text-sm">
                              {formatAssetAmount(swap.toAsset, swap.toAmount)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs lg:text-sm hidden sm:table-cell">
                          {formatExchangeRate(swap.exchangeRate)}
                        </TableCell>
                        <TableCell className="font-mono text-xs lg:text-sm hidden md:table-cell">
                          {swap.fee ? `${swap.fee.toLocaleString()} sats` : '—'}
                        </TableCell>
                        <TableCell className="text-xs lg:text-sm">
                          <div className="text-xs lg:text-sm">
                            {formatDistanceToNow(new Date(swap.createdAt), {
                              addSuffix: true,
                            })}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Mobile-only summary for hidden columns */}
            <div className="sm:hidden p-3 bg-gray-50 border-t">
              <div className="text-xs text-gray-600 space-y-1">
                <p>
                  💡 <strong>Tip:</strong> Scroll horizontally to see exchange
                  rates and fees
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Bottom pagination controls */}
        {swaps.length > 0 && (
          <TablePaginationControls
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            itemsPerPage={pagination.itemsPerPage}
            totalItems={pagination.totalItems}
            startIndex={pagination.startIndex}
            endIndex={pagination.endIndex}
            isFirstPage={pagination.isFirstPage}
            isLastPage={pagination.isLastPage}
            onPageChange={handlePageChange}
            onItemsPerPageChange={handleItemsPerPageChange}
            onFirstPage={() => handleNavigation(pagination.goToFirstPage)}
            onLastPage={() => handleNavigation(pagination.goToLastPage)}
            onNextPage={() => handleNavigation(pagination.goToNextPage)}
            onPreviousPage={() => handleNavigation(pagination.goToPreviousPage)}
            isLoading={paginationLoading}
            itemLabel="swaps"
          />
        )}
      </CardContent>
    </Card>
  );
}
