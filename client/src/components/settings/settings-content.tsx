import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Trash2 } from "lucide-react";
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
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

export function SettingsContent() {
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const { user, logout } = useAuth();
  const { toast } = useToast();

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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
        <p className="text-gray-600 mt-1">Manage your account settings and preferences.</p>
      </div>

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