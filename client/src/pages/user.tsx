import { useUser } from "@/hooks/use-trading";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, Bitcoin, DollarSign } from "lucide-react";

export default function UserPage() {
  const { data: user, isLoading } = useUser();

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

      <div className="grid gap-6">
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
      </div>
    </div>
  );
}