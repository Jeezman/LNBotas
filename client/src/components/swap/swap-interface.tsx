import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowUpDown, RefreshCw } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useExecuteSwap } from '@/hooks/use-swaps';
import { SwapConfirmationModal } from './swap-confirmation-modal';
import { cn } from '@/lib/utils';

interface SwapInterfaceProps {
  btcBalance?: number;
  usdBalance?: number;
  marketPrice?: number;
}

export function SwapInterface({ btcBalance = 0, usdBalance = 0, marketPrice = 0 }: SwapInterfaceProps) {
  const { user } = useAuth();
  const executeSwap = useExecuteSwap();
  
  const [fromAsset, setFromAsset] = useState<'BTC' | 'USD'>('BTC');
  const [toAsset, setToAsset] = useState<'BTC' | 'USD'>('USD');
  const [amount, setAmount] = useState('');
  const [estimatedReceived, setEstimatedReceived] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [specifyInput, setSpecifyInput] = useState(true);

  const handleAssetSwap = () => {
    setFromAsset(toAsset);
    setToAsset(fromAsset);
    setAmount('');
    setEstimatedReceived('');
  };

  const calculateEstimatedReceived = (inputAmount: string, inputSpecify: boolean) => {
    if (!inputAmount || !marketPrice) return '';
    
    const numAmount = parseFloat(inputAmount);
    if (isNaN(numAmount) || numAmount <= 0) return '';

    if (inputSpecify) {
      // User specified input amount
      if (fromAsset === 'BTC') {
        // BTC to USD: convert satoshis to BTC, then to USD
        const btcAmount = numAmount / 100000000; // Convert satoshis to BTC
        const usdAmount = btcAmount * marketPrice;
        return Math.round(usdAmount * 100).toString(); // Convert to cents for internal storage
      } else {
        // USD to BTC: input is in USD, convert to BTC, then to satoshis
        const btcAmount = numAmount / marketPrice; // numAmount is already in USD
        const satoshis = Math.round(btcAmount * 100000000);
        return satoshis.toString();
      }
    } else {
      // User specified output amount
      if (toAsset === 'BTC') {
        // Want BTC output: convert satoshis to BTC, then calculate USD input
        const btcAmount = numAmount / 100000000; // Convert satoshis to BTC
        const usdAmount = btcAmount * marketPrice;
        return Math.round(usdAmount * 100).toString(); // Convert to cents for internal storage
      } else {
        // Want USD output: input is in USD, calculate BTC input
        const btcAmount = numAmount / marketPrice; // numAmount is already in USD
        const satoshis = Math.round(btcAmount * 100000000);
        return satoshis.toString();
      }
    }
  };

  const handleAmountChange = (value: string) => {
    console.log('handleAmountChange', value);
    setAmount(value);
    const estimated = calculateEstimatedReceived(value, specifyInput);
    setEstimatedReceived(estimated);
  };

  const handleEstimatedChange = (value: string) => {
    setEstimatedReceived(value);
    const estimated = calculateEstimatedReceived(value, false);
    setAmount(estimated);
  };

  const canSwap = () => {
    if (!user || !amount || !estimatedReceived) return false;
    
    const numAmount = parseFloat(amount);
    const currentBalance = fromAsset === 'BTC' ? btcBalance : usdBalance;
    
    // Convert user input to internal format for comparison
    const amountInInternalFormat = fromAsset === 'BTC' ? numAmount : numAmount * 100;
    
    return numAmount > 0 && amountInInternalFormat <= currentBalance;
  };

  const handleSwap = () => {
    if (!canSwap()) return;
    setShowConfirmation(true);
  };

  const handleConfirmSwap = () => {
    const numAmount = parseFloat(amount);
    // Convert to internal format for API
    const amountInInternalFormat = fromAsset === 'BTC' ? numAmount : numAmount * 1;
    console.log('amountInInternalFormat', amountInInternalFormat);
    executeSwap.mutate({
      fromAsset,
      toAsset,
      amount: amountInInternalFormat,
      specifyInput,
    });
    setShowConfirmation(false);
    setAmount('');
    setEstimatedReceived('');
  };

  const formatAssetAmount = (asset: 'BTC' | 'USD', rawAmount: string) => {
    if (!rawAmount) return '0';
    const num = parseFloat(rawAmount);
    
    if (asset === 'BTC') {
      // Show satoshis directly
      return num.toLocaleString();
    } else {
      // For USD, treat as dollars (user input format)
      return num.toFixed(2);
    }
  };

  const formatInternalAmount = (asset: 'BTC' | 'USD', rawAmount: string) => {
    if (!rawAmount) return '0';
    const num = parseFloat(rawAmount);
    
    if (asset === 'BTC') {
      // Show satoshis directly
      return num.toLocaleString();
    } else {
      // For USD, convert from cents to dollars
      return (num / 100).toFixed(2);
    }
  };

  const getMaxBalance = () => {
    return fromAsset === 'BTC' ? btcBalance : usdBalance;
  };

  const handleMaxClick = () => {
    const maxBalance = getMaxBalance();
    // Convert balance to user input format for the input field
    const userInputAmount = fromAsset === 'BTC' ? maxBalance.toString() : (maxBalance / 100).toFixed(2);
    setAmount(userInputAmount);
    const estimated = calculateEstimatedReceived(userInputAmount, true);
    setEstimatedReceived(estimated);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowUpDown className="h-5 w-5" />
            Swap Assets
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* From Asset Section */}
          <div className="space-y-2">
            <Label htmlFor="from-asset">From</Label>
            <div className="flex gap-2">
              <Select value={fromAsset} onValueChange={(value: 'BTC' | 'USD') => {
                setFromAsset(value);
                // Automatically set toAsset to the opposite
                setToAsset(value === 'BTC' ? 'USD' : 'BTC');
                setAmount('');
                setEstimatedReceived('');
              }}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BTC">BTC</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
              <Input
                id="from-amount"
                placeholder="0.00"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                className="flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleMaxClick}
                disabled={!user}
              >
                Max
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">
              Balance: {formatInternalAmount(fromAsset, getMaxBalance().toString())} {fromAsset === 'BTC' ? 'sats' : fromAsset}
            </div>
          </div>

          {/* Swap Button */}
          <div className="flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={handleAssetSwap}
              className="h-8 w-8 p-0"
            >
              <ArrowUpDown className="h-4 w-4" />
            </Button>
          </div>

          {/* To Asset Section */}
          <div className="space-y-2">
            <Label htmlFor="to-asset">To</Label>
            <div className="flex gap-2">
              <Select value={toAsset} onValueChange={(value: 'BTC' | 'USD') => {
                setToAsset(value);
                // Automatically set fromAsset to the opposite
                setFromAsset(value === 'BTC' ? 'USD' : 'BTC');
                setAmount('');
                setEstimatedReceived('');
              }}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BTC">BTC</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
              <Input
                id="to-amount"
                placeholder="0.00"
                value={estimatedReceived}
                onChange={(e) => handleEstimatedChange(e.target.value)}
                className="flex-1"
              />
            </div>
            <div className="text-sm text-muted-foreground">
              You will receive: {formatInternalAmount(toAsset, estimatedReceived)} {toAsset === 'BTC' ? 'sats' : toAsset}
            </div>
          </div>

          {/* Exchange Rate */}
          {marketPrice > 0 && (
            <div className="border rounded-lg p-3 bg-gray-50">
              <div className="text-sm text-muted-foreground">Exchange Rate</div>
              <div className="font-mono text-sm">
                1 BTC = ${marketPrice.toLocaleString()}
              </div>
            </div>
          )}

          {/* Swap Button */}
          <Button
            onClick={handleSwap}
            disabled={!canSwap() || executeSwap.isPending}
            className="w-full"
          >
            {executeSwap.isPending ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Executing Swap...
              </>
            ) : (
              'Swap'
            )}
          </Button>

          {/* Warning Messages */}
          {!user && (
            <div className="text-sm text-yellow-600 bg-yellow-50 p-2 rounded">
              Please configure your API credentials to enable swapping.
            </div>
          )}
          
          {amount && (fromAsset === 'BTC' ? parseFloat(amount) : parseFloat(amount) * 100) > getMaxBalance() && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
              Insufficient balance. Maximum: {formatInternalAmount(fromAsset, getMaxBalance().toString())} {fromAsset === 'BTC' ? 'sats' : fromAsset}
            </div>
          )}
        </CardContent>
      </Card>

      {showConfirmation && (
        <SwapConfirmationModal
          isOpen={showConfirmation}
          onClose={() => setShowConfirmation(false)}
          onConfirm={handleConfirmSwap}
          isLoading={executeSwap.isPending}
          swapData={{
            fromAsset,
            toAsset,
            fromAmount: formatAssetAmount(fromAsset, amount),
            toAmount: formatInternalAmount(toAsset, estimatedReceived),
            exchangeRate: marketPrice,
          }}
        />
      )}
    </>
  );
}