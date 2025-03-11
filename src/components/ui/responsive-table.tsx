'use client';

import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Column<T> {
  header: string;
  accessor: keyof T | ((row: T) => React.ReactNode);
  className?: string;
  sortable?: boolean;
  mobileLabel?: string;
  hidden?: boolean;
}

interface ResponsiveTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyField: keyof T;
  onRowClick?: (row: T) => void;
  isLoading?: boolean;
  emptyMessage?: string;
  pagination?: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
  sorting?: {
    column: string;
    direction: 'asc' | 'desc';
    onSort: (column: string) => void;
  };
  rowClassName?: (row: T) => string;
  showMobileCards?: boolean;
}

export function ResponsiveTable<T>({
  data,
  columns,
  keyField,
  onRowClick,
  isLoading = false,
  emptyMessage = 'No data available',
  pagination,
  sorting,
  rowClassName,
  showMobileCards = true,
}: ResponsiveTableProps<T>) {
  const [isMobile, setIsMobile] = useState(false);

  // Check if we're on mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Render loading state
  if (isLoading) {
    return (
      <div className="w-full overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="p-6 flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-600 dark:border-indigo-400 mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">Loading data...</p>
        </div>
      </div>
    );
  }

  // Render empty state
  if (data.length === 0) {
    return (
      <div className="w-full overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="p-6 text-center">
          <p className="text-gray-500 dark:text-gray-400">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  // Render mobile card view
  if (isMobile && showMobileCards) {
    return (
      <div className="space-y-4 animate-fade-in">
        {data.map((row) => (
          <div 
            key={String(row[keyField])} 
            className={cn(
              "mobile-card",
              onRowClick && "cursor-pointer",
              rowClassName && rowClassName(row)
            )}
            onClick={() => onRowClick && onRowClick(row)}
          >
            {columns
              .filter(col => !col.hidden)
              .map((column, index) => {
                const value = typeof column.accessor === 'function' 
                  ? column.accessor(row) 
                  : row[column.accessor];
                
                return (
                  <div key={index} className="mobile-card-row">
                    <span className="mobile-card-label">
                      {column.mobileLabel || column.header}:
                    </span>
                    <span className="mobile-card-value">
                      {value as React.ReactNode}
                    </span>
                  </div>
                );
              })}
          </div>
        ))}
        
        {pagination && (
          <div className="flex justify-center mt-4 items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
              disabled={pagination.currentPage <= 1}
              className="h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-gray-600 dark:text-gray-300">
              Page {pagination.currentPage} of {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
              disabled={pagination.currentPage >= pagination.totalPages}
              className="h-8 w-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Render desktop table view
  return (
    <div className="w-full overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 animate-fade-in">
      <div className="responsive-table">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              {columns
                .filter(col => !col.hidden)
                .map((column, index) => (
                  <th
                    key={index}
                    scope="col"
                    className={cn(
                      "px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider",
                      column.sortable && "cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600",
                      column.className
                    )}
                    onClick={() => {
                      if (column.sortable && sorting) {
                        sorting.onSort(typeof column.accessor === 'string' ? column.accessor as string : index.toString());
                      }
                    }}
                  >
                    <div className="flex items-center">
                      {column.header}
                      {column.sortable && sorting && typeof column.accessor === 'string' && sorting.column === column.accessor && (
                        <span className="ml-1">
                          {sorting.direction === 'asc' ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {data.map((row) => (
              <tr
                key={String(row[keyField])}
                className={cn(
                  "hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors",
                  onRowClick && "cursor-pointer",
                  rowClassName && rowClassName(row)
                )}
                onClick={() => onRowClick && onRowClick(row)}
              >
                {columns
                  .filter(col => !col.hidden)
                  .map((column, index) => {
                    const value = typeof column.accessor === 'function' 
                      ? column.accessor(row) 
                      : row[column.accessor];
                    
                    return (
                      <td key={index} className={cn("px-6 py-4 whitespace-nowrap text-sm", column.className)}>
                        {value as React.ReactNode}
                      </td>
                    );
                  })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {pagination && (
        <div className="px-6 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
          <div className="flex-1 flex justify-between sm:hidden">
            <Button
              variant="outline"
              onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
              disabled={pagination.currentPage <= 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
              disabled={pagination.currentPage >= pagination.totalPages}
            >
              Next
            </Button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Page <span className="font-medium">{pagination.currentPage}</span> of{' '}
                <span className="font-medium">{pagination.totalPages}</span>
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
                  disabled={pagination.currentPage <= 1}
                  className="rounded-l-md"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: Math.min(5, pagination.totalPages) }).map((_, i) => {
                  let pageNumber: number;
                  
                  if (pagination.totalPages <= 5) {
                    pageNumber = i + 1;
                  } else if (pagination.currentPage <= 3) {
                    pageNumber = i + 1;
                  } else if (pagination.currentPage >= pagination.totalPages - 2) {
                    pageNumber = pagination.totalPages - 4 + i;
                  } else {
                    pageNumber = pagination.currentPage - 2 + i;
                  }
                  
                  return (
                    <Button
                      key={pageNumber}
                      variant={pagination.currentPage === pageNumber ? "default" : "outline"}
                      onClick={() => pagination.onPageChange(pageNumber)}
                      className="w-10 h-10"
                    >
                      {pageNumber}
                    </Button>
                  );
                })}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
                  disabled={pagination.currentPage >= pagination.totalPages}
                  className="rounded-r-md"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 