import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Clock, 
  Calendar, 
  TrendingUp, 
  Pause, 
  Play, 
  Edit3, 
  Trash2,
  ArrowUpDown,
  MoreHorizontal
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/use-auth';

interface ScheduledSwap {
  id: number;
  scheduleType: 'calendar' | 'recurring' | 'market_condition';
  swapDirection: 'btc_to_usd' | 'usd_to_btc';
  amount: string;
  triggerConfig: string;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  name: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export function ActiveSchedulesList() {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<ScheduledSwap[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchSchedules();
    }
  }, [user]);

  const fetchSchedules = async () => {
    try {
      const response = await fetch(`/api/scheduled-swaps/${user?.id}`);
      if (response.ok) {
        const data = await response.json();
        setSchedules(data.filter((s: ScheduledSwap) => ['active', 'paused'].includes(s.status)));
      }
    } catch (error) {
      console.error('Failed to fetch schedules:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePauseToggle = async (id: number, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'paused' : 'active';
      const response = await fetch(`/api/scheduled-swaps/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        fetchSchedules();
      }
    } catch (error) {
      console.error('Failed to update schedule:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to cancel this schedule?')) {
      try {
        const response = await fetch(`/api/scheduled-swaps/${id}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          fetchSchedules();
        }
      } catch (error) {
        console.error('Failed to delete schedule:', error);
      }
    }
  };

  const getScheduleTypeLabel = (type: string) => {
    switch (type) {
      case 'calendar':
        return 'Calendar';
      case 'recurring':
        return 'Recurring';
      case 'market_condition':
        return 'Market Condition';
      default:
        return type;
    }
  };

  const getScheduleTypeIcon = (type: string) => {
    switch (type) {
      case 'calendar':
        return <Calendar className="w-4 h-4" />;
      case 'recurring':
        return <Clock className="w-4 h-4" />;
      case 'market_condition':
        return <TrendingUp className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getSwapDirectionLabel = (direction: string) => {
    return direction === 'btc_to_usd' ? 'BTC → USD' : 'USD → BTC';
  };

  const getTriggerConditionText = (schedule: ScheduledSwap) => {
    try {
      const triggerConfig = JSON.parse(schedule.triggerConfig);
      
      switch (schedule.scheduleType) {
        case 'calendar':
          if (triggerConfig.dateTime) {
            return `Execute on ${new Date(triggerConfig.dateTime).toLocaleString()}`;
          }
          break;
        case 'recurring':
          const { interval, hour, minute } = triggerConfig;
          const timeStr = `${hour?.toString().padStart(2, '0')}:${minute?.toString().padStart(2, '0')}`;
          return `Every ${interval} at ${timeStr}`;
        case 'market_condition':
          const { condition, targetPrice, minPrice, maxPrice, percentage, basePrice } = triggerConfig;
          
          // Handle percentage-based conditions
          if (percentage !== undefined && basePrice !== undefined) {
            const direction = percentage > 0 ? 'rises' : 'falls';
            const targetPriceCalc = basePrice * (1 + percentage / 100);
            return `When BTC price ${direction} ${Math.abs(percentage)}% to $${targetPriceCalc.toLocaleString()}`;
          }
          
          // Handle absolute price conditions
          if (condition === 'above' && targetPrice) {
            return `When BTC price goes above $${targetPrice.toLocaleString()}`;
          } else if (condition === 'below' && targetPrice) {
            return `When BTC price goes below $${targetPrice.toLocaleString()}`;
          } else if (condition === 'between' && minPrice && maxPrice) {
            return `When BTC price is between $${minPrice.toLocaleString()} - $${maxPrice.toLocaleString()}`;
          }
          break;
      }
      return 'Trigger conditions not configured';
    } catch (error) {
      return 'Invalid trigger configuration';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (schedules.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Clock className="w-16 h-16 text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Active Schedules</h3>
          <p className="text-gray-500 text-center max-w-md">
            You haven't created any scheduled swaps yet. Create your first schedule to automate your Bitcoin and USD swaps.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {schedules.map((schedule) => (
        <Card key={schedule.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="flex items-center space-x-2">
                    {getScheduleTypeIcon(schedule.scheduleType)}
                    <Badge variant="secondary">
                      {getScheduleTypeLabel(schedule.scheduleType)}
                    </Badge>
                  </div>
                  <Badge variant={schedule.status === 'active' ? 'default' : 'secondary'}>
                    {schedule.status}
                  </Badge>
                </div>
                
                <div className="flex items-center space-x-4 mb-3">
                  <div className="flex items-center space-x-2">
                    <ArrowUpDown className="w-4 h-4 text-gray-500" />
                    <span className="font-medium">{getSwapDirectionLabel(schedule.swapDirection)}</span>
                  </div>
                  <div className="text-sm text-gray-500">
                    Amount: {parseFloat(schedule.amount).toFixed(8)} {schedule.swapDirection === 'btc_to_usd' ? 'BTC' : 'USD'}
                  </div>
                </div>

                <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-2 mb-1">
                    {getScheduleTypeIcon(schedule.scheduleType)}
                    <span className="text-sm font-medium text-gray-700">Trigger Condition</span>
                  </div>
                  <p className="text-sm text-gray-600">{getTriggerConditionText(schedule)}</p>
                </div>

                {schedule.name && (
                  <div className="mb-2">
                    <h4 className="font-medium">{schedule.name}</h4>
                  </div>
                )}

                {schedule.description && (
                  <p className="text-sm text-gray-600 mb-3">{schedule.description}</p>
                )}

                <div className="text-xs text-gray-500">
                  Created: {new Date(schedule.createdAt).toLocaleDateString()}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handlePauseToggle(schedule.id, schedule.status)}
                  className="h-8 w-8 p-0"
                >
                  {schedule.status === 'active' ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Edit3 className="mr-2 h-4 w-4" />
                      Edit Schedule
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Play className="mr-2 h-4 w-4" />
                      Execute Now
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      className="text-red-600"
                      onClick={() => handleDelete(schedule.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Cancel Schedule
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}