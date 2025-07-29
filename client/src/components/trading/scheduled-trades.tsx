import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useScheduledTrades,
  useDeleteScheduledTrade,
} from '@/hooks/use-trading';
import {
  Clock,
  Trash2,
  Edit,
  Calendar,
  DollarSign,
  Percent,
} from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';
import { EditScheduledTradeModal } from './edit-scheduled-trade-modal';
import type { ScheduledTrade } from '@/lib/api';

export function ScheduledTrades() {
  const { data: scheduledTrades = [], isLoading } = useScheduledTrades();
  const deleteScheduledTrade = useDeleteScheduledTrade();
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedTrade, setSelectedTrade] = useState<ScheduledTrade | null>(null);

  // Sort scheduled trades to show pending tasks first
  const sortedScheduledTrades = [...scheduledTrades].sort((a, b) => {
    // Priority order: pending, triggered, cancelled, failed
    const statusOrder = {
      pending: 0,
      triggered: 1,
      cancelled: 2,
      failed: 3
    };
    
    const aOrder = statusOrder[a.status as keyof typeof statusOrder] ?? 4;
    const bOrder = statusOrder[b.status as keyof typeof statusOrder] ?? 4;
    
    if (aOrder !== bOrder) {
      return aOrder - bOrder;
    }
    
    // If same status, sort by creation date (newest first)
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const handleDeleteScheduledTrade = (scheduledTradeId: number) => {
    if (confirm('Are you sure you want to delete this scheduled trade?')) {
      deleteScheduledTrade.mutate(scheduledTradeId);
    }
  };

  const handleEditScheduledTrade = (scheduledTrade: ScheduledTrade) => {
    setSelectedTrade(scheduledTrade);
    setEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setSelectedTrade(null);
  };

  const getTriggerIcon = (triggerType: string) => {
    switch (triggerType) {
      case 'date':
        return <Calendar className="h-4 w-4" />;
      case 'price_range':
        return <DollarSign className="h-4 w-4" />;
      case 'price_percentage':
        return <Percent className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getTriggerDescription = (scheduledTrade: any) => {
    try {
      switch (scheduledTrade.triggerType) {
        case 'date':
          if (scheduledTrade.scheduledTime) {
            return `Execute on ${format(
              new Date(scheduledTrade.scheduledTime),
              'MMM dd, yyyy HH:mm'
            )}`;
          }
          return 'Date trigger (no time set)';
        case 'price_range':
          if (scheduledTrade.targetPriceLow && scheduledTrade.targetPriceHigh) {
            return `Execute when price is between $${scheduledTrade.targetPriceLow.toLocaleString()} - $${scheduledTrade.targetPriceHigh.toLocaleString()}`;
          }
          return 'Price range trigger (no range set)';
        case 'price_percentage':
          if (
            scheduledTrade.pricePercentage &&
            scheduledTrade.basePriceSnapshot
          ) {
            const sign = scheduledTrade.pricePercentage > 0 ? '+' : '';
            return `Execute when price ${sign}${
              scheduledTrade.pricePercentage
            }% from $${scheduledTrade.basePriceSnapshot.toLocaleString()}`;
          }
          return 'Price percentage trigger (no percentage set)';
        default:
          return 'Unknown trigger';
      }
    } catch (error) {
      return 'Invalid trigger data';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'pending':
        return 'secondary';
      case 'triggered':
        return 'default';
      case 'cancelled':
        return 'secondary';
      case 'failed':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getStatusBadgeClassName = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-orange-600 text-white hover:bg-orange-700';
      case 'triggered':
        return 'bg-green-600 text-white hover:bg-green-700';
      case 'cancelled':
        return 'bg-gray-600 text-white hover:bg-gray-700';
      case 'failed':
        return 'bg-red-600 text-white hover:bg-red-700';
      default:
        return '';
    }
  };

  const getSideBadgeVariant = (side: string) => {
    return side === 'buy' ? 'default' : 'destructive';
  };

  const getSideBadgeClassName = (side: string) => {
    return side === 'buy'
      ? 'bg-green-600 text-white hover:bg-green-700'
      : 'bg-red-600 text-white hover:bg-red-700';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">
            Scheduled Trades
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Scheduled Trades
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sortedScheduledTrades.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No scheduled trades yet</p>
            <p className="text-sm">
              Create a scheduled trade to automate your trading strategy
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedScheduledTrades.map((scheduledTrade) => (
              <div
                key={scheduledTrade.id}
                className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getTriggerIcon(scheduledTrade.triggerType)}
                      <span className="font-medium text-sm text-gray-700">
                        {scheduledTrade.triggerType
                          .replace('_', ' ')
                          .toUpperCase()}
                      </span>
                      <Badge
                        variant={getStatusBadgeVariant(scheduledTrade.status)}
                        className={getStatusBadgeClassName(scheduledTrade.status)}
                      >
                        {scheduledTrade.status}
                      </Badge>
                    </div>

                    <p className="text-sm text-gray-600 mb-2">
                      {getTriggerDescription(scheduledTrade)}
                    </p>

                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Badge
                          variant={getSideBadgeVariant(scheduledTrade.side)}
                          className={getSideBadgeClassName(scheduledTrade.side)}
                        >
                          {scheduledTrade.side.toUpperCase()}
                        </Badge>
                        <span className="text-gray-600">
                          {scheduledTrade.type} • {scheduledTrade.orderType}
                        </span>
                      </div>

                      {scheduledTrade.margin && (
                        <span className="text-gray-600">
                          {scheduledTrade.margin.toLocaleString()} sats
                        </span>
                      )}

                      {scheduledTrade.leverage && (
                        <span className="text-gray-600">
                          {scheduledTrade.leverage}x
                        </span>
                      )}
                    </div>

                    {scheduledTrade.executedAt && (
                      <p className="text-xs text-gray-500 mt-2">
                        Executed:{' '}
                        {format(
                          new Date(scheduledTrade.executedAt),
                          'MMM dd, yyyy HH:mm'
                        )}
                      </p>
                    )}

                    {scheduledTrade.errorMessage && (
                      <p className="text-xs text-red-500 mt-2">
                        Error: {scheduledTrade.errorMessage}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {scheduledTrade.status === 'pending' && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditScheduledTrade(scheduledTrade)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleDeleteScheduledTrade(scheduledTrade.id)
                          }
                          disabled={deleteScheduledTrade.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      
      <EditScheduledTradeModal
        scheduledTrade={selectedTrade}
        isOpen={editModalOpen}
        onClose={handleCloseEditModal}
      />
    </Card>
  );
}
