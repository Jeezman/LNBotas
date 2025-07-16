import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import type { Trade } from '@/lib/api';

interface CloseAllTradesModalProps {
  trades: Trade[];
  type: 'close-all' | 'cancel-orders';
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function CloseAllTradesModal({
  trades,
  type,
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
}: CloseAllTradesModalProps) {
  const isCloseAll = type === 'close-all';
  const targetTrades = isCloseAll
    ? trades.filter(trade => trade.status === 'running')
    : trades.filter(trade => trade.status === 'open');

  const actionText = isCloseAll ? 'Close All Positions' : 'Cancel All Orders';
  const actionDescription = isCloseAll
    ? 'This will close all your running trading positions and realize any profits or losses.'
    : 'This will cancel all your pending orders.';

  // Calculate total PnL for running positions
  const totalPnL = isCloseAll
    ? targetTrades.reduce((sum, trade) => {
        if (trade.pnl) {
          return sum + parseFloat(trade.pnl);
        }
        return sum;
      }, 0)
    : null;

  const formatPnL = (value: number) => {
    const isPositive = value >= 0;
    return (
      <span className={isPositive ? 'text-green-600' : 'text-red-600'}>
        {isPositive ? '+' : ''}
        {value.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </span>
    );
  };

  const getSideBadgeClassName = (side: string) => {
    return side === 'buy'
      ? 'bg-green-600 text-white hover:bg-green-700'
      : 'bg-red-600 text-white hover:bg-red-700';
  };

  if (targetTrades.length === 0) {
    return (
      <AlertDialog open={isOpen} onOpenChange={onClose}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>No {isCloseAll ? 'Positions' : 'Orders'} to {isCloseAll ? 'Close' : 'Cancel'}</AlertDialogTitle>
            <AlertDialogDescription>
              You don't have any {isCloseAll ? 'running positions' : 'open orders'} to {isCloseAll ? 'close' : 'cancel'}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>OK</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl font-semibold">
            {actionText}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base">
            {actionDescription}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Summary */}
        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm font-medium text-gray-600">
              {isCloseAll ? 'Positions to close:' : 'Orders to cancel:'}
            </span>
            <span className="text-lg font-semibold">{targetTrades.length}</span>
          </div>

          {isCloseAll && totalPnL !== null && (
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-600">Total current PnL:</span>
              <span className="text-lg font-semibold font-mono">{formatPnL(totalPnL)}</span>
            </div>
          )}

          {/* List of trades */}
          <div className="max-h-48 overflow-y-auto space-y-2">
            {targetTrades.map((trade) => (
              <div
                key={trade.id}
                className="flex items-center justify-between p-2 border border-gray-200 rounded-lg"
              >
                <div className="flex items-center space-x-2">
                  <Badge className={getSideBadgeClassName(trade.side)}>
                    {trade.side === 'buy' ? 'Long' : 'Short'}
                  </Badge>
                  <span className="text-sm font-medium">
                    {trade.type.charAt(0).toUpperCase() + trade.type.slice(1)}
                  </span>
                  {trade.leverage && (
                    <span className="text-xs text-gray-500">{trade.leverage}x</span>
                  )}
                </div>
                <div className="text-right">
                  {isCloseAll && trade.pnl ? (
                    <div className="text-sm font-mono">{formatPnL(parseFloat(trade.pnl))}</div>
                  ) : trade.limitPrice ? (
                    <div className="text-sm font-mono text-gray-600">
                      ${parseFloat(trade.limitPrice).toLocaleString()}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-400">Pending</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Warning */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-800">
            ⚠️ <strong>This action cannot be undone.</strong>{' '}
            {isCloseAll
              ? 'All positions will be closed at current market prices.'
              : 'All pending orders will be cancelled immediately.'}
          </p>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            {isLoading ? 'Processing...' : actionText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}