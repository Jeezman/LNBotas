import { useUser } from "@/hooks/use-trading";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useUpdateUserCredentials } from "@/hooks/use-trading";
import { useToast } from "@/hooks/use-toast";
import { User, Key, Bitcoin, DollarSign, AlertCircle } from "lucide-react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const credentialsSchema = z.object({
  apiKey: z.string().min(1, "API Key is required"),
  apiSecret: z.string().min(1, "API Secret is required"),
  apiPassphrase: z.string().min(1, "API Passphrase is required"),
});

type CredentialsFormValues = z.infer<typeof credentialsSchema>;

export default function UserPage() {
  const { data: user, isLoading } = useUser();
  const updateCredentials = useUpdateUserCredentials();
  const { toast } = useToast();

  const form = useForm<CredentialsFormValues>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: {
      apiKey: user?.apiKey || "",
      apiSecret: user?.apiSecret || "",
      apiPassphrase: user?.apiPassphrase || "",
    },
  });

  const onSubmit = (values: CredentialsFormValues) => {
    updateCredentials.mutate(values, {
      onSuccess: () => {
        toast({
          title: "Success",
          description: "API credentials updated successfully",
        });
      },
      onError: (error) => {
        toast({
          title: "Error",
          description: error.message || "Failed to update credentials",
          variant: "destructive",
        });
      },
    });
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
          Manage your account settings and API credentials
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
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

        {/* API Credentials */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              LN Markets API Credentials
            </CardTitle>
            <CardDescription>
              Configure your LN Markets API credentials for live trading
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="apiKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>API Key</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Enter your API key"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="apiSecret"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>API Secret</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Enter your API secret"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="apiPassphrase"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>API Passphrase</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Enter your API passphrase"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={updateCredentials.isPending}
                >
                  {updateCredentials.isPending ? "Updating..." : "Update Credentials"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      {/* Additional Information */}
      <Card>
        <CardHeader>
          <CardTitle>About LN Markets API</CardTitle>
          <CardDescription>
            Information about connecting to LN Markets
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            To enable live trading, you need to provide your LN Markets API credentials. 
            You can obtain these from your LN Markets account dashboard.
          </p>
          <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                How to Get API Credentials
              </h4>
              <ol className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-decimal list-inside">
                <li>Log in to your LN Markets account</li>
                <li>Go to Account → API Management</li>
                <li>Create a new API key with trading permissions</li>
                <li>Copy the API Key, Secret, and Passphrase</li>
                <li>Enter them in the form above</li>
              </ol>
            </div>
            
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                Security Note
              </h4>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                Your API credentials are encrypted and stored securely. Never share your 
                API credentials with anyone else. The app will test your credentials when you save them.
              </p>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
              <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-2 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Demo Mode
              </h4>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                The app currently runs in demo mode with sample data. To enable live trading with real Bitcoin, 
                add your LN Markets API credentials above. Without valid credentials, you can still explore 
                the interface and test trading features with simulated data.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}