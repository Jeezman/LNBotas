import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Clock, 
  Calendar, 
  TrendingUp, 
  CheckCircle, 
  XCircle,
  ArrowUpDown,
  Filter,
  Download
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/hooks/use-auth';

interface SwapExecution {
  id: number;
  scheduledSwapId: number;
  swapId: number | null;
  executionTime: string;
  status: 'success' | 'failed' | 'cancelled';
  failureReason: string | null;
  createdAt: string;
}

interface ScheduledSwap {
  id: number;
  scheduleType: 'calendar' | 'recurring' | 'market_condition';
  swapDirection: 'btc_to_usd' | 'usd_to_btc';
  amount: string;
  name: string | null;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  executions?: SwapExecution[];
}

export function ScheduleSwapsHistory() {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<ScheduledSwap[]>([]);
  const [executions, setExecutions] = useState<SwapExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    if (user?.id) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      // Fetch all schedules
      const schedulesResponse = await fetch(`/api/scheduled-swaps/${user?.id}`);
      if (schedulesResponse.ok) {
        const schedulesData = await schedulesResponse.json();
        setSchedules(schedulesData);

        // Fetch executions for each schedule
        const allExecutions: SwapExecution[] = [];
        for (const schedule of schedulesData) {
          const executionsResponse = await fetch(`/api/scheduled-swaps/${schedule.id}/executions`);
          if (executionsResponse.ok) {
            const executionsData = await executionsResponse.json();
            allExecutions.push(...executionsData);
          }
        }
        setExecutions(allExecutions);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredExecutions = executions.filter(execution => 
    statusFilter === 'all' || execution.status === statusFilter
  );

  const getScheduleDetails = (scheduledSwapId: number) => {
    return schedules.find(s => s.id === scheduledSwapId);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-gray-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
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

  const getSwapDirectionLabel = (direction: string) => {
    return direction === 'btc_to_usd' ? 'BTC → USD' : 'USD → BTC';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Executions</p>
                <p className="text-2xl font-bold">{executions.length}</p>
              </div>
              <Clock className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Successful</p>
                <p className="text-2xl font-bold text-green-600">
                  {executions.filter(e => e.status === 'success').length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Failed</p>
                <p className="text-2xl font-bold text-red-600">
                  {executions.filter(e => e.status === 'failed').length}
                </p>
              </div>
              <XCircle className="w-8 h-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold">
                  {executions.length > 0 
                    ? Math.round((executions.filter(e => e.status === 'success').length / executions.length) * 100)
                    : 0}%
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Execution History</CardTitle>
            <div className="flex items-center space-x-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredExecutions.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No execution history found</p>
              <p className="text-xs text-gray-400">
                {statusFilter === 'all' 
                  ? 'Your scheduled swaps will appear here once executed' 
                  : `No ${statusFilter} executions found`}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Direction</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExecutions.map((execution) => {
                  const schedule = getScheduleDetails(execution.scheduledSwapId);
                  return (
                    <TableRow key={execution.id}>
                      <TableCell>
                        <div className="text-sm">
                          {new Date(execution.executionTime).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(execution.executionTime).toLocaleTimeString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {schedule?.name || `Schedule #${execution.scheduledSwapId}`}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {schedule ? getScheduleTypeLabel(schedule.scheduleType) : 'Unknown'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <ArrowUpDown className="w-3 h-3 text-gray-500" />
                          <span className="text-sm">
                            {schedule ? getSwapDirectionLabel(schedule.swapDirection) : 'Unknown'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">
                          {schedule ? parseFloat(schedule.amount).toFixed(8) : 'Unknown'} 
                          {schedule && schedule.swapDirection === 'btc_to_usd' ? ' BTC' : ' USD'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(execution.status)}
                          <Badge className={getStatusColor(execution.status)}>
                            {execution.status}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        {execution.failureReason && (
                          <div className="text-xs text-red-600 max-w-xs truncate">
                            {execution.failureReason}
                          </div>
                        )}
                        {execution.swapId && (
                          <div className="text-xs text-gray-500">
                            Swap ID: {execution.swapId}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}