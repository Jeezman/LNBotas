import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToast } from './use-toast';
import type { Withdrawal, WithdrawalEstimate } from '@/lib/api';

export function useWithdrawals(userId?: number) {
  return useQuery({
    queryKey: ['/api/withdrawals', userId],
    queryFn: () => api.getWithdrawals(Number(userId)),
    enabled: !!userId,
  });
}

export function useWithdrawLightning() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      userId,
      amount,
      invoice,
    }: {
      userId: number;
      amount: number;
      invoice: string;
    }) => api.withdrawLightning(userId, amount, invoice),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/withdrawals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user', variables.userId] });
      toast({
        title: 'Withdrawal Successful',
        description: `Successfully withdrew ${data.amount} sats`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Withdrawal Failed',
        description: error.message || 'Failed to process withdrawal',
        variant: 'destructive',
      });
    },
  });
}

export function useWithdrawUSD() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      userId,
      amountUSD,
      invoice,
    }: {
      userId: number;
      amountUSD: number;
      invoice: string;
    }) => api.withdrawUSD(userId, amountUSD, invoice),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/withdrawals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user', variables.userId] });
      toast({
        title: 'USD Withdrawal Successful',
        description: `Successfully withdrew $${(data.amountUsd || 0) / 100} USD`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'USD Withdrawal Failed',
        description: error.message || 'Failed to process USD withdrawal',
        variant: 'destructive',
      });
    },
  });
}

export function useWithdrawalEstimate(
  userId: number,
  amount: number,
  currency: 'BTC' | 'USD' = 'BTC'
) {
  return useQuery({
    queryKey: ['/api/withdrawals/estimate', userId, amount, currency],
    queryFn: () => api.estimateWithdrawalFee(userId, amount, currency),
    enabled: !!userId && amount > 0,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}