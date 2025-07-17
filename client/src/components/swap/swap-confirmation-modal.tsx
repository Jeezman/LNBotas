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
import { ArrowRight, AlertTriangle, RefreshCw } from 'lucide-react';

interface SwapConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
  swapData: {
    fromAsset: string;
    toAsset: string;
    fromAmount: string;
    toAmount: string;
    exchangeRate: number;
  };
}

export function SwapConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
  swapData,
}: SwapConfirmationModalProps) {
  const { fromAsset, toAsset, fromAmount, toAmount, exchangeRate } = swapData;

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="sm:max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm Swap</AlertDialogTitle>
          <AlertDialogDescription>
            Please review the swap details before confirming. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          {/* Swap Details */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-medium">Swap Details</div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="font-mono">
                  {fromAsset === 'BTC' ? 'sats' : fromAsset}
                </Badge>
                <span className="font-mono text-lg">{fromAmount}</span>
              </div>
              
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="font-mono">
                  {toAsset === 'BTC' ? 'sats' : toAsset}
                </Badge>
                <span className="font-mono text-lg">{toAmount}</span>
              </div>
            </div>
          </div>

          {/* Exchange Rate */}
          {exchangeRate > 0 && (
            <div className="border rounded-lg p-3 bg-blue-50">
              <div className="text-sm text-muted-foreground mb-1">Exchange Rate</div>
              <div className="font-mono text-sm">
                1 BTC = ${exchangeRate.toLocaleString()}
              </div>
            </div>
          )}

          {/* Important Notice */}
          <div className="border rounded-lg p-3 bg-yellow-50 border-yellow-200">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
              <div className="text-sm">
                <div className="font-medium text-yellow-800 mb-1">Important Notice</div>
                <ul className="text-yellow-700 space-y-1 text-xs">
                  <li>• This swap will be executed immediately at the current market rate</li>
                  <li>• Exchange rates may fluctuate during execution</li>
                  <li>• This action cannot be reversed once confirmed</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Executing...
              </>
            ) : (
              'Confirm Swap'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}