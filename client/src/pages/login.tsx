import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, LogIn } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username || !password) {
      setError("Please enter both username and password");
      return;
    }

    setIsLoading(true);

    try {
      console.log('Login page: Attempting login with:', { username });
      const user = await login(username, password);
      console.log('Login page: Login successful, user:', user);
      // Login successful, redirect to dashboard
      console.log('Login page: Navigating to dashboard');
      setLocation("/dashboard");
    } catch (error: any) {
      console.error('Login page: Login failed:', error);
      setError(error.message || "Login failed. Please try again.");
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
              <LogIn className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            </div>
          </div>
          <CardTitle className="text-xl sm:text-2xl">Sign In</CardTitle>
          <CardDescription className="text-sm sm:text-base">
            Sign in to your account to access Bitcoin derivatives trading
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

            <Button 
              type="submit" 
              className="w-full text-sm sm:text-base py-2 sm:py-3" 
              disabled={isLoading}
            >
              {isLoading ? "Signing In..." : "Sign In"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              Don't have an account?{" "}
              <button
                onClick={() => setLocation("/register")}
                className="text-primary hover:underline font-medium"
              >
                Create one here
              </button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}