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

interface CloseTradeModalProps {
  trade: Trade | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function CloseTradeModal({
  trade,
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
}: CloseTradeModalProps) {
  if (!trade) return null;

  const isRunning = trade.status === 'running';
  const actionText = isRunning ? 'Close Position' : 'Cancel Order';
  const actionDescription = isRunning
    ? 'This will close your trading position and realize any profit or loss.'
    : 'This will cancel your pending order.';

  const getSideBadgeClassName = (side: string) => {
    return side === 'buy'
      ? 'bg-green-600 text-white hover:bg-green-700'
      : 'bg-red-600 text-white hover:bg-red-700';
  };

  const formatPrice = (price: string | null) => {
    if (!price) return 'N/A';
    return `$${parseFloat(price).toLocaleString()}`;
  };

  const formatPnL = (pnl: string | null) => {
    if (!pnl) return null;
    const value = parseFloat(pnl);
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

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl font-semibold">
            {actionText}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base">
            {actionDescription}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Trade Details */}
        <div className="space-y-3 py-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600">Side:</span>
            <Badge className={getSideBadgeClassName(trade.side)}>
              {trade.side === 'buy' ? 'Long' : 'Short'}
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600">Type:</span>
            <span className="text-sm font-mono">
              {trade.type.charAt(0).toUpperCase() + trade.type.slice(1)}
            </span>
          </div>

          {trade.entryPrice && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Entry Price:</span>
              <span className="text-sm font-mono">{formatPrice(trade.entryPrice)}</span>
            </div>
          )}

          {trade.limitPrice && trade.status === 'open' && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Limit Price:</span>
              <span className="text-sm font-mono">{formatPrice(trade.limitPrice)}</span>
            </div>
          )}

          {trade.quantity && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Size:</span>
              <span className="text-sm font-mono">
                ₿ {parseFloat(trade.quantity).toFixed(4)}
              </span>
            </div>
          )}

          {trade.leverage && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Leverage:</span>
              <span className="text-sm font-mono">{trade.leverage}x</span>
            </div>
          )}

          {isRunning && trade.pnl && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Current PnL:</span>
              <span className="text-sm font-mono">{formatPnL(trade.pnl)}</span>
            </div>
          )}
        </div>

        {/* Warning */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-sm text-yellow-800">
            ⚠️ This action cannot be undone. {isRunning ? 'Your position will be closed at the current market price.' : 'Your order will be cancelled immediately.'}
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