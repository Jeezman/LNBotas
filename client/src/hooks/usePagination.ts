import { useState, useMemo, useEffect, useCallback } from 'react';

interface UsePaginationProps<T> {
  data: T[];
  defaultItemsPerPage?: number;
  storageKey?: string;
  enableUrlSync?: boolean;
  urlPrefix?: string;
}

interface UsePaginationReturn<T> {
  currentPage: number;
  itemsPerPage: number | 'all';
  totalItems: number;
  totalPages: number;
  paginatedData: T[];
  isFirstPage: boolean;
  isLastPage: boolean;
  startIndex: number;
  endIndex: number;
  setPage: (page: number) => void;
  setItemsPerPage: (count: number | 'all') => void;
  goToFirstPage: () => void;
  goToLastPage: () => void;
  goToNextPage: () => void;
  goToPreviousPage: () => void;
}

// URL parameter utilities
const getUrlParams = (prefix?: string) => {
  if (typeof window === 'undefined') return {};
  console.log('prefix', prefix);
  const params = new URLSearchParams(window.location.search);
  const pageParam = prefix ? `${prefix}_page` : 'page';
  const sizeParam = prefix ? `${prefix}_size` : 'size';
  return {
    page: params.get(pageParam),
    size: params.get(sizeParam),
  };
};

const updateUrlParams = (
  page?: number,
  size?: number | 'all',
  prefix?: string
) => {
  if (typeof window === 'undefined') return;

  const url = new URL(window.location.href);
  const pageParam = prefix ? `${prefix}_page` : 'page';
  const sizeParam = prefix ? `${prefix}_size` : 'size';

  if (page !== undefined && page > 1) {
    url.searchParams.set(pageParam, page.toString());
  } else {
    url.searchParams.delete(pageParam);
  }

  if (size !== undefined && size !== 20) {
    url.searchParams.set(sizeParam, size.toString());
  } else {
    url.searchParams.delete(sizeParam);
  }

  window.history.replaceState({}, '', url.toString());
};

export function usePagination<T>({
  data,
  defaultItemsPerPage = 20,
  storageKey = 'table-items-per-page',
  enableUrlSync = false,
  urlPrefix,
}: UsePaginationProps<T>): UsePaginationReturn<T> {
  // Initialize from URL params if URL sync is enabled, otherwise from localStorage
  const [itemsPerPage, setItemsPerPageState] = useState<number | 'all'>(() => {
    if (enableUrlSync && typeof window !== 'undefined') {
      const urlParams = getUrlParams(urlPrefix);
      if (urlParams.size) {
        return urlParams.size === 'all' ? 'all' : parseInt(urlParams.size, 10);
      }
    }

    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        return stored === 'all' ? 'all' : parseInt(stored, 10);
      }
    }
    return defaultItemsPerPage;
  });

  const [currentPage, setCurrentPage] = useState(() => {
    if (enableUrlSync && typeof window !== 'undefined') {
      const urlParams = getUrlParams(urlPrefix);
      if (urlParams.page) {
        return parseInt(urlParams.page, 10) || 1;
      }
    }
    return 1;
  });

  // Persist items per page to localStorage and URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, itemsPerPage.toString());
      if (enableUrlSync) {
        updateUrlParams(currentPage, itemsPerPage, urlPrefix);
      }
    }
  }, [itemsPerPage, currentPage, storageKey, enableUrlSync, urlPrefix]);

  // // Listen for browser navigation (back/forward buttons)
  // useEffect(() => {
  //   console.log('enableUrlSync', enableUrlSync);
  //   if (!enableUrlSync || typeof window === 'undefined') return;

  //   const handlePopState = () => {
  //     const urlParams = getUrlParams(urlPrefix);
  //     const urlPage = urlParams.page ? parseInt(urlParams.page, 10) : 1;
  //     const urlSize = urlParams.size;

  //     console.log('urlPage', urlPage);

  //     if (urlPage !== currentPage) {
  //       setCurrentPage(urlPage);
  //     }

  //     if (urlSize && urlSize !== itemsPerPage.toString()) {
  //       const newSize = urlSize === 'all' ? 'all' : parseInt(urlSize, 10);
  //       setItemsPerPageState(newSize);
  //     }
  //   };

  //   window.addEventListener('popstate', handlePopState);
  //   return () => window.removeEventListener('popstate', handlePopState);
  // }, [enableUrlSync, urlPrefix, currentPage, itemsPerPage]);

  // Reset to first page when data changes significantly
  useEffect(() => {
    setCurrentPage(1);
  }, [data.length, itemsPerPage]);

  // Memoized calculations
  const calculations = useMemo(() => {
    const totalItems = data.length;

    if (itemsPerPage === 'all') {
      return {
        totalPages: 1,
        paginatedData: data,
        startIndex: 1,
        endIndex: totalItems,
        isFirstPage: true,
        isLastPage: true,
      };
    }

    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
    const safeCurrentPage = Math.min(currentPage, totalPages);
    const startIndex = (safeCurrentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
    const paginatedData = data.slice(startIndex, endIndex);

    return {
      totalPages,
      paginatedData,
      startIndex: totalItems > 0 ? startIndex + 1 : 0,
      endIndex,
      isFirstPage: safeCurrentPage === 1,
      isLastPage: safeCurrentPage === totalPages,
    };
  }, [data, currentPage, itemsPerPage]);

  const setPage = useCallback(
    (page: number) => {
      const maxPage = calculations.totalPages;
      let newPage;

      if (page < 1) {
        newPage = 1;
      } else if (page > maxPage && maxPage > 0) {
        // If page is beyond max, redirect to last valid page instead of page 1
        newPage = maxPage;
      } else {
        newPage = Math.min(page, maxPage);
      }

      setCurrentPage(newPage);
      if (enableUrlSync) {
        updateUrlParams(newPage, itemsPerPage, urlPrefix);
      }
    },
    [calculations.totalPages, itemsPerPage, enableUrlSync, urlPrefix]
  );

  const setItemsPerPage = useCallback(
    (count: number | 'all') => {
      setItemsPerPageState(count);
      setCurrentPage(1); // Reset to first page when changing items per page
      if (enableUrlSync) {
        updateUrlParams(1, count, urlPrefix);
      }
    },
    [enableUrlSync, urlPrefix]
  );

  const goToFirstPage = () => setPage(1);
  const goToLastPage = () => setPage(calculations.totalPages);
  const goToNextPage = () => setPage(currentPage + 1);
  const goToPreviousPage = () => setPage(currentPage - 1);

  return {
    currentPage,
    itemsPerPage,
    totalItems: data.length,
    totalPages: calculations.totalPages,
    paginatedData: calculations.paginatedData,
    isFirstPage: calculations.isFirstPage,
    isLastPage: calculations.isLastPage,
    startIndex: calculations.startIndex,
    endIndex: calculations.endIndex,
    setPage,
    setItemsPerPage,
    goToFirstPage,
    goToLastPage,
    goToNextPage,
    goToPreviousPage,
  };
}
