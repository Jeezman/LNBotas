import { Skeleton } from '@/components/ui/skeleton';
import { TableRow, TableCell } from '@/components/ui/table';

interface ColumnConfig {
  width: string;
  hideOnMobile?: boolean;
  hideOnTablet?: boolean;
}

interface TableRowSkeletonProps {
  columns: ColumnConfig[];
  rows?: number;
}

function SkeletonTableRow({ columns }: { columns: ColumnConfig[] }) {
  return (
    <TableRow>
      {columns.map((column, index) => (
        <TableCell 
          key={index}
          className={`${column.hideOnMobile ? 'hidden sm:table-cell' : ''} ${
            column.hideOnTablet ? 'hidden md:table-cell' : ''
          }`}
        >
          <Skeleton className={`h-6 ${column.width}`} />
        </TableCell>
      ))}
    </TableRow>
  );
}

export function TableRowSkeleton({ columns, rows = 20 }: TableRowSkeletonProps) {
  return (
    <>
      {Array.from({ length: rows }).map((_, index) => (
        <SkeletonTableRow 
          key={index} 
          columns={columns}
        />
      ))}
    </>
  );
}

// Predefined skeleton configurations for common table types
export const SwapHistorySkeletonConfig: ColumnConfig[] = [
  { width: 'w-16' }, // Status badge
  { width: 'w-24' }, // From asset
  { width: 'w-24' }, // To asset  
  { width: 'w-20', hideOnMobile: true }, // Exchange rate
  { width: 'w-16', hideOnTablet: true }, // Fee
  { width: 'w-28' }, // Date
];

export const TradingPositionsSkeletonConfig: ColumnConfig[] = [
  { width: 'w-16' }, // Side
  { width: 'w-20' }, // Type
  { width: 'w-24' }, // Margin
  { width: 'w-16' }, // Leverage
  { width: 'w-20' }, // Entry Price
  { width: 'w-20' }, // P&L
  { width: 'w-16' }, // Status
  { width: 'w-24' }, // Created
  { width: 'w-16' }, // Actions
];