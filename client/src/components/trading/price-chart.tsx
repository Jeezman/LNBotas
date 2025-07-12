import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp } from "lucide-react";
import { useState } from "react";

const timeframes = [
  { label: '1H', value: '1h' },
  { label: '4H', value: '4h' },
  { label: '1D', value: '1d' },
  { label: '1W', value: '1w' },
];

export function PriceChart() {
  const [selectedTimeframe, setSelectedTimeframe] = useState('1h');

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900">BTC/USD Price Chart</CardTitle>
          <div className="flex items-center space-x-2">
            {timeframes.map((tf) => (
              <Button
                key={tf.value}
                variant={selectedTimeframe === tf.value ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedTimeframe(tf.value)}
                className={selectedTimeframe === tf.value ? "bg-primary text-white" : ""}
              >
                {tf.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Chart placeholder - in real implementation, use TradingView or Chart.js */}
        <div className="h-80 bg-gray-50 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
          <div className="text-center">
            <TrendingUp className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <p className="text-gray-500 font-medium">Price Chart</p>
            <p className="text-sm text-gray-400">TradingView integration recommended</p>
            <p className="text-xs text-gray-400 mt-2">
              Selected timeframe: {timeframes.find(tf => tf.value === selectedTimeframe)?.label}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
