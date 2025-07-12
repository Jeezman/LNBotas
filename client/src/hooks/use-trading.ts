import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type MarketData, type Trade, type User, type TradeRequest } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

export function useMarketData() {
  return useQuery<MarketData>({
    queryKey: ['/api/market/ticker'],
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
      error: null
    };
  }
  
  const userIdParam = userId || authUser?.id;
  
  return useQuery<User>({
    queryKey: ['/api/user', userIdParam],
    enabled: !!userIdParam, // Only run query if we have a user ID
  });
}

export function useActiveTrades(userId?: string | number) {
  const { user: authUser } = useAuth();
  const userIdParam = userId || authUser?.id;
  
  return useQuery<Trade[]>({
    queryKey: ['/api/trades', userIdParam, 'active'],
    refetchInterval: 10000, // Refetch every 10 seconds
    enabled: !!userIdParam, // Only run query if we have a user ID
  });
}

export function useTradeHistory(userId?: string | number) {
  const { user: authUser } = useAuth();
  const userIdParam = userId || authUser?.id;
  
  return useQuery<Trade[]>({
    queryKey: ['/api/trades', userIdParam],
    enabled: !!userIdParam, // Only run query if we have a user ID
  });
}

export function useCreateTrade(userId?: string | number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user: authUser } = useAuth();
  const userIdParam = userId || authUser?.id;

  return useMutation({
    mutationFn: (trade: Omit<TradeRequest, 'userId'>) => 
      api.createTrade({ ...trade, userId: Number(userIdParam) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trades'] });
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
    mutationFn: ({ tradeId, updates }: { tradeId: number; updates: { takeProfit?: string; stopLoss?: string } }) =>
      api.updateTrade(tradeId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trades'] });
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
      queryClient.invalidateQueries({ queryKey: ['/api/trades'] });
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

  return useMutation({
    mutationFn: () => api.closeAllTrades(MOCK_USER_ID),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trades'] });
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
      queryClient.invalidateQueries({ queryKey: ['/api/market/ticker'] });
    },
  });
}

export function useUpdateUserCredentials(userId?: string | number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user: authUser } = useAuth();
  const userIdParam = userId || authUser?.id;

  return useMutation({
    mutationFn: (credentials: { apiKey: string; apiSecret: string; apiPassphrase: string }) => {
      console.log('Update credentials mutation - User ID param:', userIdParam);
      console.log('Update credentials mutation - Auth user:', authUser);
      if (!userIdParam) {
        throw new Error('No user ID available for updating credentials');
      }
      return api.updateUserCredentials(Number(userIdParam), credentials);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
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
