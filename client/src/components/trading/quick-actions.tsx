import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle, Ban, Download, ChevronRight } from "lucide-react";
import { useCloseAllTrades } from "@/hooks/use-trading";

export function QuickActions() {
  const closeAllTrades = useCloseAllTrades();

  const handleCloseAllPositions = () => {
    closeAllTrades.mutate();
  };

  const handleCancelAllOrders = () => {
    // This would integrate with LN Markets cancel all orders API
    console.log('Cancel all orders');
  };

  const handleExportHistory = () => {
    // This would export trading history
    console.log('Export history');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button
          variant="outline"
          className="w-full justify-between text-left h-auto py-3 px-4"
          onClick={handleCloseAllPositions}
          disabled={closeAllTrades.isPending}
        >
          <div className="flex items-center space-x-3">
            <XCircle className="text-danger h-5 w-5" />
            <span className="font-medium">Close All Positions</span>
          </div>
          <ChevronRight className="text-gray-400 h-4 w-4" />
        </Button>
        
        <Button
          variant="outline"
          className="w-full justify-between text-left h-auto py-3 px-4"
          onClick={handleCancelAllOrders}
        >
          <div className="flex items-center space-x-3">
            <Ban className="text-warning h-5 w-5" />
            <span className="font-medium">Cancel All Orders</span>
          </div>
          <ChevronRight className="text-gray-400 h-4 w-4" />
        </Button>
        
        <Button
          variant="outline"
          className="w-full justify-between text-left h-auto py-3 px-4"
          onClick={handleExportHistory}
        >
          <div className="flex items-center space-x-3">
            <Download className="text-primary h-5 w-5" />
            <span className="font-medium">Export History</span>
          </div>
          <ChevronRight className="text-gray-400 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
