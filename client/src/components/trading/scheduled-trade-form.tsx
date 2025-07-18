import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { useCreateScheduledTrade, useMarketData } from '@/hooks/use-trading';
import { Clock, Calendar, DollarSign, Percent } from 'lucide-react';

const scheduledTradeFormSchema = z.object({
  triggerType: z.enum(['date', 'price_range', 'price_percentage']),
  triggerValue: z.string().min(1, 'Trigger value is required'),
  type: z.enum(['futures', 'options']),
  orderType: z.enum(['market', 'limit']),
  side: z.enum(['buy', 'sell']),
  margin: z.string().min(1, 'Margin is required'),
  leverage: z.string().min(1, 'Leverage is required'),
  takeProfit: z.string().optional(),
  stopLoss: z.string().optional(),
  quantity: z.string().optional(),
  instrumentName: z.string().optional(),
  settlement: z.enum(['physical', 'cash']).optional(),
});

type ScheduledTradeFormValues = z.infer<typeof scheduledTradeFormSchema>;

export function ScheduledTradeForm() {
  const [tradeType, setTradeType] = useState<'futures' | 'options'>('futures');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [triggerType, setTriggerType] = useState<
    'date' | 'price_range' | 'price_percentage'
  >('date');

  const { data: marketData } = useMarketData();
  const createScheduledTrade = useCreateScheduledTrade();

  const form = useForm<ScheduledTradeFormValues>({
    resolver: zodResolver(scheduledTradeFormSchema),
    defaultValues: {
      triggerType: 'date',
      triggerValue: '',
      type: 'futures',
      orderType: 'market',
      side: 'buy',
      margin: '',
      leverage: '10',
      takeProfit: '',
      stopLoss: '',
    },
  });

  const onSubmit = (values: ScheduledTradeFormValues) => {
    // Validate that triggerValue is not empty
    if (!values.triggerValue || values.triggerValue.trim() === '') {
      alert('Please fill in the trigger value');
      return;
    }

    // Validate trigger value based on trigger type
    try {
      switch (values.triggerType) {
        case 'date':
          if (!values.triggerValue) {
            throw new Error('Please select a date and time');
          }
          const dateTime = new Date(values.triggerValue);
          if (isNaN(dateTime.getTime())) {
            throw new Error('Invalid date format');
          }
          break;
        case 'price_range':
          if (!values.triggerValue) {
            throw new Error('Please enter a price range');
          }
          const [minPrice, maxPrice] = values.triggerValue
            .split('-')
            .map((p) => parseFloat(p.trim()));
          if (isNaN(minPrice) || isNaN(maxPrice) || minPrice >= maxPrice) {
            throw new Error(
              'Invalid price range. Use format: min - max (e.g., 115000 - 116000)'
            );
          }
          break;
        case 'price_percentage':
          if (!values.triggerValue) {
            throw new Error('Please enter a percentage');
          }
          const percentage = parseFloat(values.triggerValue);
          if (isNaN(percentage)) {
            throw new Error('Invalid percentage. Use format: +5 or -5');
          }
          break;
        default:
          throw new Error('Invalid trigger type');
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Invalid trigger value');
      return;
    }

    createScheduledTrade.mutate({
      triggerType: values.triggerType,
      triggerValue: values.triggerValue,
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

  const currentPrice = marketData?.lastPrice
    ? parseFloat(marketData.lastPrice)
    : 0;
  const margin = form.watch('margin');
  const leverage = form.watch('leverage');

  const positionSize =
    margin && leverage && currentPrice > 0
      ? (
          (parseInt(margin) * parseFloat(leverage)) /
          currentPrice /
          100000000
        ).toFixed(6)
      : '0.000000';
  const estimatedFee = margin
    ? Math.max(1, Math.floor(parseInt(margin) * 0.001))
    : 0;
  const liquidationPrice =
    margin && leverage && side && currentPrice > 0
      ? (
          currentPrice *
          (1 - (side === 'buy' ? 0.9 : -0.9) / parseFloat(leverage))
        ).toFixed(2)
      : '0.00';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Schedule Trade
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Trigger Type */}
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-2">
                Trigger Type
              </Label>
              <Tabs
                value={triggerType}
                onValueChange={(value) => {
                  setTriggerType(value as any);
                  form.setValue('triggerType', value as any);
                  form.setValue('triggerValue', '');
                }}
              >
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="date" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Date
                  </TabsTrigger>
                  <TabsTrigger
                    value="price_range"
                    className="flex items-center gap-2"
                  >
                    <DollarSign className="h-4 w-4" />
                    Price Range
                  </TabsTrigger>
                  <TabsTrigger
                    value="price_percentage"
                    className="flex items-center gap-2"
                  >
                    <Percent className="h-4 w-4" />
                    Percentage
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="date" className="mt-4">
                  <FormField
                    control={form.control}
                    name="triggerValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date & Time</FormLabel>
                        <FormControl>
                          <Input
                            type="datetime-local"
                            placeholder="Select date and time"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                <TabsContent value="price_range" className="mt-4">
                  <FormField
                    control={form.control}
                    name="triggerValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price Range (USD)</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            placeholder="115000 - 116000"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                <TabsContent value="price_percentage" className="mt-4">
                  <FormField
                    control={form.control}
                    name="triggerValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price Percentage</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            placeholder="+5 or -5"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {currentPrice > 0 && (
                    <p className="text-sm text-gray-500 mt-1">
                      Current price: ${currentPrice.toLocaleString()}
                    </p>
                  )}
                </TabsContent>
              </Tabs>
            </div>

            {/* Trade Type */}
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-2">
                Trade Type
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={tradeType === 'futures' ? 'default' : 'outline'}
                  onClick={() => {
                    setTradeType('futures');
                    form.setValue('type', 'futures');
                  }}
                  className={
                    tradeType === 'futures' ? 'bg-primary text-white' : ''
                  }
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
                  className={
                    tradeType === 'options' ? 'bg-primary text-white' : ''
                  }
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
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
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
              <Label className="block text-sm font-medium text-gray-700 mb-2">
                Side
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={side === 'buy' ? 'default' : 'outline'}
                  onClick={() => {
                    setSide('buy');
                    form.setValue('side', 'buy');
                  }}
                  className={
                    side === 'buy'
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'text-green-600 border-green-600 hover:bg-green-50'
                  }
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
                  className={
                    side === 'sell'
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'text-red-600 border-red-600 hover:bg-red-50'
                  }
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
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="1">1x</SelectItem>
                      <SelectItem value="2">2x</SelectItem>
                      <SelectItem value="3">3x</SelectItem>
                      <SelectItem value="4">4x</SelectItem>
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
              disabled={createScheduledTrade.isPending}
            >
              <div className="flex items-center justify-center space-x-2">
                <Clock className="h-4 w-4" />
                <span>
                  {createScheduledTrade.isPending
                    ? 'Scheduling Trade...'
                    : 'Schedule Trade'}
                </span>
              </div>
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
