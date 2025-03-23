'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { PreOrderWithDetails, OrderStatus, Flight, Customer, Reminder, BankAccount } from '@/lib/types';
import { formatDate, formatCurrency, formatStatus, exportPreOrdersToCSV } from '@/lib/utils';
import { getPreOrdersWithPagination, fetchFlights, getCustomers } from '@/lib/api';
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
  
  // State for pagination (server-side)
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [itemsPerPage] = useState(20);
  
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
  
  // Add reminders state
  const [preOrderReminders, setPreOrderReminders] = useState<Record<string, Reminder[]>>({});
  
  // State for preorder items
  const [preOrderItems, setPreOrderItems] = useState<Record<string, any[]>>({});
  const [loadingItems, setLoadingItems] = useState<Set<string>>(new Set());
  
  // Add pendingChanges state to track inline edits
  const [pendingChanges, setPendingChanges] = useState<{
    statuses: Record<string, OrderStatus>,
    flights: Record<string, string>,
  }>({
    statuses: {},
    flights: {},
  });
  
  // Add hasChanges helper
  const hasChanges = Object.keys(pendingChanges.statuses).length > 0 || 
                    Object.keys(pendingChanges.flights).length > 0;
  
  // Add state for bulk edit
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<OrderStatus | ''>('');
  const [bulkFlight, setBulkFlight] = useState('');
  
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
      loadFlights();
      loadCustomers();
    };
    
    checkUser();
  }, [router]);
  
  useEffect(() => {
    // Get status from URL parameters
    const statusFromUrl = searchParams.get('status');
    if (statusFromUrl) {
      setStatusFilter(statusFromUrl);
      // Reload with filter
      loadData(1, statusFromUrl);
    }
  }, [searchParams]);
  
  // Load pre-orders data with pagination
  const loadData = useCallback(async (page: number, status: string = statusFilter) => {
    try {
      setLoading(true);
      setError(null);

      const response = await getPreOrdersWithPagination(page, itemsPerPage);
      if (response.error) {
        throw response.error;
      }
      
      if (response.data) {
        setPreOrders(response.data.preOrders);
        setTotalItems(response.data.count);
        setTotalPages(Math.ceil(response.data.count / itemsPerPage));
        setCurrentPage(page);
      }

      // Fetch additional data needed
      fetchReminders();
    } catch (error) {
      console.error('Error loading pre-orders:', error);
      setError(error instanceof Error ? error.message : 'Failed to load pre-orders');
    } finally {
      setLoading(false);
    }
  }, [itemsPerPage, statusFilter]);

  // Load flights for filters
  const loadFlights = async () => {
    try {
      const flightsData = await fetchFlights();
      setFlights(flightsData);
    } catch (error) {
      console.error('Error loading flights:', error);
    }
  };

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
  
  // Handle page change
  const handlePageChange = (page: number) => {
    loadData(page);
  };
  
  // Fetch reminders for all preorders
  const fetchReminders = useCallback(async () => {
    try {
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
    }
  }, []);
  
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
  
  // Handle saving pre-order
  const handleSavePreOrder = async (preOrder: PreOrderWithDetails & { newProductsTotal?: number, newProductsAdvance?: number }, productItems: any[], bankAccount: BankAccount, reminderData?: any) => {
    setIsSubmitting(true);
    console.log('Saving pre-order:', preOrder);
    
    try {
      const { preorder_id } = preOrder;
      // Make sure we don't have an empty string for preorder_id
      const isNewPreOrder = !preorder_id || preorder_id === '';
      
      // Format the data for insertion/update - explicitly remove properties we don't want to send
      const { customer, flight, newProductsTotal, newProductsAdvance, items, preorder_id: _, total_amount, remaining_amount, ...preOrderData } = preOrder;
      
      // Track the ID of the saved preorder (either existing or newly created)
      let savedPreOrderId = preorder_id;
      
      // Calculate or update remaining amount
      const total = (preOrderData.subtotal || 0) + (preOrderData.delivery_charges || 0);
      // Only total_amount needs to be calculated here, remaining_amount is now calculated by the database trigger
      
      console.log('Formatted pre-order data:', preOrderData);
      
      if (isNewPreOrder) {
        // Insert new pre-order - no need to calculate total_amount and remaining_amount or provide preorder_id
        // The database has a trigger that will generate a preorder_id if not provided
        const { data: insertedPreOrder, error: insertError } = await supabase
          .from('preorders')
          .insert({
            customer_id: preOrderData.customer_id,
            flight_id: preOrderData.flight_id || null, // Ensure null instead of empty string
            order_status: preOrderData.order_status,
            subtotal: preOrderData.subtotal || 0,
            delivery_charges: preOrderData.delivery_charges || 0,
            // preorder_id will be generated by the database trigger
            // total_amount and remaining_amount will be calculated by the database trigger
          })
          .select();
        
        if (insertError) {
          console.error('Error inserting pre-order:', insertError);
          throw new Error(insertError.message || 'Failed to save pre-order');
        }
        
        if (!insertedPreOrder?.[0]?.preorder_id) {
          throw new Error('No preorder_id returned from insert operation');
        }
        
        savedPreOrderId = insertedPreOrder[0].preorder_id;
        console.log('New pre-order created with ID:', savedPreOrderId);
      } else {
        // Update existing pre-order - only send the user-editable fields
        const updateData = {
          customer_id: preOrderData.customer_id,
          flight_id: preOrderData.flight_id || null, // Ensure null instead of empty string
          order_status: preOrderData.order_status,
          subtotal: preOrderData.subtotal || 0,
          delivery_charges: preOrderData.delivery_charges || 0
          // total_amount and remaining_amount will be calculated by the database trigger
        };
        
        // Update existing pre-order with cleaned data - using preorder_id which we've already verified is valid
        const { data: updatedPreOrder, error: updateError } = await supabase
          .from('preorders')
          .update(updateData)
          .eq('preorder_id', savedPreOrderId)
          .select();
        
        if (updateError) {
          console.error('Error updating pre-order:', updateError);
          throw new Error(updateError.message || 'Failed to update pre-order');
        }
        
        console.log('Pre-order updated:', updatedPreOrder);
      }
      
      // Save product items if there are any
      if (productItems && productItems.length > 0) {
        // Format the product items
        const formattedItems = productItems
          .filter(item => item.product_name.trim() !== '') // Filter out empty products
          .map(item => ({
            preorder_id: savedPreOrderId,
            preorder_item_id: item.id, // Use the id from ProductItem as preorder_item_id
            product_name: item.product_name,
            shade: item.shade || '',
            size: item.size || '',
            link: item.link || '',
            quantity: item.quantity,
            price: item.price,
            advance_payment: item.advance_payment || 0 // Include advance_payment in the product items
          }));
        
        console.log('Saving product items:', formattedItems);
        
        // If editing, update existing items instead of deleting and recreating
        if (!isNewPreOrder) {
          console.log('Updating existing product items for preorder:', savedPreOrderId);
          
          // Get existing items to determine which to update, delete, or insert
          const { data: existingItems, error: fetchError } = await supabase
            .from('preorder_items')
            .select('preorder_item_id, product_name')
            .eq('preorder_id', savedPreOrderId);
          
          if (fetchError) {
            console.error('Error fetching existing product items:', fetchError);
            throw new Error(fetchError.message || 'Failed to fetch existing product items');
          }
          
          // Map existing items by their ID for easy lookup
          const existingItemsMap = new Map();
          existingItems?.forEach(item => {
            existingItemsMap.set(item.preorder_item_id, item);
          });
          
          // Track items to update, insert, or delete
          const itemsToUpdate = [];
          const itemsToInsert = [];
          const processedIds = new Set();
          
          // Determine which items to update or insert
          for (const item of formattedItems) {
            // If item has a preorder_item_id and it exists in our map, update it
            if (item.preorder_item_id && existingItemsMap.has(item.preorder_item_id)) {
              itemsToUpdate.push({
                preorder_item_id: item.preorder_item_id,
                product_name: item.product_name,
                shade: item.shade,
                size: item.size,
                link: item.link,
                quantity: item.quantity,
                price: item.price,
                advance_payment: item.advance_payment
              });
              processedIds.add(item.preorder_item_id);
            } else {
              // New item, insert it
              itemsToInsert.push(item);
            }
          }
          
          // Determine which items to delete (those in existingItemsMap not processed)
          const itemsToDelete = Array.from(existingItemsMap.keys())
            .filter(id => !processedIds.has(id));
          
          // Process updates
          if (itemsToUpdate.length > 0) {
            for (const item of itemsToUpdate) {
              const { error: updateError } = await supabase
                .from('preorder_items')
                .update(item)
                .eq('preorder_item_id', item.preorder_item_id);
              
              if (updateError) {
                console.error('Error updating product item:', updateError);
                throw new Error(updateError.message || 'Failed to update product item');
              }
            }
          }
          
          // Process deletes
          if (itemsToDelete.length > 0) {
            const { error: deleteError } = await supabase
              .from('preorder_items')
              .delete()
              .in('preorder_item_id', itemsToDelete);
            
            if (deleteError) {
              console.error('Error deleting product items:', deleteError);
              throw new Error(deleteError.message || 'Failed to delete product items');
            }
          }
          
          // Process inserts
          if (itemsToInsert.length > 0) {
            const { error: insertError } = await supabase
              .from('preorder_items')
              .insert(itemsToInsert);
            
            if (insertError) {
              console.error('Error inserting product items:', insertError);
              throw new Error(insertError.message || 'Failed to insert product items');
            }
          }
        } else {
          // For new pre-orders, just insert all items
          const { error: insertError } = await supabase
            .from('preorder_items')
            .insert(formattedItems);
          
          if (insertError) {
            console.error('Error inserting product items:', insertError);
            throw new Error(insertError.message || 'Failed to save product items');
          }
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
          console.log('Reminder created successfully for preorder_id:', savedPreOrderId);
          toast.success('Reminder created successfully');
        }
      }
      
      // Refresh pre-order list
      await loadData(currentPage);
      
      // Create payment records based on whether it's a new pre-order or editing an existing one
      // NOTE: We're completely removing this manual payment creation code since the database trigger
      // will automatically create payments for products with advance payments in both
      // new pre-orders and edited pre-orders
      const shouldCreatePayment = false; // Always disable manual payment creation since the trigger handles it
      console.log('Should create payment? No - using database trigger for all payment creation');

      // For new pre-orders and edited pre-orders, the database trigger will handle payments automatically
      if (shouldCreatePayment) {
        // This code block will never execute now, but we're keeping it commented for reference
        /*
        try {
          // Set the payment amount based on the new products' advance payments
          let paymentAmount = preOrder.newProductsAdvance || 0;
          
          console.log('Creating payment for amount:', paymentAmount, 'for preorder_id:', savedPreOrderId);
          console.log('Payment customer_id:', preOrderData.customer_id);
          
          // Get the current user's ID for the payment record
          const { data: { session } } = await supabase.auth.getSession();
          
          // Create a payment record
          const paymentData = {
            customer_id: preOrderData.customer_id,
            preorder_id: savedPreOrderId,
            amount: paymentAmount,
            payment_purpose: 'advance',
            bank_account: bankAccount,
            tally: false,
            payment_date: new Date().toISOString().split('T')[0]
          };
          
          console.log('Creating payment record:', paymentData);
          
          // Insert the payment
          const { data: paymentResult, error: paymentError } = await supabase
            .from('payments')
            .insert([paymentData])
            .select();
          
          if (paymentError) {
            console.error('Error creating payment record:', paymentError);
            toast.error(`Pre-order saved but failed to create payment record: ${paymentError.message}`);
          } else {
            console.log('Payment record created successfully:', paymentResult);
            toast.success('New products advance payment record created automatically');
          }
        } catch (paymentErr: any) {
          console.error('Error in payment creation:', paymentErr);
          toast.error('Pre-order saved but failed to create payment record');
        }
        */
      }
      
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
      await loadData(currentPage);
      
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
      toast.success(`Pre-order status updated to ${newStatus}`);
      
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
  
  const displayedPreOrders = preOrders.slice(0, itemsPerPage);

  // Handle selection
  const handleSelectOrder = (orderId: string, isSelected: boolean) => {
    setSelectedOrders(prev => {
      const newSelection = new Set(prev);
      if (isSelected) {
        newSelection.add(orderId);
      } else {
        newSelection.delete(orderId);
      }
      
      // Show/hide bulk actions based on selection
      setShowBulkActions(newSelection.size > 0);
      
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
      
      // Apply status filter
      if (statusFilter && preOrder.order_status !== statusFilter) {
        return false;
      }
      
      // Apply flight filter
      if (flightFilter && preOrder.flight?.flight_id !== flightFilter) {
        return false;
      }
      
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

  // Get paginated data with indexes
  const getPaginatedData = () => {
    const filtered = getFilteredPreOrders();
    const paginatedItems = filtered.slice(0, itemsPerPage);
    
    // Add index for easy serial number calculation
    return paginatedItems.map((item, index) => ({
      ...item,
      rowIndex: index // This adds the rowIndex property to each item
    }));
  };

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
  
  // Fetch items for visible preorders
  useEffect(() => {
    const fetchVisibleItems = async () => {
      if (!preOrders.length) return;
      
      // Get the current visible pre-orders based on pagination
      const visiblePreOrders = getPaginatedData();
      
      // Fetch items for all visible preorders that don't have items
      const preordersToFetch = visiblePreOrders
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
    
    fetchVisibleItems();
  }, [preOrders, currentPage, searchQuery, statusFilter, flightFilter, sortColumn, sortDirection, fetchPreOrderItems, preOrderItems, loadingItems]);

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
      width: '30px',
      className: "w-[30px] px-2",
    },
    {
      header: 'Sr #',
      accessor: (row: any) => {
        return (
          <div className="font-medium text-gray-900 dark:text-white">
            {row.rowIndex + 1}
          </div>
        );
      },
      id: 'serialNumber',
      width: '40px',
      mobileLabel: '#',
      className: "w-[40px] px-2",
    },
    {
      header: 'Order ID',
      accessor: (row: PreOrderWithDetails) => row.preorder_id,
      sortable: true,
      mobileLabel: 'ID',
      width: '80px',
      className: "w-[80px]",
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
      width: 'auto',
    },
    {
      header: 'Flight',
      accessor: (row: PreOrderWithDetails) => {
        const hasFlightChange = pendingChanges.flights[row.preorder_id] !== undefined;
        const currentFlightId = hasFlightChange ? pendingChanges.flights[row.preorder_id] : row.flight?.flight_id || '';
        const currentFlight = flights.find(f => f.flight_id === currentFlightId);
        
        return (
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <select
              value={currentFlightId}
              onChange={(e) => handleInlineFlightChange(row.preorder_id, e.target.value)}
              className={`block w-full py-2 text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md cursor-pointer ${
                hasFlightChange ? 'changed-item' : ''
              }`}
            >
              <option value="">No Flight</option>
              {flights.map((flight) => (
                <option key={flight.flight_id} value={flight.flight_id}>
                  {flight.flight_name}
                </option>
              ))}
            </select>
            
            {/* Only show the flight date, not duplicate flight name */}
            {currentFlight?.shipment_date && (
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
                {formatDate(currentFlight.shipment_date)}
              </div>
            )}
          </div>
        );
      },
      sortable: true,
      mobileLabel: 'Flight',
      width: '150px',
      className: "min-w-[150px] max-w-[180px]",
    },
    {
      header: 'Status',
      accessor: (row: PreOrderWithDetails) => {
        const hasStatusChange = pendingChanges.statuses[row.preorder_id] !== undefined;
        const currentStatus = hasStatusChange ? pendingChanges.statuses[row.preorder_id] : row.order_status;
        
        // Helper function to get display name for status
        const getStatusDisplayName = (status: string) => {
          switch(status) {
            case 'pending': return 'Pending';
            case 'ordered': return 'Ordered';
            case 'shipped': return 'Shipped';
            case 'delivered': return 'Delivered';
            case 'cancelled': return 'Cancelled';
            case 'Out_of_stock': return 'Out of Stock';
            default: return status;
          }
        };
        
        return (
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <select
              value={currentStatus}
              onChange={(e) => handleInlineStatusChange(row.preorder_id, e.target.value as OrderStatus)}
              className={`w-full py-2 text-sm font-medium rounded-md cursor-pointer ${
                hasStatusChange ? 'changed-item' : ''
              } ${
                currentStatus === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
                currentStatus === 'ordered' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
                currentStatus === 'shipped' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' :
                currentStatus === 'delivered' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                currentStatus === 'cancelled' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
                currentStatus === 'Out_of_stock' ? 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300' :
                'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
              }`}
            >
              <option value="pending">{getStatusDisplayName('pending')}</option>
              <option value="ordered">{getStatusDisplayName('ordered')}</option>
              <option value="shipped">{getStatusDisplayName('shipped')}</option>
              <option value="delivered">{getStatusDisplayName('delivered')}</option>
              <option value="cancelled">{getStatusDisplayName('cancelled')}</option>
              <option value="Out_of_stock">{getStatusDisplayName('Out_of_stock')}</option>
            </select>
          </div>
        );
      },
      sortable: true,
      mobileLabel: 'Status',
      width: '120px',
      className: "min-w-[120px] max-w-[120px]",
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
      width: '140px',
      className: "min-w-[140px]",
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
        
        // Don't call fetchPreOrderItems directly in render - use useEffect instead
        return <span className="text-gray-500 dark:text-gray-400">Loading items...</span>;
      },
      sortable: false,
      mobileLabel: 'Products',
      width: 'auto',
      className: "min-w-[200px]",
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
      width: '100px',
      className: "min-w-[100px] max-w-[120px]",
    },
    {
      header: 'Created At',
      accessor: (row: PreOrderWithDetails) => formatDate(row.created_at),
      sortable: true,
      mobileLabel: 'Date',
      width: '100px',
      className: "min-w-[100px] max-w-[120px]",
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
      className: "text-right w-[100px]",
      mobileLabel: 'Actions',
      width: '100px',
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

  // Handle inline status change
  const handleInlineStatusChange = (preOrderId: string, newStatus: OrderStatus) => {
    setPendingChanges(prev => ({
      ...prev,
      statuses: {
        ...prev.statuses,
        [preOrderId]: newStatus
      }
    }));
  };

  // Handle inline flight change
  const handleInlineFlightChange = (preOrderId: string, newFlightId: string) => {
    setPendingChanges(prev => ({
      ...prev,
      flights: {
        ...prev.flights,
        [preOrderId]: newFlightId
      }
    }));
  };

  // Apply pending changes
  const applyChanges = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Apply status changes
      const statusPromises = Object.entries(pendingChanges.statuses).map(
        ([preOrderId, status]) => handleStatusChange(preOrderId, status)
      );
      
      // Apply flight changes
      const flightPromises = Object.entries(pendingChanges.flights).map(
        ([preOrderId, flightId]) => {
          return supabase
            .from('preorders')
            .update({ flight_id: flightId })
            .eq('preorder_id', preOrderId);
        }
      );
      
      await Promise.all([...statusPromises, ...flightPromises]);
      
      // Clear pending changes
      setPendingChanges({
        statuses: {},
        flights: {},
      });
      
      // Refresh data
      await loadData(currentPage);
      
      toast.success('Changes applied successfully');
    } catch (err) {
      console.error('Error applying changes:', err);
      setError('Failed to apply changes');
      toast.error('Failed to apply changes');
    } finally {
      setLoading(false);
    }
  };

  // Apply bulk changes to selected orders
  const applyBulkChanges = async () => {
    if (selectedOrders.size === 0) {
      toast.error('No orders selected');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const promises = [];
      
      // Apply bulk status if selected
      if (bulkStatus) {
        for (const preOrderId of selectedOrders) {
          promises.push(handleStatusChange(preOrderId, bulkStatus));
        }
      }
      
      // Apply bulk flight if selected
      if (bulkFlight) {
        const { error } = await supabase
          .from('preorders')
          .update({ flight_id: bulkFlight })
          .in('preorder_id', Array.from(selectedOrders));
          
        if (error) throw error;
      }
      
      await Promise.all(promises);
      
      // Clear selections
      setBulkStatus('');
      setBulkFlight('');
      setShowBulkActions(false);
      
      // Refresh data
      await loadData(currentPage);
      
      toast.success('Bulk changes applied successfully');
    } catch (err) {
      console.error('Error applying bulk changes:', err);
      setError('Failed to apply bulk changes');
      toast.error('Failed to apply bulk changes');
    } finally {
      setLoading(false);
    }
  };

  // Bulk delete selected orders
  const bulkDeleteOrders = async () => {
    if (selectedOrders.size === 0) {
      toast.error('No orders selected');
      return;
    }
    
    if (!confirm(`Are you sure you want to delete ${selectedOrders.size} order(s)?`)) {
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const { error } = await supabase
        .from('preorders')
        .delete()
        .in('preorder_id', Array.from(selectedOrders));
        
      if (error) throw error;
      
      // Clear selections
      setSelectedOrders(new Set());
      setShowBulkActions(false);
      
      // Refresh data
      await loadData(currentPage);
      
      toast.success('Selected orders deleted successfully');
    } catch (err) {
      console.error('Error deleting orders:', err);
      setError('Failed to delete orders');
      toast.error('Failed to delete orders');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-10 max-w-7xl">
      {/* Add inline styles */}
      <style jsx>{`
        .status-select {
          appearance: none;
          padding: 0.5rem 1.5rem 0.5rem 0.75rem;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          width: 100%;
        }
        
        select {
          appearance: none;
          background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
          background-position: right 0.5rem center;
          background-repeat: no-repeat;
          background-size: 1.5em 1.5em;
          padding-right: 2.5rem;
          width: 100%;
        }
        
        /* Fix for Edge browser */
        select::-ms-expand {
          display: none;
        }
        
        /* Style for changed items */
        .changed-item {
          border: 1px solid #9333ea !important;
          box-shadow: 0 0 0 1px rgba(147, 51, 234, 0.2);
          animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(147, 51, 234, 0.4);
          }
          70% {
            box-shadow: 0 0 0 5px rgba(147, 51, 234, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(147, 51, 234, 0);
          }
        }

        /* Add some mobile-specific styling */
        @media (max-width: 768px) {
          .mobile-card select {
            width: 100%;
            margin-top: 0.25rem;
            padding: 0.5rem;
          }
          
          .interactive-content {
            display: block;
            width: 100%;
            padding: 0.25rem;
            border-radius: 0.25rem;
            background-color: rgba(124, 58, 237, 0.05);
          }
        }
      `}</style>
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
        
        {/* Pending Changes Bar */}
        {hasChanges && (
          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 p-4 rounded-lg flex justify-between items-center">
            <div className="text-sm font-medium text-blue-800 dark:text-blue-200">
              You have unsaved changes
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPendingChanges({ statuses: {}, flights: {} })}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={applyChanges}
              >
                Apply Changes
              </Button>
            </div>
          </div>
        )}
        
        {/* Bulk Actions Bar */}
        {showBulkActions && (
          <div className="bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800 p-4 rounded-lg">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm font-medium text-purple-800 dark:text-purple-200">
                {selectedOrders.size} order{selectedOrders.size !== 1 ? 's' : ''} selected
              </div>
              <div className="flex flex-wrap gap-3 items-center">
                <select
                  value={bulkStatus}
                  onChange={(e) => setBulkStatus(e.target.value as OrderStatus | '')}
                  className="text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                >
                  <option value="">Change Status...</option>
                  <option value="pending">Pending</option>
                  <option value="ordered">Ordered</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="Out_of_stock">Out of Stock</option>
                </select>
                
                <select
                  value={bulkFlight}
                  onChange={(e) => setBulkFlight(e.target.value)}
                  className="text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                >
                  <option value="">Change Flight...</option>
                  <option value="">No Flight</option>
                  {flights.map((flight) => (
                    <option key={flight.flight_id} value={flight.flight_id}>
                      {flight.flight_name}
                    </option>
                  ))}
                </select>
                
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={applyBulkChanges}
                  disabled={!bulkStatus && !bulkFlight}
                >
                  Apply
                </Button>
                
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={bulkDeleteOrders}
                >
                  Delete
                </Button>
              </div>
            </div>
          </div>
        )}
        
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
                  onChange={(e) => {
                    // Convert to OrderStatus type or empty string
                    setStatusFilter(e.target.value);
                    // Clear previous results
                    setCurrentPage(1);
                  }}
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
            
            {/* Add a Refresh Data button */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Refresh Data
              </label>
              <button
                onClick={() => loadData(currentPage)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 h-10"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh All
              </button>
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
                  onChange={(e) => {
                    setFlightFilter(e.target.value);
                    // Clear previous results
                    setCurrentPage(1);
                  }}
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
              onClick={() => {
                // Apply all filters without reloading data
                setCurrentPage(1); // Reset to first page
                
                // This will trigger useEffect to update filtered data
                // No need to reload data from server as that would reset any unsaved changes
              }}
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
              onClick={() => loadData(currentPage)}
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
              pageSize: itemsPerPage,
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
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-4">
            <div className="text-sm text-gray-700">
              Showing <span className="font-medium">{preOrders.length}</span> of{' '}
              <span className="font-medium">{totalItems}</span> pre-orders
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
        onSave={(preOrder, items, bankAccount, reminderData) => handleSavePreOrder(preOrder, items, bankAccount, reminderData)}
        isNew={true}
        customers={customers}
        flights={flights}
        isSubmitting={isSubmitting}
      />
      
      <PreOrderAddEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        preOrder={selectedPreOrder}
        onSave={(preOrder, items, bankAccount, reminderData) => handleSavePreOrder(preOrder, items, bankAccount, reminderData)}
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