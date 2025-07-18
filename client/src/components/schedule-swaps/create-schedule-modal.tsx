import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, TrendingUp, ArrowUpDown } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

const scheduleSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  scheduleType: z.enum(['calendar', 'recurring', 'market_condition']),
  swapDirection: z.enum(['btc_to_usd', 'usd_to_btc']),
  amount: z.number().min(0.00000001, 'Amount must be greater than 0'),
  // Calendar fields
  dateTime: z.string().optional(),
  // Recurring fields
  interval: z.enum(['daily', 'weekly', 'monthly']).optional(),
  hour: z.number().min(0).max(23).optional(),
  minute: z.number().min(0).max(59).optional(),
  // Market condition fields
  condition: z.enum(['above', 'below', 'between']).optional(),
  targetPrice: z.number().optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
}).refine((data) => {
  // Validate calendar schedule type
  if (data.scheduleType === 'calendar') {
    return data.dateTime && data.dateTime.length > 0;
  }
  // Validate recurring schedule type
  if (data.scheduleType === 'recurring') {
    return data.interval && data.hour !== undefined && data.minute !== undefined;
  }
  // Validate market condition schedule type
  if (data.scheduleType === 'market_condition') {
    if (!data.condition) return false;
    if (data.condition === 'above' || data.condition === 'below') {
      return data.targetPrice !== undefined && data.targetPrice > 0;
    }
    if (data.condition === 'between') {
      return data.minPrice !== undefined && data.maxPrice !== undefined && 
             data.minPrice > 0 && data.maxPrice > 0 && data.minPrice < data.maxPrice;
    }
  }
  return true;
}, {
  message: "Please fill in all required fields for the selected schedule type",
  path: ["scheduleType"]
});

type ScheduleFormData = z.infer<typeof scheduleSchema>;

interface CreateScheduleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateScheduleModal({ open, onOpenChange }: CreateScheduleModalProps) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<ScheduleFormData>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      scheduleType: 'calendar',
      swapDirection: 'btc_to_usd',
      amount: 0.001,
      hour: 12,
      minute: 0,
      condition: 'above',
      interval: 'daily',
    },
  });

  const watchedValues = form.watch();

  // Prevent form submission on Enter key in input fields
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
    }
  };

  const handleSubmit = async (data: ScheduleFormData) => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);
    try {
      let triggerConfig: any = {};

      switch (data.scheduleType) {
        case 'calendar':
          triggerConfig = {
            dateTime: data.dateTime,
          };
          break;
        case 'recurring':
          triggerConfig = {
            interval: data.interval,
            hour: data.hour,
            minute: data.minute,
          };
          break;
        case 'market_condition':
          triggerConfig = {
            condition: data.condition,
            targetPrice: data.targetPrice,
            minPrice: data.minPrice,
            maxPrice: data.maxPrice,
          };
          break;
      }

      const response = await fetch('/api/scheduled-swaps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          scheduleType: data.scheduleType,
          swapDirection: data.swapDirection,
          amount: data.amount,
          triggerConfig,
          name: data.name,
          description: data.description,
        }),
      });

      if (response.ok) {
        onOpenChange(false);
        setCurrentStep(1);
        form.reset();
        // Refresh the page or emit an event to refresh the schedules list
        window.location.reload();
      } else {
        const errorResponse = await response.json();
        console.error('Failed to create schedule:', errorResponse);
        setError(errorResponse.message || 'Failed to create schedule');
      }
    } catch (error) {
      console.error('Failed to create schedule:', error);
      setError(error instanceof Error ? error.message : 'Failed to create schedule');
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card 
          className={`cursor-pointer transition-all ${
            watchedValues.scheduleType === 'calendar' ? 'ring-2 ring-blue-500' : ''
          }`}
          onClick={() => form.setValue('scheduleType', 'calendar')}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-blue-500" />
              <CardTitle className="text-lg">Calendar</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-gray-600">
              Execute swap on a specific date and time
            </p>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all ${
            watchedValues.scheduleType === 'recurring' ? 'ring-2 ring-blue-500' : ''
          }`}
          onClick={() => form.setValue('scheduleType', 'recurring')}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-green-500" />
              <CardTitle className="text-lg">Recurring</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-gray-600">
              Execute swap at regular intervals
            </p>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all ${
            watchedValues.scheduleType === 'market_condition' ? 'ring-2 ring-blue-500' : ''
          }`}
          onClick={() => form.setValue('scheduleType', 'market_condition')}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-orange-500" />
              <CardTitle className="text-lg">Market Condition</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-gray-600">
              Execute swap when price conditions are met
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Schedule Name (Optional)</Label>
          <Input
            id="name"
            placeholder="e.g., Daily DCA, Price Alert Swap"
            onKeyDown={handleKeyDown}
            {...form.register('name')}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description (Optional)</Label>
          <Textarea
            id="description"
            placeholder="Describe your schedule strategy..."
            onKeyDown={handleKeyDown}
            {...form.register('description')}
          />
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card 
          className={`cursor-pointer transition-all ${
            watchedValues.swapDirection === 'btc_to_usd' ? 'ring-2 ring-blue-500' : ''
          }`}
          onClick={() => form.setValue('swapDirection', 'btc_to_usd')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-center space-x-2">
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                <span className="text-orange-600 font-bold text-sm">₿</span>
              </div>
              <ArrowUpDown className="w-4 h-4 text-gray-500" />
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 font-bold text-sm">$</span>
              </div>
            </div>
            <p className="text-center text-sm font-medium mt-2">BTC → USD</p>
            <p className="text-center text-xs text-gray-500">Sell Bitcoin for USD</p>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all ${
            watchedValues.swapDirection === 'usd_to_btc' ? 'ring-2 ring-blue-500' : ''
          }`}
          onClick={() => form.setValue('swapDirection', 'usd_to_btc')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-center space-x-2">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 font-bold text-sm">$</span>
              </div>
              <ArrowUpDown className="w-4 h-4 text-gray-500" />
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                <span className="text-orange-600 font-bold text-sm">₿</span>
              </div>
            </div>
            <p className="text-center text-sm font-medium mt-2">USD → BTC</p>
            <p className="text-center text-xs text-gray-500">Buy Bitcoin with USD</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-2">
        <Label htmlFor="amount">Amount</Label>
        <div className="relative">
          <Input
            id="amount"
            type="number"
            step="0.00000001"
            placeholder="0.001"
            onKeyDown={handleKeyDown}
            {...form.register('amount', { valueAsNumber: true })}
          />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">
            {watchedValues.swapDirection === 'btc_to_usd' ? 'BTC' : 'USD'}
          </div>
        </div>
      </div>

      {/* Schedule Type Specific Fields */}
      {watchedValues.scheduleType === 'calendar' && (
        <div className="space-y-2">
          <Label htmlFor="dateTime">Date & Time</Label>
          <Input
            id="dateTime"
            type="datetime-local"
            onKeyDown={handleKeyDown}
            {...form.register('dateTime')}
          />
        </div>
      )}

      {watchedValues.scheduleType === 'recurring' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Interval</Label>
            <Select 
              value={watchedValues.interval} 
              onValueChange={(value) => form.setValue('interval', value as any)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hour">Hour</Label>
              <Input
                id="hour"
                type="number"
                min="0"
                max="23"
                onKeyDown={handleKeyDown}
                {...form.register('hour', { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="minute">Minute</Label>
              <Input
                id="minute"
                type="number"
                min="0"
                max="59"
                onKeyDown={handleKeyDown}
                {...form.register('minute', { valueAsNumber: true })}
              />
            </div>
          </div>
        </div>
      )}

      {watchedValues.scheduleType === 'market_condition' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Condition</Label>
            <Select 
              value={watchedValues.condition} 
              onValueChange={(value) => form.setValue('condition', value as any)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="above">Price Above</SelectItem>
                <SelectItem value="below">Price Below</SelectItem>
                <SelectItem value="between">Price Between</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {watchedValues.condition === 'between' ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minPrice">Min Price ($)</Label>
                <Input
                  id="minPrice"
                  type="number"
                  step="0.01"
                  placeholder="95000"
                  onKeyDown={handleKeyDown}
                  {...form.register('minPrice', { valueAsNumber: true })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxPrice">Max Price ($)</Label>
                <Input
                  id="maxPrice"
                  type="number"
                  step="0.01"
                  placeholder="105000"
                  onKeyDown={handleKeyDown}
                  {...form.register('maxPrice', { valueAsNumber: true })}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="targetPrice">Target Price ($)</Label>
              <Input
                id="targetPrice"
                type="number"
                step="0.01"
                placeholder="100000"
                onKeyDown={handleKeyDown}
                {...form.register('targetPrice', { valueAsNumber: true })}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Review Your Schedule</h3>
        <p className="text-sm text-gray-600">
          Please review the details before creating your schedule
        </p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Schedule Type</span>
            <Badge variant="outline">
              {watchedValues.scheduleType === 'calendar' ? 'Calendar' :
               watchedValues.scheduleType === 'recurring' ? 'Recurring' :
               'Market Condition'}
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Swap Direction</span>
            <Badge>
              {watchedValues.swapDirection === 'btc_to_usd' ? 'BTC → USD' : 'USD → BTC'}
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Amount</span>
            <span className="text-sm font-mono">
              {watchedValues.amount} {watchedValues.swapDirection === 'btc_to_usd' ? 'BTC' : 'USD'}
            </span>
          </div>

          {watchedValues.name && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Name</span>
              <span className="text-sm">{watchedValues.name}</span>
            </div>
          )}

          {watchedValues.description && (
            <div className="space-y-2">
              <span className="text-sm font-medium">Description</span>
              <p className="text-sm text-gray-600">{watchedValues.description}</p>
            </div>
          )}

          <div className="pt-4 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Trigger Details</span>
              <div className="text-sm text-gray-600">
                {watchedValues.scheduleType === 'calendar' && watchedValues.dateTime && (
                  <span>Execute on {new Date(watchedValues.dateTime).toLocaleString()}</span>
                )}
                {watchedValues.scheduleType === 'recurring' && (
                  <span>
                    Every {watchedValues.interval} at {watchedValues.hour}:{watchedValues.minute?.toString().padStart(2, '0')}
                  </span>
                )}
                {watchedValues.scheduleType === 'market_condition' && (
                  <span>
                    When BTC price is {watchedValues.condition} {
                      watchedValues.condition === 'between' 
                        ? `$${watchedValues.minPrice} - $${watchedValues.maxPrice}`
                        : `$${watchedValues.targetPrice}`
                    }
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create Schedule Swap</DialogTitle>
        </DialogHeader>

        <form onSubmit={(e) => e.preventDefault()}>
          {/* Step Indicator */}
          <div className="flex items-center justify-center mb-6">
            <div className="flex space-x-2">
              {[1, 2, 3].map((step) => (
                <div
                  key={step}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step === currentStep
                      ? 'bg-blue-600 text-white'
                      : step < currentStep
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {step}
                </div>
              ))}
            </div>
          </div>

          {/* Step Content */}
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          
          {/* Error Display */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          
          {/* Form Validation Errors */}
          {Object.keys(form.formState.errors).length > 0 && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-700 font-medium">Please fix the following issues:</p>
              <ul className="text-sm text-yellow-700 mt-1 list-disc list-inside">
                {Object.entries(form.formState.errors).map(([field, error]) => (
                  <li key={field}>{error?.message || `${field} is required`}</li>
                ))}
              </ul>
            </div>
          )}

          <DialogFooter className="mt-6">
            {currentStep > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStep(currentStep - 1)}
              >
                Back
              </Button>
            )}
            {currentStep < 3 ? (
              <Button
                type="button"
                onClick={() => setCurrentStep(currentStep + 1)}
              >
                Next
              </Button>
            ) : (
              <Button 
                type="button" 
                disabled={loading}
                onClick={() => {
                  form.handleSubmit(handleSubmit)();
                }}
              >
                {loading ? 'Creating...' : 'Create Schedule'}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}