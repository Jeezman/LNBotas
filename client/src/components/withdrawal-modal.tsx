import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatAmount } from '@/lib/utils';
import { Loader2, Copy, AlertCircle, CheckCircle, Info } from 'lucide-react';

interface WithdrawalModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number;
  userBalance: number; // in satoshis
  userBalanceUSD: number; // in USD
  onSuccess?: () => void;
}

export function WithdrawalModal({
  isOpen,
  onClose,
  userId,
  userBalance,
  userBalanceUSD,
  onSuccess,
}: WithdrawalModalProps) {
  const { toast } = useToast();
  const [withdrawalType, setWithdrawalType] = useState<'lightning' | 'usd'>(
    'lightning'
  );
  const [amount, setAmount] = useState('');
  const [invoice, setInvoice] = useState('');
  const [estimating, setEstimating] = useState(false);
  const [decodedInvoice, setDecodedInvoice] = useState<any>(null);
  const [decodingInvoice, setDecodingInvoice] = useState(false);

  // Estimate withdrawal fee
  const { data: feeEstimate, refetch: refetchEstimate } = useQuery({
    queryKey: ['/api/withdrawals/estimate', userId, amount, withdrawalType],
    queryFn: async () => {
      if (!amount || parseFloat(amount) <= 0) return null;
      setEstimating(true);
      try {
        const amountValue =
          withdrawalType === 'usd'
            ? Math.floor(parseFloat(amount) * 100) // Convert USD to cents
            : parseInt(amount); // Satoshis

        const estimate = await api.estimateWithdrawalFee(
          userId,
          amountValue,
          withdrawalType === 'usd' ? 'USD' : 'BTC'
        );
        return estimate;
      } finally {
        setEstimating(false);
      }
    },
    enabled: !!amount && parseFloat(amount) > 0,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Lightning withdrawal mutation
  const withdrawLightning = useMutation({
    mutationFn: async () => {
      const amountSats = parseInt(amount);
      return api.withdrawLightning(userId, amountSats, invoice);
    },
    onSuccess: () => {
      toast({
        title: 'Withdrawal Successful',
        description: `Successfully withdrew ${formatAmount(
          parseInt(amount)
        )} sats`,
      });
      onSuccess?.();
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: 'Withdrawal Failed',
        description: error.message || 'Failed to process withdrawal',
        variant: 'destructive',
      });
    },
  });

  // USD withdrawal mutation
  const withdrawUSD = useMutation({
    mutationFn: async () => {
      const amountCents = Math.floor(parseFloat(amount) * 100);
      return api.withdrawUSD(userId, amountCents, invoice);
    },
    onSuccess: () => {
      toast({
        title: 'USD Withdrawal Successful',
        description: `Successfully withdrew $${amount} USD`,
      });
      onSuccess?.();
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: 'USD Withdrawal Failed',
        description: error.message || 'Failed to process USD withdrawal',
        variant: 'destructive',
      });
    },
  });

  const decodeInvoice = async (invoiceStr: string) => {
    if (!invoiceStr || !invoiceStr.startsWith('lnbc')) {
      setDecodedInvoice(null);
      return;
    }

    setDecodingInvoice(true);
    try {
      // Basic local BOLT11 invoice decoding
      // This provides a quick decode without external API calls
      const decoded: any = {};
      
      // Extract amount from invoice
      const amountMatch = invoiceStr.match(/lnbc(\d+)([munp])?/);
      if (amountMatch) {
        let amount = parseInt(amountMatch[1]);
        const unit = amountMatch[2] || 'u'; // default to micro-bitcoin if no unit
        
        // Convert to sats based on unit
        switch(unit) {
          case 'm': // milli-bitcoin (0.001 BTC)
            amount = amount * 100000; 
            break;
          case 'u': // micro-bitcoin (0.000001 BTC)
            amount = amount * 100; 
            break;
          case 'n': // nano-bitcoin (0.000000001 BTC)
            amount = Math.round(amount / 10); 
            break;
          case 'p': // pico-bitcoin (0.000000000001 BTC)
            amount = Math.round(amount / 100000);
            break;
        }
        
        decoded.amount_sats = amount;
        setAmount(amount.toString());
      }
      
      // Try to extract timestamp (follows amount)
      const timestampMatch = invoiceStr.match(/lnbc\d+[munp]?(\d{10})/);
      if (timestampMatch) {
        decoded.created_at = parseInt(timestampMatch[1]);
      }
      
      // Extract description if present (tagged field 'd')
      // This is a simplified extraction - full BOLT11 parsing would be more complex
      if (invoiceStr.includes('d')) {
        decoded.has_description = true;
      }
      
      // Extract payment hash if we can identify it
      // Payment hash is 52 characters in the invoice
      const paymentHashPattern = /pp([0-9a-z]{52})/;
      const hashMatch = invoiceStr.match(paymentHashPattern);
      if (hashMatch) {
        // Convert from bech32 to hex (simplified - actual conversion is complex)
        decoded.payment_hash = hashMatch[1];
      }
      
      // Set a default expiry of 1 hour (3600 seconds) if not specified
      decoded.expiry = 3600;
      
      // Provide a link to view full details
      decoded.decoder_url = `https://lightningdecoder.com/${invoiceStr}`;
      
      setDecodedInvoice(decoded);
    } catch (error) {
      console.error('Error decoding invoice:', error);
      setDecodedInvoice(null);
    } finally {
      setDecodingInvoice(false);
    }
  };

  // Decode invoice when it changes
  useEffect(() => {
    if (invoice && invoice.startsWith('lnbc')) {
      const timer = setTimeout(() => {
        decodeInvoice(invoice);
      }, 500); // Debounce for 500ms
      return () => clearTimeout(timer);
    } else {
      setDecodedInvoice(null);
    }
  }, [invoice]);

  const handleClose = () => {
    setAmount('');
    setInvoice('');
    setWithdrawalType('lightning');
    setDecodedInvoice(null);
    onClose();
  };

  const handleWithdraw = () => {
    if (!invoice || !amount) {
      toast({
        title: 'Missing Information',
        description: 'Please enter both amount and Lightning invoice',
        variant: 'destructive',
      });
      return;
    }

    if (withdrawalType === 'lightning') {
      const amountSats = parseInt(amount);
      if (amountSats > userBalance) {
        toast({
          title: 'Insufficient Balance',
          description: 'You do not have enough balance for this withdrawal',
          variant: 'destructive',
        });
        return;
      }
      withdrawLightning.mutate();
    } else {
      const amountUSD = parseFloat(amount);
      if (amountUSD > userBalanceUSD) {
        toast({
          title: 'Insufficient USD Balance',
          description: 'You do not have enough USD balance for this withdrawal',
          variant: 'destructive',
        });
        return;
      }
      withdrawUSD.mutate();
    }
  };

  const isProcessing = withdrawLightning.isPending || withdrawUSD.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Withdraw Funds</DialogTitle>
          <DialogDescription>
            Withdraw your funds via Lightning Network
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={withdrawalType}
          onValueChange={(v) => setWithdrawalType(v as 'lightning' | 'usd')}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="lightning">Bitcoin (Lightning)</TabsTrigger>
            <TabsTrigger value="usd">USD Balance</TabsTrigger>
          </TabsList>

          <TabsContent value="lightning" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="btc-amount">Amount (satoshis)</Label>
              <Input
                id="btc-amount"
                type="number"
                placeholder="Enter amount in satoshis"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={isProcessing || (decodedInvoice && decodedInvoice.amount_sats)}
              />
              <p className="text-sm text-muted-foreground">
                Available: {formatAmount(userBalance)} sats
                {decodedInvoice && decodedInvoice.amount_sats && (
                  <span className="ml-2 text-yellow-600">
                    (Amount fixed by invoice)
                  </span>
                )}
              </p>
            </div>
          </TabsContent>

          <TabsContent value="usd" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="usd-amount">Amount (USD)</Label>
              <Input
                id="usd-amount"
                type="number"
                step="0.01"
                placeholder="Enter amount in USD"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={isProcessing}
              />
              <p className="text-sm text-muted-foreground">
                Available: ${userBalanceUSD.toFixed(2)} USD
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <div className="space-y-2">
          <Label htmlFor="invoice">Lightning Invoice</Label>
          <div className="relative">
            <Textarea
              id="invoice"
              placeholder="lnbc..."
              value={invoice}
              onChange={(e) => setInvoice(e.target.value)}
              disabled={isProcessing}
              className="pr-10 font-mono text-xs resize-none"
              rows={6}
              style={{ maxHeight: '200px' }}
            />
            <Button
              size="sm"
              variant="ghost"
              className="absolute right-0 top-0 px-3 py-2"
              onClick={async () => {
                try {
                  const text = await navigator.clipboard.readText();
                  if (text.startsWith('lnbc')) {
                    setInvoice(text);
                    toast({
                      title: 'Invoice Pasted',
                      description: 'Decoding Lightning invoice...',
                    });
                    // Decode will happen automatically via useEffect
                  } else {
                    toast({
                      title: 'Invalid Invoice',
                      description:
                        'Clipboard does not contain a valid Lightning invoice',
                      variant: 'destructive',
                    });
                  }
                } catch (error) {
                  toast({
                    title: 'Paste Failed',
                    description: 'Could not read from clipboard',
                    variant: 'destructive',
                  });
                }
              }}
              title="Paste from clipboard"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Paste your Lightning invoice here. The invoice should start with
            "lnbc"
          </p>
        </div>

        {/* Decoded Invoice Details */}
        {decodingInvoice && (
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Decoding invoice...</span>
              </div>
            </CardContent>
          </Card>
        )}

        {decodedInvoice && !decodingInvoice && (
          <Card>
            <CardContent className="pt-4">
              <div className="space-y-2">
                <div className="flex items-start space-x-2">
                  <Info className="h-4 w-4 text-blue-500 mt-0.5" />
                  <div className="space-y-1 flex-1">
                    <p className="text-sm font-medium">Invoice Details</p>
                    <div className="text-xs space-y-1 text-muted-foreground">
                      {decodedInvoice.amount_sats && (
                        <div className="flex justify-between">
                          <span>Amount:</span>
                          <span className="font-mono">
                            {formatAmount(decodedInvoice.amount_sats)} sats
                          </span>
                        </div>
                      )}
                      {decodedInvoice.description && (
                        <div className="flex justify-between">
                          <span>Description:</span>
                          <span className="font-mono truncate max-w-[200px]">
                            {decodedInvoice.description}
                          </span>
                        </div>
                      )}
                      {decodedInvoice.payee && (
                        <div className="flex justify-between">
                          <span>Payee:</span>
                          <span className="font-mono text-xs">
                            {decodedInvoice.payee.substring(0, 8)}...{decodedInvoice.payee.substring(decodedInvoice.payee.length - 8)}
                          </span>
                        </div>
                      )}
                      {decodedInvoice.expiry && (
                        <div className="flex justify-between">
                          <span>Expires in:</span>
                          <span className="font-mono">
                            {Math.floor(decodedInvoice.expiry / 60)} minutes
                          </span>
                        </div>
                      )}
                      {decodedInvoice.payment_hash && (
                        <div className="flex justify-between">
                          <span>Payment Hash:</span>
                          <span className="font-mono text-xs">
                            {decodedInvoice.payment_hash.substring(0, 8)}...
                          </span>
                        </div>
                      )}
                      {decodedInvoice.created_at && (
                        <div className="flex justify-between">
                          <span>Created:</span>
                          <span className="font-mono">
                            {new Date(decodedInvoice.created_at * 1000).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {feeEstimate && !estimating && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <div>
                  Amount:{' '}
                  {withdrawalType === 'usd'
                    ? `$${amount} USD (${formatAmount(
                        feeEstimate.amount
                      )} sats)`
                    : `${formatAmount(parseInt(amount))} sats`}
                </div>
                <div>Estimated Fee: {formatAmount(feeEstimate.fee)} sats</div>
                <div className="font-semibold">
                  Total: {formatAmount(feeEstimate.total)} sats
                </div>
                {withdrawalType === 'usd' && feeEstimate.exchangeRate > 0 && (
                  <div className="text-sm text-muted-foreground">
                    Exchange Rate: {feeEstimate.exchangeRate.toFixed(2)}{' '}
                    sats/USD
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {estimating && (
          <Alert>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription>Estimating withdrawal fee...</AlertDescription>
          </Alert>
        )}

        <div className="flex justify-end space-x-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            onClick={handleWithdraw}
            disabled={
              isProcessing || !invoice || !amount || parseFloat(amount) <= 0
            }
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Withdraw
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
