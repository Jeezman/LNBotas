import { useUser, useUserFullInfo, useDeposits, useGenerateDeposit, useSyncDeposits, useCheckDepositStatus, useSyncBalance } from "@/hooks/use-trading";
import { useAuth } from "@/hooks/use-auth";
import type { Deposit } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { User, Bitcoin, DollarSign, Copy, QrCode, Download, RefreshCw, Hash, Settings, Zap, Mail, Key, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DepositModal } from "@/components/deposit-modal";

const depositFormSchema = z.object({
  amount: z.string().min(1, "Amount is required").refine(
    (val) => {
      const num = parseInt(val);
      return !isNaN(num) && num > 0;
    },
    "Amount must be a positive number"
  ),
});

type DepositFormValues = z.infer<typeof depositFormSchema>;

export default function UserPage() {
  const { user: authUser } = useAuth();
  const { data: user, isLoading } = useUser(authUser?.id);
  const { data: userFullInfo, isLoading: isLoadingFullInfo } = useUserFullInfo(authUser?.id);
  const { data: deposits = [], refetch: refetchDeposits } = useDeposits(authUser?.id);
  const generateDeposit = useGenerateDeposit(authUser?.id);
  const syncDeposits = useSyncDeposits(authUser?.id);
  const syncBalance = useSyncBalance(authUser?.id);
  const checkDepositStatus = useCheckDepositStatus();
  const { toast } = useToast();
  
  const [selectedDeposit, setSelectedDeposit] = useState<Deposit | null>(null);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  const truncateText = (text: string, maxLength: number = 20) => {
    if (text.length <= maxLength) return text;
    return `${text.substring(0, maxLength)}...`;
  };
  
  const depositForm = useForm<DepositFormValues>({
    resolver: zodResolver(depositFormSchema),
    defaultValues: {
      amount: "",
    },
  });

  const onSubmitDeposit = async (values: DepositFormValues) => {
    const amount = parseInt(values.amount); // Amount is already in satoshis
    generateDeposit.mutate({ amount }, {
      onSuccess: (newDeposit) => {
        setSelectedDeposit(newDeposit);
        setIsDepositModalOpen(true);
        depositForm.reset();
      }
    });
  };

  const handleCopyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    toast({
      title: "Copied",
      description: "Deposit address copied to clipboard.",
    });
  };

  const handleShowQrCode = (deposit: Deposit) => {
    setSelectedDeposit(deposit);
    setIsDepositModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsDepositModalOpen(false);
    setSelectedDeposit(null);
  };

  const handleSyncDeposits = () => {
    syncDeposits.mutate();
  };

  const handleCheckDepositStatus = (depositId: number) => {
    if (!authUser?.id) return;
    checkDepositStatus.mutate({ depositId, userId: authUser.id });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">User not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">User Profile</h1>
        <p className="text-muted-foreground">
          View your account information and trading balances
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* User Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Account Information
            </CardTitle>
            <CardDescription>
              Your account details and current status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Username</Label>
              <Badge variant="secondary">{user.username}</Badge>
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Bitcoin className="h-4 w-4" />
                Bitcoin Balance
              </Label>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm">
                  ₿{user.balance ? parseFloat(user.balance).toLocaleString() : "0"}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => syncBalance.mutate()}
                  disabled={syncBalance.isPending}
                  className="h-6 w-6 p-0"
                >
                  <RefreshCw className={`h-3 w-3 ${syncBalance.isPending ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                USD Balance
              </Label>
              <span className="font-mono text-sm">
                ${user.balanceUSD || "0.00"}
              </span>
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <Label>API Status</Label>
              <Badge variant={user.apiKey ? "default" : "secondary"}>
                {user.apiKey ? "Connected" : "Not Connected"}
              </Badge>
            </div>
            
            {userFullInfo && (
              <>
                <Separator />
                
                {/* User ID */}
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Hash className="h-4 w-4" />
                    User ID
                  </Label>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-gray-600">
                      {truncateText(userFullInfo.uid || 'N/A', 16)}
                    </span>
                    {userFullInfo.uid && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(userFullInfo.uid!, 'User ID')}
                        className="h-6 w-6 p-0"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
                
                {/* Synthetic USD Balance */}
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Synthetic USD Balance
                  </Label>
                  <span className="font-mono text-sm">
                    ${userFullInfo.synthetic_usd_balance?.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    }) || '0.00'}
                  </span>
                </div>
                
                <Separator />
                
                {/* Taproot Addresses */}
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Taproot Addresses
                  </Label>
                  <Badge variant={userFullInfo.use_taproot_addresses ? "default" : "secondary"}>
                    {userFullInfo.use_taproot_addresses ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
                
                {/* Auto Withdraw */}
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Auto Withdraw
                  </Label>
                  <Badge variant={userFullInfo.auto_withdraw_enabled ? "default" : "secondary"}>
                    {userFullInfo.auto_withdraw_enabled ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
                
                {/* Auto Withdraw Lightning Address */}
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    Auto Withdraw Address
                  </Label>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-gray-600">
                      {userFullInfo.auto_withdraw_lightning_address 
                        ? truncateText(userFullInfo.auto_withdraw_lightning_address, 20)
                        : 'Not Set'}
                    </span>
                    {userFullInfo.auto_withdraw_lightning_address && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(userFullInfo.auto_withdraw_lightning_address!, 'Lightning Address')}
                        className="h-6 w-6 p-0"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
                
                <Separator />
                
                {/* Linking Public Key */}
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Key className="h-4 w-4" />
                    Linking Public Key
                  </Label>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-gray-600">
                      {userFullInfo.linkingpublickey 
                        ? truncateText(userFullInfo.linkingpublickey, 20)
                        : 'N/A'}
                    </span>
                    {userFullInfo.linkingpublickey && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(userFullInfo.linkingpublickey!, 'Public Key')}
                        className="h-6 w-6 p-0"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </>
            )}
            
            {isLoadingFullInfo && (
              <>
                <Separator />
                <div className="flex items-center justify-center py-4">
                  <span className="text-sm text-gray-500">Loading extended user info...</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Deposit Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Deposit Bitcoin
            </CardTitle>
            <CardDescription>
              Add funds to your trading account via Bitcoin Lightning Network
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Form {...depositForm}>
              <form onSubmit={depositForm.handleSubmit(onSubmitDeposit)} className="space-y-4">
                <FormField
                  control={depositForm.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount (Satoshis)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="1337" 
                          type="number"
                          step="1"
                          min="1"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Enter the amount in satoshis you want to deposit
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={generateDeposit.isPending}
                >
                  {generateDeposit.isPending ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Generate Deposit Address
                </Button>
              </form>
            </Form>

            {deposits.length > 0 && (
              <>
                <Separator />
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Recent Deposits</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSyncDeposits}
                      disabled={syncDeposits.isPending}
                    >
                      {syncDeposits.isPending ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  
                  {deposits.slice(0, 3).map((deposit: Deposit) => (
                    <div key={deposit.id} className="p-4 border rounded-lg bg-muted/50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={
                              deposit.status === 'completed' || deposit.status === 'confirmed' ? 'default' :
                              deposit.status === 'pending' ? 'secondary' : 'destructive'
                            }
                            className={
                              deposit.status === 'completed' || deposit.status === 'confirmed' 
                                ? 'bg-green-600 text-white hover:bg-green-700' 
                                : ''
                            }
                          >
                            {deposit.status}
                          </Badge>
                          {deposit.amount && (
                            <span className="text-sm text-muted-foreground">
                              {deposit.amount} sats
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleShowQrCode(deposit)}
                            title="Show QR code"
                          >
                            <QrCode className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleCheckDepositStatus(deposit.id)}
                            disabled={checkDepositStatus.isPending}
                            title="Check payment status"
                          >
                            {checkDepositStatus.isPending ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <RefreshCw className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyAddress(deposit.address)}
                            title="Copy deposit address"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="bg-background p-3 rounded border font-mono text-xs break-all">
                        {deposit.address}
                      </div>
                      {deposit.expiresAt && new Date(deposit.expiresAt) > new Date() && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Expires: {new Date(deposit.expiresAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Deposit Modal */}
      <DepositModal
        isOpen={isDepositModalOpen}
        onClose={handleCloseModal}
        deposit={selectedDeposit}
      />
    </div>
  );
}