import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { useCreateTrade, useMarketData } from "@/hooks/use-trading";
import { Zap } from "lucide-react";

const tradeFormSchema = z.object({
  type: z.enum(['futures', 'options']),
  orderType: z.enum(['market', 'limit']),
  side: z.enum(['buy', 'sell']),
  margin: z.string().min(1, "Margin is required"),
  leverage: z.string().min(1, "Leverage is required"),
  takeProfit: z.string().optional(),
  stopLoss: z.string().optional(),
  quantity: z.string().optional(),
  instrumentName: z.string().optional(),
  settlement: z.enum(['physical', 'cash']).optional(),
});

type TradeFormValues = z.infer<typeof tradeFormSchema>;

export function TradingForm() {
  const [tradeType, setTradeType] = useState<'futures' | 'options'>('futures');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  
  const { data: marketData } = useMarketData();
  const createTrade = useCreateTrade();

  const form = useForm<TradeFormValues>({
    resolver: zodResolver(tradeFormSchema),
    defaultValues: {
      type: 'futures',
      orderType: 'market',
      side: 'buy',
      margin: '',
      leverage: '10',
      takeProfit: '',
      stopLoss: '',
    },
  });

  const onSubmit = (values: TradeFormValues) => {
    createTrade.mutate({
      type: values.type,
      side: values.side,
      orderType: values.orderType,
      margin: parseInt(values.margin),
      leverage: values.leverage,
      takeProfit: values.takeProfit || undefined,
      stopLoss: values.stopLoss || undefined,
      quantity: values.quantity || undefined,
      instrumentName: values.instrumentName || undefined,
      settlement: values.settlement || undefined,
    });
  };

  const currentPrice = marketData?.lastPrice ? parseFloat(marketData.lastPrice) : 43750;
  const margin = form.watch('margin');
  const leverage = form.watch('leverage');
  
  const positionSize = margin && leverage ? 
    (parseInt(margin) * parseFloat(leverage) / currentPrice / 100000000).toFixed(6) : '0.000000';
  const estimatedFee = margin ? Math.max(1, Math.floor(parseInt(margin) * 0.001)) : 0;
  const liquidationPrice = margin && leverage && side ? 
    (currentPrice * (1 - (side === 'buy' ? 0.9 : -0.9) / parseFloat(leverage))).toFixed(2) : '0.00';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900">New Trade</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Trade Type */}
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-2">Trade Type</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={tradeType === 'futures' ? 'default' : 'outline'}
                  onClick={() => {
                    setTradeType('futures');
                    form.setValue('type', 'futures');
                  }}
                  className={tradeType === 'futures' ? 'bg-primary text-white' : ''}
                >
                  Futures
                </Button>
                <Button
                  type="button"
                  variant={tradeType === 'options' ? 'default' : 'outline'}
                  onClick={() => {
                    setTradeType('options');
                    form.setValue('type', 'options');
                  }}
                  className={tradeType === 'options' ? 'bg-primary text-white' : ''}
                >
                  Options
                </Button>
              </div>
            </div>

            {/* Order Type */}
            <FormField
              control={form.control}
              name="orderType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Order Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="market">Market</SelectItem>
                      <SelectItem value="limit">Limit</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            {/* Side */}
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-2">Side</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={side === 'buy' ? 'default' : 'outline'}
                  onClick={() => {
                    setSide('buy');
                    form.setValue('side', 'buy');
                  }}
                  className={side === 'buy' ? 'bg-success text-white' : ''}
                >
                  Buy / Long
                </Button>
                <Button
                  type="button"
                  variant={side === 'sell' ? 'default' : 'outline'}
                  onClick={() => {
                    setSide('sell');
                    form.setValue('side', 'sell');
                  }}
                  className={side === 'sell' ? 'bg-danger text-white' : ''}
                >
                  Sell / Short
                </Button>
              </div>
            </div>

            {/* Margin */}
            <FormField
              control={form.control}
              name="margin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Margin (sats)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="1000"
                      className="font-mono"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Leverage */}
            <FormField
              control={form.control}
              name="leverage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Leverage</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="1">1x</SelectItem>
                      <SelectItem value="2">2x</SelectItem>
                      <SelectItem value="5">5x</SelectItem>
                      <SelectItem value="10">10x</SelectItem>
                      <SelectItem value="25">25x</SelectItem>
                      <SelectItem value="50">50x</SelectItem>
                      <SelectItem value="100">100x</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            {/* Take Profit & Stop Loss */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="takeProfit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Take Profit</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="45000"
                        className="font-mono"
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="stopLoss"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stop Loss</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="42000"
                        className="font-mono"
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* Position Summary */}
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Position Size:</span>
                <span className="font-mono">₿ {positionSize}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Est. Fee:</span>
                <span className="font-mono">{estimatedFee} sats</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Liquidation Price:</span>
                <span className="font-mono">${liquidationPrice}</span>
              </div>
            </div>

            {/* Submit Button */}
            <Button 
              type="submit" 
              className="w-full bg-primary text-white py-3 hover:bg-blue-800"
              disabled={createTrade.isPending}
            >
              <div className="flex items-center justify-center space-x-2">
                <Zap className="h-4 w-4" />
                <span>{createTrade.isPending ? 'Placing Order...' : 'Place Order'}</span>
              </div>
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
