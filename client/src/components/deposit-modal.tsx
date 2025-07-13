import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, QrCode } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import QRCode from "react-qr-code";

interface Deposit {
  id: number;
  address: string;
  amount: number;
  status: string;
  expiresAt: string;
  expiry: number;
}

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  deposit: Deposit | null;
}

export function DepositModal({ isOpen, onClose, deposit }: DepositModalProps) {
  const { toast } = useToast();

  if (!deposit) return null;

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(deposit.address);
    toast({
      title: "Payment Request Copied",
      description: "Lightning Network payment request copied to clipboard.",
    });
  };

  const formatAmount = (amount: number) => {
    return amount.toLocaleString();
  };

  const formatExpiry = (expiresAt: string) => {
    const expiry = new Date(expiresAt);
    const now = new Date();
    const diffMs = expiry.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins <= 0) return "Expired";
    if (diffMins < 60) return `${diffMins} minutes`;
    
    const diffHours = Math.floor(diffMins / 60);
    const remainingMins = diffMins % 60;
    return `${diffHours}h ${remainingMins}m`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <DialogTitle className="flex items-center justify-center gap-2">
            <QrCode className="h-5 w-5" />
            Lightning Payment Request
          </DialogTitle>
          <DialogDescription>
            Scan the QR code or copy the payment request to send Bitcoin
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* QR Code */}
          <div className="flex justify-center">
            <div className="p-4 bg-white rounded-lg">
              <QRCode
                value={deposit.address}
                size={200}
                level="M"
              />
            </div>
          </div>

          {/* Payment Details */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Amount:</span>
              <Badge variant="secondary" className="font-mono">
                {formatAmount(deposit.amount)} sats
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Status:</span>
              <Badge variant="outline">
                {deposit.status}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Expires in:</span>
              <span className="text-sm text-muted-foreground">
                {formatExpiry(deposit.expiresAt)}
              </span>
            </div>
          </div>

          {/* Payment Request */}
          <div className="space-y-2">
            <span className="text-sm font-medium">Payment Request:</span>
            <div className="p-3 bg-muted rounded-lg">
              <div className="font-mono text-xs break-all text-muted-foreground">
                {deposit.address.length > 80 
                  ? `${deposit.address.slice(0, 40)}...${deposit.address.slice(-40)}`
                  : deposit.address
                }
              </div>
            </div>
          </div>

          {/* Copy Button */}
          <Button
            onClick={handleCopyAddress}
            className="w-full"
            variant="default"
          >
            <Copy className="mr-2 h-4 w-4" />
            Copy Payment Request
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}