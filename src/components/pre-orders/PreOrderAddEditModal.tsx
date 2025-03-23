'use client';

import React, { useState, useEffect } from 'react';
import { PreOrder, PreOrderWithDetails, Customer, Flight, OrderStatus, PreOrderItem, ReminderStatus, ReminderPriority, Reminder, BankAccount } from '@/lib/types';
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
  isNew?: boolean; // Flag to identify new products added during editing
  advance_payment?: number; // Add advance payment field for each product
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
  onSave: (preOrder: PreOrderWithDetails, items: ProductItem[], bankAccount: BankAccount, reminderData?: ReminderData) => void;
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
  const [formData, setFormData] = useState<Partial<Omit<PreOrder, 'total_amount'>> & { customer?: Customer; flight?: Flight }>({
    customer_id: '',
    flight_id: '', // Keep as empty string initially
    order_status: 'pending',
    subtotal: 0,
    delivery_charges: 0,
    remaining_amount: 0,
    created_at: new Date().toISOString(),
    // Only include preorder_id if it exists from an existing order and it's not an empty string
    ...(preOrder?.preorder_id && preOrder.preorder_id !== '' ? { preorder_id: preOrder.preorder_id } : {})
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

  // Add bank account state
  const [bankAccount, setBankAccount] = useState<BankAccount>('HBL');

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
      // Fetch reminders with the correct column name
      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .eq('preorder_id', preorderId);
      
      if (error) {
        console.error('Error fetching reminders:', error);
        return;
      }
      
      console.log('Fetched reminders:', data);
      
      if (data && data.length > 0) {
        setAssociatedReminders(data);
      } else {
        // No reminders found for this preorder
        setAssociatedReminders([]);
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
      if (preOrder && !isNew) {
        // Make a copy of preOrder without total_amount property
        const preOrderWithoutTotal = { ...preOrder } as Partial<PreOrderWithDetails>;
        if ('total_amount' in preOrderWithoutTotal) {
          delete preOrderWithoutTotal.total_amount;
        }
        
        // Set form data
        setFormData({
          ...preOrderWithoutTotal,
          created_at: preOrder.created_at 
            ? new Date(preOrder.created_at).toISOString().split('T')[0] 
            : new Date().toISOString().split('T')[0],
          remaining_amount: preOrderWithoutTotal.remaining_amount || 0,
        });
        
        // Set selected customer and flight
        if (preOrderWithoutTotal.customer) {
          setSelectedCustomer(preOrderWithoutTotal.customer);
          setCustomerSearchQuery(preOrderWithoutTotal.customer.name || '');
        }
        
        if (preOrderWithoutTotal.flight) {
          setSelectedFlight(preOrderWithoutTotal.flight);
          setFlightSearchQuery(preOrderWithoutTotal.flight.flight_name || '');
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
            price: item.price,
            isNew: false, // Mark existing products as not new
            advance_payment: item.advance_payment || 0, // Include advance payment with default value
          })));
        } else {
          // Fetch from preorder_items if not available in preOrderWithoutTotal.items
          const fetchPreorderItems = async () => {
            try {
              const { data: itemsData, error } = await supabase
                .from('preorder_items')
                .select('*')
                .eq('preorder_id', preOrderWithoutTotal.preorder_id);
              
              if (error) {
                console.error('Error fetching preorder items:', error);
                return;
              }
              
              if (itemsData && itemsData.length > 0) {
                setProducts(itemsData.map(item => ({
                  id: item.preorder_item_id || uuidv4(),
                  product_name: item.product_name,
                  shade: item.shade || '',
                  size: item.size || '',
                  link: item.link || '',
                  quantity: item.quantity,
                  price: item.price,
                  isNew: false, // Mark existing products as not new
                  advance_payment: item.advance_payment || 0, // Include advance payment with default value
                })));
              } else {
                // If still no items, initialize with one empty product
                setProducts([{
                  id: uuidv4(),
                  product_name: '',
                  shade: '',
                  size: '',
                  link: '',
                  quantity: 1,
                  price: 0,
                  isNew: true,  // Mark as new product
                  advance_payment: 0, // Initialize advance payment
                }]);
              }
            } catch (error) {
              console.error('Error in fetchPreorderItems:', error);
            }
          };
          
          fetchPreorderItems();
        }
        
        // Fetch associated reminders
        fetchAssociatedReminders(preOrderWithoutTotal.preorder_id || '');
      } else {
        // Creating new pre-order
        setFormData({
          customer_id: '',
          flight_id: '',
          order_status: 'pending',
          subtotal: 0,
          delivery_charges: 0,
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
          price: 0,  // We keep 0 for type safety but won't display it
          isNew: true,  // Mark as new product
          advance_payment: 0, // Initialize advance payment
        }]);
        
        // Reset bank account to default
        setBankAccount('HBL');
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
    
    if (name === 'subtotal' || name === 'delivery_charges') {
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
    
    // For advance_payment field, handle conversion to number
    if (field === 'advance_payment') {
      if (value === '') {
        // Mark this field as being edited
        setEditingFields(prev => ({
          ...prev,
          [`advance-${id}`]: true,
        }));
        // Don't update with 0, just return to keep the previous value
        return;
      } else {
        // Remove from editing fields
        setEditingFields(prev => ({
          ...prev,
          [`advance-${id}`]: false,
        }));
        // Convert to number for advance payment and ensure it's not negative
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
        price: 0,
        isNew: true,  // Mark as new product
        advance_payment: 0, // Initialize advance payment
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

  // Validate form data
  const validateFormData = () => {
    const newErrors: Record<string, string> = {};
    
    // Validate required fields
    if (!formData.customer_id) {
      newErrors.customer_id = 'Customer is required';
    }
    
    // No need to validate preorder_id as it's generated by the database
    
    // Validate products - at least one product is required
    const validProducts = products.filter(p => p.product_name.trim() !== '');
    if (validProducts.length === 0) {
      newErrors.products = 'At least one product is required';
    }
    
    // Validate each product
    validProducts.forEach((product, index) => {
      if (!product.product_name) {
        newErrors[`product_name_${index}`] = 'Product name is required';
      }
      
      if (product.quantity <= 0) {
        newErrors[`product_quantity_${index}`] = 'Quantity must be greater than 0';
      }
      
      if (product.price <= 0) {
        newErrors[`product_price_${index}`] = 'Price must be greater than 0';
      }
      
      // Validate that advance payment is not negative
      if ((product.advance_payment || 0) < 0) {
        newErrors[`product_advance_${index}`] = 'Advance payment cannot be negative';
      }
      
      // Validate that advance payment is not greater than the product total
      const productTotal = product.price * product.quantity;
      if ((product.advance_payment || 0) > productTotal) {
        newErrors[`product_advance_${index}`] = 'Advance payment cannot exceed the product total';
      }
    });
    
    // Validate delivery charges
    if ((formData.delivery_charges || 0) < 0) {
      newErrors.delivery_charges = 'Delivery charges cannot be negative';
    }
    
    // Validate reminder if it's being added
    if (addReminder) {
      if (!reminderData.title) {
        newErrors.reminder_title = 'Reminder title is required';
      }
      
      if (!reminderData.due_date) {
        newErrors.reminder_due_date = 'Due date is required';
      }
    }
    
    return newErrors;
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('Submitting form...');
    
    // Validate form
    const validationErrors = validateFormData();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    // Calculate total amount
    const totalAmount = (formData.subtotal || 0) + (formData.delivery_charges || 0);
    
    // Calculate the total advance payment for new products
    const newProducts = products.filter(p => p.isNew && p.product_name.trim() !== '');
    const newProductsAdvance = newProducts.reduce((sum, product) => {
      // Handle advance_payment that might be a string due to form input
      const advancePayment = typeof product.advance_payment === 'string'
        ? parseFloat(product.advance_payment)
        : (product.advance_payment || 0);
      return sum + advancePayment;
    }, 0);
    
    // Filter out any products with empty names before saving
    const validProducts = products.filter(product => product.product_name.trim() !== '');
    
    // Create pre-order object with the updated data
    const preOrderData = {
      ...formData,
      customer: selectedCustomer!,
      flight: selectedFlight || undefined,
      items: [],
      total_amount: totalAmount,
      // Make sure IDs are properly handled - empty strings will be converted to null in the backend
      flight_id: formData.flight_id && formData.flight_id.trim() !== '' ? formData.flight_id : undefined,
      // Never include preorder_id when creating a new pre-order
      ...(formData.preorder_id && formData.preorder_id !== '' && !isNew ? { preorder_id: formData.preorder_id } : {}),
      // Include information about new products for the parent component
      newProductsTotal: newProducts.reduce((sum, product) => sum + (product.price * product.quantity), 0),
      newProductsAdvance: newProductsAdvance, // Pass the advance for new products
    } as PreOrderWithDetails & { newProductsTotal: number, newProductsAdvance: number };
    
    // Extract any reminder data that should be created
    let reminderToCreate: ReminderData | undefined;
    if (addReminder && reminderData.title && reminderData.due_date) {
      reminderToCreate = {
        title: reminderData.title,
        description: reminderData.description || '',
        due_date: reminderData.due_date,
        priority: reminderData.priority,
        status: reminderData.status,
      };
    }
    
    // Pass the bank account info to the onSave function
    onSave(preOrderData, validProducts, bankAccount, reminderToCreate);
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

  // Add handler for bank account change
  const handleBankAccountChange = (value: BankAccount) => {
    setBankAccount(value);
  };

  // Add helper function to display numeric values
  const displayNumericValue = (value: number | undefined): string => {
    if (value === undefined || value === 0) {
      return '';
    }
    return value.toString();
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
                          className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-gray-400"
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
                          className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-gray-400"
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
                  value={new Date(formData.created_at || new Date().toISOString()).toISOString().split('T')[0]}
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
                            value={editingFields[`price-${product.id}`] ? product.price : displayNumericValue(product.price)}
                            onChange={(e) => handleProductChange(product.id, 'price', e.target.value)}
                            onFocus={() => handlePriceFocus(product.id)}
                            onBlur={() => handlePriceBlur(product.id)}
                            className="w-full pl-12 pr-3 py-2 border border-gray-200 rounded-md bg-white text-black focus:outline-none focus:ring-1 focus:ring-gray-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            placeholder="0.00"
                          />
                          {errors[`product_price_${index}`] && (
                            <p className="text-red-500 text-xs mt-1">{errors[`product_price_${index}`]}</p>
                          )}
                        </div>
                      </div>

                      {/* Advance Payment for All Products */}
                      <div className="space-y-2">
                        <Label htmlFor={`product-advance-${index}`} className="block text-xs font-medium text-blue-600 dark:text-blue-300 ml-1">
                          Advance Payment
                        </Label>
                        <div className="relative rounded-md shadow-sm">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-600 dark:text-blue-400 pointer-events-none">
                            PKR
                          </span>
                          <input
                            id={`product-advance-${index}`}
                            type="number"
                            min="0"
                            step="0.01"
                            value={editingFields[`advance-${product.id}`] ? (product.advance_payment ?? 0) : displayNumericValue(product.advance_payment)}
                            onChange={(e) => handleProductChange(product.id, 'advance_payment', e.target.value)}
                            onFocus={() => setEditingFields(prev => ({ ...prev, [`advance-${product.id}`]: true }))}
                            onBlur={() => setEditingFields(prev => ({ ...prev, [`advance-${product.id}`]: false }))}
                            className="w-full pl-12 pr-3 py-2 border border-blue-200 dark:border-blue-800 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            placeholder="0.00"
                          />
                        </div>
                        <p className="text-xs text-blue-600 dark:text-blue-400 italic mt-1">
                          Advance payment for this product
                        </p>
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
                    PKR {formData.subtotal || 0}
                  </div>
                </div>
              </div>
              
              {/* New Products Section - Only show when editing */}
              {!isNew && products.some(p => p.isNew) && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-4 border border-blue-100 dark:border-blue-800">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-medium text-blue-800 dark:text-blue-300">New Products</h4>
                      <p className="text-sm text-blue-600 dark:text-blue-400">Products added in this edit</p>
                    </div>
                    <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                      PKR {products
                        .filter(p => p.isNew && p.product_name.trim() !== '')
                        .reduce((sum, p) => sum + (p.price * p.quantity), 0)}
                    </div>
                  </div>
                  
                  {/* List of new products */}
                  <div className="mt-3 space-y-2">
                    {products
                      .filter(p => p.isNew && p.product_name.trim() !== '')
                      .map((product, idx) => (
                        <div key={product.id} className="flex justify-between text-sm px-2 py-1 bg-blue-100/50 dark:bg-blue-800/30 rounded">
                          <span className="text-blue-700 dark:text-blue-300">
                            {product.product_name} {product.shade ? `(${product.shade})` : ''} x{product.quantity}
                          </span>
                          <div className="flex space-x-3">
                            <span className="font-medium text-blue-700 dark:text-blue-300">
                              PKR {product.price * product.quantity}
                            </span>
                            {(product.advance_payment ?? 0) > 0 && (
                              <span className="font-medium text-green-600 dark:text-green-400">
                                (Advance: PKR {product.advance_payment ?? 0})
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                  
                  {/* Total advance payment for new products */}
                  <div className="mt-4 pt-3 border-t border-blue-200 dark:border-blue-700 flex justify-between">
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                      Total Advance for New Products:
                    </span>
                    <span className="text-sm font-bold text-blue-700 dark:text-blue-300">
                      PKR {products
                        .filter(p => p.isNew && p.product_name.trim() !== '')
                        .reduce((sum, p) => {
                          const advancePayment = typeof p.advance_payment === 'string'
                            ? parseFloat(p.advance_payment)
                            : (p.advance_payment || 0);
                          return sum + advancePayment;
                        }, 0)}
                    </span>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* Only show the main delivery charges field */}
                <div>
                  <Label htmlFor="delivery_charges">Delivery Charges</Label>
                  <Input
                    type="number"
                    id="delivery_charges"
                    name="delivery_charges"
                    placeholder="0"
                    min="0"
                    value={editingFields.delivery_charges ? formData.delivery_charges : displayNumericValue(formData.delivery_charges)}
                    onChange={handleChange}
                    onFocus={handleNumberFocus}
                    onBlur={handleNumberBlur}
                    disabled={isSubmitting}
                    className={cn(errors.delivery_charges && "border-red-500", "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none")}
                  />
                  {errors.delivery_charges && (
                    <p className="text-red-500 text-xs mt-1">{errors.delivery_charges}</p>
                  )}
                </div>
                
                {/* Show bank account selector if any products have advance payments */}
                {products.some(p => (p.advance_payment ?? 0) > 0) && (
                  <div>
                    <Label htmlFor="bank_account">Bank Account for Advance Payment</Label>
                    <select
                      id="bank_account"
                      value={bankAccount}
                      onChange={(e) => handleBankAccountChange(e.target.value as BankAccount)}
                      disabled={isSubmitting}
                      className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-brand"
                    >
                      <option value="HBL">HBL</option>
                      <option value="Meezan">Meezan</option>
                      <option value="JazzCash">JazzCash</option>
                      <option value="EasyPaisa">EasyPaisa</option>
                    </select>
                  </div>
                )}
              </div>
              
              {/* Summary Amount section */}
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">Total Amount</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Subtotal + Delivery Charges</p>
                  </div>
                  <div className="text-xl font-bold text-green-600 dark:text-green-400">
                    PKR {(formData.subtotal || 0) + (formData.delivery_charges || 0)}
                    <span className="block text-xs text-gray-500 dark:text-gray-400 font-normal text-right">
                      (calculated by system)
                    </span>
                  </div>
                </div>
              </div>

              {/* Add Remaining Amount Preview - This is just a preview */}
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg mt-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">Remaining Amount</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Total Amount - Sum of Advance Payments
                    </p>
                  </div>
                  <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                    PKR {
                      (formData.subtotal || 0) + (formData.delivery_charges || 0) - 
                      products.reduce((sum, p) => {
                        // Ensure advance_payment is properly converted to a number
                        const advancePayment = typeof p.advance_payment === 'string' 
                          ? parseFloat(p.advance_payment) 
                          : (p.advance_payment || 0);
                        return sum + advancePayment;
                      }, 0)
                    }
                    <span className="block text-xs text-gray-500 dark:text-gray-400 font-normal text-right">
                      (calculated by system)
                    </span>
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
                    className="w-full bg-white dark:bg-gray-700 text-black dark:text-white border-gray-200 dark:border-gray-600 focus:border-gray-400 dark:focus:border-gray-500"
                  />
                  {errors.reminder_title && (
                    <p className="mt-1 text-sm text-red-500 dark:text-red-400">{errors.reminder_title}</p>
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
                  {errors.reminder_due_date && (
                    <p className="mt-1 text-sm text-red-500 dark:text-red-400">{errors.reminder_due_date}</p>
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