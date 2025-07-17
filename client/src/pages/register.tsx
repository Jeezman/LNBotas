import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, User } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function RegisterPage() {
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username || !password || !confirmPassword) {
      setError("All fields are required");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    setIsLoading(true);

    try {
      const response = await apiRequest("POST", "/api/user/register", { username, password });
      const user = await response.json();

      // Registration successful, redirect to dashboard with user ID
      setLocation(`/dashboard?userId=${user.id}`);
    } catch (error: any) {
      setError(error.message || "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4 sm:p-6">
      <Card className="w-full max-w-sm sm:max-w-md">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <div className="h-10 w-10 sm:h-12 sm:w-12 bg-primary/10 rounded-full flex items-center justify-center">
              <User className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            </div>
          </div>
          <CardTitle className="text-xl sm:text-2xl">Create Account</CardTitle>
          <CardDescription className="text-sm sm:text-base">
            Create a new account to start trading Bitcoin derivatives with LN Markets
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm sm:text-base">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
                className="text-sm sm:text-base"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm sm:text-base">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className="text-sm sm:text-base"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm sm:text-base">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required
                className="text-sm sm:text-base"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full text-sm sm:text-base py-2 sm:py-3" 
              disabled={isLoading}
            >
              {isLoading ? "Creating Account..." : "Create Account"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              Already have an account?{" "}
              <button
                onClick={() => setLocation("/")}
                className="text-primary hover:underline font-medium"
              >
                Sign in here
              </button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}