import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  api,
  type MarketData,
  type Trade,
  type User,
  type TradeRequest,
} from "@/lib/api";
import type { Deposit } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

export function useMarketData() {
  return useQuery<MarketData>({
    queryKey: ["/api/market/ticker"],
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

export function useUser(userId?: string | number) {
  const { user: authUser } = useAuth();

  // If we have an authenticated user from context, return that instead of making API call
  if (authUser && !userId) {
    return {
      data: authUser,
      isLoading: false,
      error: null,
    };
  }

  const userIdParam = userId || authUser?.id;

  return useQuery<User>({
    queryKey: ["/api/user", userIdParam],
    enabled: !!userIdParam, // Only run query if we have a user ID
  });
}

export function useActiveTrades(userId?: string | number) {
  const { user: authUser } = useAuth();
  const userIdParam = userId || authUser?.id;

  return useQuery<Trade[]>({
    queryKey: ["/api/trades", userIdParam, "active"],
    refetchInterval: 10000, // Refetch every 10 seconds
    enabled: !!userIdParam, // Only run query if we have a user ID
  });
}

export function useTradeHistory(userId?: string | number) {
  const { user: authUser } = useAuth();
  const userIdParam = userId || authUser?.id;

  return useQuery<Trade[]>({
    queryKey: ["/api/trades", userIdParam],
    enabled: !!userIdParam, // Only run query if we have a user ID
  });
}

export function useCreateTrade(userId?: string | number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user: authUser } = useAuth();
  const userIdParam = userId || authUser?.id;

  return useMutation({
    mutationFn: (trade: Omit<TradeRequest, "userId">) =>
      api.createTrade({ ...trade, userId: Number(userIdParam) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trades"] });
      toast({
        title: "Trade Created",
        description: "Your trade has been placed successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Trade Failed",
        description: error.message || "Failed to create trade",
        variant: "destructive",
      });
    },
  });
}

export function useUpdateTrade() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      tradeId,
      updates,
    }: {
      tradeId: number;
      updates: { takeProfit?: string; stopLoss?: string };
    }) => api.updateTrade(tradeId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trades"] });
      toast({
        title: "Trade Updated",
        description: "Your trade has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update trade",
        variant: "destructive",
      });
    },
  });
}

export function useCloseTrade() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (tradeId: number) => api.closeTrade(tradeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trades"] });
      toast({
        title: "Trade Closed",
        description: "Your trade has been closed successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Close Failed",
        description: error.message || "Failed to close trade",
        variant: "destructive",
      });
    },
  });
}

export function useCloseAllTrades() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user: authUser } = useAuth();

  return useMutation({
    mutationFn: () => {
      if (!authUser?.id) {
        throw new Error("No user ID available for closing trades");
      }
      return api.closeAllTrades(Number(authUser.id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trades"] });
      toast({
        title: "All Trades Closed",
        description: "All your trades have been closed successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Close All Failed",
        description: error.message || "Failed to close all trades",
        variant: "destructive",
      });
    },
  });
}

export function useUpdateMarketData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.updateMarketData(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/market/ticker"] });
    },
  });
}

export function useUpdateUserCredentials(userId?: string | number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user: authUser, setUser } = useAuth();
  const userIdParam = userId || authUser?.id;

  return useMutation({
    mutationFn: (credentials: {
      apiKey: string;
      apiSecret: string;
      apiPassphrase: string;
    }) => {
      console.log("Update credentials mutation - User ID param:", userIdParam);
      console.log("Update credentials mutation - Auth user:", authUser);
      if (!userIdParam) {
        throw new Error("No user ID available for updating credentials");
      }
      return api.updateUserCredentials(Number(userIdParam), credentials);
    },
    onSuccess: (data) => {
      // Invalidate all user-related queries
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });

      // Update the auth context with fresh user data that includes API credentials
      if (authUser && data) {
        const updatedUser = {
          ...authUser,
          apiKey: data.apiKey || authUser.apiKey,
          apiSecret: data.apiSecret || authUser.apiSecret,
          apiPassphrase: data.apiPassphrase || authUser.apiPassphrase,
          balance: data.balance || authUser.balance,
          balanceUSD: data.balanceUSD || authUser.balanceUSD,
        };
        setUser(updatedUser);
      }

      toast({
        title: "Credentials Updated",
        description: "Your API credentials have been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update credentials",
        variant: "destructive",
      });
    },
  });
}

export function useSyncTrades(userId?: string | number, tradeType: 'open' | 'running' | 'closed' | 'all' = 'all') {
  const { toast } = useToast();
  const { user: authUser } = useAuth();
  const userIdParam = userId || authUser?.id;
  
  return useMutation({
    mutationFn: async () => {
      if (!userIdParam) throw new Error("User ID is required");
      
      const response = await apiRequest("POST", "/api/trades/sync", { userId: userIdParam, tradeType });
      return response.json();
    },
    onSuccess: (data: any) => {
      // Invalidate all trade-related queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/trades', userIdParam] });
      queryClient.invalidateQueries({ queryKey: ['/api/trades', userIdParam, 'active'] });
      
      const tradeTypeLabel = tradeType === 'all' ? 'All' : tradeType.charAt(0).toUpperCase() + tradeType.slice(1);
      toast({
        title: `${tradeTypeLabel} Trades Synced`,
        description: `Synced ${data.totalProcessed} ${tradeType === 'all' ? '' : tradeType + ' '}trades from LN Markets (${data.syncedCount} new, ${data.updatedCount} updated)`,
      });
    },
    onError: (error: any) => {
      const tradeTypeLabel = tradeType === 'all' ? 'All' : tradeType.charAt(0).toUpperCase() + tradeType.slice(1);
      toast({
        title: `${tradeTypeLabel} Sync Failed`,
        description: error.message || `Failed to sync ${tradeType} trades from LN Markets`,
        variant: "destructive",
      });
    },
  });
}

// Deposit hooks
export function useDeposits(userId?: string | number) {
  return useQuery<Deposit[]>({
    queryKey: ["/api/deposits", Number(userId)],
    enabled: !!userId,
  });
}

export function useGenerateDeposit(userId?: string | number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ amount }: { amount?: number }) => {
      if (!userId) {
        throw new Error("User ID is required");
      }
      
      const response = await apiRequest("POST", "/api/deposits/generate", {
        userId: Number(userId), 
        amount 
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deposits", Number(userId)] });
      toast({
        title: "Deposit Address Generated",
        description: "Your Lightning deposit address has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate deposit address",
        variant: "destructive",
      });
    },
  });
}

export function useSyncDeposits(userId?: string | number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      if (!userId) {
        throw new Error("User ID is required");
      }
      
      const response = await apiRequest("POST", "/api/deposits/sync", {
        userId: Number(userId)
      });
      return response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/deposits", Number(userId)] });
      toast({
        title: "Deposits Synced",
        description: `Synced ${data.totalProcessed} deposits from LN Markets (${data.syncedCount} new, ${data.updatedCount} updated)`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync deposits from LN Markets",
        variant: "destructive",
      });
    },
  });
}

export function useCheckDepositStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ depositId, userId }: { depositId: number; userId: number }) => {
      const response = await apiRequest("POST", `/api/deposits/${depositId}/check`, {
        userId: Number(userId)
      });
      return response.json();
    },
    onSuccess: (data: any, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/deposits", Number(variables.userId)] });
      
      const statusMessage = data.status === "completed" 
        ? "Payment confirmed! Deposit completed successfully."
        : data.status === "failed"
        ? "Payment failed or expired."
        : "Payment still pending...";
        
      toast({
        title: "Deposit Status Updated",
        description: statusMessage,
        variant: data.status === "completed" ? "default" : "destructive",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Status Check Failed",
        description: error.message || "Failed to check deposit status",
        variant: "destructive",
      });
    },
  });
}
