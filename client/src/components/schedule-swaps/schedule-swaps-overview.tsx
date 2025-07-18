import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, TrendingUp } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function ScheduleSwapsOverview() {
  const { user } = useAuth();
  
  const { data: userFullInfo } = useQuery({
    queryKey: ['/api/user/full-info', user?.id],
    queryFn: () => api.getUserFullInfo(Number(user?.id)),
    enabled: !!user?.id,
  });

  const { data: marketData } = useQuery({
    queryKey: ['/api/market/ticker'],
    queryFn: () => api.getMarketTicker(),
    refetchInterval: 30000,
  });

  const btcBalance = user?.balance ? parseFloat(user.balance) : 0;
  const btcValueInUsd = marketData?.lastPrice ? (btcBalance * 0.00000001 * parseFloat(marketData.lastPrice)) : 0;
  const syntheticUsdBalance = userFullInfo?.synthetic_usd_balance || 0;
  
  const totalValueUsd = btcValueInUsd + syntheticUsdBalance;
  const btcAllocationPercentage = totalValueUsd > 0 ? (btcValueInUsd / totalValueUsd) * 100 : 50;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Balance Cards */}
      <div className="lg:col-span-2 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Bitcoin Balance</CardTitle>
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                <span className="text-orange-600 font-bold text-sm">₿</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {btcBalance.toFixed(8)} BTC
              </div>
              <p className="text-xs text-muted-foreground">
                ≈ ${btcValueInUsd.toFixed(2)} USD
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">USD Balance</CardTitle>
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 font-bold text-sm">$</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${syntheticUsdBalance.toFixed(2)} USD
              </div>
              <p className="text-xs text-muted-foreground">
                Synthetic USD balance
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Balance Allocation */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Balance Allocation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="relative">
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div 
                    className="bg-orange-500 h-4 rounded-full transition-all duration-300"
                    style={{ width: `${btcAllocationPercentage}%` }}
                  />
                </div>
                <div className="flex justify-between mt-2 text-sm">
                  <span className="text-orange-600">
                    {btcAllocationPercentage.toFixed(1)}% BTC
                  </span>
                  <span className="text-green-600">
                    {(100 - btcAllocationPercentage).toFixed(1)}% USD
                  </span>
                </div>
              </div>
              <div className="text-sm text-gray-600">
                Total Value: ${totalValueUsd.toFixed(2)} USD
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Swaps */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Upcoming Swaps</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No upcoming swaps</p>
                <p className="text-xs text-gray-400">Create a schedule to get started</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start">
              <Clock className="w-4 h-4 mr-2" />
              Schedule Recurring Swap
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <TrendingUp className="w-4 h-4 mr-2" />
              Price Alert Swap
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Calendar className="w-4 h-4 mr-2" />
              One-time Swap
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}