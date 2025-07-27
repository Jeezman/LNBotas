import { Sidebar } from '@/components/layout/sidebar';
import { MobileNav } from '@/components/layout/mobile-nav';
import { MarketOverview } from '@/components/trading/market-overview';
import { ActivePositions } from '@/components/trading/active-positions';
import { TradingForm } from '@/components/trading/trading-form';
import { MarketInfo } from '@/components/trading/market-info';
import { QuickActions } from '@/components/trading/quick-actions';
import { ScheduledTrades } from '@/components/trading/scheduled-trades';
import { ScheduledTradeForm } from '@/components/trading/scheduled-trade-form';
import { SettingsContent } from '@/components/settings/settings-content';
import { ScheduleSwapsPage } from '@/components/schedule-swaps/schedule-swaps-page';
import { useUser, useUpdateMarketData, useSyncBalance } from '@/hooks/use-trading';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw } from 'lucide-react';
import { useLocation } from 'wouter';
import UserPage from './user';
import FuturesPage from './futures';
import PortfolioPage from './portfolio';

function DashboardContent() {
  return (
    <>
      <MarketOverview />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 mt-4 lg:mt-6">
        {/* Trading Panel */}
        <div className="lg:col-span-2 space-y-4 lg:space-y-6">
          <ActivePositions />
          <ScheduledTrades />
        </div>

        {/* Trading Form */}
        <div className="space-y-4 lg:space-y-6">
          <TradingForm />
          <ScheduledTradeForm />
          <MarketInfo />
          <QuickActions />
        </div>
      </div>
    </>
  );
}

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
        <p className="text-gray-600">This page is coming soon...</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data: user } = useUser();
  const updateMarketData = useUpdateMarketData();
  const syncBalance = useSyncBalance();
  const [location] = useLocation();

  // Update market data on component mount and periodically
  useEffect(() => {
    updateMarketData.mutate();
    const interval = setInterval(() => {
      updateMarketData.mutate();
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  const getPageTitle = () => {
    switch (location) {
      case '/user':
        return 'User Profile';
      case '/futures':
        return 'Futures Trading';
      case '/options':
        return 'Options Trading';
      case '/history':
        return 'Trade History';
      case '/portfolio':
        return 'Portfolio';
      case '/settings':
        return 'Settings';
      case '/schedule-swaps':
        return 'Schedule Swaps';
      default:
        return 'Trading Dashboard';
    }
  };

  const renderPageContent = () => {
    switch (location) {
      case '/user':
        return <UserPage />;
      case '/futures':
        return <FuturesPage />;
      case '/options':
        return <PlaceholderPage title="Options Trading" />;
      case '/history':
        return <PlaceholderPage title="Trade History" />;
      case '/portfolio':
        return <PortfolioPage />;
      case '/settings':
        return <SettingsContent />;
      case '/schedule-swaps':
        return <ScheduleSwapsPage />;
      default:
        return <DashboardContent />;
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-3 lg:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 lg:space-x-4">
              <MobileNav />
              <h2 className="text-lg lg:text-2xl font-bold text-gray-900">
                {getPageTitle()}
              </h2>
              {location === '/' && (
                <div className="hidden sm:flex items-center space-x-2">
                  <div className="w-2 h-2 bg-success rounded-full"></div>
                  <span className="text-sm text-gray-600">Market Open</span>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2 lg:space-x-4">
              {/* Balance Display */}
              <div className="hidden sm:flex items-center space-x-3 bg-gray-50 px-3 lg:px-4 py-2 rounded-lg">
                <div className="text-center">
                  <p className="text-xs text-gray-500">Available Balance</p>
                  <p className="text-sm lg:text-lg font-mono font-semibold text-gray-900">
                    {user?.balance
                      ? `₿ ${parseFloat(user.balance).toLocaleString()}`
                      : '₿ 0.00000000'}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">USD Equivalent</p>
                  <p className="text-sm lg:text-lg font-mono font-semibold text-gray-900">
                    {user?.balanceUSD
                      ? `$${parseFloat(user.balanceUSD).toLocaleString(
                          'en-US',
                          { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                        )}`
                      : '$0.00'}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => syncBalance.mutate()}
                  disabled={syncBalance.isPending}
                  className="text-gray-600 hover:text-gray-900"
                >
                  <RefreshCw className={`w-4 h-4 ${syncBalance.isPending ? 'animate-spin' : ''}`} />
                </Button>
              </div>

              {/* Mobile Balance Display */}
              <div className="sm:hidden flex items-center space-x-2 bg-gray-50 px-2 py-1 rounded-lg">
                <div className="text-center">
                  <p className="text-xs text-gray-500">Balance</p>
                  <p className="text-xs font-mono font-semibold text-gray-900">
                    {user?.balanceUSD
                      ? `$${parseFloat(user.balanceUSD).toLocaleString(
                          'en-US',
                          { minimumFractionDigits: 0, maximumFractionDigits: 0 }
                        )}`
                      : '$0'}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => syncBalance.mutate()}
                  disabled={syncBalance.isPending}
                  className="text-gray-600 hover:text-gray-900 p-1"
                >
                  <RefreshCw className={`w-3 h-3 ${syncBalance.isPending ? 'animate-spin' : ''}`} />
                </Button>
              </div>

              {location === '/' && (
                <Button className="bg-primary text-white hover:bg-blue-800 text-sm lg:text-base">
                  <Plus className="w-3 h-3 lg:w-4 lg:h-4 mr-1 lg:mr-2" />
                  <span className="hidden sm:inline">Deposit</span>
                </Button>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6">{renderPageContent()}</div>
      </main>
    </div>
  );
}
