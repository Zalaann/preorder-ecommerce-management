'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { PaymentWithDetails, PaymentPurpose, Customer } from '@/lib/types';
import { formatDate, formatCurrency } from '@/lib/utils';
import { getPaymentsWithPagination, getCustomers } from '@/lib/api';
import { 
  Search, 
  Calendar, 
  Filter, 
  CreditCard, 
  Plus,
  Edit,
  Trash2,
  Eye,
  Image
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import PaymentDetailModal from '@/components/payments/PaymentDetailModal';
import PaymentAddEditModal from '@/components/payments/PaymentAddEditModal';
import PaymentDeleteModal from '@/components/payments/PaymentDeleteModal';

const PaymentsManagementPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // State for payments data
  const [payments, setPayments] = useState<PaymentWithDetails[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState('');
  const [purposeFilter, setPurposeFilter] = useState<string>('');
  const [customerFilter, setCustomerFilter] = useState<string>('');
  
  // State for pagination (server-side)
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [itemsPerPage] = useState(20);
  
  // State for sorting
  const [sortColumn, setSortColumn] = useState<string>('payment_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // State for modals
  const [selectedPayment, setSelectedPayment] = useState<PaymentWithDetails | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Check if user is logged in
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/auth');
        return;
      }
      
      // Load initial data
      loadData(1);
      loadCustomers();
    };
    
    checkUser();
  }, [router]);
  
  // Load payments data with pagination
  const loadData = useCallback(async (page: number) => {
    try {
      setLoading(true);
      setError(null);

      const response = await getPaymentsWithPagination(page, itemsPerPage);
      if (response.error) {
        throw response.error;
      }
      
      if (response.data) {
        setPayments(response.data.payments);
        setTotalItems(response.data.count);
        setTotalPages(Math.ceil(response.data.count / itemsPerPage));
        setCurrentPage(page);
      }
    } catch (error) {
      console.error('Error loading payments:', error);
      setError(error instanceof Error ? error.message : 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  }, [itemsPerPage]);

  // Load customers for filters
  const loadCustomers = async () => {
    try {
      const response = await getCustomers();
      if (response.error) {
        throw response.error;
      }
      setCustomers(response.data || []);
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };
  
  // Handle page change
  const handlePageChange = (page: number) => {
    loadData(page);
  };
  
  // Handle opening detail modal
  const handleViewPayment = (payment: PaymentWithDetails) => {
    setSelectedPayment(payment);
    setIsDetailModalOpen(true);
  };
  
  // Handle opening add modal
  const handleAddPayment = () => {
    setSelectedPayment(null);
    setIsAddModalOpen(true);
  };
  
  // Handle opening edit modal
  const handleEditPayment = (payment: PaymentWithDetails) => {
    setSelectedPayment(payment);
    setIsEditModalOpen(true);
  };
  
  // Handle opening delete modal
  const handleDeletePayment = (payment: PaymentWithDetails) => {
    setSelectedPayment(payment);
    setIsDeleteModalOpen(true);
  };
  
  // For sorting - we'll sort on the server side in future updates
  const handleSort = (column: string) => {
    if (column === sortColumn) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
    // For now just re-load the current page
    loadData(currentPage);
  };
  
  // Get sort indicator
  const getSortIndicator = (column: string) => {
    if (column !== sortColumn) return null;
    
    return sortDirection === 'asc' ? (
      <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
      </svg>
    );
  };
  
  // Format payment purpose for display
  const formatPaymentPurpose = (purpose: PaymentPurpose) => {
    switch (purpose) {
      case 'advance':
        return 'Advance Payment';
      case 'final_remaining':
        return 'Final Remaining Payment';
      case 'delivery_charges':
        return 'Delivery Charges';
      default:
        return purpose;
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold gradient-text">Payments Management</h1>
        <Button 
          onClick={handleAddPayment}
          className="bg-brand hover:bg-brand/90"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Payment
        </Button>
      </div>
      
      {/* Search and Filters - these will be implemented on the server-side in future updates */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search payments..."
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="date"
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
          />
        </div>
        
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <select
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent appearance-none"
            value={purposeFilter}
            onChange={(e) => setPurposeFilter(e.target.value)}
          >
            <option value="">All Payment Purposes</option>
            <option value="preorder">Pre-order Payment</option>
            <option value="final_payment">Final Payment</option>
            <option value="refund">Refund</option>
          </select>
        </div>
        
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <select
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent appearance-none"
            value={customerFilter}
            onChange={(e) => setCustomerFilter(e.target.value)}
          >
            <option value="">All Customers</option>
            {customers.map((customer) => (
              <option key={customer.customer_id} value={customer.customer_id}>
                {customer.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      {/* Error Message */}
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-md mb-6">
          <p>{error}</p>
        </div>
      )}
      
      {/* Payments Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('payment_date')}
                >
                  <div className="flex items-center">
                    Date
                    {getSortIndicator('payment_date')}
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('customer_name')}
                >
                  <div className="flex items-center">
                    Customer
                    {getSortIndicator('customer_name')}
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('preorder_id')}
                >
                  <div className="flex items-center">
                    Order ID
                    {getSortIndicator('preorder_id')}
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('amount')}
                >
                  <div className="flex items-center">
                    Amount
                    {getSortIndicator('amount')}
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('payment_purpose')}
                >
                  <div className="flex items-center">
                    Purpose
                    {getSortIndicator('payment_purpose')}
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('bank_account')}
                >
                  <div className="flex items-center">
                    Bank Account
                    {getSortIndicator('bank_account')}
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('tally')}
                >
                  <div className="flex items-center">
                    Tally
                    {getSortIndicator('tally')}
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  <div className="flex items-center">
                    Screenshot
                  </div>
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-4 text-center">
                    <div className="flex justify-center items-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand"></div>
                      <span className="ml-2">Loading payments...</span>
                    </div>
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-4 text-center text-gray-500">
                    No payments found
                  </td>
                </tr>
              ) : (
                payments.map((payment) => (
                  <tr 
                    key={payment.payment_id} 
                    className="hover:bg-gray-50 cursor-pointer" 
                    onClick={() => handleViewPayment(payment)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(payment.payment_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {payment.customer?.name || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {payment.preorder?.preorder_id || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(payment.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatPaymentPurpose(payment.payment_purpose)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {payment.bank_account}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${payment.tally ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {payment.tally ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {payment.payment_screenshot ? (
                        <div 
                          className="cursor-pointer" 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewPayment(payment);
                          }}
                        >
                          <div className="h-10 w-10 rounded border border-gray-200 overflow-hidden bg-gray-50 flex items-center justify-center">
                            <img 
                              src={payment.payment_screenshot} 
                              alt="Screenshot" 
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJsdWNpZGUgbHVjaWRlLWltYWdlIj48cmVjdCB3aWR0aD0iMTgiIGhlaWdodD0iMTgiIHg9IjMiIHk9IjMiIHJ4PSIyIiByeT0iMiIvPjxjaXJjbGUgY3g9IjguNSIgY3k9IjguNSIgcj0iMS41Ii8+PHBvbHlsaW5lIHBvaW50cz0iMjEgMTUgMTYgMTAgNSAyMSIvPjwvc3ZnPg==';
                                (e.target as HTMLImageElement).className = 'h-6 w-6 text-gray-400';
                              }}
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">
                          <Image className="h-5 w-5" />
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewPayment(payment);
                        }}
                        className="text-indigo-600 hover:text-indigo-900 mr-3"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditPayment(payment);
                        }}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePayment(payment);
                        }}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-700">
            Showing <span className="font-medium">{payments.length}</span> of{' '}
            <span className="font-medium">{totalItems}</span> payments
          </div>
          <div className="flex space-x-2">
            <Button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              variant="outline"
              size="sm"
            >
              Previous
            </Button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              // Show pages around current page
              let pageNumber;
              if (totalPages <= 5) {
                pageNumber = i + 1;
              } else if (currentPage <= 3) {
                pageNumber = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNumber = totalPages - 4 + i;
              } else {
                pageNumber = currentPage - 2 + i;
              }
              
              return (
                <Button
                  key={pageNumber}
                  onClick={() => handlePageChange(pageNumber)}
                  variant={currentPage === pageNumber ? 'default' : 'outline'}
                  size="sm"
                >
                  {pageNumber}
                </Button>
              );
            })}
            <Button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              variant="outline"
              size="sm"
            >
              Next
            </Button>
          </div>
        </div>
      )}
      
      {/* Modals */}
      {isDetailModalOpen && selectedPayment && (
        <PaymentDetailModal
          payment={selectedPayment}
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
        />
      )}
      
      {(isAddModalOpen || isEditModalOpen) && (
        <PaymentAddEditModal
          payment={selectedPayment}
          isOpen={isAddModalOpen || isEditModalOpen}
          onClose={() => {
            setIsAddModalOpen(false);
            setIsEditModalOpen(false);
          }}
          onSave={() => {
            loadData(currentPage);
            setIsAddModalOpen(false);
            setIsEditModalOpen(false);
          }}
          isEditing={isEditModalOpen}
        />
      )}
      
      {isDeleteModalOpen && selectedPayment && (
        <PaymentDeleteModal
          payment={selectedPayment}
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onDelete={() => {
            loadData(currentPage);
            setIsDeleteModalOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default PaymentsManagementPage; 