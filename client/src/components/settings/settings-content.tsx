import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Trash2, Key, Database } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useUser, useUpdateUserCredentials } from "@/hooks/use-trading";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const credentialsSchema = z.object({
  apiKey: z.string().min(1, "API Key is required"),
  apiSecret: z.string().min(1, "API Secret is required"),
  apiPassphrase: z.string().min(1, "API Passphrase is required"),
});

type CredentialsFormValues = z.infer<typeof credentialsSchema>;

export function SettingsContent() {
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isClearingCache, setIsClearingCache] = useState(false);
  const { user, logout } = useAuth();
  const { toast } = useToast();

  // Debug: Show current user info
  console.log('SettingsContent - Current user:', user);
  console.log('SettingsContent - User ID:', user?.id);
  
  // Get user data for API credentials
  const { data: userData, isLoading: userLoading } = useUser();
  const updateCredentials = useUpdateUserCredentials();

  const form = useForm<CredentialsFormValues>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: {
      apiKey: "",
      apiSecret: "",
      apiPassphrase: "",
    },
  });

  // Update form values when user data loads
  useEffect(() => {
    if (userData) {
      form.reset({
        apiKey: userData.apiKey || "",
        apiSecret: userData.apiSecret || "",
        apiPassphrase: userData.apiPassphrase || "",
      });
    }
  }, [userData, form]);

  const onSubmit = (values: CredentialsFormValues) => {
    console.log('Settings form submit - Auth user:', user);
    console.log('Settings form submit - User ID:', user?.id);
    console.log('Settings form submit - Values:', values);
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

  const handleClearCache = async () => {
    setIsClearingCache(true);
    try {
      const response = await apiRequest("DELETE", "/api/market/cache", {});
      const result = await response.json();
      
      toast({
        title: "Cache Cleared",
        description: result.message || "Market data cache has been cleared successfully",
      });
    } catch (error: any) {
      console.error('Clear cache error:', error);
      toast({
        title: "Clear Cache Failed",
        description: error.message || "Failed to clear market data cache",
        variant: "destructive",
      });
    } finally {
      setIsClearingCache(false);
    }
  };

  const handleDeleteAccount = async () => {
    console.log('Delete account button clicked');
    console.log('Current user:', user);
    console.log('User ID:', user?.id);
    console.log('User keys:', user ? Object.keys(user) : 'No user object');
    
    if (!user?.id) {
      console.log('No user ID found, aborting delete');
      return;
    }

    if (confirmText !== "DELETE") {
      console.log('Confirmation text incorrect:', confirmText);
      toast({
        title: "Confirmation Required",
        description: "Please type 'DELETE' to confirm account deletion",
        variant: "destructive",
      });
      return;
    }

    console.log('Starting delete process for user ID:', user.id);
    setIsDeleting(true);

    try {
      console.log('Making DELETE request to:', `/api/user/${user.id}`);
      const response = await apiRequest("DELETE", `/api/user/${user.id}`, {});
      console.log('Delete API response status:', response.status);
      
      // Parse the response to get the actual result
      const result = await response.json();
      console.log('Delete API result:', result);
      
      console.log('Account deleted successfully, calling logout');
      // Use logout function which handles cleanup and redirect
      logout();
      
      toast({
        title: "Account Deleted",
        description: "Your account has been permanently deleted",
      });
    } catch (error: any) {
      console.error('Delete account error:', error);
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete account",
        variant: "destructive",
      });
    } finally {
      console.log('Delete process finished, resetting state');
      setIsDeleting(false);
      setConfirmText("");
    }
  };

  // Show user info for debugging
  if (!user) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>
              You need to be logged in to access settings. Please log out and log back in.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Current user: {user ? JSON.stringify(user) : 'null'}</p>
            <p className="text-sm text-muted-foreground">Try logging in as "jeezman" to test API credentials.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
        <p className="text-gray-600 mt-1">Manage your account settings and preferences.</p>
      </div>

      {/* Debug Info */}
      <Card>
        <CardHeader>
          <CardTitle>Debug Info</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Current User ID: {user.id}</p>
          <p className="text-sm text-muted-foreground">Username: {user.username}</p>
          <p className="text-sm text-muted-foreground">API Key exists: {user.apiKey ? 'Yes' : 'No'}</p>
        </CardContent>
      </Card>

      {/* Account Information */}
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>
            Your account details and current status
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm font-medium text-gray-700">Username</Label>
            <p className="text-sm text-gray-900 mt-1">{user?.username || 'Loading...'}</p>
          </div>
          
          <div>
            <Label className="text-sm font-medium text-gray-700">API Status</Label>
            <p className="text-sm text-gray-900 mt-1">
              {user?.apiKey ? 'Connected to LN Markets' : 'Not connected'}
            </p>
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
          {userLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : (
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
          )}
        </CardContent>
      </Card>

      {/* API Information */}
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
          </div>
        </CardContent>
      </Card>

      {/* Market Data Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Market Data Management
          </CardTitle>
          <CardDescription>
            Manage cached market data and system cache
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
              Clear Market Data Cache
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
              This will clear all cached market data from the database. The system will either fetch fresh data from the LN Markets API (if credentials are available) or return empty values.
            </p>
            <Button 
              onClick={handleClearCache}
              disabled={isClearingCache}
              variant="outline"
              className="w-full sm:w-auto"
            >
              <Database className="w-4 h-4 mr-2" />
              {isClearingCache ? "Clearing..." : "Clear Market Data Cache"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600">Danger Zone</CardTitle>
          <CardDescription>
            Irreversible actions that will permanently affect your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Deleting your account is permanent and cannot be undone. All your trading history, 
              API credentials, and account data will be permanently removed.
            </AlertDescription>
          </Alert>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full sm:w-auto">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete your account and remove all your data from our servers.
                </AlertDialogDescription>
              </AlertDialogHeader>
              
              <div className="space-y-2 py-4">
                <p className="text-sm text-gray-600">This includes:</p>
                <ul className="list-disc list-inside text-sm space-y-1 text-gray-600">
                  <li>Your trading history and positions</li>
                  <li>API credentials and connections</li>
                  <li>Account settings and preferences</li>
                  <li>All personal data associated with your account</li>
                </ul>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="confirm-delete" className="text-sm font-medium">
                    Type "DELETE" to confirm:
                  </Label>
                  <Input
                    id="confirm-delete"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="Type DELETE here"
                    className="mt-1"
                  />
                </div>
              </div>

              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setConfirmText("")}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAccount}
                  disabled={confirmText !== "DELETE" || isDeleting}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {isDeleting ? "Deleting..." : "Delete Account"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}