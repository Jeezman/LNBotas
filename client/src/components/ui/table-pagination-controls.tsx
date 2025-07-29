import { useState } from 'react';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronFirst, ChevronLast, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TablePaginationControlsProps {
  currentPage: number;
  totalPages: number;
  itemsPerPage: number | 'all';
  totalItems: number;
  startIndex: number;
  endIndex: number;
  isFirstPage: boolean;
  isLastPage: boolean;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (count: number | 'all') => void;
  onFirstPage: () => void;
  onLastPage: () => void;
  onNextPage: () => void;
  onPreviousPage: () => void;
  isLoading?: boolean;
  itemLabel?: string;
}

export function TablePaginationControls({
  currentPage,
  totalPages,
  itemsPerPage,
  totalItems,
  startIndex,
  endIndex,
  isFirstPage,
  isLastPage,
  onPageChange,
  onItemsPerPageChange,
  onFirstPage,
  onLastPage,
  onNextPage,
  onPreviousPage,
  isLoading = false,
  itemLabel = 'items',
}: TablePaginationControlsProps) {
  const [jumpToPage, setJumpToPage] = useState('');
  const { toast } = useToast();

  const handleJumpToPage = () => {
    const pageNumber = parseInt(jumpToPage, 10);

    if (isNaN(pageNumber) || pageNumber < 1 || pageNumber > totalPages) {
      toast({
        title: 'Invalid Page Number',
        description: `Please enter a number between 1 and ${totalPages}`,
        variant: 'destructive',
      });
      return;
    }

    onPageChange(pageNumber);
    setJumpToPage('');
  };

  const handleJumpInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleJumpToPage();
    }
  };

  const handleItemsPerPageChange = (value: string) => {
    if (value === 'all') {
      onItemsPerPageChange('all');
    } else {
      onItemsPerPageChange(parseInt(value, 10));
    }
  };

  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      // Show all pages if there are few enough
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      // Determine range around current page
      let startPage = Math.max(2, currentPage - 1);
      let endPage = Math.min(totalPages - 1, currentPage + 1);

      // Adjust range if we're near the beginning or end
      if (currentPage <= 3) {
        endPage = 4;
      } else if (currentPage >= totalPages - 2) {
        startPage = totalPages - 3;
      }

      // Add ellipsis before start if needed
      if (startPage > 2) {
        pages.push('ellipsis');
      }

      // Add middle pages
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }

      // Add ellipsis after end if needed
      if (endPage < totalPages - 1) {
        pages.push('ellipsis');
      }

      // Always show last page
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  if (totalItems === 0) {
    return null;
  }

  return (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 p-4 border-t">
      {/* Left side: Items per page and status */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Items per page selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            Show
          </span>
          <Select
            value={itemsPerPage.toString()}
            onValueChange={handleItemsPerPageChange}
            disabled={isLoading}
          >
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">{itemLabel}</span>
        </div>

        {/* Status display */}
        {itemsPerPage !== 'all' && (
          <div className="text-sm text-muted-foreground">
            Showing {startIndex}-{endIndex} of {totalItems} {itemLabel}
          </div>
        )}
      </div>

      {/* Right side: Pagination controls */}
      {itemsPerPage !== 'all' && totalPages > 1 && (
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          {/* Jump to page (desktop only) */}
          <div className="hidden lg:flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              Go to
            </span>
            <Input
              type="number"
              placeholder="Page"
              value={jumpToPage}
              onChange={(e) => setJumpToPage(e.target.value)}
              onKeyDown={handleJumpInputKeyDown}
              className="w-20"
              min={1}
              max={totalPages}
              disabled={isLoading}
            />
            <Button
              onClick={handleJumpToPage}
              disabled={!jumpToPage || isLoading}
              size="sm"
              variant="outline"
            >
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Page navigation */}
          <Pagination>
            <PaginationContent>
              {/* First page button (desktop only) */}
              <PaginationItem className="hidden lg:inline-flex">
                <Button
                  onClick={onFirstPage}
                  disabled={isFirstPage || isLoading}
                  variant="outline"
                  size="sm"
                  className="gap-1 pl-2.5"
                >
                  <ChevronFirst className="h-4 w-4" />
                  <span className="hidden sm:inline">First</span>
                </Button>
              </PaginationItem>

              {/* Previous page */}
              <PaginationItem>
                <PaginationPrevious
                  onClick={onPreviousPage}
                  className={
                    isFirstPage || isLoading
                      ? 'pointer-events-none opacity-50'
                      : 'cursor-pointer'
                  }
                />
              </PaginationItem>

              {/* Page numbers (desktop) / Current page (mobile) */}
              <div className="hidden sm:flex">
                {pageNumbers.map((page, index) => (
                  <PaginationItem key={index}>
                    {page === 'ellipsis' ? (
                      <PaginationEllipsis />
                    ) : (
                      <PaginationLink
                        onClick={() => onPageChange(page)}
                        isActive={page === currentPage}
                        className={
                          isLoading
                            ? 'pointer-events-none opacity-50'
                            : 'cursor-pointer'
                        }
                      >
                        {page}
                      </PaginationLink>
                    )}
                  </PaginationItem>
                ))}
              </div>

              {/* Current page info (mobile only) */}
              <PaginationItem className="sm:hidden">
                <span className="px-4 py-2 text-sm">
                  {currentPage} of {totalPages}
                </span>
              </PaginationItem>

              {/* Next page */}
              <PaginationItem>
                <PaginationNext
                  onClick={onNextPage}
                  className={
                    isLastPage || isLoading
                      ? 'pointer-events-none opacity-50'
                      : 'cursor-pointer'
                  }
                />
              </PaginationItem>

              {/* Last page button (desktop only) */}
              <PaginationItem className="hidden lg:inline-flex">
                <Button
                  onClick={onLastPage}
                  disabled={isLastPage || isLoading}
                  variant="outline"
                  size="sm"
                  className="gap-1 pr-2.5"
                >
                  <span className="hidden sm:inline">Last</span>
                  <ChevronLast className="h-4 w-4" />
                </Button>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}
