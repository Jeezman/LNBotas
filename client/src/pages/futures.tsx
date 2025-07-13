import { useState } from "react";
import { useActiveTrades, useTradeHistory, useSyncTrades } from "@/hooks/use-trading";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, TrendingDown, Clock, CheckCircle, XCircle, Filter, RefreshCw } from "lucide-react";
import { Trade } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";

type TradeStatus = "all" | "open" | "closed" | "pending" | "cancelled";
type TradeType = "all" | "futures" | "options";

export default function FuturesPage() {
  const [statusFilter, setStatusFilter] = useState<TradeStatus>("all");
  const [typeFilter, setTypeFilter] = useState<TradeType>("all");
  
  const { user } = useAuth();
  const { data: activeTrades = [], isLoading: activeLoading } = useActiveTrades();
  const { data: allTrades = [], isLoading: historyLoading } = useTradeHistory();
  const syncTrades = useSyncTrades(user?.id);

  const isLoading = activeLoading || historyLoading;

  // Combine active and historical trades
  const allTradesData = [...activeTrades, ...allTrades.filter(trade => 
    !activeTrades.some(activeTrade => activeTrade.id === trade.id)
  )];

  // Filter trades based on selected filters
  const filteredTrades = allTradesData.filter(trade => {
    const statusMatch = statusFilter === "all" || trade.status === statusFilter;
    const typeMatch = typeFilter === "all" || trade.type === typeFilter;
    return statusMatch && typeMatch;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open":
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "closed":
        return <CheckCircle className="h-4 w-4 text-gray-500" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "cancelled":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "open":
        return "default";
      case "closed":
        return "secondary";
      case "pending":
        return "outline";
      case "cancelled":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const getSideBadgeVariant = (side: string) => {
    return side === "buy" ? "default" : "destructive";
  };

  const formatPrice = (price: string | null) => {
    if (!price) return "—";
    return `$${parseFloat(price).toLocaleString()}`;
  };

  const formatPnL = (pnl: string | null, pnlUSD: string | null) => {
    if (!pnl && !pnlUSD) return "—";
    
    const pnlValue = pnlUSD ? parseFloat(pnlUSD) : (pnl ? parseFloat(pnl) : 0);
    const isPositive = pnlValue >= 0;
    const color = isPositive ? "text-green-600" : "text-red-600";
    const sign = isPositive ? "+" : "";
    
    return (
      <span className={color}>
        {sign}{pnlUSD ? `$${pnlValue.toFixed(2)}` : `₿${pnlValue.toFixed(8)}`}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Futures Trading</h1>
        <p className="text-muted-foreground">
          Manage your Bitcoin futures positions and trading history
        </p>
      </div>

      {/* Trade Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Trades</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {allTradesData.filter(trade => trade.status === "open").length}
            </div>
            <p className="text-xs text-muted-foreground">
              Currently open positions
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Trades</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allTradesData.length}</div>
            <p className="text-xs text-muted-foreground">
              All time trades
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {allTradesData.filter(trade => trade.status === "pending").length}
            </div>
            <p className="text-xs text-muted-foreground">
              Awaiting execution
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total P&L</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPnL(
                allTradesData.reduce((sum, trade) => sum + (parseFloat(trade.pnl || "0")), 0).toString(),
                allTradesData.reduce((sum, trade) => sum + (parseFloat(trade.pnlUSD || "0")), 0).toString()
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Realized + unrealized
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Sync */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Trade Filters
              </CardTitle>
              <CardDescription>
                Filter your trades by status and type
              </CardDescription>
            </div>
            <Button 
              onClick={() => syncTrades.mutate()}
              disabled={syncTrades.isPending}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${syncTrades.isPending ? 'animate-spin' : ''}`} />
              {syncTrades.isPending ? 'Syncing...' : 'Sync from LN Markets'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={statusFilter} onValueChange={(value: TradeStatus) => setStatusFilter(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <Select value={typeFilter} onValueChange={(value: TradeType) => setTypeFilter(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="futures">Futures</SelectItem>
                  <SelectItem value="options">Options</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trades Table */}
      <Card>
        <CardHeader>
          <CardTitle>Trading History</CardTitle>
          <CardDescription>
            View and manage all your trades ({filteredTrades.length} trades)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredTrades.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No trades found matching your filters.</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Side</TableHead>
                    <TableHead>Entry Price</TableHead>
                    <TableHead>Exit Price</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Leverage</TableHead>
                    <TableHead>P&L</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTrades.map((trade: Trade) => (
                    <TableRow key={trade.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(trade.status)}
                          <Badge variant={getStatusBadgeVariant(trade.status)}>
                            {trade.status}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{trade.type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getSideBadgeVariant(trade.side)}>
                          {trade.side}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatPrice(trade.entryPrice)}</TableCell>
                      <TableCell>{formatPrice(trade.exitPrice)}</TableCell>
                      <TableCell>
                        {trade.quantity ? `₿${parseFloat(trade.quantity).toFixed(8)}` : "—"}
                      </TableCell>
                      <TableCell>
                        {trade.leverage ? `${trade.leverage}x` : "—"}
                      </TableCell>
                      <TableCell>{formatPnL(trade.pnl, trade.pnlUSD)}</TableCell>
                      <TableCell>
                        {formatDistanceToNow(new Date(trade.createdAt), { addSuffix: true })}
                      </TableCell>
                      <TableCell>
                        {trade.status === "open" && (
                          <Button variant="outline" size="sm">
                            Manage
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}