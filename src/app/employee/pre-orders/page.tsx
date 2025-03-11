'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { PreOrderWithDetails, OrderStatus, Flight, Customer, Reminder } from '@/lib/types';
import { formatDate, formatCurrency, formatStatus, exportPreOrdersToCSV } from '@/lib/utils';
import { getPreOrders, fetchFlights, getCustomers } from '@/lib/api';
import PreOrderDetailModal from '@/components/pre-orders/PreOrderDetailModal';
import PreOrderAddEditModal from '@/components/pre-orders/PreOrderAddEditModal';
import PreOrderDeleteModal from '@/components/pre-orders/PreOrderDeleteModal';
import { ResponsiveTable } from '@/components/ui/responsive-table';
import { 
  Search, 
  Calendar, 
  Filter, 
  Package, 
  Plus,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Download,
  Bell,
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { motion } from 'framer-motion';
import { toast } from 'sonner';

interface ApiResponse<T> {
  data: T | null;
  error: Error | null;
}

// Define error types
interface DatabaseError extends Error {
  code: string;
  details: string;
  hint: string;
}

interface Column<T> {
  header: string | (({ table }: any) => React.ReactNode);
  accessor: (row: T) => React.ReactNode;
  sortable?: boolean;
  mobileLabel?: string;
  hidden?: boolean;
  className?: string;
  id?: string;
  width?: string;
}

const PreOrdersManagementPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // State for pre-orders data
  const [preOrders, setPreOrders] = useState<PreOrderWithDetails[]>([]);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [flightFilter, setFlightFilter] = useState<string>('');
  
  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [itemsPerPage] = useState(10);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage - 1;
  
  // State for sorting
  const [sortColumn, setSortColumn] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // State for modals
  const [selectedPreOrder, setSelectedPreOrder] = useState<PreOrderWithDetails | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Add selection state
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  
  // State for preorder items
  const [preOrderItems, setPreOrderItems] = useState<Record<string, any[]>>({});
  const [loadingItems, setLoadingItems] = useState<Set<string>>(new Set());
  
  // State for reminders
  const [preOrderReminders, setPreOrderReminders] = useState<Record<string, Reminder[]>>({});
  const [loadingReminders, setLoadingReminders] = useState(false);
  
  // Check if user is logged in
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/auth');
        return;
      }
      
      // Load initial data
      loadData();
    };
    
    checkUser();
  }, [router]);
  
  useEffect(() => {
    // Get status from URL parameters
    const statusFromUrl = searchParams.get('status');
    if (statusFromUrl) {
      setStatusFilter(statusFromUrl);
    }
  }, [searchParams]);
  
  // Fetch reminders for all preorders
  const fetchReminders = useCallback(async () => {
    try {
      setLoadingReminders(true);
      const { data, error } = await supabase
        .from('reminders')
        .select('*');
      
      if (error) {
        console.error('Error fetching reminders:', error);
        return;
      }
      
      // Group reminders by preorder_id
      const remindersByPreOrder: Record<string, Reminder[]> = {};
      data.forEach((reminder: Reminder) => {
        if (reminder.preorder_id) {
          if (!remindersByPreOrder[reminder.preorder_id]) {
            remindersByPreOrder[reminder.preorder_id] = [];
          }
          remindersByPreOrder[reminder.preorder_id].push(reminder);
        }
      });
      
      setPreOrderReminders(remindersByPreOrder);
    } catch (error) {
      console.error('Error in fetchReminders:', error);
    } finally {
      setLoadingReminders(false);
    }
  }, []);
  
  // Load pre-orders data with filters, sorting, and pagination
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [preOrdersResponse, flightsData] = await Promise.all([
        getPreOrders(),
        fetchFlights(),
      ]);
      
      if (preOrdersResponse.error) {
        setError(preOrdersResponse.error.message);
        console.error('Error loading pre-orders:', preOrdersResponse.error);
        toast.error('Failed to load pre-orders');
        return;
      }
      
      setPreOrders(preOrdersResponse.data || []);
      setFlights(flightsData || []);
      setTotalItems((preOrdersResponse.data || []).length);
      
      // Fetch reminders
      await fetchReminders();
    } catch (error) {
      console.error('Error loading data:', error);
      setError('An error occurred while loading data');
      toast.error('An error occurred while loading data');
    } finally {
      setLoading(false);
    }
  }, [fetchReminders]);

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
  
  // Sort function for pre-orders
  const sortPreOrders = (a: PreOrderWithDetails, b: PreOrderWithDetails) => {
    if (sortColumn === 'preorder_id') {
      return sortDirection === 'asc'
        ? (a.preorder_id || '').localeCompare(b.preorder_id || '')
        : (b.preorder_id || '').localeCompare(a.preorder_id || '');
    } else if (sortColumn === 'customer') {
      const aName = a.customer?.name || '';
      const bName = b.customer?.name || '';
      return sortDirection === 'asc'
        ? aName.localeCompare(bName)
        : bName.localeCompare(aName);
    } else if (sortColumn === 'flight') {
      const aFlight = a.flight?.flight_name || '';
      const bFlight = b.flight?.flight_name || '';
      return sortDirection === 'asc'
        ? aFlight.localeCompare(bFlight)
        : bFlight.localeCompare(aFlight);
    } else if (sortColumn === 'date') {
      const aDate = new Date(a.created_at).getTime();
      const bDate = new Date(b.created_at).getTime();
      return sortDirection === 'asc' ? aDate - bDate : bDate - aDate;
    } else if (sortColumn === 'status') {
      return sortDirection === 'asc'
        ? a.order_status.localeCompare(b.order_status)
        : b.order_status.localeCompare(a.order_status);
    } else if (sortColumn === 'amount') {
      const aAmount = a.subtotal || 0;
      const bAmount = b.subtotal || 0;
      return sortDirection === 'asc' ? aAmount - bAmount : bAmount - aAmount;
    }
    return 0;
  };
  
  // Handle pagination
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };
  
  // Handle opening detail modal
  const handleViewPreOrder = (preOrder: PreOrderWithDetails) => {
    setSelectedPreOrder(preOrder);
    setIsDetailModalOpen(true);
  };
  
  // Handle opening add modal
  const handleAddPreOrder = () => {
    setSelectedPreOrder(null);
    setIsAddModalOpen(true);
  };
  
  // Handle opening edit modal
  const handleEditPreOrder = (preOrder: PreOrderWithDetails) => {
    setSelectedPreOrder(preOrder);
    setIsEditModalOpen(true);
  };
  
  // Handle opening delete modal
  const handleDeletePreOrder = (preOrder: PreOrderWithDetails) => {
    setSelectedPreOrder(preOrder);
    setIsDeleteModalOpen(true);
  };
  
  // Handle saving pre-order (add or edit)
  const handleSavePreOrder = async (preOrder: PreOrderWithDetails, productItems: any[], reminderData?: any) => {
    try {
      setIsSubmitting(true);
      setError(null);

      // Ensure subtotal is calculated from product items
      const calculatedSubtotal = productItems.reduce((total, item) => {
        return total + (item.price * item.quantity);
      }, 0);

      // Calculate total and remaining amounts
      const totalAmount = calculatedSubtotal + (preOrder.cod_amount || 0);
      const remainingAmount = totalAmount - (preOrder.advance_payment || 0);

      // Format the data before saving
      const formattedPreOrder = {
        // For new pre-orders, preorder_id will be generated by the database
        ...(preOrder.preorder_id ? { preorder_id: preOrder.preorder_id } : {}),
        customer_id: preOrder.customer_id,
        flight_id: preOrder.flight_id || null, // Allow null for flight_id
        order_status: preOrder.order_status,
        subtotal: calculatedSubtotal,
        advance_payment: preOrder.advance_payment || 0,
        cod_amount: preOrder.cod_amount || 0,
        total_amount: totalAmount,
        remaining_amount: remainingAmount,
        created_at: new Date(preOrder.created_at).toISOString()
      };

      console.log('Saving pre-order:', formattedPreOrder);

      // Start a transaction
      const { data, error } = await supabase
        .from('preorders')
        .upsert(formattedPreOrder)
        .select('*')
        .single();

      if (error) {
        console.error('Database error:', error);
        throw new Error(error.message || 'Failed to save pre-order');
      }

      if (!data) {
        throw new Error('No data returned from the database');
      }

      console.log('Pre-order saved successfully:', data);

      // Get the preorder_id from the saved data (important for new pre-orders)
      const savedPreOrderId = data.preorder_id;

      // Now save the product items
      if (productItems && productItems.length > 0) {
        // First, delete any existing items for this pre-order
        if (preOrder.preorder_id) {
          const { error: deleteError } = await supabase
            .from('preorder_items')
            .delete()
            .eq('preorder_id', preOrder.preorder_id);

          if (deleteError) {
            console.error('Error deleting existing items:', deleteError);
            throw new Error(deleteError.message || 'Failed to update product items');
          }
        }

        // Format the product items
        const formattedItems = productItems.map(item => ({
          preorder_id: savedPreOrderId, // Use the saved preorder_id
          product_name: item.product_name,
          shade: item.shade || '',
          size: item.size || '',
          quantity: item.quantity || 1,
          price: item.price || 0,
          link: item.link || ''
        }));

        // Insert the new items
        const { error: insertError } = await supabase
          .from('preorder_items')
          .insert(formattedItems);

        if (insertError) {
          console.error('Error inserting product items:', insertError);
          throw new Error(insertError.message || 'Failed to save product items');
        }
      }

      // Save reminder if provided
      if (reminderData) {
        // Get the current user's ID
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;

        if (!userId) {
          console.error('No user ID found for reminder');
          throw new Error('User authentication required to create reminder');
        }

        // Format the reminder data
        const formattedReminder = {
          preorder_id: savedPreOrderId,
          user_id: userId,
          title: reminderData.title,
          description: reminderData.description || '',
          status: reminderData.status,
          priority: reminderData.priority,
          due_date: new Date(reminderData.due_date).toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        console.log('Saving reminder:', formattedReminder);

        // Insert the reminder
        const { error: reminderError } = await supabase
          .from('reminders')
          .insert(formattedReminder);

        if (reminderError) {
          console.error('Error creating reminder:', reminderError);
          // Don't throw here, just log the error and continue
          toast.error(`Pre-order saved but failed to create reminder: ${reminderError.message}`);
        } else {
          toast.success('Reminder created successfully');
        }
      }

      // Refresh pre-order list
      await loadData();

      // Close the modal
      setIsAddModalOpen(false);
      setIsEditModalOpen(false);

      // Show success message
      toast.success(`Pre-order ${savedPreOrderId} saved successfully`);
    } catch (err: any) {
      console.error('Error saving pre-order:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      toast.error(err instanceof Error ? err.message : 'Failed to save pre-order');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle deleting pre-order
  const handleDeleteConfirm = async (preOrderId: string) => {
    try {
      console.log(`Attempting to delete pre-order with ID: ${preOrderId}`);
      
      // Delete the pre-order (cascade will delete the items automatically due to ON DELETE CASCADE)
      const { error } = await supabase
        .from('preorders')
        .delete()
        .eq('preorder_id', preOrderId);
      
      if (error) {
        throw new Error(error.message || 'Failed to delete pre-order');
      }
      
      console.log('Pre-order deleted successfully');
      
      // Show success toast
      toast.success('Pre-order deleted successfully');
      
      // Refresh data
      await loadData();
      
      // Close modal
      setIsDeleteModalOpen(false);
      
    } catch (err: any) {
      console.error('Error deleting pre-order:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`Failed to delete pre-order: ${errorMessage}`);
      // Show error toast
      toast.error(`Failed to delete pre-order: ${errorMessage}`);
      // Keep the modal open so user can try again or cancel
    }
  };
  
  // Handle status change
  const handleStatusChange = async (preOrderId: string, newStatus: OrderStatus): Promise<ApiResponse<PreOrderWithDetails>> => {
    try {
      console.log(`Updating pre-order ${preOrderId} status to ${newStatus}`);
      
      // Clear any previous errors
      setError(null);
      
      const { data, error } = await supabase
        .from('preorders')
        .update({ order_status: newStatus })
        .eq('preorder_id', preOrderId)
        .select('*');
      
      if (error) {
        console.error('Error updating pre-order status:', error);
        throw error;
      }
      
      // Update the local state
      setPreOrders(prevOrders =>
        prevOrders.map(order =>
          order.preorder_id === preOrderId ? { ...order, order_status: newStatus } : order
        )
      );
      
      // If the detail modal is open, update the selected pre-order
      if (selectedPreOrder && selectedPreOrder.preorder_id === preOrderId) {
        setSelectedPreOrder({ ...selectedPreOrder, order_status: newStatus });
      }

      // Show success toast
      toast.success(`Pre-order status updated to ${formatStatus(newStatus)}`);
      
      return { data: data[0], error: null };
    } catch (error) {
      console.error('Error updating pre-order status:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(`Failed to update status: ${errorMessage}`);
      // Show error toast
      toast.error(`Failed to update status: ${errorMessage}`);
      return { data: null, error: error as Error };
    }
  };
  
  // Get sort indicator
  const getSortIndicator = (column: string) => {
    if (sortColumn !== column) return null;
    
    return sortDirection === 'asc' ? (
      <ChevronUp className="ml-1 h-4 w-4" />
    ) : (
      <ChevronDown className="ml-1 h-4 w-4" />
    );
  };
  
  // Get status badge class
  const getStatusBadgeClass = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'ordered':
        return 'bg-blue-100 text-blue-800';
      case 'shipped':
        return 'bg-purple-100 text-purple-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'Out_of_stock':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Update customer display
  const formatCustomerInfo = (customer: Customer) => {
    return `${customer.name} - ${customer.phone_number || 'No phone'}`;
  };
  
  const displayedPreOrders = preOrders.slice(startIndex, endIndex);

  // Handle selection
  const handleSelectOrder = (orderId: string, isSelected: boolean) => {
    setSelectedOrders(prev => {
      const newSelection = new Set(prev);
      if (isSelected) {
        newSelection.add(orderId);
      } else {
        newSelection.delete(orderId);
      }
      return newSelection;
    });
  };

  // Handle select all
  const handleSelectAll = (isSelected: boolean) => {
    if (isSelected) {
      const filteredOrders = getFilteredPreOrders();
      setSelectedOrders(new Set(filteredOrders.map(order => order.preorder_id)));
    } else {
      setSelectedOrders(new Set());
    }
  };

  // Clear selection when filters change
  useEffect(() => {
    setSelectedOrders(new Set());
  }, [searchQuery, statusFilter, flightFilter]);

  // Handle export
  const handleExport = () => {
    const filteredOrders = getFilteredPreOrders();
    const ordersToExport = selectedOrders.size > 0
      ? filteredOrders.filter(order => selectedOrders.has(order.preorder_id))
      : filteredOrders;
    exportPreOrdersToCSV(ordersToExport);
  };

  // Get filtered pre-orders
  const getFilteredPreOrders = () => {
    return preOrders.filter(preOrder => {
      const searchLower = searchQuery.toLowerCase();
      
      // Search in pre-order ID
      if (preOrder.preorder_id.toLowerCase().includes(searchLower)) {
        return true;
      }
      
      // Search in customer name
      if (preOrder.customer && preOrder.customer.name.toLowerCase().includes(searchLower)) {
        return true;
      }
      
      // Search in flight name
      if (preOrder.flight && preOrder.flight.flight_name.toLowerCase().includes(searchLower)) {
        return true;
      }
      
      // Search in status
      if (preOrder.order_status.toLowerCase().includes(searchLower)) {
        return true;
      }
      
      // Search in items
      if (preOrder.items && preOrder.items.some(item => 
        item.product_name.toLowerCase().includes(searchLower) ||
        (item.shade && item.shade.toLowerCase().includes(searchLower)) ||
        (item.size && item.size.toLowerCase().includes(searchLower))
      )) {
        return true;
      }
      
      return false;
    });
  };

  // Update pagination when filters change
  useEffect(() => {
    const filtered = getFilteredPreOrders();
    setTotalItems(filtered.length);
    setTotalPages(Math.ceil(filtered.length / itemsPerPage));
    setCurrentPage(1); // Reset to first page when filters change
  }, [searchQuery, statusFilter, flightFilter, sortColumn, sortDirection]);

  // Get paginated data
  const getPaginatedData = () => {
    const filtered = getFilteredPreOrders();
    return filtered.slice(startIndex, startIndex + itemsPerPage);
  };

  // Function to fetch items for a preorder
  const fetchPreOrderItems = useCallback(async (preorderId: string) => {
    if (!preorderId || preOrderItems[preorderId] || loadingItems.has(preorderId)) return;
    
    // Mark as loading
    setLoadingItems(prev => new Set([...prev, preorderId]));
    
    try {
      const { data, error } = await supabase
        .from('preorder_items')
        .select('*')
        .eq('preorder_id', preorderId);
      
      if (error) {
        console.error('Error fetching preorder items:', error);
        return;
      }
      
      // Store the items
      setPreOrderItems(prev => ({
        ...prev,
        [preorderId]: data || []
      }));
    } catch (error) {
      console.error('Error in fetchPreOrderItems:', error);
    } finally {
      // Remove from loading set
      setLoadingItems(prev => {
        const newSet = new Set([...prev]);
        newSet.delete(preorderId);
        return newSet;
      });
    }
  }, [preOrderItems, loadingItems]);
  
  // Fetch items for all preorders
  useEffect(() => {
    const fetchAllItems = async () => {
      if (!preOrders.length) return;
      
      // Fetch items for all preorders that don't have items
      const preordersToFetch = preOrders
        .filter(po => !po.items || po.items.length === 0)
        .filter(po => !preOrderItems[po.preorder_id] && !loadingItems.has(po.preorder_id))
        .map(po => po.preorder_id);
      
      // Fetch in batches to avoid too many concurrent requests
      const batchSize = 5;
      for (let i = 0; i < preordersToFetch.length; i += batchSize) {
        const batch = preordersToFetch.slice(i, i + batchSize);
        await Promise.all(batch.map(id => fetchPreOrderItems(id)));
      }
    };
    
    fetchAllItems();
  }, [preOrders, fetchPreOrderItems]);

  // Set up real-time subscription for reminders
  useEffect(() => {
    const remindersSubscription = supabase
      .channel('reminders-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'reminders' 
      }, () => {
        fetchReminders();
      })
      .subscribe();
      
    return () => {
      remindersSubscription.unsubscribe();
    };
  }, [fetchReminders]);

  // Define table columns
  const columns = [
    {
      header: 'Select',
      accessor: (row: PreOrderWithDetails) => (
        <div className="px-1" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={selectedOrders.has(row.preorder_id)}
            onChange={(e) => handleSelectOrder(row.preorder_id, e.target.checked)}
            className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
          />
        </div>
      ),
      id: 'selection',
      width: '40px',
    },
    {
      header: 'Order ID',
      accessor: (row: PreOrderWithDetails) => row.preorder_id,
      sortable: true,
      mobileLabel: 'ID',
    },
    {
      header: 'Customer',
      accessor: (row: PreOrderWithDetails) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-white">
            {row.customer?.name || 'Unknown'}
          </div>
          {row.customer?.instagram_id && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              @{row.customer.instagram_id}
            </div>
          )}
        </div>
      ),
      sortable: true,
      mobileLabel: 'Customer',
    },
    {
      header: 'Flight',
      accessor: (row: PreOrderWithDetails) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-white">
            {row.flight?.flight_name || 'Unknown'}
          </div>
          {row.flight?.shipment_date && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {formatDate(row.flight.shipment_date)}
            </div>
          )}
        </div>
      ),
      sortable: true,
      mobileLabel: 'Flight',
    },
    {
      header: 'Status',
      accessor: (row: PreOrderWithDetails) => (
        <span className={`status-badge ${
          row.order_status === 'pending' ? 'status-badge-pending' :
          row.order_status === 'ordered' ? 'status-badge-info' :
          row.order_status === 'shipped' ? 'status-badge-info' :
          row.order_status === 'delivered' ? 'status-badge-success' :
          'status-badge-error'
        }`}>
          {formatStatus(row.order_status)}
        </span>
      ),
      sortable: true,
      mobileLabel: 'Status',
    },
    {
      header: 'Product Details',
      accessor: (row: PreOrderWithDetails) => {
        // Check if we have items directly in the row
        if (row.items && row.items.length > 0) {
          const items = row.items;
          return (
            <div className="max-w-xs">
              <div className="space-y-1">
                {items.slice(0, 2).map((item, i) => (
                  <div key={i} className="flex items-center text-sm">
                    <span className="font-medium truncate text-gray-900 dark:text-white">{item.product_name}</span>
                    <span className="mx-1 text-gray-400 dark:text-gray-500">•</span>
                    <span className="text-gray-600 dark:text-gray-300">
                      {item.quantity} × {formatCurrency(item.price)}
                    </span>
                  </div>
                ))}
                {items.length > 2 && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    +{items.length - 2} more items
                  </div>
                )}
              </div>
            </div>
          );
        }
        
        // Check if we have fetched items for this preorder
        if (preOrderItems[row.preorder_id]) {
          const items = preOrderItems[row.preorder_id];
          if (items.length === 0) {
            return <span className="text-gray-500 dark:text-gray-400 italic">No products</span>;
          }
          
          return (
            <div className="max-w-xs">
              <div className="space-y-1">
                {items.slice(0, 2).map((item, i) => (
                  <div key={i} className="flex items-center text-sm">
                    <span className="font-medium truncate text-gray-900 dark:text-white">{item.product_name}</span>
                    <span className="mx-1 text-gray-400 dark:text-gray-500">•</span>
                    <span className="text-gray-600 dark:text-gray-300">
                      {item.quantity} × {formatCurrency(item.price)}
                    </span>
                  </div>
                ))}
                {items.length > 2 && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    +{items.length - 2} more items
                  </div>
                )}
              </div>
            </div>
          );
        }
        
        // If we're loading items for this preorder
        if (loadingItems.has(row.preorder_id)) {
          return <span className="text-gray-500 dark:text-gray-400">Loading items...</span>;
        }
        
        // If we haven't started loading items yet, trigger the load
        fetchPreOrderItems(row.preorder_id);
        return <span className="text-gray-500 dark:text-gray-400">Loading items...</span>;
      },
      sortable: false,
      mobileLabel: 'Products',
    },
    {
      header: 'Payment',
      accessor: (row: PreOrderWithDetails) => (
        <div className="px-4 py-3 text-sm">
          <div className="flex flex-col">
            <span className="font-medium text-gray-900 dark:text-white">
              {formatCurrency(row.subtotal)}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {row.items && row.items.length > 0 ? `${row.items.length} items` : 'No items'}
            </span>
          </div>
        </div>
      ),
      sortable: true,
      mobileLabel: 'Payment',
    },
    {
      header: 'Reminders',
      accessor: (row: PreOrderWithDetails) => {
        const reminders = preOrderReminders[row.preorder_id] || [];
        return (
          <div className="flex items-center">
            {reminders.length > 0 ? (
              <div className="flex items-center">
                <span className="inline-flex items-center justify-center w-6 h-6 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-300 rounded-full mr-2">
                  {reminders.length}
                </span>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {reminders[0].title.length > 20 
                      ? `${reminders[0].title.substring(0, 20)}...` 
                      : reminders[0].title}
                  </span>
                  {reminders.length > 1 && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      +{reminders.length - 1} more
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <span className="text-gray-500 dark:text-gray-400 italic">No reminders</span>
            )}
          </div>
        );
      },
      sortable: false,
      mobileLabel: 'Reminders',
    },
    {
      header: 'Created At',
      accessor: (row: PreOrderWithDetails) => formatDate(row.created_at),
      sortable: true,
      mobileLabel: 'Date',
    },
    {
      header: 'Actions',
      accessor: (row: PreOrderWithDetails) => (
        <div className="flex justify-end space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleEditPreOrder(row);
            }}
            className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 mr-3"
          >
            Edit
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDeletePreOrder(row);
            }}
            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
          >
            Delete
          </button>
        </div>
      ),
      className: "text-right",
      mobileLabel: 'Actions',
    },
  ];

  // Add select all checkbox in the table header
  const renderTableHeader = () => (
    <div className="flex items-center gap-2 mb-4">
      <div className="px-1">
        <input
          type="checkbox"
          checked={selectedOrders.size > 0 && selectedOrders.size === getFilteredPreOrders().length}
          ref={(input) => {
            if (input) {
              input.indeterminate = selectedOrders.size > 0 && selectedOrders.size < getFilteredPreOrders().length;
            }
          }}
          onChange={(e) => handleSelectAll(e.target.checked)}
          className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
        />
      </div>
      <span className="text-sm text-gray-500">
        {selectedOrders.size > 0 ? `${selectedOrders.size} selected` : 'Select all'}
      </span>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-10 max-w-7xl">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pre-Orders Management</h1>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleExport}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              {selectedOrders.size > 0 ? `Export (${selectedOrders.size} selected)` : 'Export All'}
            </Button>
            <Button
              onClick={handleAddPreOrder}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              <span>Add Pre-Order</span>
            </Button>
          </div>
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700 transition-all hover:shadow-md">
            <div className="flex items-center">
              <div className="p-2 rounded-full bg-indigo-100 dark:bg-indigo-900">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Pre-Orders</h3>
                <p className="text-2xl font-semibold">{totalItems}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700 transition-all hover:shadow-md">
            <div className="flex items-center">
              <div className="p-2 rounded-full bg-yellow-100 dark:bg-yellow-900">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Pending Orders</h3>
                <p className="text-2xl font-semibold">{preOrders.filter(po => po.order_status === 'pending').length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700 transition-all hover:shadow-md">
            <div className="flex items-center">
              <div className="p-2 rounded-full bg-green-100 dark:bg-green-900">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Completed Orders</h3>
                <p className="text-2xl font-semibold">{preOrders.filter(po => po.order_status === 'delivered').length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700 transition-all hover:shadow-md">
            <div className="flex items-center">
              <div className="p-2 rounded-full bg-red-100 dark:bg-red-900">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Cancelled Orders</h3>
                <p className="text-2xl font-semibold">{preOrders.filter(po => po.order_status === 'cancelled').length}</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border border-gray-100 dark:border-gray-700">
          <div className="flex flex-col md:flex-row gap-4">
            <div>
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
                  placeholder="Search products, customers, or flights..."
                  className="focus:ring-brand focus:border-brand block w-full pl-10 sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md h-10"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="dateRange" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Date Range
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Calendar className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="date"
                  id="dateRange"
                  value={dateRange}
                  onChange={(e) => {
                    const date = e.target.value;
                    if (date) {
                      const formattedDate = new Date(date).toISOString().split('T')[0];
                      setDateRange(formattedDate);
                    } else {
                      setDateRange('');
                    }
                  }}
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
                  onChange={(e) => setStatusFilter(e.target.value as OrderStatus | '')}
                  className="focus:ring-brand focus:border-brand block w-full pl-10 sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md h-10 appearance-none"
                >
                  <option value="">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="ordered">Ordered</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="Out_of_stock">Out of Stock</option>
                </select>
              </div>
            </div>
            
            <div>
              <label htmlFor="flightFilter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Flight
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Package className="h-5 w-5 text-gray-400" />
                </div>
                <select
                  id="flightFilter"
                  value={flightFilter}
                  onChange={(e) => setFlightFilter(e.target.value)}
                  className="focus:ring-brand focus:border-brand block w-full pl-10 sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md h-10 appearance-none"
                >
                  <option value="">All Flights</option>
                  {flights.map((flight) => (
                    <option key={flight.flight_id} value={flight.flight_id}>
                      {flight.flight_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => loadData()}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-200"
            >
              Apply Filters
            </button>
          </div>
        </div>
        
        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 p-4 rounded-md">
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
              Pre-Orders List
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
          
          {renderTableHeader()}
          
          <ResponsiveTable
            data={getPaginatedData()}
            columns={columns}
            keyField="preorder_id"
            onRowClick={handleViewPreOrder}
            isLoading={loading}
            emptyMessage="No pre-orders found. Try adjusting your filters."
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
              if (row.order_status === 'cancelled') return 'bg-red-50/50 dark:bg-red-900/10';
              if (row.order_status === 'delivered') return 'bg-green-50/50 dark:bg-green-900/10';
              return '';
            }}
          />
        </motion.div>
      </div>
      
      {/* Modals */}
      <PreOrderDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        preOrder={selectedPreOrder}
        onStatusChange={handleStatusChange}
      />
      
      <PreOrderAddEditModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        preOrder={null}
        onSave={(preOrder, items, reminderData) => handleSavePreOrder(preOrder, items, reminderData)}
        isNew={true}
        customers={customers}
        flights={flights}
        isSubmitting={isSubmitting}
      />
      
      <PreOrderAddEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        preOrder={selectedPreOrder}
        onSave={(preOrder, items, reminderData) => handleSavePreOrder(preOrder, items, reminderData)}
        isNew={false}
        customers={customers}
        flights={flights}
        isSubmitting={isSubmitting}
      />
      
      <PreOrderDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        preOrder={selectedPreOrder}
        onDelete={handleDeleteConfirm}
      />
      
      {/* Mobile Add Button */}
      <div className="md:hidden">
        <button
          onClick={handleAddPreOrder}
          className="fab"
          aria-label="Add Pre-Order"
        >
          <Plus className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
};

export default PreOrdersManagementPage; 