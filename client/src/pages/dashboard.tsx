import { Sidebar } from "@/components/layout/sidebar";
import { MarketOverview } from "@/components/trading/market-overview";
import { PriceChart } from "@/components/trading/price-chart";
import { ActivePositions } from "@/components/trading/active-positions";
import { TradingForm } from "@/components/trading/trading-form";
import { MarketInfo } from "@/components/trading/market-info";
import { QuickActions } from "@/components/trading/quick-actions";
import { useUser, useUpdateMarketData } from "@/hooks/use-trading";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function Dashboard() {
  const { data: user } = useUser();
  const updateMarketData = useUpdateMarketData();

  // Update market data on component mount and periodically
  useEffect(() => {
    updateMarketData.mutate();
    const interval = setInterval(() => {
      updateMarketData.mutate();
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h2 className="text-2xl font-bold text-gray-900">Trading Dashboard</h2>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-success rounded-full"></div>
                <span className="text-sm text-gray-600">Market Open</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Balance Display */}
              <div className="flex items-center space-x-3 bg-gray-50 px-4 py-2 rounded-lg">
                <div className="text-center">
                  <p className="text-xs text-gray-500">Available Balance</p>
                  <p className="text-lg font-mono font-semibold text-gray-900">
                    {user?.balance ? `₿ ${parseFloat(user.balance).toFixed(8)}` : '₿ 0.00000000'}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">USD Equivalent</p>
                  <p className="text-lg font-mono font-semibold text-gray-900">
                    {user?.balanceUSD ? `$${parseFloat(user.balanceUSD).toFixed(2)}` : '$0.00'}
                  </p>
                </div>
              </div>
              
              <Button className="bg-primary text-white hover:bg-blue-800">
                <Plus className="w-4 h-4 mr-2" />
                Deposit
              </Button>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <MarketOverview />
          
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-6">
            {/* Trading Panel */}
            <div className="xl:col-span-2 space-y-6">
              <PriceChart />
              <ActivePositions />
            </div>
            
            {/* Trading Form */}
            <div className="space-y-6">
              <TradingForm />
              <MarketInfo />
              <QuickActions />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
