'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Reminder, ReminderPriority, ReminderStatus, Customer } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Bell, Package, User, Link as LinkIcon, ChevronsUpDown, Search, Calendar, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { modalStyles, animations } from '@/lib/theme-config';

interface ReminderEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  reminder: Reminder | null;
  onSave: (reminder: Reminder) => void;
  isSubmitting: boolean;
}

const ReminderEditModal: React.FC<ReminderEditModalProps> = ({
  isOpen,
  onClose,
  reminder,
  onSave,
  isSubmitting,
}) => {
  const [formData, setFormData] = useState<Reminder>({
    reminder_id: '',
    preorder_id: '',
    user_id: '',
    title: '',
    description: '',
    status: 'Pending',
    priority: 'Medium',
    due_date: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [linkToPreorder, setLinkToPreorder] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [searchedCustomers, setSearchedCustomers] = useState<Customer[]>([]);
  const [isSearchingCustomers, setIsSearchingCustomers] = useState(false);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [preorders, setPreorders] = useState<{ preorder_id: string; created_at: string }[]>([]);
  const [loadingPreorders, setLoadingPreorders] = useState(false);
  const customerDropdownRef = React.useRef<HTMLDivElement>(null);
  const preorderDropdownRef = React.useRef<HTMLDivElement>(null);

  // Initialize form data when modal opens or reminder changes
  useEffect(() => {
    if (isOpen && reminder) {
      setFormData({
        ...reminder,
        due_date: reminder.due_date ? new Date(reminder.due_date).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
      });
      
      // If this is an existing reminder with a preorder_id, set linkToPreorder to true
      if (reminder.preorder_id) {
        setLinkToPreorder(true);
        // Load the customer for this preorder
        loadPreorderCustomer(reminder.preorder_id);
      } else {
        setLinkToPreorder(false);
        setSelectedCustomer(null);
        setCustomerSearchQuery('');
      }
    }
  }, [isOpen, reminder]);

  // Load customers when the modal opens
  useEffect(() => {
    if (isOpen && !reminder?.reminder_id) {
      loadInitialCustomers();
    }
  }, [isOpen, reminder]);

  // Load customer preorders when a customer is selected
  useEffect(() => {
    if (selectedCustomer) {
      loadCustomerPreorders(selectedCustomer.customer_id);
    } else {
      setPreorders([]);
    }
  }, [selectedCustomer]);

  // Handle click outside customer dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target as Node)) {
        setShowCustomerDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Load initial customers for dropdown
  const loadInitialCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name')
        .limit(10);
      
      if (error) {
        console.error('Error loading initial customers:', error);
        return;
      }
      
      setCustomers(data || []);
    } catch (err) {
      console.error('Error loading initial customers:', err);
    }
  };

  // Search customers dynamically
  const searchCustomers = async (query: string) => {
    if (!query.trim()) {
      // If query is empty, load initial customers
      loadInitialCustomers();
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
        // If API returns no results, search directly in Supabase
        const { data, error } = await supabase
          .from('customers')
          .select('*')
          .or(`name.ilike.%${query}%,instagram_id.ilike.%${query}%,phone_number.ilike.%${query}%`)
          .order('name')
          .limit(10);
        
        if (error) {
          console.error('Error searching customers:', error);
          return;
        }
        
        setSearchedCustomers(data || []);
      }
    } catch (error) {
      console.error('Error searching customers:', error);
      
      // Fallback to direct Supabase search if API fails
      try {
        const { data, error } = await supabase
          .from('customers')
          .select('*')
          .or(`name.ilike.%${query}%,instagram_id.ilike.%${query}%,phone_number.ilike.%${query}%`)
          .order('name')
          .limit(10);
        
        if (error) {
          console.error('Error in fallback customer search:', error);
          return;
        }
        
        setSearchedCustomers(data || []);
      } catch (err) {
        console.error('Error in fallback customer search:', err);
      }
    } finally {
      setIsSearchingCustomers(false);
    }
  };

  // Debounce customer search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (showCustomerDropdown) {
        searchCustomers(customerSearchQuery);
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [customerSearchQuery, showCustomerDropdown]);

  // Load preorders for a specific customer
  const loadCustomerPreorders = async (customerId: string) => {
    try {
      setLoadingPreorders(true);
      
      const { data, error } = await supabase
        .from('preorders')
        .select('preorder_id, created_at')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error loading customer preorders:', error);
        return;
      }
      
      setPreorders(data || []);
    } catch (err) {
      console.error('Error loading customer preorders:', err);
    } finally {
      setLoadingPreorders(false);
    }
  };

  // Load customer for a specific preorder
  const loadPreorderCustomer = async (preorderId: string) => {
    try {
      const { data: preorderData, error: preorderError } = await supabase
        .from('preorders')
        .select('customer_id')
        .eq('preorder_id', preorderId)
        .single();
      
      if (preorderError || !preorderData) {
        console.error('Error loading preorder customer:', preorderError);
        return;
      }
      
      // Load customer details
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('customer_id', preorderData.customer_id)
        .single();
      
      if (customerError || !customerData) {
        console.error('Error loading customer details:', customerError);
        return;
      }
      
      setSelectedCustomer(customerData);
      setCustomerSearchQuery(customerData.name);
    } catch (err) {
      console.error('Error loading preorder customer:', err);
    }
  };

  // Handle form field changes
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error for this field if it exists
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Handle select changes
  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error for this field if it exists
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Handle customer search input
  const handleCustomerSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setCustomerSearchQuery(query);
    setShowCustomerDropdown(true);
  };

  // Handle customer selection
  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    setCustomerSearchQuery(customer.name);
    setShowCustomerDropdown(false);
    
    // Clear preorder selection when customer changes
    setFormData(prev => ({
      ...prev,
      preorder_id: ''
    }));
    
    // Clear error for customer if it exists
    if (errors.customer) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.customer;
        return newErrors;
      });
    }
  };

  // Toggle customer dropdown
  const toggleCustomerDropdown = () => {
    setShowCustomerDropdown(!showCustomerDropdown);
    if (!showCustomerDropdown && customers.length === 0) {
      loadInitialCustomers();
    }
  };

  // Handle link to preorder toggle
  const handleLinkToggle = (checked: boolean) => {
    setLinkToPreorder(checked);
    
    if (!checked) {
      // Clear customer and preorder selections when toggling off
      setSelectedCustomer(null);
      setCustomerSearchQuery('');
      setFormData(prev => ({
        ...prev,
        preorder_id: ''
      }));
    }
  };

  // Toggle preorder dropdown
  const togglePreorderDropdown = () => {
    // Implementation of togglePreorderDropdown
  };

  // Validate form before submission
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    
    if (!formData.due_date) {
      newErrors.due_date = 'Due date is required';
    }
    
    // If linking to preorder is enabled, require a preorder selection
    if (linkToPreorder) {
      if (!selectedCustomer) {
        newErrors.customer = 'Please select a customer';
      }
      
      if (!formData.preorder_id) {
        newErrors.preorder_id = 'Please select a preorder';
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
      // If not linking to a preorder, ensure preorder_id is empty
      const updatedReminder = {
        ...formData,
        preorder_id: linkToPreorder ? formData.preorder_id : '',
        updated_at: new Date().toISOString()
      };
      
      onSave(updatedReminder);
    } catch (error) {
      console.error('Error in form submission:', error);
    }
  };

  const isNewReminder = !formData.reminder_id;
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Get display text for customer
  const getCustomerDisplayText = (customer: Customer) => {
    if (customer.instagram_id) {
      return `${customer.name} (@${customer.instagram_id})`;
    }
    return customer.name;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn(
        "w-full max-w-[550px] p-0 overflow-hidden",
        "bg-white/95 dark:bg-gray-900/95 backdrop-blur-md",
        "border-2 border-purple-300/50 dark:border-purple-700/50",
        "shadow-elegant rounded-2xl"
      )}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <DialogHeader className={cn(
            "p-6 bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/20 dark:to-purple-900/10",
            "border-b border-purple-200/50 dark:border-purple-700/30"
          )}>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-purple-500/10 dark:bg-purple-500/20 rounded-full">
                <Bell className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">
                  {isNewReminder ? 'New Reminder' : 'Edit Reminder'}
                </DialogTitle>
                <DialogDescription className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {isNewReminder 
                    ? 'Create a new reminder by filling out the form below.' 
                    : 'Update the reminder details using the form below.'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <form onSubmit={handleSubmit}>
            <div className="p-6 space-y-5">
              {/* Link to Preorder Toggle (only for new reminders) */}
              {isNewReminder && (
                <div className="flex items-center justify-between p-4 rounded-xl bg-purple-50/80 dark:bg-purple-900/20 border border-purple-200/50 dark:border-purple-700/30">
                  <div className="space-y-0.5">
                    <Label htmlFor="link-preorder" className="text-base font-medium flex items-center text-gray-800 dark:text-gray-200">
                      <LinkIcon className="w-4 h-4 mr-2 text-purple-600 dark:text-purple-400" />
                      Link to Preorder
                    </Label>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Associate this reminder with a specific preorder
                    </p>
                  </div>
                  <Switch
                    id="link-preorder"
                    checked={linkToPreorder}
                    onCheckedChange={handleLinkToggle}
                    className="data-[state=checked]:bg-purple-600"
                  />
                </div>
              )}
              
              {/* Customer Selection (only if linking to preorder) */}
              {isNewReminder && linkToPreorder && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-2" 
                  ref={customerDropdownRef}
                >
                  <Label htmlFor="customer" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 ml-1 flex items-center">
                    <User className="w-4 h-4 mr-1.5 text-purple-500" />
                    Customer <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-purple-500/60" />
                    </div>
                    <button
                      type="button"
                      onClick={toggleCustomerDropdown}
                      className={cn(
                        "pl-12 w-full flex justify-between items-center",
                        "rounded-xl border bg-white/50 dark:bg-gray-800/50",
                        "text-gray-900 dark:text-white shadow-sm",
                        "ring-1 ring-inset transition-all duration-200 py-3 h-12 sm:text-sm text-left",
                        errors.customer 
                          ? "ring-red-500 focus:ring-red-500" 
                          : "ring-gray-300/50 dark:ring-gray-600/50 focus:ring-purple-500 focus:ring-2"
                      )}
                    >
                      <span className="truncate max-w-[calc(100%-2rem)] inline-block">
                        {selectedCustomer ? getCustomerDisplayText(selectedCustomer) : "Select customer..."}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </button>
                    
                    {showCustomerDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className={cn(
                          "absolute z-10 mt-1 w-full overflow-auto rounded-xl bg-white dark:bg-gray-800",
                          "border border-gray-200 dark:border-gray-700 shadow-lg max-h-60"
                        )}
                      >
                        <div className="sticky top-0 z-10 p-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-purple-500/60" />
                            <input
                              type="text"
                              value={customerSearchQuery}
                              onChange={handleCustomerSearch}
                              placeholder="Search by name or @instagram..."
                              className="w-full pl-10 pr-3 py-2 text-sm bg-gray-50/80 dark:bg-gray-700/50 rounded-lg border border-gray-200/70 dark:border-gray-700/70 focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                          </div>
                        </div>
                        <div className="max-h-[240px] overflow-y-auto">
                          {isSearchingCustomers ? (
                            <div className="p-4 text-center text-gray-500 dark:text-gray-400 flex items-center justify-center">
                              <div className="animate-spin mr-2 h-4 w-4 border-2 border-purple-500 border-t-transparent rounded-full"></div>
                              Searching...
                            </div>
                          ) : (searchedCustomers.length > 0 ? searchedCustomers : customers).length === 0 ? (
                            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                              No customers found
                            </div>
                          ) : (
                            (searchedCustomers.length > 0 ? searchedCustomers : customers).map(customer => (
                              <button
                                key={customer.customer_id}
                                onClick={() => handleCustomerSelect(customer)}
                                className={cn(
                                  "w-full text-left px-4 py-2 text-sm flex items-center space-x-2",
                                  "hover:bg-purple-50 dark:hover:bg-purple-900/20",
                                  "focus:bg-purple-100 dark:focus:bg-purple-900/30 focus:outline-none"
                                )}
                              >
                                <User className="h-4 w-4 text-purple-500" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                    {customer.name}
                                  </p>
                                  <div className="flex text-xs text-gray-500 dark:text-gray-400 space-x-2">
                                    {customer.instagram_id && (
                                      <span className="flex items-center">
                                        <span className="text-primary/70 dark:text-primary-light/70">@</span>{customer.instagram_id}
                                      </span>
                                    )}
                                    <span>{customer.phone_number}</span>
                                  </div>
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      </motion.div>
                    )}
                  </div>
                  {errors.customer && (
                    <p className="mt-1 text-sm text-red-500 flex items-center">
                      <AlertCircle className="h-3.5 w-3.5 mr-1" />
                      {errors.customer}
                    </p>
                  )}
                </motion.div>
              )}
              
              {/* Preorder Selection (only if linking to preorder) */}
              {isNewReminder && linkToPreorder && selectedCustomer && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-2"
                  ref={preorderDropdownRef}
                >
                  <Label htmlFor="preorder_id" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 ml-1 flex items-center">
                    <Package className="w-4 h-4 mr-1.5 text-purple-500" />
                    Preorder <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Select
                    value={formData.preorder_id}
                    onValueChange={(value) => handleSelectChange('preorder_id', value)}
                  >
                    <SelectTrigger className={cn(
                      "bg-white/50 dark:bg-gray-800/50 border-gray-200/70 dark:border-gray-700/70 rounded-xl h-12",
                      "focus:ring-purple-500",
                      errors.preorder_id ? "border-red-500 focus:ring-red-500" : ""
                    )}>
                      <SelectValue placeholder={loadingPreorders ? 'Loading preorders...' : 'Select a preorder'} />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-gray-800 border-gray-200/70 dark:border-gray-700/70 rounded-lg shadow-lg">
                      {loadingPreorders ? (
                        <div className="p-4 text-center text-gray-500 dark:text-gray-400 flex items-center justify-center">
                          <div className="animate-spin mr-2 h-4 w-4 border-2 border-purple-500 border-t-transparent rounded-full"></div>
                          Loading preorders...
                        </div>
                      ) : preorders.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                          No preorders found for this customer
                        </div>
                      ) : (
                        preorders.map(preorder => (
                          <SelectItem key={preorder.preorder_id} value={preorder.preorder_id} className="focus:bg-purple-100/50 dark:focus:bg-purple-900/20">
                            <div className="flex items-center py-1">
                              <Package className="w-4 h-4 mr-2 text-purple-500/70 dark:text-purple-400/70" />
                              <span className="truncate">{preorder.preorder_id} - {formatDate(preorder.created_at)}</span>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {errors.preorder_id && (
                    <p className="mt-1 text-sm text-red-500 flex items-center">
                      <AlertCircle className="h-3.5 w-3.5 mr-1" />
                      {errors.preorder_id}
                    </p>
                  )}
                </motion.div>
              )}
              
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 ml-1 flex items-center">
                  <Bell className="w-4 h-4 mr-1.5 text-purple-500" />
                  Title <span className="text-red-500 ml-1">*</span>
                </Label>
                <Input
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="Enter reminder title"
                  className={cn(
                    "bg-white/50 dark:bg-gray-800/50 border-gray-200/70 dark:border-gray-700/70 rounded-xl h-12",
                    "focus-visible:ring-purple-500",
                    errors.title && "border-red-500 focus-visible:ring-red-500"
                  )}
                />
                {errors.title && (
                  <p className="text-red-500 text-sm mt-1 flex items-center">
                    <AlertCircle className="w-3.5 h-3.5 mr-1" />
                    {errors.title}
                  </p>
                )}
              </div>
              
              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 ml-1 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1.5 text-purple-500" />
                  Description
                </Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description || ''}
                  onChange={handleChange}
                  placeholder="Enter reminder description"
                  className={cn(
                    "bg-white/50 dark:bg-gray-800/50 border-gray-200/70 dark:border-gray-700/70 rounded-xl min-h-[100px]",
                    "focus-visible:ring-purple-500",
                    errors.description && "border-red-500 focus-visible:ring-red-500"
                  )}
                  rows={3}
                />
              </div>
              
              {/* Due Date */}
              <div className="space-y-2">
                <Label htmlFor="due_date" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 ml-1 flex items-center">
                  <Calendar className="w-4 h-4 mr-1.5 text-purple-500" />
                  Due Date <span className="text-red-500 ml-1">*</span>
                </Label>
                <Input
                  id="due_date"
                  name="due_date"
                  type="datetime-local"
                  value={formData.due_date ? new Date(formData.due_date).toISOString().slice(0, 16) : ''}
                  onChange={handleChange}
                  className={cn(
                    "bg-white/50 dark:bg-gray-800/50 border-gray-200/70 dark:border-gray-700/70 rounded-xl h-12",
                    "focus-visible:ring-purple-500",
                    errors.due_date && "border-red-500 focus-visible:ring-red-500"
                  )}
                />
                {errors.due_date && (
                  <p className="text-red-500 text-sm mt-1 flex items-center">
                    <AlertCircle className="w-3.5 h-3.5 mr-1" />
                    {errors.due_date}
                  </p>
                )}
              </div>
              
              {/* Priority and Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Priority */}
                <div className="space-y-2">
                  <Label htmlFor="priority" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 ml-1 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1.5 text-purple-500" />
                    Priority
                  </Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) => handleSelectChange('priority', value)}
                  >
                    <SelectTrigger className="bg-white/50 dark:bg-gray-800/50 border-gray-200/70 dark:border-gray-700/70 rounded-xl h-12 focus:ring-purple-500">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low" className="flex items-center py-1.5">
                        <div className="w-2 h-2 rounded-full bg-success mr-2"></div>
                        Low
                      </SelectItem>
                      <SelectItem value="Medium" className="flex items-center py-1.5">
                        <div className="w-2 h-2 rounded-full bg-warning mr-2"></div>
                        Medium
                      </SelectItem>
                      <SelectItem value="High" className="flex items-center py-1.5">
                        <div className="w-2 h-2 rounded-full bg-secondary mr-2"></div>
                        High
                      </SelectItem>
                      <SelectItem value="Urgent" className="flex items-center py-1.5">
                        <div className="w-2 h-2 rounded-full bg-destructive mr-2"></div>
                        Urgent
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Status */}
                <div className="space-y-2">
                  <Label htmlFor="status" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 ml-1 flex items-center">
                    <Clock className="w-4 h-4 mr-1.5 text-purple-500" />
                    Status
                  </Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => handleSelectChange('status', value)}
                  >
                    <SelectTrigger className="bg-white/50 dark:bg-gray-800/50 border-gray-200/70 dark:border-gray-700/70 rounded-xl h-12 focus:ring-purple-500">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pending" className="flex items-center py-1.5">
                        <Clock className="h-4 w-4 mr-2 text-amber-500" />
                        Pending
                      </SelectItem>
                      <SelectItem value="In Progress" className="flex items-center py-1.5">
                        <div className="animate-spin h-4 w-4 mr-2 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                        In Progress
                      </SelectItem>
                      <SelectItem value="Completed" className="flex items-center py-1.5">
                        <div className="h-4 w-4 mr-2 rounded-full bg-green-500 flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                        </div>
                        Completed
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            {/* Form Actions */}
            <DialogFooter className="p-6 bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/20 dark:to-purple-900/10 border-t border-purple-200/50 dark:border-purple-700/30 flex justify-end space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {isSubmitting ? (
                  <div className="flex items-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Saving...
                  </div>
                ) : (
                  'Save Reminder'
                )}
              </Button>
            </DialogFooter>
          </form>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};

export default ReminderEditModal; 