'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { formatDate } from '@/lib/utils';
import { Transaction } from '@/lib/types';
import { fetchTransactionsWithFilters, saveTransaction, deleteTransaction } from '@/lib/api';
import { ResponsiveTable } from '@/components/ui/responsive-table';
import { 
  Search, 
  Filter, 
  Plus,
  RefreshCw,
  Download,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  Banknote,
  Calendar,
  ArrowUpDown,
  Trash2,
  Edit,
  MoreHorizontal,
  AlertCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { 
  TransactionAddEditModal, 
  TransactionDetailModal, 
  TransactionDeleteModal 
} from '@/components/transactions';
import { getCurrentUserProfile } from '@/utils/userRoles';

interface Column<T> {
  header: string;
  accessor: (row: T) => React.ReactNode;
  sortable?: boolean;
  mobileLabel?: string;
  hidden?: boolean;
  className?: string;
  id?: string;
  width?: string;
}

const TransactionsManagementPage = () => {
  const router = useRouter();
  
  // State for transactions data
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [paymentFilter, setPaymentFilter] = useState<string>('');
  
  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [itemsPerPage] = useState(10);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage - 1;
  
  // State for sorting
  const [sortColumn, setSortColumn] = useState<string>('transaction_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // State for modals
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Check if user is logged in and is admin
  useEffect(() => {
    const checkUser = async () => {
      try {
        setLoading(true);
        
        // Check if user is logged in
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          router.push('/auth');
          return;
        }
        
        // Check user role using the same method as admin layout
        const profile = await getCurrentUserProfile();
        
        if (!profile) {
          router.push('/auth');
          return;
        }
        
        // If user is not admin, redirect to employee dashboard
        if (profile.role !== 'admin') {
          router.push('/employee');
          return;
        }
        
        // Load initial data once we confirm user is admin
        loadData();
        setLoading(false);
      } catch (error) {
        console.error('Error checking user access:', error);
        router.push('/auth');
      }
    };
    
    checkUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]); // loadData is defined using useCallback which depends on this effect
  
  // Load transactions data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await fetchTransactionsWithFilters({
        page: currentPage,
        pageSize: itemsPerPage,
        searchQuery,
        statusFilter,
        paymentFilter,
        sortColumn,
        sortDirection,
      });
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      setTransactions(result.data || []);
      setTotalItems(result.totalItems || 0);
      setTotalPages(result.totalPages || 1);
    } catch (error) {
      console.error('Error loading data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, searchQuery, statusFilter, paymentFilter, sortColumn, sortDirection]);

  useEffect(() => {
    loadData();
  }, [loadData]);
  
  // Handle sorting
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };
  
  // Handle pagination
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };
  
  // Handle opening detail modal
  const handleViewTransaction = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsDetailModalOpen(true);
  };
  
  // Handle opening add modal
  const handleAddTransaction = () => {
    setSelectedTransaction(null);
    setIsAddModalOpen(true);
  };
  
  // Handle opening edit modal
  const handleEditTransaction = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsEditModalOpen(true);
  };
  
  // Handle opening delete modal
  const handleDeleteTransaction = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsDeleteModalOpen(true);
  };
  
  // Handle saving transaction
  const handleSaveTransaction = async (transaction: Transaction) => {
    try {
      setIsSubmitting(true);
      
      // Add the current user as the updater
      const { data: { session } } = await supabase.auth.getSession();
      transaction.updated_by = session?.user.id || null;
      
      const { data, error } = await saveTransaction(transaction);
      
      if (error) {
        throw error;
      }
      
      toast.success(`Transaction ${transaction.transaction_id ? 'updated' : 'added'} successfully`);
      
      if (!transaction.transaction_id) {
        setTransactions(prev => [data, ...prev]);
      } else {
        setTransactions(prev => 
          prev.map(t => t.transaction_id === transaction.transaction_id ? data : t)
        );
      }
      
      // Close modals
      setIsAddModalOpen(false);
      setIsEditModalOpen(false);
      
    } catch (error) {
      console.error('Error saving transaction:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save transaction');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle deleting transaction
  const handleConfirmDelete = async () => {
    if (!selectedTransaction) return;
    
    try {
      setIsSubmitting(true);
      
      const { error } = await deleteTransaction(selectedTransaction.transaction_id);
      
      if (error) {
        throw error;
      }
      
      toast.success('Transaction deleted successfully');
      setTransactions(prev => 
        prev.filter(t => t.transaction_id !== selectedTransaction.transaction_id)
      );
      
      // Close modal
      setIsDeleteModalOpen(false);
      
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete transaction');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Get filtered transactions
  const getFilteredTransactions = () => {
    return transactions.filter(transaction => {
      const searchLower = searchQuery.toLowerCase();
      
      // Apply search filter
      if (searchQuery && !(
        transaction.brand.toLowerCase().includes(searchLower) ||
        transaction.amount.toString().includes(searchLower) ||
        (transaction.user?.email && transaction.user.email.toLowerCase().includes(searchLower)) ||
        (transaction.remarks && transaction.remarks.toLowerCase().includes(searchLower))
      )) {
        return false;
      }
      
      // Apply status filter
      if (statusFilter && transaction.confirmation_status !== statusFilter) {
        return false;
      }
      
      // Apply payment filter
      if (paymentFilter && transaction.pay_status !== paymentFilter) {
        return false;
      }
      
      return true;
    });
  };
  
  // Get paginated data
  const getPaginatedData = () => {
    const filteredData = getFilteredTransactions();
    return filteredData.slice(startIndex, endIndex + 1);
  };
  
  // Get status badge class
  const getStatusBadgeClass = (status: 'Not Confirmed' | 'Confirmed') => {
    switch (status) {
      case 'Confirmed':
        return 'bg-green-100 text-green-800';
      case 'Not Confirmed':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Get payment status badge class
  const getPaymentStatusBadgeClass = (status: 'Paid' | 'Unpaid') => {
    switch (status) {
      case 'Paid':
        return 'bg-green-100 text-green-800';
      case 'Unpaid':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Define table columns
  const columns: Column<Transaction>[] = [
    {
      id: 'transaction_id',
      header: 'ID',
      accessor: (row) => <span className="font-medium">#{row.transaction_id}</span>,
      sortable: true,
      width: '80px',
    },
    {
      id: 'transaction_date',
      header: 'Date',
      accessor: (row) => formatDate(row.transaction_date),
      sortable: true,
      width: '120px',
    },
    {
      id: 'brand',
      header: 'Brand',
      accessor: (row) => <span className="font-medium">{row.brand}</span>,
      sortable: true,
    },
    {
      id: 'amount',
      header: 'Amount',
      accessor: (row) => (
        <span className="font-medium">
          PKR {row.amount.toFixed(2)}
        </span>
      ),
      sortable: true,
      className: 'text-right',
    },
    {
      id: 'confirmation_status',
      header: 'Status',
      accessor: (row) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(row.confirmation_status)}`}>
          {row.confirmation_status}
        </span>
      ),
      sortable: true,
    },
    {
      id: 'pay_status',
      header: 'Payment',
      accessor: (row) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusBadgeClass(row.pay_status)}`}>
          {row.pay_status}
        </span>
      ),
      sortable: true,
    },
    {
      id: 'due_date',
      header: 'Due Date',
      accessor: (row) => formatDate(row.due_date),
      sortable: true,
    },
    {
      id: 'actions',
      header: 'Actions',
      accessor: (row) => (
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleEditTransaction(row);
            }}
          >
            Edit
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteTransaction(row);
            }}
          >
            Delete
          </Button>
        </div>
      ),
      className: 'text-right',
    },
  ];
  
  // Export transactions to CSV
  const exportTransactionsToCSV = () => {
    const filteredTransactions = getFilteredTransactions();
    const csvContent = [
      // CSV Header
      ['ID', 'Date', 'Due Date', 'Brand', 'Amount', 'Status', 'Payment', 'Remarks'].join(','),
      // CSV Rows
      ...filteredTransactions.map(transaction => [
        transaction.transaction_id,
        transaction.transaction_date,
        transaction.due_date,
        `"${transaction.brand.replace(/"/g, '""')}"`, // Escape quotes
        transaction.amount,
        transaction.confirmation_status,
        transaction.pay_status,
        `"${(transaction.remarks || '').replace(/"/g, '""')}"` // Escape quotes
      ].join(','))
    ].join('\n');
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `transactions_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  return (
    <>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Transactions Management</h1>
          <div className="flex items-center gap-2 mt-4 sm:mt-0">
            <Button
              onClick={exportTransactionsToCSV}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Button
              onClick={handleAddTransaction}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              <span>Add Transaction</span>
            </Button>
          </div>
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700 transition-all hover:shadow-md">
            <div className="flex items-center">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 mb-4">
                <Banknote className="h-6 w-6 text-indigo-500" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Transactions</h3>
                <p className="text-2xl font-semibold">{totalItems}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700 transition-all hover:shadow-md">
            <div className="flex items-center">
              <div className="p-2 rounded-full bg-yellow-100 dark:bg-yellow-900">
                <Clock className="h-6 w-6 text-yellow-500" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Not Confirmed</h3>
                <p className="text-2xl font-semibold">{transactions.filter(t => t.confirmation_status === 'Not Confirmed').length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700 transition-all hover:shadow-md">
            <div className="flex items-center">
              <div className="p-2 rounded-full bg-green-100 dark:bg-green-900">
                <CheckCircle className="h-6 w-6 text-green-500" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Paid Transactions</h3>
                <p className="text-2xl font-semibold">{transactions.filter(t => t.pay_status === 'Paid').length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700 transition-all hover:shadow-md">
            <div className="flex items-center">
              <div className="p-2 rounded-full bg-red-100 dark:bg-red-900">
                <XCircle className="h-6 w-6 text-red-500" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Unpaid Transactions</h3>
                <p className="text-2xl font-semibold">{transactions.filter(t => t.pay_status === 'Unpaid').length}</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border border-gray-100 dark:border-gray-700 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label htmlFor="searchQuery" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Search
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  id="searchQuery"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by brand, amount, or remarks..."
                  className="focus:ring-brand focus:border-brand block w-full pl-10 sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md h-10"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="statusFilter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Filter className="h-5 w-5 text-gray-400" />
                </div>
                <select
                  id="statusFilter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="focus:ring-brand focus:border-brand block w-full pl-10 sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md h-10 appearance-none"
                >
                  <option value="">All Statuses</option>
                  <option value="Confirmed">Confirmed</option>
                  <option value="Not Confirmed">Not Confirmed</option>
                </select>
              </div>
            </div>
            
            <div>
              <label htmlFor="paymentFilter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Payment
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Banknote className="h-5 w-5 text-gray-400" />
                </div>
                <select
                  id="paymentFilter"
                  value={paymentFilter}
                  onChange={(e) => setPaymentFilter(e.target.value)}
                  className="focus:ring-brand focus:border-brand block w-full pl-10 sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md h-10 appearance-none"
                >
                  <option value="">All Payments</option>
                  <option value="Paid">Paid</option>
                  <option value="Unpaid">Unpaid</option>
                </select>
              </div>
            </div>
          </div>
        </div>
        
        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 p-4 rounded-md mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Responsive Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">
              Transactions List
            </h2>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadData}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh</span>
            </Button>
          </div>
          
          <ResponsiveTable
            data={getPaginatedData()}
            columns={columns}
            keyField="transaction_id"
            onRowClick={handleViewTransaction}
            isLoading={loading}
            emptyMessage="No transactions found. Try adjusting your filters or add a new transaction."
            pagination={{
              currentPage,
              totalPages,
              onPageChange: handlePageChange,
            }}
            sorting={{
              column: sortColumn,
              direction: sortDirection,
              onSort: handleSort,
            }}
            rowClassName={(row) => {
              if (row.pay_status === 'Unpaid' && new Date(row.due_date) < new Date()) return 'bg-red-50/50 dark:bg-red-900/10';
              if (row.pay_status === 'Paid') return 'bg-green-50/50 dark:bg-green-900/10';
              return '';
            }}
          />
        </motion.div>
      </div>
      
      {/* Modals */}
      {isAddModalOpen && (
        <TransactionAddEditModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          transaction={null}
          onSave={handleSaveTransaction}
          isSubmitting={isSubmitting}
        />
      )}
      
      {isEditModalOpen && selectedTransaction && (
        <TransactionAddEditModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          transaction={selectedTransaction}
          onSave={handleSaveTransaction}
          isSubmitting={isSubmitting}
        />
      )}
      
      {isDetailModalOpen && selectedTransaction && (
        <TransactionDetailModal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          transaction={selectedTransaction}
          onEdit={() => {
            setIsDetailModalOpen(false);
            setIsEditModalOpen(true);
          }}
          onDelete={() => {
            setIsDetailModalOpen(false);
            setIsDeleteModalOpen(true);
          }}
        />
      )}
      
      {isDeleteModalOpen && selectedTransaction && (
        <TransactionDeleteModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleConfirmDelete}
          isSubmitting={isSubmitting}
          transactionId={selectedTransaction.transaction_id}
        />
      )}
    </>
  );
};

export default TransactionsManagementPage; 