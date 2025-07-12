import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { useActiveTrades, useCloseTrade, useCloseAllTrades } from "@/hooks/use-trading";
import { Skeleton } from "@/components/ui/skeleton";
import { Edit, X } from "lucide-react";

export function ActivePositions() {
  const { data: trades = [], isLoading } = useActiveTrades();
  const closeTrade = useCloseTrade();
  const closeAllTrades = useCloseAllTrades();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Active Positions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleCloseTrade = (tradeId: number) => {
    closeTrade.mutate(tradeId);
  };

  const handleCloseAll = () => {
    closeAllTrades.mutate();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900">Active Positions</CardTitle>
          {trades.length > 0 && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleCloseAll}
              disabled={closeAllTrades.isPending}
            >
              Close All
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {trades.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No active positions</p>
            <p className="text-sm text-gray-400">Create a new trade to see positions here</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Side</TableHead>
                  <TableHead>Entry Price</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>PnL</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trades.map((trade) => (
                  <TableRow key={trade.id}>
                    <TableCell>
                      <Badge variant={trade.type === 'futures' ? 'default' : 'secondary'}>
                        {trade.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={trade.side === 'buy' ? 'default' : 'destructive'}
                        className={trade.side === 'buy' ? 'bg-success text-white' : 'bg-danger text-white'}
                      >
                        {trade.side === 'buy' ? 'Long' : 'Short'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {trade.entryPrice ? `$${parseFloat(trade.entryPrice).toLocaleString()}` : 'Pending'}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {trade.quantity ? `₿ ${parseFloat(trade.quantity).toFixed(4)}` : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {trade.pnlUSD ? (
                        <span className={`font-mono text-sm ${parseFloat(trade.pnlUSD) >= 0 ? 'text-success' : 'text-danger'}`}>
                          {parseFloat(trade.pnlUSD) >= 0 ? '+' : ''}${parseFloat(trade.pnlUSD).toFixed(2)}
                        </span>
                      ) : (
                        <span className="font-mono text-sm text-gray-500">--</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleCloseTrade(trade.id)}
                          disabled={closeTrade.isPending}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
