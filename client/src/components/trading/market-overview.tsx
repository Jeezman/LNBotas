import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, BarChart3, Layers, Percent, Bitcoin } from "lucide-react";
import { useMarketData } from "@/hooks/use-trading";
import { Skeleton } from "@/components/ui/skeleton";

export function MarketOverview() {
  const { data: marketData, isLoading } = useMarketData();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4 lg:p-6">
              <Skeleton className="h-16 lg:h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const formatPrice = (price: string | null | undefined) => {
    if (!price) return "N/A";
    return `$${parseFloat(price).toLocaleString()}`;
  };

  const formatChange = (change: string | null | undefined) => {
    if (!change) return { value: "N/A", isPositive: true };
    const numChange = parseFloat(change);
    return {
      value: `${numChange > 0 ? '+' : ''}${numChange.toFixed(2)}%`,
      isPositive: numChange >= 0
    };
  };

  const priceChange = formatChange(marketData?.priceChange24h);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
      <Card>
        <CardContent className="p-4 lg:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs lg:text-sm text-gray-500">BTC/USD</p>
              <p className="text-lg lg:text-2xl font-mono font-bold text-gray-900">
                {formatPrice(marketData?.lastPrice)}
              </p>
              <div className="flex items-center space-x-1 mt-1">
                {priceChange.isPositive ? (
                  <TrendingUp className="text-success h-3 w-3 lg:h-4 lg:w-4" />
                ) : (
                  <TrendingDown className="text-danger h-3 w-3 lg:h-4 lg:w-4" />
                )}
                <span className={`text-xs lg:text-sm font-medium ${priceChange.isPositive ? 'text-success' : 'text-danger'}`}>
                  {priceChange.value}
                </span>
              </div>
            </div>
            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Bitcoin className="text-orange-500 h-5 w-5 lg:h-6 lg:w-6" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4 lg:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs lg:text-sm text-gray-500">24h Volume</p>
              <p className="text-lg lg:text-2xl font-mono font-bold text-gray-900">
                {marketData?.volume24h ? `₿ ${parseFloat(marketData.volume24h).toFixed(2)}` : 'N/A'}
              </p>
              <p className="text-xs lg:text-sm text-gray-500 mt-1">
                {marketData?.volumeUSD ? `$${parseFloat(marketData.volumeUSD).toLocaleString()}` : 'N/A'}
              </p>
            </div>
            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="text-blue-500 h-5 w-5 lg:h-6 lg:w-6" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4 lg:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs lg:text-sm text-gray-500">Open Interest</p>
              <p className="text-lg lg:text-2xl font-mono font-bold text-gray-900">
                {marketData?.openInterest ? `₿ ${parseFloat(marketData.openInterest).toFixed(2)}` : 'N/A'}
              </p>
              <div className="flex items-center space-x-1 mt-1">
                <TrendingDown className="text-danger h-3 w-3 lg:h-4 lg:w-4" />
                <span className="text-xs lg:text-sm font-medium text-danger">-0.82%</span>
              </div>
            </div>
            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Layers className="text-purple-500 h-5 w-5 lg:h-6 lg:w-6" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4 lg:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs lg:text-sm text-gray-500">Funding Rate</p>
              <p className="text-lg lg:text-2xl font-mono font-bold text-gray-900">
                {marketData?.fundingRate ? `${(parseFloat(marketData.fundingRate) * 100).toFixed(4)}%` : 'N/A'}
              </p>
              <p className="text-xs lg:text-sm text-gray-500 mt-1">Next: 6h 23m</p>
            </div>
            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Percent className="text-green-500 h-5 w-5 lg:h-6 lg:w-6" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
