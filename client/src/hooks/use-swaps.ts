import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './use-auth';
import { useToast } from './use-toast';
import { api, type Swap, type SwapRequest, type SwapSyncResult } from '@/lib/api';

export function useSwaps(userId?: number) {
  const { user: authUser } = useAuth();
  const userIdParam = userId || authUser?.id;

  return useQuery<Swap[]>({
    queryKey: ['/api/swaps', userIdParam],
    queryFn: () => api.getSwaps(Number(userIdParam)),
    enabled: !!userIdParam,
  });
}

export function useExecuteSwap() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user: authUser } = useAuth();

  return useMutation({
    mutationFn: (swapRequest: Omit<SwapRequest, 'userId'>) =>
      api.executeSwap({ ...swapRequest, userId: Number(authUser?.id) }),
    onSuccess: (swap) => {
      queryClient.invalidateQueries({ queryKey: ['/api/swaps'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user'] }); // Refresh balance
      toast({
        title: 'Swap Executed',
        description: `Successfully swapped ${swap.fromAsset} to ${swap.toAsset}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Swap Failed',
        description: error.message || 'Failed to execute swap',
        variant: 'destructive',
      });
    },
  });
}

export function useSyncSwaps() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user: authUser } = useAuth();

  return useMutation({
    mutationFn: (userId?: number) =>
      api.syncSwaps(userId || Number(authUser?.id)),
    onSuccess: (result: SwapSyncResult) => {
      queryClient.invalidateQueries({ queryKey: ['/api/swaps'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user'] }); // Refresh balance
      toast({
        title: 'Swaps Synced',
        description: `${result.totalProcessed} swaps synchronized from LN Markets`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Sync Failed',
        description: error.message || 'Failed to sync swaps',
        variant: 'destructive',
      });
    },
  });
}