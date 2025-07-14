import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMarketData } from "@/hooks/use-trading";
import { Skeleton } from "@/components/ui/skeleton";

export function MarketInfo() {
  const { data: marketData, isLoading } = useMarketData();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Market Info</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatPrice = (price: string | null | undefined) => {
    if (!price) return "N/A";
    return `$${parseFloat(price).toLocaleString()}`;
  };

  const formatTime = (timeStr: string | null | undefined) => {
    if (!timeStr) return "N/A";
    const time = new Date(timeStr);
    const now = new Date();
    const diff = Math.floor((time.getTime() - now.getTime()) / (1000 * 60 * 60));
    return `${Math.max(0, diff)}h ${Math.floor(((time.getTime() - now.getTime()) % (1000 * 60 * 60)) / (1000 * 60))}m`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900">Market Info</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between">
          <span className="text-sm text-gray-600">Last Price</span>
          <span className="text-sm font-mono font-medium">
            {formatPrice(marketData?.lastPrice)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-gray-600">24h High</span>
          <span className="text-sm font-mono font-medium">
            {formatPrice(marketData?.high24h)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-gray-600">24h Low</span>
          <span className="text-sm font-mono font-medium">
            {formatPrice(marketData?.low24h)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-gray-600">Mark Price</span>
          <span className="text-sm font-mono font-medium">
            {formatPrice(marketData?.markPrice)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-gray-600">Index Price</span>
          <span className="text-sm font-mono font-medium">
            {formatPrice(marketData?.indexPrice)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-gray-600">Next Funding</span>
          <span className="text-sm font-mono font-medium">
            {formatTime(marketData?.nextFundingTime)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
