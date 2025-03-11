'use client';

import React, { useState, useEffect } from 'react';
import { PreOrder, PreOrderWithDetails, Customer, Flight, OrderStatus, PreOrderItem, ReminderStatus, ReminderPriority, Reminder } from '@/lib/types';
import { formatDate, cn } from '@/lib/utils';
import { fetchFlights } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { ShoppingBag, X, User, Plane, Activity, Plus, Trash2, Hash, Minus, Package, Truck, Calendar, Banknote, ChevronsUpDown, Check, Bell, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { v4 as uuidv4 } from 'uuid';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

// Define a product item structure
interface ProductItem {
  id: string;
  product_name: string;
  shade: string;
  size: string;
  link: string;
  quantity: number;
  price: number;
}

// Define a reminder structure
interface ReminderData {
  title: string;
  description: string;
  due_date: string;
  priority: ReminderPriority;
  status: ReminderStatus;
}

interface PreOrderAddEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  preOrder: PreOrderWithDetails | null;
  onSave: (preOrder: PreOrderWithDetails, items: ProductItem[], reminderData?: ReminderData) => void;
  isNew: boolean;
  customers: Customer[];
  flights: Flight[];
  isSubmitting: boolean;
}

const PreOrderAddEditModal: React.FC<PreOrderAddEditModalProps> = ({
  isOpen,
  onClose,
  preOrder,
  onSave,
  isNew,
  customers,
  flights,
  isSubmitting,
}) => {
  // Initialize form state
  const [formData, setFormData] = useState<Omit<PreOrder, 'total_amount'> & { customer?: Customer; flight?: Flight }>({
    preorder_id: '',
    customer_id: '',
    flight_id: '',
    order_status: 'pending',
    subtotal: 0,
    advance_payment: 0,
    cod_amount: 0,
    remaining_amount: 0,
    created_at: new Date().toISOString(),
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [flightSearchQuery, setFlightSearchQuery] = useState('');
  const [searchedCustomers, setSearchedCustomers] = useState<Customer[]>([]);
  const [isSearchingCustomers, setIsSearchingCustomers] = useState(false);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [isGeneratingId, setIsGeneratingId] = useState(false);
  const [editingQuantityIds, setEditingQuantityIds] = useState<Set<string>>(new Set());
  const [editingFields, setEditingFields] = useState<Record<string, boolean>>({});

  // Customer search state
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Flight search state
  const [showFlightDropdown, setShowFlightDropdown] = useState(false);
  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null);
  const [availableFlights, setAvailableFlights] = useState<Flight[]>([]);

  // Filter flights based on search query
  const filteredFlights = flightSearchQuery
    ? availableFlights.filter(flight => 
        flight.flight_name.toLowerCase().includes(flightSearchQuery.toLowerCase()) ||
        formatDate(flight.shipment_date).toLowerCase().includes(flightSearchQuery.toLowerCase())
      )
    : availableFlights;
  
  // State for flight search
  const [isSearchingFlights, setIsSearchingFlights] = useState(false);
  
  // Use filteredFlights directly instead of maintaining a separate searchedFlights state
  const searchedFlights = filteredFlights;

  // Reminder state
  const [addReminder, setAddReminder] = useState(false);
  const [reminderData, setReminderData] = useState<ReminderData>({
    title: '',
    description: '',
    due_date: new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Default to 7 days from now
    priority: 'Medium',
    status: 'Pending'
  });

  // State for associated reminders
  const [associatedReminders, setAssociatedReminders] = useState<Reminder[]>([]);
  const [isLoadingReminders, setIsLoadingReminders] = useState(false);

  // Load flights directly from database if not provided
  const loadFlights = async () => {
    try {
      console.log('Checking flights prop:', flights);
      
      // If flights are provided and not empty, use them
      if (flights && flights.length > 0) {
        console.log('Using provided flights:', flights);
        setAvailableFlights(flights);
        return;
      }
      
      // Otherwise, fetch flights directly from the database
      console.log('Fetching flights directly from database...');
      const { data, error } = await supabase
        .from('flights')
        .select('*')
        .order('shipment_date', { ascending: false });
      
      if (error) {
        console.error('Error fetching flights:', error);
        return;
      }
      
      console.log('Fetched flights from database:', data);
      setAvailableFlights(data || []);
    } catch (error) {
      console.error('Error in loadFlights:', error);
    }
  };

  // Fetch associated reminders for this preorder
  const fetchAssociatedReminders = async (preorderId: string) => {
    if (!preorderId) {
      console.log('No preorder ID provided for fetching reminders');
      return;
    }
    
    console.log('Fetching reminders for preorder ID:', preorderId);
    setIsLoadingReminders(true);
    
    try {
      // First check if the reminders table exists and its structure
      const { data: tableInfo, error: tableError } = await supabase
        .from('reminders')
        .select('*')
        .limit(1);
      
      console.log('Reminders table sample:', tableInfo);
      if (tableError) {
        console.error('Error checking reminders table:', tableError);
      }
      
      // Now fetch the actual reminders for this preorder
      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .eq('preorder_id', preorderId);
      
      if (error) {
        console.error('Error fetching reminders:', error);
        
        // Try a direct SQL query as a fallback
        try {
          const { data: sqlData, error: sqlError } = await supabase
            .rpc('get_reminders_for_preorder', { preorder_id_param: preorderId });
          
          if (sqlError) {
            console.error('Error with SQL fallback:', sqlError);
          } else {
            console.log('SQL fallback results:', sqlData);
            if (sqlData && sqlData.length > 0) {
              setAssociatedReminders(sqlData);
              setIsLoadingReminders(false);
              return;
            }
          }
        } catch (sqlCatchError) {
          console.error('Exception in SQL fallback:', sqlCatchError);
        }
        
        // If SQL fallback fails, try a raw query
        try {
          const { data: rawData, error: rawError } = await supabase
            .from('reminders')
            .select('*');
          
          if (rawError) {
            console.error('Error with raw query:', rawError);
          } else {
            console.log('All reminders:', rawData);
            // Filter manually
            const filteredReminders = rawData?.filter(r => r.preorder_id === preorderId);
            console.log('Manually filtered reminders:', filteredReminders);
            if (filteredReminders && filteredReminders.length > 0) {
              setAssociatedReminders(filteredReminders);
            }
          }
        } catch (rawCatchError) {
          console.error('Exception in raw query:', rawCatchError);
        }
        
        setIsLoadingReminders(false);
        return;
      }
      
      console.log('Fetched reminders:', data);
      
      if (data && data.length > 0) {
        setAssociatedReminders(data);
      } else {
        console.log('No reminders found with standard query, trying alternatives...');
        
        // Try with alternative field names
        const alternativeFields = ['preOrder_id', 'pre_order_id', 'pre_order', 'preorder'];
        let foundReminders = false;
        
        for (const field of alternativeFields) {
          if (foundReminders) break;
          
          console.log(`Trying with field: ${field}`);
          try {
            const { data: altData, error: altError } = await supabase
              .from('reminders')
              .select('*')
              .eq(field, preorderId);
            
            if (altError) {
              console.error(`Error fetching reminders with ${field}:`, altError);
              continue;
            }
            
            if (altData && altData.length > 0) {
              console.log(`Found reminders using ${field}:`, altData);
              setAssociatedReminders(altData);
              foundReminders = true;
            }
          } catch (fieldError) {
            console.error(`Exception trying field ${field}:`, fieldError);
          }
        }
        
        // If still no reminders found, try a final approach - get all reminders and filter client-side
        if (!foundReminders) {
          try {
            const { data: allData, error: allError } = await supabase
              .from('reminders')
              .select('*');
            
            if (allError) {
              console.error('Error fetching all reminders:', allError);
            } else {
              console.log('All reminders for client-side filtering:', allData);
              // Check each reminder for any property that might match the preorder ID
              const matchingReminders = allData?.filter(reminder => {
                return Object.entries(reminder).some(([key, value]) => {
                  return typeof value === 'string' && value === preorderId;
                });
              });
              
              console.log('Client-side filtered reminders:', matchingReminders);
              if (matchingReminders && matchingReminders.length > 0) {
                setAssociatedReminders(matchingReminders);
              }
            }
          } catch (finalError) {
            console.error('Exception in final approach:', finalError);
          }
        }
      }
    } catch (error) {
      console.error('Error in fetchAssociatedReminders:', error);
    } finally {
      setIsLoadingReminders(false);
    }
  };

  // Initialize form data when modal opens or preOrder changes
  useEffect(() => {
    if (isOpen) {
      if (preOrder) {
        // Editing existing pre-order
        const { total_amount, ...preOrderWithoutTotal } = preOrder;
        
        // Set form data from preOrder
        setFormData({
          ...preOrderWithoutTotal,
          created_at: preOrder.created_at ? new Date(preOrder.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          remaining_amount: preOrderWithoutTotal.remaining_amount || 0,
        });
        
        // Set selected customer and flight
        if (preOrderWithoutTotal.customer) {
          setSelectedCustomer(preOrderWithoutTotal.customer);
          setCustomerSearchQuery(preOrderWithoutTotal.customer.name);
        }
        
        if (preOrderWithoutTotal.flight) {
          setSelectedFlight(preOrderWithoutTotal.flight);
          setFlightSearchQuery(preOrderWithoutTotal.flight.flight_name);
        }
        
        // Set products from items
        if (preOrderWithoutTotal.items && preOrderWithoutTotal.items.length > 0) {
          setProducts(preOrderWithoutTotal.items.map(item => ({
            id: item.preorder_item_id || uuidv4(),
            product_name: item.product_name,
            shade: item.shade || '',
            size: item.size || '',
            link: item.link || '',
            quantity: item.quantity,
            price: item.price
          })));
        }
        
        // Fetch associated reminders
        fetchAssociatedReminders(preOrderWithoutTotal.preorder_id);
      } else {
        // Creating new pre-order
        setFormData({
          preorder_id: '', // This will be generated by Supabase
          customer_id: '',
          flight_id: '',
          order_status: 'pending',
          subtotal: 0,
          advance_payment: 0,
          cod_amount: 0,
          remaining_amount: 0,
          created_at: new Date().toISOString().split('T')[0],
        });
        
        // Reset selected customer and flight
        setSelectedCustomer(null);
        setSelectedFlight(null);
        setCustomerSearchQuery('');
        setFlightSearchQuery('');
        
        // Initialize with one empty product
        setProducts([{
          id: uuidv4(),
          product_name: '',
          shade: '',
          size: '',
          link: '',
          quantity: 1,
          price: 0
        }]);
      }
      
      // Reset errors
      setErrors({});
      
      // Load available flights
      loadFlights();
    }
  }, [isOpen, preOrder, isNew]);

  // Load flights when flights prop changes
  useEffect(() => {
    loadFlights();
  }, [flights, isOpen]);

  // Log flights data when component mounts or flights change
  useEffect(() => {
    console.log('Flights prop:', flights);
    console.log('Available flights state:', availableFlights);
  }, [flights, availableFlights]);

  // Handle input focus for number fields
  const handleNumberFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Clear the field when it's focused and the value is 0
    if (parseFloat(value) === 0) {
      setEditingFields(prev => ({
        ...prev,
        [name]: true,
      }));
    }
  };

  // Handle form change
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    if (name === 'subtotal' || name === 'advance_payment' || name === 'cod_amount') {
      if (value === '') {
        // Mark this field as being edited
        setEditingFields(prev => ({
          ...prev,
          [name]: true,
        }));
      } else {
        // If we have a value now, remove from editing set
        setEditingFields(prev => ({
          ...prev,
          [name]: false,
        }));
        // Update the form data with the numeric value
        setFormData((prev) => ({
          ...prev,
          [name]: parseFloat(value) || 0
        }));
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
    
    // Clear error for this field if it exists
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Calculate subtotal whenever products change
  useEffect(() => {
    const calculatedSubtotal = products.reduce((sum, product) => {
      return sum + (product.price * product.quantity);
    }, 0);
    
    setFormData(prev => ({
      ...prev,
      subtotal: calculatedSubtotal
    }));
  }, [products]);

  // Handle product change
  const handleProductChange = (id: string, field: keyof ProductItem, value: string | number) => {
    // For quantity field, handle empty string case
    if (field === 'quantity') {
      if (value === '') {
        // Mark this product as being edited
        setEditingQuantityIds(prev => {
          const newSet = new Set(prev);
          newSet.add(id);
          return newSet;
        });
        // Don't update the product yet, just return
        return;
      } else {
        // If we have a value now, remove from editing set
        setEditingQuantityIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(id);
          return newSet;
        });
        // Convert to number for quantity and ensure it's at least 1
        value = Math.max(1, parseInt(value as string) || 1);
      }
    }
    
    // For price field, handle conversion to number
    if (field === 'price') {
      if (value === '') {
        // Mark this field as being edited
        setEditingFields(prev => ({
          ...prev,
          [`price-${id}`]: true,
        }));
        // Don't update with 0, just return to keep the previous value
        return;
      } else {
        // Remove from editing fields
        setEditingFields(prev => ({
          ...prev,
          [`price-${id}`]: false,
        }));
        // Convert to number for price and ensure it's not negative
        value = Math.max(0, parseFloat(value as string) || 0);
      }
    }
    
    // Update the product
    setProducts(prevProducts => 
      prevProducts.map(product => 
        product.id === id ? { ...product, [field]: value } : product
      )
    );
  };

  // Handle product quantity focus
  const handleProductQuantityFocus = (id: string) => {
    const product = products.find(p => p.id === id);
    if (product && product.quantity === 0) {
      // Mark this product as being edited
      setEditingQuantityIds(prev => {
        const newSet = new Set(prev);
        newSet.add(id);
        return newSet;
      });
    }
  };

  // Add a new product
  const addProduct = () => {
    setProducts(prev => [
      ...prev, 
      {
        id: uuidv4(),
        product_name: '',
        shade: '',
        size: '',
        link: '',
        quantity: 1,
        price: 0
      }
    ]);
  };

  // Remove a product
  const removeProduct = (id: string) => {
    setProducts(prev => prev.filter(product => product.id !== id));
  };

  // Search customers dynamically
  const searchCustomers = async (query: string) => {
    if (!query.trim()) {
      setSearchedCustomers([]);
      return;
    }
    
    setIsSearchingCustomers(true);
    try {
      // First try the API endpoint
      const response = await fetch(`/api/customers?search=${encodeURIComponent(query)}&limit=10`);
      const result = await response.json();
      
      if (result.data && result.data.length > 0) {
        setSearchedCustomers(result.data);
      } else {
        // If API returns no results, search locally through the customers array
        const lowerQuery = query.toLowerCase();
        const filteredCustomers = customers.filter(customer => 
          customer.name.toLowerCase().includes(lowerQuery) || 
          (customer.instagram_id && customer.instagram_id.toLowerCase().includes(lowerQuery)) ||
          (customer.phone_number && customer.phone_number.includes(query))
        );
        setSearchedCustomers(filteredCustomers);
      }
    } catch (error) {
      console.error('Error searching customers:', error);
      
      // Fallback to local search if API fails
      const lowerQuery = query.toLowerCase();
      const filteredCustomers = customers.filter(customer => 
        customer.name.toLowerCase().includes(lowerQuery) || 
        (customer.instagram_id && customer.instagram_id.toLowerCase().includes(lowerQuery)) ||
        (customer.phone_number && customer.phone_number.includes(query))
      );
      setSearchedCustomers(filteredCustomers);
    } finally {
      setIsSearchingCustomers(false);
    }
  };

  // Debounce customer search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchCustomers(customerSearchQuery);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [customerSearchQuery]);

  // Handle reminder data change
  const handleReminderChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setReminderData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Validate form before submission
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    // We don't need to validate preorder_id anymore as it's generated by Supabase
    
    if (!formData.customer_id) {
      newErrors.customer_id = 'Customer is required';
    }
    
    // Flight is no longer required
    
    if (!formData.order_status) {
      newErrors.order_status = 'Status is required';
    }
    
    // Check if we have at least one product with a name
    const hasValidProduct = products.some(product => product.product_name.trim() !== '');
    if (!hasValidProduct) {
      newErrors.products = 'At least one product with a name is required';
    }
    
    // Check if all products with names have prices greater than 0
    const invalidPricedProducts = products.filter(
      product => product.product_name.trim() !== '' && product.price <= 0
    );
    
    if (invalidPricedProducts.length > 0) {
      newErrors.product_price = 'All products must have a price greater than 0';
    }
    
    // Validate reminder data if reminder toggle is on
    if (addReminder) {
      if (!reminderData.title.trim()) {
        newErrors.reminderTitle = 'Reminder title is required';
      }
      
      if (!reminderData.due_date) {
        newErrors.reminderDueDate = 'Due date is required';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      // Calculate subtotal from products
      const subtotal = products.reduce((total, product) => {
        return total + (product.price * product.quantity);
      }, 0);
      
      // Calculate remaining amount
      const totalAmount = subtotal + (formData.cod_amount || 0);
      const remainingAmount = totalAmount - (formData.advance_payment || 0);
      
      // Create updated form data with calculated values
      const updatedFormData = {
        ...formData,
        subtotal,
        total_amount: totalAmount,
        remaining_amount: remainingAmount
      };
      
      // Map products to PreOrderItem format for database
      const preOrderItems = products.map(product => ({
        id: product.id,
        product_name: product.product_name,
        shade: product.shade,
        size: product.size,
        quantity: product.quantity,
        price: product.price,
        link: product.link
      }));
      
      // Call onSave with the updated form data, product items, and reminder data if needed
      onSave(
        updatedFormData as unknown as PreOrderWithDetails, 
        preOrderItems, 
        addReminder ? reminderData : undefined
      );
    } catch (error) {
      console.error('Error in form submission:', error);
    }
  };

  // Handle customer search and selection
  const handleCustomerSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setCustomerSearchQuery(query);
    setShowCustomerDropdown(true);
  };

  const handleCustomerSelect = (customer: Customer) => {
    console.log('Selected customer:', customer);
    setSelectedCustomer(customer);
    setFormData(prev => ({
      ...prev,
      customer_id: customer.customer_id,
      customer: customer
    }));
    setCustomerSearchQuery(customer.name);
    setShowCustomerDropdown(false);
    
    // Clear any errors related to customer selection
    if (errors.customer_id) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.customer_id;
        return newErrors;
      });
    }
  };

  // Handle flight search and selection
  const handleFlightSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    console.log('Flight search query:', query);
    setFlightSearchQuery(query);
    setShowFlightDropdown(true);
  };

  const handleFlightSelect = (flight: Flight) => {
    console.log('Selected flight:', flight);
    setSelectedFlight(flight);
    setFormData(prev => ({ ...prev, flight_id: flight.flight_id }));
    setFlightSearchQuery(flight.flight_name);
    
    // Clear any errors related to flight selection
    if (errors.flight_id) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.flight_id;
        return newErrors;
      });
    }
    
    // Close the dropdown immediately instead of using setTimeout
    setShowFlightDropdown(false);
  };

  // Toggle customer dropdown
  const toggleCustomerDropdown = () => {
    setShowCustomerDropdown(!showCustomerDropdown);
  };

  // Toggle flight dropdown
  const toggleFlightDropdown = () => {
    setShowFlightDropdown(!showFlightDropdown);
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Close customer dropdown when clicking outside
      if (showCustomerDropdown && event.target instanceof Node) {
        const customerDropdownElement = document.querySelector('[data-customer-dropdown]');
        if (customerDropdownElement && !customerDropdownElement.contains(event.target)) {
          setShowCustomerDropdown(false);
        }
      }
      
      // Close flight dropdown when clicking outside
      if (showFlightDropdown && event.target instanceof Node) {
        const flightDropdownElement = document.querySelector('[data-flight-dropdown]');
        if (flightDropdownElement && !flightDropdownElement.contains(event.target)) {
          setShowFlightDropdown(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCustomerDropdown, showFlightDropdown]);

  // Update the handlePriceFocus function
  const handlePriceFocus = (productId: string) => {
    if (products.find(p => p.id === productId)?.price === 0) {
      setEditingFields(prev => ({
        ...prev,
        [`price-${productId}`]: true,
      }));
    }
  };

  const handlePriceBlur = (productId: string) => {
    setEditingFields(prev => ({
      ...prev,
      [`price-${productId}`]: false,
    }));
    
    // Ensure price is properly formatted when user leaves the field
    const product = products.find(p => p.id === productId);
    if (product && (product.price === 0 || isNaN(product.price))) {
      handleProductChange(productId, 'price', '0');
    }
  };

  // Add this function to handle number field blur
  const handleNumberBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name } = e.target;
    setEditingFields(prev => ({
      ...prev,
      [name]: false,
    }));
    
    // Ensure value is properly formatted when user leaves the field
    const value = formData[name as keyof typeof formData];
    if (typeof value === 'number' && (value === 0 || isNaN(value))) {
      setFormData(prev => ({
        ...prev,
        [name]: 0
      }));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-[800px] max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
        <DialogHeader>
          <DialogTitle className="sr-only">
            {isNew ? 'New Pre-Order' : 'Edit Pre-Order'}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {isNew ? 'Create a new pre-order by filling out the form below.' : 'Update the pre-order details using the form below.'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-black dark:text-white">
                {isNew ? 'New Pre-Order' : 'Edit Pre-Order'}
              </h2>
              <p className="text-gray-800 dark:text-gray-300 mt-1">
                {isNew ? 'Create a new pre-order by filling out the form below.' : 'Update the pre-order details using the form below.'}
              </p>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose}
              className="text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          
          {/* Debug information */}
          {!isNew && (
            <div className="mb-2 text-xs text-gray-500">
              Debug: {isLoadingReminders ? 'Loading reminders...' : `Found ${associatedReminders.length} reminders`}
            </div>
          )}
          
          {/* Display associated reminders if they exist and we're not in new mode */}
          {!isNew && associatedReminders.length > 0 && (
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
              <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-2 flex items-center">
                <Bell className="w-4 h-4 mr-2 text-gray-600 dark:text-gray-300" />
                Associated Reminders
              </h3>
              <div className="space-y-3">
                {associatedReminders.map((reminder) => (
                  <div key={reminder.reminder_id} className="p-3 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-600 flex items-start">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <h4 className="font-medium text-gray-800 dark:text-white">{reminder.title}</h4>
                        <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                          reminder.priority === 'Low' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300' :
                          reminder.priority === 'Medium' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-300' :
                          reminder.priority === 'High' ? 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-300' :
                          'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300'
                        }`}>
                          {reminder.priority}
                        </span>
                        <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                          reminder.status === 'Pending' ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300' :
                          reminder.status === 'In Progress' ? 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-300' :
                          'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300'
                        }`}>
                          {reminder.status}
                        </span>
                      </div>
                      {reminder.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{reminder.description}</p>
                      )}
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Due: {new Date(reminder.due_date).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Loading indicator for reminders */}
          {!isNew && isLoadingReminders && (
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 flex justify-center">
              <div className="flex items-center">
                <div className="w-4 h-4 border-2 border-gray-600 dark:border-gray-300 border-t-transparent rounded-full animate-spin mr-2"></div>
                <span className="text-gray-600 dark:text-gray-300">Loading reminders...</span>
              </div>
            </div>
          )}
          
          {/* No reminders message */}
          {!isNew && !isLoadingReminders && associatedReminders.length === 0 && (
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
              <div className="flex items-center justify-center text-gray-500 dark:text-gray-400">
                <Bell className="w-4 h-4 mr-2 text-gray-400 dark:text-gray-500" />
                No reminders associated with this pre-order
              </div>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Pre-Order ID */}
            <div className="mb-6">
              <Label htmlFor="preorder_id" className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">
                Pre-Order ID
              </Label>
              <Input
                id="preorder_id"
                value={formData.preorder_id}
                disabled={!isNew}
                onChange={(e) => handleChange({ target: { name: 'preorder_id', value: e.target.value } } as React.ChangeEvent<HTMLInputElement>)}
                className="w-full text-black dark:text-white bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:border-gray-400 dark:focus:border-gray-500 focus:ring-gray-300 dark:focus:ring-gray-500"
              />
            </div>
            
            {/* Customer Selection */}
            <div className="space-y-2">
              <Label htmlFor="customer_id" className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1.5 ml-1">
                Customer
              </Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-purple-400 dark:text-purple-300" />
                </div>
                <button
                  type="button"
                  onClick={toggleCustomerDropdown}
                  className={cn(
                    "pl-12 w-full flex justify-between items-center",
                    "rounded-xl border bg-white dark:bg-gray-700",
                    "text-gray-900 dark:text-white shadow-sm",
                    "ring-1 ring-inset transition-all duration-200 py-3 h-12 sm:text-sm text-left",
                    errors.customer_id 
                      ? "ring-red-500 focus:ring-red-500" 
                      : "ring-gray-300/50 dark:ring-gray-600/50 focus:ring-gray-400 dark:focus:ring-gray-500 focus:ring-2"
                  )}
                >
                  <span className="truncate max-w-[calc(100%-2rem)] inline-block">
                    {selectedCustomer ? selectedCustomer.name : "Select customer..."}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </button>
                
                {showCustomerDropdown && (
                  <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 shadow-lg rounded-xl border border-gray-200 dark:border-gray-600 max-h-60 overflow-hidden">
                    <div className="p-2 border-b border-gray-100 dark:border-gray-700">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                        <input
                          type="text"
                          value={customerSearchQuery}
                          onChange={handleCustomerSearch}
                          placeholder="Search customers..."
                          className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-500"
                        />
                      </div>
                    </div>
                    <div className="max-h-52 overflow-y-auto">
                      {isSearchingCustomers ? (
                        <div className="p-4 text-center text-gray-500 dark:text-gray-400 flex items-center justify-center">
                          <div className="animate-spin mr-2 h-4 w-4 border-2 border-gray-500 dark:border-gray-400 border-t-transparent rounded-full"></div>
                          Searching...
                        </div>
                      ) : searchedCustomers.length === 0 && customerSearchQuery ? (
                        <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                          No customers found
                        </div>
                      ) : (
                        (searchedCustomers.length > 0 ? searchedCustomers : customers).map(customer => (
                          <div
                            key={customer.customer_id}
                            className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer flex items-center transition-colors"
                            onClick={() => handleCustomerSelect(customer)}
                          >
                            <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-600 flex items-center justify-center mr-3 flex-shrink-0">
                              <User className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {customer.name}
                              </p>
                              <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 space-x-2">
                                {customer.instagram_id && (
                                  <span className="truncate">@{customer.instagram_id}</span>
                                )}
                                {customer.phone_number && (
                                  <span className="truncate">{customer.phone_number}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Show selected customer details */}
              {selectedCustomer && (
                <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                  <div className="text-sm">
                    <div className="font-medium text-gray-900 dark:text-white">{selectedCustomer.name}</div>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      {selectedCustomer.instagram_id && (
                        <div className="text-gray-600 dark:text-gray-300">
                          <span className="text-gray-500 dark:text-gray-400">Instagram:</span> @{selectedCustomer.instagram_id}
                        </div>
                      )}
                      {selectedCustomer.phone_number && (
                        <div className="text-gray-600 dark:text-gray-300">
                          <span className="text-gray-500 dark:text-gray-400">Phone:</span> {selectedCustomer.phone_number}
                        </div>
                      )}
                      {selectedCustomer.city && (
                        <div className="text-gray-600 dark:text-gray-300">
                          <span className="text-gray-500 dark:text-gray-400">City:</span> {selectedCustomer.city}
                        </div>
                      )}
                      {selectedCustomer.address && (
                        <div className="text-gray-600 dark:text-gray-300 col-span-2">
                          <span className="text-gray-500 dark:text-gray-400">Address:</span> {selectedCustomer.address}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {errors.customer_id && (
                <p className="mt-1.5 text-sm text-red-500 dark:text-red-400 ml-1">{errors.customer_id}</p>
              )}
            </div>
            
            {/* Flight Selection */}
            <div className="space-y-2">
              <Label htmlFor="flight_id" className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1.5 ml-1">
                Flight <span className="text-gray-500 dark:text-gray-400 text-xs font-normal">(optional)</span>
              </Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Plane className="h-5 w-5 text-purple-400 dark:text-purple-300" />
                </div>
                <button
                  type="button"
                  onClick={toggleFlightDropdown}
                  className={cn(
                    "pl-12 w-full flex justify-between items-center",
                    "rounded-xl border bg-white dark:bg-gray-700",
                    "text-gray-900 dark:text-white shadow-sm",
                    "ring-1 ring-inset transition-all duration-200 py-3 h-12 sm:text-sm text-left",
                    errors.flight_id 
                      ? "ring-red-500 focus:ring-red-500" 
                      : "ring-gray-300/50 dark:ring-gray-600/50 focus:ring-gray-400 dark:focus:ring-gray-500 focus:ring-2"
                  )}
                >
                  <span className="truncate max-w-[calc(100%-2rem)] inline-block">
                    {selectedFlight ? selectedFlight.flight_name : "Select flight..."}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </button>
                
                {showFlightDropdown && (
                  <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 shadow-lg rounded-xl border border-gray-200 dark:border-gray-600 max-h-60 overflow-hidden">
                    <div className="p-2 border-b border-gray-100 dark:border-gray-700">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                        <input
                          type="text"
                          value={flightSearchQuery}
                          onChange={handleFlightSearch}
                          placeholder="Search flights..."
                          className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-500"
                        />
                      </div>
                    </div>
                    <div className="max-h-52 overflow-y-auto">
                      {isSearchingFlights ? (
                        <div className="p-4 text-center text-gray-500 dark:text-gray-400 flex items-center justify-center">
                          <div className="animate-spin mr-2 h-4 w-4 border-2 border-gray-500 dark:border-gray-400 border-t-transparent rounded-full"></div>
                          Searching...
                        </div>
                      ) : filteredFlights.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                          No flights found
                        </div>
                      ) : (
                        filteredFlights.map((flight) => (
                          <div
                            key={flight.flight_id}
                            className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer flex items-center transition-colors"
                            onClick={() => handleFlightSelect(flight)}
                          >
                            <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-600 flex items-center justify-center mr-3 flex-shrink-0">
                              <Plane className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {flight.flight_name}
                              </p>
                              <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                                <span className="truncate">{formatDate(flight.shipment_date)}</span>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Show selected flight details */}
              {selectedFlight && (
                <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                  <div className="text-sm">
                    <div className="font-medium text-gray-900 dark:text-white">{selectedFlight.flight_name}</div>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <div className="text-gray-600 dark:text-gray-300">
                        <span className="text-gray-500 dark:text-gray-400">Date:</span> {formatDate(selectedFlight.shipment_date)}
                      </div>
                      <div className="text-gray-600 dark:text-gray-300">
                        <span className="text-gray-500 dark:text-gray-400">Status:</span> {selectedFlight.status}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Order Date */}
            <div className="space-y-2">
              <Label htmlFor="order_date" className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1.5 ml-1">
                Order Date
              </Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Calendar className="h-5 w-5 text-purple-400" />
                </div>
                <input
                  id="order_date"
                  name="created_at"
                  type="date"
                  value={new Date(formData.created_at).toISOString().split('T')[0]}
                  onChange={(e) => {
                    const date = new Date(e.target.value);
                    setFormData(prev => ({
                      ...prev,
                      created_at: date.toISOString()
                    }));
                  }}
                  className="pl-12 block w-full rounded-xl border-0 bg-gray-50/50 dark:bg-gray-700/50 text-gray-900 dark:text-white shadow-sm ring-1 ring-inset ring-gray-300/50 dark:ring-gray-600/50 focus:ring-2 focus:ring-inset focus:ring-purple-500 transition-all duration-200 py-3 sm:text-sm"
                />
              </div>
            </div>
            
            {/* Products Section */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label htmlFor="products" className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1.5 ml-1">
                  Products
                </Label>
                <button
                  type="button"
                  onClick={addProduct}
                  className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-200 shadow-sm"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Product
                </button>
              </div>
              
              <div className="space-y-4">
                {products.map((product, index) => (
                  <div key={index} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-medium text-gray-800 dark:text-white">Product {index + 1}</h3>
                      <button
                        type="button"
                        onClick={() => removeProduct(product.id)}
                        className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors rounded-full p-1 hover:bg-red-100/10"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`product-name-${index}`} className="block text-xs font-medium text-gray-800 dark:text-gray-200 ml-1">
                          Product Name
                        </Label>
                        <input
                          id={`product-name-${index}`}
                          type="text"
                          value={product.product_name}
                          onChange={(e) => handleProductChange(product.id, 'product_name', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-md bg-white text-black focus:outline-none focus:ring-1 focus:ring-gray-400"
                          placeholder="Product name"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor={`product-shade-${index}`} className="block text-xs font-medium text-gray-800 dark:text-gray-200 ml-1">
                          Shade
                        </Label>
                        <input
                          id={`product-shade-${index}`}
                          type="text"
                          value={product.shade}
                          onChange={(e) => handleProductChange(product.id, 'shade', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-md bg-white text-black focus:outline-none focus:ring-1 focus:ring-gray-400"
                          placeholder="Shade"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor={`product-size-${index}`} className="block text-xs font-medium text-gray-800 dark:text-gray-200 ml-1">
                          Size
                        </Label>
                        <input
                          id={`product-size-${index}`}
                          type="text"
                          value={product.size}
                          onChange={(e) => handleProductChange(product.id, 'size', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-md bg-white text-black focus:outline-none focus:ring-1 focus:ring-gray-400"
                          placeholder="Size"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor={`product-link-${index}`} className="block text-xs font-medium text-gray-800 dark:text-gray-200 ml-1">
                          Link
                        </Label>
                        <input
                          id={`product-link-${index}`}
                          type="text"
                          value={product.link}
                          onChange={(e) => handleProductChange(product.id, 'link', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-md bg-white text-black focus:outline-none focus:ring-1 focus:ring-gray-400"
                          placeholder="Product link"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor={`product-quantity-${index}`} className="block text-xs font-medium text-gray-800 dark:text-gray-200 ml-1">
                          Quantity
                        </Label>
                        <div className="flex items-center">
                          <button
                            type="button"
                            onClick={() => handleProductChange(product.id, 'quantity', product.quantity - 1)}
                            disabled={product.quantity <= 1}
                            className="px-2 py-1 border border-gray-200 rounded-l-md bg-white text-gray-800 hover:bg-gray-100 disabled:opacity-50"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <input
                            id={`product-quantity-${index}`}
                            type="number"
                            min="1"
                            value={product.quantity}
                            onChange={(e) => handleProductChange(product.id, 'quantity', parseInt(e.target.value) || 1)}
                            className="w-16 text-center border-y border-gray-200 bg-white text-black focus:outline-none focus:ring-1 focus:ring-gray-400"
                          />
                          <button
                            type="button"
                            onClick={() => handleProductChange(product.id, 'quantity', product.quantity + 1)}
                            className="px-2 py-1 border border-gray-200 rounded-r-md bg-white text-gray-800 hover:bg-gray-100"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      
                      {/* Price Input */}
                      <div className="space-y-2">
                        <Label htmlFor={`product-price-${index}`} className="block text-xs font-medium text-gray-800 dark:text-gray-200 ml-1">
                          Price
                        </Label>
                        <div className="relative rounded-md shadow-sm">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-600 dark:text-gray-400 pointer-events-none">
                            PKR
                          </span>
                          <input
                            id={`product-price-${index}`}
                            type="number"
                            min="0"
                            step="0.01"
                            value={product.price}
                            onChange={(e) => handleProductChange(product.id, 'price', parseFloat(e.target.value) || 0)}
                            className="w-full pl-12 pr-3 py-2 border border-gray-200 rounded-md bg-white text-black focus:outline-none focus:ring-1 focus:ring-gray-400"
                            placeholder="0.00"
                          />
                          {errors[`product_price_${index}`] && (
                            <p className="text-red-500 text-xs mt-1">{errors[`product_price_${index}`]}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 bg-gray-50 dark:bg-gray-800 p-2 rounded-lg">
                      <div className="flex justify-between items-center">
                        <Label htmlFor={`item-total-${index}`} className="block text-sm font-medium text-gray-800 dark:text-gray-200">
                          Item Total:
                        </Label>
                        <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                          PKR {(product.price * product.quantity).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Payment Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Payment Information</h3>
              
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg mb-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">Subtotal</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Calculated from products</p>
                  </div>
                  <div className="text-xl font-bold text-green-600 dark:text-green-400">
                    PKR {formData.subtotal.toFixed(2)}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="advance_payment">Advance Payment</Label>
                  <div className="relative mt-1">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500 dark:text-gray-400 pointer-events-none">
                      PKR
                    </span>
                    <Input
                      id="advance_payment"
                      name="advance_payment"
                      type="number"
                      step="0.01"
                      min="0"
                      value={editingFields.advance_payment ? '' : formData.advance_payment}
                      onChange={handleChange}
                      onFocus={handleNumberFocus}
                      onBlur={handleNumberBlur}
                      className="pl-12"
                    />
                    {errors.advance_payment && (
                      <p className="text-red-500 text-xs mt-1">{errors.advance_payment}</p>
                    )}
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="cod_amount">COD Amount</Label>
                  <div className="relative mt-1">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500 dark:text-gray-400 pointer-events-none">
                      PKR
                    </span>
                    <Input
                      id="cod_amount"
                      name="cod_amount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={editingFields.cod_amount ? '' : formData.cod_amount}
                      onChange={handleChange}
                      onFocus={handleNumberFocus}
                      onBlur={handleNumberBlur}
                      className="pl-12"
                    />
                    {errors.cod_amount && (
                      <p className="text-red-500 text-xs mt-1">{errors.cod_amount}</p>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">Total Amount</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Subtotal + COD Amount</p>
                  </div>
                  <div className="text-xl font-bold text-green-600 dark:text-green-400">
                    PKR {(formData.subtotal + (formData.cod_amount || 0)).toFixed(2)}
                  </div>
                </div>
                
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">Remaining Amount</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Total - Advance Payment</p>
                    </div>
                    <div className="text-xl font-bold text-amber-600 dark:text-amber-400">
                      PKR {((formData.subtotal + (formData.cod_amount || 0)) - (formData.advance_payment || 0)).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Order Status */}
            <div className="space-y-2">
              <Label htmlFor="order_status" className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1.5 ml-1">
                Order Status
              </Label>
              <Select
                value={formData.order_status}
                onValueChange={(value) => handleChange({ target: { name: 'order_status', value } } as React.ChangeEvent<HTMLSelectElement>)}
              >
                <SelectTrigger className="w-full bg-white dark:bg-gray-700 text-black dark:text-white border-gray-200 dark:border-gray-600 focus:ring-gray-400 dark:focus:ring-gray-500">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-gray-800 text-black dark:text-white">
                  <SelectItem value="pending" className="text-black dark:text-white">Pending</SelectItem>
                  <SelectItem value="ordered" className="text-black dark:text-white">Ordered</SelectItem>
                  <SelectItem value="shipped" className="text-black dark:text-white">Shipped</SelectItem>
                  <SelectItem value="delivered" className="text-black dark:text-white">Delivered</SelectItem>
                  <SelectItem value="cancelled" className="text-black dark:text-white">Cancelled</SelectItem>
                  <SelectItem value="Out_of_stock" className="text-black dark:text-white">Out of Stock</SelectItem>
                </SelectContent>
              </Select>
              {errors.order_status && (
                <p className="mt-1.5 text-sm text-red-500 dark:text-red-400 ml-1">{errors.order_status}</p>
              )}
            </div>
            
            {/* Reminder Toggle */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 mt-6">
              <div className="space-y-0.5">
                <Label htmlFor="create-reminder" className="text-base font-medium text-gray-800 dark:text-gray-200 flex items-center">
                  <Bell className="w-4 h-4 mr-2 text-gray-600 dark:text-gray-300" />
                  Create Reminder
                </Label>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Set a reminder for this pre-order
                </p>
              </div>
              <Switch
                id="create-reminder"
                checked={addReminder}
                onCheckedChange={setAddReminder}
                className="data-[state=checked]:bg-gray-600 dark:data-[state=checked]:bg-gray-400"
              />
            </div>

            {/* Reminder Fields (conditionally rendered) */}
            {addReminder && (
              <div className="space-y-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600">
                <h3 className="text-lg font-medium text-gray-800 dark:text-white">
                  Reminder Details
                </h3>
                
                {/* Reminder Title */}
                <div>
                  <Label htmlFor="reminder-title" className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    Title <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="reminder-title"
                    value={reminderData.title}
                    onChange={(e) => setReminderData({ ...reminderData, title: e.target.value })}
                    placeholder="Enter reminder title"
                    className="w-full bg-white dark:bg-gray-700 text-black dark:text-white border-gray-200 dark:border-gray-600 focus:border-gray-400 dark:focus:border-gray-500 focus:ring-gray-300 dark:focus:ring-gray-500"
                  />
                  {errors.reminderTitle && (
                    <p className="mt-1 text-sm text-red-500 dark:text-red-400">{errors.reminderTitle}</p>
                  )}
                </div>
                
                {/* Reminder Description */}
                <div>
                  <Label htmlFor="reminder-description" className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    Description
                  </Label>
                  <Textarea
                    id="reminder-description"
                    value={reminderData.description}
                    onChange={(e) => setReminderData({ ...reminderData, description: e.target.value })}
                    placeholder="Enter reminder description"
                    className="w-full bg-white dark:bg-gray-700 text-black dark:text-white border-gray-200 dark:border-gray-600 focus:border-gray-400 dark:focus:border-gray-500 focus:ring-gray-300 dark:focus:ring-gray-500"
                  />
                </div>
                
                {/* Due Date */}
                <div>
                  <Label htmlFor="reminder-due-date" className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    Due Date <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="reminder-due-date"
                    type="datetime-local"
                    value={reminderData.due_date}
                    onChange={(e) => setReminderData({ ...reminderData, due_date: e.target.value })}
                    className="w-full bg-white dark:bg-gray-700 text-black dark:text-white border-gray-200 dark:border-gray-600 focus:border-gray-400 dark:focus:border-gray-500 focus:ring-gray-300 dark:focus:ring-gray-500"
                  />
                  {errors.reminderDueDate && (
                    <p className="mt-1 text-sm text-red-500 dark:text-red-400">{errors.reminderDueDate}</p>
                  )}
                </div>
                
                {/* Priority */}
                <div>
                  <Label htmlFor="reminder-priority" className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    Priority
                  </Label>
                  <Select
                    value={reminderData.priority}
                    onValueChange={(value) => setReminderData({ ...reminderData, priority: value as ReminderPriority })}
                  >
                    <SelectTrigger className="w-full bg-white dark:bg-gray-700 text-black dark:text-white border-gray-200 dark:border-gray-600">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-gray-800 text-black dark:text-white">
                      <SelectItem value="Low" className="text-black dark:text-white">Low</SelectItem>
                      <SelectItem value="Medium" className="text-black dark:text-white">Medium</SelectItem>
                      <SelectItem value="High" className="text-black dark:text-white">High</SelectItem>
                      <SelectItem value="Urgent" className="text-black dark:text-white">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Status */}
                <div>
                  <Label htmlFor="reminder-status" className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    Status
                  </Label>
                  <Select
                    value={reminderData.status}
                    onValueChange={(value) => setReminderData({ ...reminderData, status: value as ReminderStatus })}
                  >
                    <SelectTrigger className="w-full bg-white dark:bg-gray-700 text-black dark:text-white border-gray-200 dark:border-gray-600">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-gray-800 text-black dark:text-white">
                      <SelectItem value="Pending" className="text-black dark:text-white">Pending</SelectItem>
                      <SelectItem value="In Progress" className="text-black dark:text-white">In Progress</SelectItem>
                      <SelectItem value="Completed" className="text-black dark:text-white">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            
            <div className="flex justify-end space-x-3 mt-8">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-gray-800 dark:bg-gray-700 hover:bg-gray-700 dark:hover:bg-gray-600 text-white"
              >
                {isSubmitting ? (
                  <div className="flex items-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Saving...
                  </div>
                ) : (
                  'Save Pre-Order'
                )}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PreOrderAddEditModal; 