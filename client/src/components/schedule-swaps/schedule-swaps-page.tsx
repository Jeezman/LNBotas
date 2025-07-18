import { useState, useEffect } from 'react';
import { Clock, Plus, TrendingUp, Calendar, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';
import { ScheduleSwapsOverview } from './schedule-swaps-overview';
import { ActiveSchedulesList } from './active-schedules-list';
import { ScheduleSwapsHistory } from './schedule-swaps-history';
import { CreateScheduleModal } from './create-schedule-modal';

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

interface SwapExecution {
  id: number;
  scheduledSwapId: number;
  swapId: number | null;
  executionTime: string;
  status: 'success' | 'failed' | 'cancelled';
  failureReason: string | null;
  createdAt: string;
}

export function ScheduleSwapsPage() {
  const { user } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [schedules, setSchedules] = useState<ScheduledSwap[]>([]);
  const [executions, setExecutions] = useState<SwapExecution[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      // Fetch scheduled swaps
      const schedulesResponse = await fetch(`/api/scheduled-swaps/${user?.id}`);
      if (schedulesResponse.ok) {
        const schedulesData = await schedulesResponse.json();
        setSchedules(schedulesData);
        
        // Fetch executions for each schedule
        const allExecutions: SwapExecution[] = [];
        for (const schedule of schedulesData) {
          try {
            const executionsResponse = await fetch(`/api/scheduled-swaps/${schedule.id}/executions`);
            if (executionsResponse.ok) {
              const executionsData = await executionsResponse.json();
              allExecutions.push(...executionsData);
            }
          } catch (error) {
            console.error(`Failed to fetch executions for schedule ${schedule.id}:`, error);
          }
        }
        setExecutions(allExecutions);
      }
    } catch (error) {
      console.error('Failed to fetch schedule data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const activeSchedulesCount = schedules.filter(s => s.status === 'active').length;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const completedTodayCount = executions.filter(e => {
    const executionDate = new Date(e.executionTime);
    return executionDate >= today && executionDate < tomorrow && e.status === 'success';
  }).length;

  const upcomingCount = schedules.filter(s => {
    if (s.status !== 'active') return false;
    
    try {
      const triggerConfig = JSON.parse(s.triggerConfig);
      
      if (s.scheduleType === 'calendar' && triggerConfig.dateTime) {
        const triggerDate = new Date(triggerConfig.dateTime);
        const next24Hours = new Date();
        next24Hours.setHours(next24Hours.getHours() + 24);
        return triggerDate <= next24Hours && triggerDate > new Date();
      }
      
      if (s.scheduleType === 'recurring') {
        return true; // Recurring schedules are always "upcoming"
      }
      
      return false; // Market conditions are harder to predict
    } catch {
      return false;
    }
  }).length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Clock className="text-blue-600 h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Schedule Swaps</h1>
            <p className="text-gray-600">Automate your BTC ↔ USD swaps</p>
          </div>
        </div>
        <Button 
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Schedule
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Schedules</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : activeSchedulesCount}
            </div>
            <p className="text-xs text-muted-foreground">
              {loading ? 'Loading...' : `${schedules.filter(s => s.status === 'paused').length} paused`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : completedTodayCount}
            </div>
            <p className="text-xs text-muted-foreground">
              {loading ? 'Loading...' : `${completedTodayCount} swaps executed`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : upcomingCount}
            </div>
            <p className="text-xs text-muted-foreground">
              Next 24 hours
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="active">Active Schedules</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          <ScheduleSwapsOverview />
        </TabsContent>
        <TabsContent value="active" className="space-y-4">
          <ActiveSchedulesList />
        </TabsContent>
        <TabsContent value="history" className="space-y-4">
          <ScheduleSwapsHistory />
        </TabsContent>
      </Tabs>

      {/* Create Schedule Modal */}
      <CreateScheduleModal 
        open={showCreateModal}
        onOpenChange={(open) => {
          setShowCreateModal(open);
          if (!open) {
            // Refresh data when modal closes (in case a schedule was created)
            fetchData();
          }
        }}
      />
    </div>
  );
}