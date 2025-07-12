import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import UserPage from "@/pages/user";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/user" component={Dashboard} />
      <Route path="/futures" component={Dashboard} />
      <Route path="/options" component={Dashboard} />
      <Route path="/history" component={Dashboard} />
      <Route path="/portfolio" component={Dashboard} />
      <Route path="/settings" component={Dashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
