import { useUser } from "@/hooks/use-trading";
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
import { User, Bitcoin, DollarSign, Copy, QrCode, Download, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const depositFormSchema = z.object({
  amount: z.string().min(1, "Amount is required").refine(
    (val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num > 0;
    },
    "Amount must be a positive number"
  ),
});

type DepositFormValues = z.infer<typeof depositFormSchema>;

export default function UserPage() {
  const { data: user, isLoading } = useUser();
  const { toast } = useToast();
  const [depositAddress, setDepositAddress] = useState<string | null>(null);
  const [isGeneratingAddress, setIsGeneratingAddress] = useState(false);
  
  const depositForm = useForm<DepositFormValues>({
    resolver: zodResolver(depositFormSchema),
    defaultValues: {
      amount: "",
    },
  });

  const handleGenerateDepositAddress = async () => {
    if (!user) return;
    
    setIsGeneratingAddress(true);
    try {
      // This would typically call LN Markets API to generate a new deposit address
      // For now, we'll simulate this with a placeholder address
      const mockAddress = `ln${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
      setDepositAddress(mockAddress);
      
      toast({
        title: "Deposit Address Generated",
        description: "New Bitcoin Lightning deposit address created successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate deposit address. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingAddress(false);
    }
  };

  const handleCopyAddress = () => {
    if (depositAddress) {
      navigator.clipboard.writeText(depositAddress);
      toast({
        title: "Copied",
        description: "Deposit address copied to clipboard.",
      });
    }
  };

  const onSubmitDeposit = (values: DepositFormValues) => {
    toast({
      title: "Deposit Initiated",
      description: `Deposit request for ${values.amount} sats has been created. Use the address below to complete the transfer.`,
    });
    
    // Generate address when deposit is initiated
    if (!depositAddress) {
      handleGenerateDepositAddress();
    }
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
              <span className="font-mono text-sm">
                ₿{user.balance || "0.00000000"}
              </span>
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
                          placeholder="10000" 
                          type="number"
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
                
                <Button type="submit" className="w-full">
                  Generate Deposit Address
                </Button>
              </form>
            </Form>

            {depositAddress && (
              <>
                <Separator />
                
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="mx-auto w-32 h-32 bg-white border-2 border-gray-300 rounded-lg flex items-center justify-center mb-4">
                      <QrCode className="h-16 w-16 text-gray-400" />
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Lightning Network Deposit Address
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Deposit Address</Label>
                    <div className="flex gap-2">
                      <Input 
                        value={depositAddress} 
                        readOnly 
                        className="font-mono text-xs"
                      />
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={handleCopyAddress}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2">Deposit Instructions</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Send Bitcoin to the address above</li>
                      <li>• Minimum deposit: 1,000 sats</li>
                      <li>• Funds will appear after 1 confirmation</li>
                      <li>• Lightning Network deposits are instant</li>
                    </ul>
                  </div>

                  <Button 
                    variant="outline" 
                    onClick={handleGenerateDepositAddress}
                    disabled={isGeneratingAddress}
                    className="w-full"
                  >
                    {isGeneratingAddress ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Generate New Address
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}