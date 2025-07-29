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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { useState, useEffect } from 'react';
import { useUpdateScheduledTrade, useMarketData } from '@/hooks/use-trading';
import { Calendar, DollarSign, Percent, Edit2 } from 'lucide-react';
import type { ScheduledTrade } from '@/lib/api';

const editScheduledTradeSchema = z.object({
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
  name: z.string().optional(),
  description: z.string().optional(),
});

type EditScheduledTradeFormValues = z.infer<typeof editScheduledTradeSchema>;

interface EditScheduledTradeModalProps {
  scheduledTrade: ScheduledTrade | null;
  isOpen: boolean;
  onClose: () => void;
}

export function EditScheduledTradeModal({
  scheduledTrade,
  isOpen,
  onClose,
}: EditScheduledTradeModalProps) {
  const [triggerType, setTriggerType] = useState<
    'date' | 'price_range' | 'price_percentage'
  >('date');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [tradeType, setTradeType] = useState<'futures' | 'options'>('futures');

  const { data: marketData } = useMarketData();
  const updateScheduledTrade = useUpdateScheduledTrade();

  const form = useForm<EditScheduledTradeFormValues>({
    resolver: zodResolver(editScheduledTradeSchema),
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
      name: '',
      description: '',
    },
  });

  // Helper function to convert trigger data to form triggerValue
  const getTriggerValueFromScheduledTrade = (trade: ScheduledTrade): string => {
    switch (trade.triggerType) {
      case 'date':
        return trade.scheduledTime
          ? new Date(trade.scheduledTime).toISOString().slice(0, 16)
          : '';
      case 'price_range':
        return trade.targetPriceLow && trade.targetPriceHigh
          ? `${trade.targetPriceLow} - ${trade.targetPriceHigh}`
          : '';
      case 'price_percentage':
        return trade.pricePercentage ? trade.pricePercentage.toString() : '';
      default:
        return '';
    }
  };

  // Populate form when scheduledTrade changes
  useEffect(() => {
    if (scheduledTrade) {
      const triggerValue = getTriggerValueFromScheduledTrade(scheduledTrade);
      
      setTriggerType(scheduledTrade.triggerType);
      setSide(scheduledTrade.side as 'buy' | 'sell');
      setTradeType(scheduledTrade.type as 'futures' | 'options');
      
      form.reset({
        triggerType: scheduledTrade.triggerType,
        triggerValue,
        type: scheduledTrade.type as 'futures' | 'options',
        orderType: scheduledTrade.orderType as 'market' | 'limit',
        side: scheduledTrade.side as 'buy' | 'sell',
        margin: scheduledTrade.margin?.toString() || '',
        leverage: scheduledTrade.leverage || '10',
        takeProfit: scheduledTrade.takeProfit || '',
        stopLoss: scheduledTrade.stopLoss || '',
        quantity: scheduledTrade.quantity || '',
        instrumentName: scheduledTrade.instrumentName || '',
        settlement: (scheduledTrade.settlement as 'physical' | 'cash') || undefined,
        name: scheduledTrade.name || '',
        description: scheduledTrade.description || '',
      });
    }
  }, [scheduledTrade, form]);

  const onSubmit = (values: EditScheduledTradeFormValues) => {
    if (!scheduledTrade) return;

    // Validate that triggerValue is not empty
    if (!values.triggerValue || values.triggerValue.trim() === '') {
      form.setError('triggerValue', { message: 'Please fill in the trigger value' });
      return;
    }

    // Prepare update data based on trigger type
    let updateData: Partial<ScheduledTrade> = {
      type: values.type,
      side: values.side,
      orderType: values.orderType,
      margin: parseInt(values.margin),
      leverage: values.leverage,
      takeProfit: values.takeProfit || null,
      stopLoss: values.stopLoss || null,
      quantity: values.quantity || null,
      instrumentName: values.instrumentName || null,
      settlement: values.settlement || null,
      name: values.name || null,
      description: values.description || null,
      triggerType: values.triggerType,
    };

    // Handle trigger-specific fields
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
          updateData.scheduledTime = dateTime.toISOString();
          updateData.targetPriceLow = null;
          updateData.targetPriceHigh = null;
          updateData.basePriceSnapshot = null;
          updateData.pricePercentage = null;
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
          updateData.targetPriceLow = minPrice;
          updateData.targetPriceHigh = maxPrice;
          updateData.scheduledTime = null;
          updateData.basePriceSnapshot = null;
          updateData.pricePercentage = null;
          break;

        case 'price_percentage':
          if (!values.triggerValue) {
            throw new Error('Please enter a percentage');
          }
          const percentage = parseFloat(values.triggerValue);
          if (isNaN(percentage)) {
            throw new Error('Invalid percentage. Use format: +5 or -5');
          }
          const currentPrice = marketData?.lastPrice ? parseFloat(marketData.lastPrice) : 0;
          updateData.pricePercentage = percentage;
          updateData.basePriceSnapshot = currentPrice;
          updateData.scheduledTime = null;
          updateData.targetPriceLow = null;
          updateData.targetPriceHigh = null;
          break;

        default:
          throw new Error('Invalid trigger type');
      }
    } catch (error) {
      form.setError('triggerValue', {
        message: error instanceof Error ? error.message : 'Invalid trigger value',
      });
      return;
    }

    updateScheduledTrade.mutate(
      {
        scheduledTradeId: scheduledTrade.id,
        updates: updateData,
      },
      {
        onSuccess: () => {
          onClose();
        },
      }
    );
  };

  const currentPrice = marketData?.lastPrice ? parseFloat(marketData.lastPrice) : 0;
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
  const estimatedFee = margin ? Math.max(1, Math.floor(parseInt(margin) * 0.001)) : 0;
  const liquidationPrice =
    margin && leverage && side && currentPrice > 0
      ? (
          currentPrice *
          (1 - (side === 'buy' ? 0.9 : -0.9) / parseFloat(leverage))
        ).toFixed(2)
      : '0.00';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit2 className="h-5 w-5" />
            Edit Scheduled Trade
          </DialogTitle>
        </DialogHeader>

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
                    value={field.value}
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
                  <FormMessage />
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
                    value={field.value}
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
                  <FormMessage />
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

            {/* Optional Name & Description */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name (optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="My Strategy"
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="Brief description"
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
          </form>
        </Form>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            onClick={form.handleSubmit(onSubmit)}
            disabled={updateScheduledTrade.isPending}
          >
            {updateScheduledTrade.isPending ? 'Updating...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}