import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PaymentWithDetails, Payment, PaymentPurpose, BankAccount, Customer, PreOrderWithDetails, PreOrderItem } from '@/lib/types';
import { createPayment, updatePayment, getCustomers, getPreOrdersByCustomerId } from '@/lib/api';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/lib/supabase';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronsUpDown, Upload, X, Loader2, Image as ImageIcon, Hash, CreditCard, User, Package, Calendar, ExternalLink } from 'lucide-react';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface ImprovedPaymentModalProps {
  payment: PaymentWithDetails | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  isEditing: boolean;
}

// File upload props
interface FileUploadProps {
  onFileUpload: (url: string) => void;
  existingUrl?: string;
  disabled?: boolean;
}

// Product payment interfaces
interface ProductPayment {
  preorder_item_id: string;
  amount: number;
}

interface ProductPaymentData {
  preorder_item_id: string;
  product_name: string;
  shade?: string;
  size?: string;
  amount: number;
  original_advance_payment: number;
  has_automatic_payment: boolean;
}

// Form data interface
interface FormData {
  payment_id?: string;
  customer_id?: string;
  preorder_id?: string;
  amount?: number;
  payment_purpose?: PaymentPurpose;
  bank_account?: BankAccount;
  tally?: boolean;
  payment_screenshot?: string;
  payment_date?: string;
  product_payments?: ProductPayment[];
}

const ImprovedPaymentModal: React.FC<ImprovedPaymentModalProps> = ({
  payment,
  isOpen,
  onClose,
  onSave,
  isEditing,
}) => {
  // Selection method state
  const [selectionMethod, setSelectionMethod] = useState<'customer' | 'order'>('customer');
  
  // Form state
  const [formData, setFormData] = useState<FormData>({
    customer_id: '',
    preorder_id: '',
    amount: 0,
    payment_purpose: 'advance',
    bank_account: 'HBL',
    tally: false,
    payment_screenshot: '',
    payment_date: new Date().toISOString().split('T')[0],
    product_payments: []
  });
  
  // Data for dropdowns
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [preOrders, setPreOrders] = useState<PreOrderWithDetails[]>([]);
  
  // Loading states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const [isLoadingPreOrders, setIsLoadingPreOrders] = useState(false);
  
  // Customer search state
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const [customerSearchValue, setCustomerSearchValue] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  
  // Pre-Order search state
  const [preOrderSearchOpen, setPreOrderSearchOpen] = useState(false);
  const [preOrderSearchValue, setPreOrderSearchValue] = useState("");
  const [selectedPreOrder, setSelectedPreOrder] = useState<PreOrderWithDetails | null>(null);
  const [filteredPreOrders, setFilteredPreOrders] = useState<PreOrderWithDetails[]>([]);
  
  // Add file upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Product payment state
  const [selectedProducts, setSelectedProducts] = useState<ProductPaymentData[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [automaticPayments, setAutomaticPayments] = useState<{[key: string]: boolean}>({});
  
  // Load initial data when modal opens
  useEffect(() => {
    if (isOpen) {
      if (isEditing && payment) {
        // Editing existing payment
        setFormData({
          ...payment,
          payment_date: payment.payment_date ? new Date(payment.payment_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        });
        
        // Set selected customer
        if (payment.customer_id) {
          const customer = customers.find(c => c.customer_id === payment.customer_id);
          if (customer) {
            setSelectedCustomer(customer);
            setCustomerSearchValue(customer.name);
          }
        }
        
        // Set selected pre-order
        if (payment.preorder_id) {
          const preOrder = preOrders.find(p => p.preorder_id === payment.preorder_id);
          if (preOrder) {
            setSelectedPreOrder(preOrder);
            setPreOrderSearchValue(preOrder.preorder_id);
          }
        }
        
        // Set receipt image preview if available
        if (payment.payment_screenshot) {
          setPreviewUrl(payment.payment_screenshot);
        }
      } else {
        // Creating new payment
        setFormData({
          customer_id: '',
          preorder_id: '',
          amount: 0,
          payment_purpose: 'advance',
          bank_account: 'HBL',
          tally: false,
          payment_screenshot: '',
          payment_date: new Date().toISOString().split('T')[0],
          product_payments: []
        });
        
        // Reset selection method and selected customer
        setSelectionMethod('customer');
        setSelectedCustomer(null);
        setPreviewUrl(null);
      }
      
      // Load customers for dropdown
      loadCustomers();
    }
  }, [isOpen, isEditing, payment]);
  
  // Load customers
  const loadCustomers = async () => {
    try {
      setIsLoadingCustomers(true);
      const response = await getCustomers();
      if (response.error) {
        throw response.error;
      }
      setCustomers(response.data || []);
      setFilteredCustomers(response.data || []);
    } catch (error) {
      console.error('Error loading customers:', error);
      toast.error('Failed to load customers');
    } finally {
      setIsLoadingCustomers(false);
    }
  };
  
  // Load pre-orders by customer
  const loadPreOrdersByCustomer = async (customerId: string) => {
    try {
      setIsLoadingPreOrders(true);
      const response = await getPreOrdersByCustomerId(customerId);
      if (response.error) {
        throw response.error;
      }
      setPreOrders(response.data || []);
      setFilteredPreOrders(response.data || []);
    } catch (error) {
      console.error('Error loading pre-orders:', error);
      toast.error('Failed to load pre-orders');
    } finally {
      setIsLoadingPreOrders(false);
    }
  };
  
  // Handle customer selection
  const handleCustomerChange = (customerId: string) => {
    setFormData(prev => ({ ...prev, customer_id: customerId, preorder_id: '' }));
    
    // Find the selected customer
    const customer = customers.find(c => c.customer_id === customerId);
    if (customer) {
      setSelectedCustomer(customer);
    }
    
    if (customerId) {
      loadPreOrdersByCustomer(customerId);
    } else {
      setPreOrders([]);
      setSelectedCustomer(null);
    }
  };
  
  // Handle pre-order selection
  const handlePreOrderChange = async (preOrderId: string) => {
    setFormData(prev => ({ ...prev, preorder_id: preOrderId }));
    
    if (!preOrderId) {
      setSelectedPreOrder(null);
      return;
    }
    
    try {
      // Fetch the latest preorder data
      const { data, error } = await supabase
        .from('preorders')
        .select('*, customers(*)')
        .eq('preorder_id', preOrderId)
        .single();
      
      if (error) {
        console.error('Error fetching preorder details:', error);
        toast.error('Failed to fetch preorder details');
        return;
      }
      
      if (data) {
        // Create a PreOrderWithDetails object from the fetched data
        const preOrderWithDetails: PreOrderWithDetails = {
          ...data,
          customer: data.customers,
          flight: { flight_id: data.flight_id, flight_name: '', shipment_date: '', status: 'scheduled' }
        };
        
        setSelectedPreOrder(preOrderWithDetails);
        
        // Set the customer if in customer selection mode
        if (selectionMethod === 'customer' && data.customers) {
          setSelectedCustomer(data.customers);
          setFormData(prev => ({ ...prev, customer_id: data.customer_id }));
        }
        
        // Set payment purpose based on remaining amount
        if (data.remaining_amount > 0) {
          setFormData(prev => ({ 
            ...prev, 
            payment_purpose: 'final_remaining' as PaymentPurpose
          }));
        } else {
          setFormData(prev => ({ 
            ...prev, 
            payment_purpose: 'advance' as PaymentPurpose
          }));
        }
      }

      // Fetch products and automatic payments
      const [itemsResult, automaticPaymentsResult] = await Promise.all([
        // Get items
        supabase
          .from('preorder_items')
          .select('*')
          .eq('preorder_id', preOrderId),
          
        // Get automatic payments for this preorder
        supabase
          .from('payments')
          .select('*')
          .eq('preorder_id', preOrderId)
          .eq('is_automatic', true)
      ]);
      
      const itemsData = itemsResult.data;
      const itemsError = itemsResult.error;
      const paymentsData = automaticPaymentsResult.data;
      const paymentsError = automaticPaymentsResult.error;
      
      if (itemsError) {
        console.error('Error fetching preorder items:', itemsError);
      } else if (itemsData) {
        // Initialize automatic payments tracking
        const automaticPaymentsMap: {[key: string]: boolean} = {};
        
        if (!paymentsError && paymentsData) {
          for (const payment of paymentsData) {
            if (payment.preorder_item_id) {
              automaticPaymentsMap[payment.preorder_item_id] = true;
            }
          }
        }
        
        setAutomaticPayments(automaticPaymentsMap);
        
        // Initialize selected products with their current advance payments
        const productsData: ProductPaymentData[] = itemsData.map(item => ({
          preorder_item_id: item.preorder_item_id || '',
          product_name: item.product_name,
          shade: item.shade ?? '',
          size: item.size ?? '',
          amount: 0, // Initialize with zero payment
          original_advance_payment: item.advance_payment ?? 0,
          has_automatic_payment: automaticPaymentsMap[item.preorder_item_id] || false
        }));
        setSelectedProducts(productsData);
      }
    } catch (error) {
      console.error('Error in handlePreOrderChange:', error instanceof Error ? error.message : String(error));
    }
  };
  
  // Handle pre-order ID input for order selection method
  const handlePreOrderIdInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const preOrderId = e.target.value;
    setFormData(prev => ({ ...prev, preorder_id: preOrderId }));
    
    // If a valid pre-order ID is entered, try to fetch the customer
    if (preOrderId && preOrderId.trim().length > 0) {
      try {
        setIsLoadingPreOrders(true);
        const { data, error } = await supabase
          .from('preorders')
          .select('*, customers(*)')
          .eq('preorder_id', preOrderId)
          .single();
          
        if (error) {
          // Don't throw an error for "not found" - this is expected during typing
          if (error.code !== 'PGRST116') { // PGRST116 is the "not found" error code
            console.error('Error fetching pre-order:', error.message || error);
          }
          return;
        }
        
        if (data && data.customer_id) {
          setFormData(prev => ({ ...prev, customer_id: data.customer_id }));
          
          // Also set the selectedPreOrder to show the details
          const preOrderWithDetails: PreOrderWithDetails = {
            ...data,
            customer: data.customers,
            flight: data.flight_id ? { flight_id: data.flight_id, flight_name: '', shipment_date: '', status: 'scheduled' } : undefined
          };
          setSelectedPreOrder(preOrderWithDetails);
          
          // Fetch customer details
          try {
            const { data: customerData, error: customerError } = await supabase
              .from('customers')
              .select('*')
              .eq('customer_id', data.customer_id)
              .single();
              
            if (customerError) {
              console.error('Error fetching customer details:', customerError.message || customerError);
              return;
            }
            
            if (customerData) {
              setSelectedCustomer(customerData as Customer);
            }
          } catch (customerFetchError) {
            console.error('Exception fetching customer details:', customerFetchError);
          }
        }
      } catch (error) {
        console.error('Exception in pre-order search:', error);
      } finally {
        setIsLoadingPreOrders(false);
      }
    } else {
      // Clear customer data if pre-order ID is empty
      setFormData(prev => ({ ...prev, customer_id: '' }));
      setSelectedCustomer(null);
      setSelectedPreOrder(null);
    }
  };
  
  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Handle numeric inputs
    if (name === 'amount') {
      // Convert empty string to 0 for form data, but the input field can still show empty
      const numValue = value === '' ? 0 : parseFloat(value);
      setFormData(prev => ({ ...prev, [name]: numValue }));
      return;
    }
    
    // For all other inputs, just update the value
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle amount focus
  const handleAmountFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    const { value } = e.target;
    if (parseFloat(value) === 0) {
      e.target.select();
    }
  };
  
  // Handle checkbox changes
  const handleCheckboxChange = (checked: boolean) => {
    setFormData(prev => ({ ...prev, tally: checked }));
  };
  
  // Handle select changes
  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // Check if storage bucket exists
  const checkStorageBucket = async (bucketName: string): Promise<boolean> => {
    try {
      // List buckets to check if our bucket exists
      const { data: buckets, error } = await supabase.storage.listBuckets();
      
      if (error) {
        console.error('Error checking storage buckets:', error);
        return false;
      }
      
      // Check if our bucket exists in the list
      const bucketExists = buckets.some(bucket => bucket.name === bucketName);
      
      if (!bucketExists) {
        console.log(`Bucket "${bucketName}" does not exist, attempting to create it...`);
        
        // Try to create the bucket with public access and RLS policies that allow uploads
        const { data, error: createError } = await supabase.storage.createBucket(bucketName, {
          public: true, // Make the bucket public
          fileSizeLimit: 5 * 1024 * 1024, // 5MB limit
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        });
        
        if (createError) {
          console.error(`Error creating bucket "${bucketName}":`, createError);
          return false;
        }
        
        // After creating the bucket, we need to update its RLS policies to allow uploads
        // This requires admin privileges, so we'll need to handle this on the server side
        // For now, we'll assume the bucket exists but might not have proper permissions
        console.log(`Successfully created bucket "${bucketName}"`);
        return true;
      }
      
      return true;
    } catch (error) {
      console.error('Error checking storage bucket:', error);
      return false;
    }
  };
  
  // Check if user is authenticated with Supabase
  const checkAuthentication = async (): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error checking authentication:', error);
        return false;
      }
      
      if (!data.session) {
        console.error('No active session found');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Exception checking authentication:', error);
      return false;
    }
  };
  
  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      setIsUploading(true);
      
      // Create a local preview
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      
      // Read the file as a data URL
      const reader = new FileReader();
      
      // Create a promise to handle the FileReader
      const readFileAsDataURL = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            resolve(reader.result);
          } else {
            reject(new Error('Failed to read file as data URL'));
          }
        };
        reader.onerror = () => {
          reject(reader.error || new Error('Unknown error reading file'));
        };
        reader.readAsDataURL(file);
      });
      
      // Wait for the file to be read
      const dataUrl = await readFileAsDataURL;
      
      // Use the data URL as the image source
      setFormData(prev => ({ ...prev, payment_screenshot: dataUrl }));
      
      toast.success('Screenshot processed successfully');
    } catch (error) {
      console.error('Error processing file:', error);
      toast.error('Failed to process screenshot. Please try again.');
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  // Remove uploaded file
  const handleRemoveFile = () => {
    setPreviewUrl(null);
    setFormData(prev => ({ ...prev, payment_screenshot: '' }));
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsSubmitting(true);
      
      // Ensure amount is a number before submission
      const submissionData = {
        ...formData,
        amount: typeof formData.amount === 'string' ? parseFloat(formData.amount) || 0 : formData.amount
      };
      
      // Validate required fields
      if (!submissionData.customer_id) {
        throw new Error('Customer is required');
      }
      
      if (!submissionData.preorder_id) {
        throw new Error('Pre-order is required');
      }

      if (submissionData.amount <= 0) {
        throw new Error('Payment amount must be greater than zero');
      }
      
      // Create a copy of submission data without product_payments for the API call
      const paymentData: Partial<Payment> = { 
        ...submissionData, 
        is_automatic: false 
      };
      delete (paymentData as any).product_payments;
      
      // Add preorder_item_id to the payment if it's for a specific product
      if (selectedProductId) {
        paymentData.preorder_item_id = selectedProductId;
        paymentData.advance_payment = submissionData.amount || 0;
      }
      
      // Update product advance payment in preorder_items table only
      if (selectedProductId && (submissionData.amount || 0) > 0) {
        try {
          // Get current advance payment
          const { data: item, error: itemError } = await supabase
            .from('preorder_items')
            .select('advance_payment')
            .eq('preorder_item_id', selectedProductId)
            .single();
          
          if (itemError) {
            console.error('Error fetching item for advance update:', itemError);
            throw new Error('Could not find the product to update advance payment');
          }
          
          // Calculate new advance payment
          const currentAdvance = item.advance_payment || 0;
          const newAdvance = currentAdvance + (submissionData.amount || 0);
          
          // Update advance payment
          const { error: updateError } = await supabase
            .from('preorder_items')
            .update({ advance_payment: newAdvance })
            .eq('preorder_item_id', selectedProductId);
          
          if (updateError) {
            console.error('Error updating product advance payment:', updateError);
            throw new Error('Failed to update product advance payment');
          } else {
            console.log(`Updated advance for product ${selectedProductId} from ${currentAdvance} to ${newAdvance}`);
          }
        } catch (error) {
          console.error('Error handling product payments:', error instanceof Error ? error.message : String(error));
          toast.error('Error updating product advance payments');
          throw error; // Re-throw to stop payment creation if product update fails
        }
      }
      
      // Submit the payment
      let result;
      if (isEditing) {
        result = await updatePayment(paymentData as Payment);
      } else {
        // For new payments, remove payment_id
        const newPaymentData = { ...paymentData };
        delete newPaymentData.payment_id;
        
        // Create payment
        result = await createPayment(newPaymentData as Payment);
      }
      
      if (result.error) {
        throw new Error(String(result.error));
      }
      
      toast.success(`Payment ${isEditing ? 'updated' : 'created'} successfully`);
      onSave();
      onClose();
    } catch (error) {
      console.error('Error submitting payment:', error);
      toast.error(typeof error === 'string' ? error : error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Reset form when selection method changes
  useEffect(() => {
    if (selectionMethod === 'order') {
      setFormData(prev => ({ ...prev, customer_id: '', preorder_id: '' }));
      setSelectedCustomer(null);
      setSelectedPreOrder(null);
    } else {
      setFormData(prev => ({ ...prev, preorder_id: '' }));
      setSelectedPreOrder(null);
    }
  }, [selectionMethod]);
  
  // Filter customers when search value changes
  const filterCustomers = (searchTerm: string) => {
    if (!searchTerm) return customers;
    
    // Convert search term to lowercase for case-insensitive comparison
    const searchTermLower = searchTerm.toLowerCase();
    
    return customers.filter(customer => {
      // Check name
      const nameMatch = customer.name.toLowerCase().includes(searchTermLower);
      
      // Check phone (if exists)
      const phoneMatch = customer.phone_number && customer.phone_number.toLowerCase().includes(searchTermLower);
      
      // Check Instagram ID (if exists)
      const instagramMatch = customer.instagram_id && 
        customer.instagram_id.toLowerCase().includes(searchTermLower);
      
      // Return true if any field matches
      return nameMatch || phoneMatch || instagramMatch;
    });
  };
  
  // Update filtered customers when search value changes
  useEffect(() => {
    console.log('Filtering customers with search term:', customerSearchValue);
    const filtered = filterCustomers(customerSearchValue);
    console.log('Filtered customers count:', filtered.length);
    setFilteredCustomers(filtered);
  }, [customerSearchValue, customers]);
  
  // Filter pre-orders when search value changes
  useEffect(() => {
    if (preOrders.length > 0) {
      const searchTerm = preOrderSearchValue.toLowerCase().trim();
      console.log('Pre-order search term:', searchTerm);
      console.log('Total pre-orders before filtering:', preOrders.length);
      
      if (!searchTerm) {
        setFilteredPreOrders(preOrders);
        console.log('No search term, showing all pre-orders:', preOrders.length);
        return;
      }
      
      const filtered = preOrders.filter(preOrder => {
        // Check pre-order ID
        const idMatch = preOrder.preorder_id.toLowerCase().includes(searchTerm);
        
        // Check flight name
        const flightMatch = preOrder.flight?.flight_name && 
          preOrder.flight.flight_name.toLowerCase().includes(searchTerm);
          
        // Check product details (if exists)
        const productMatch = preOrder.items && preOrder.items.length > 0 &&
          preOrder.items.some(item => 
            item.product_name.toLowerCase().includes(searchTerm) ||
            item.shade.toLowerCase().includes(searchTerm) ||
            item.size.toLowerCase().includes(searchTerm)
          );
          
        // Check date (formatted)
        const dateStr = new Date(preOrder.created_at).toLocaleDateString();
        const dateMatch = dateStr.includes(searchTerm);
        
        return idMatch || flightMatch || productMatch || dateMatch;
      });
      
      console.log('Filtered pre-orders:', filtered.length);
      setFilteredPreOrders(filtered);
    } else {
      console.log('No pre-orders loaded yet');
    }
  }, [preOrderSearchValue, preOrders]);
  
  // Add a helper function to display the amount properly in the input field
  const displayAmount = (amount: number | undefined): string => {
    if (amount === undefined || amount === 0) {
      return '';
    }
    return amount.toString();
  };
  
  // Update the handleProductPaymentChange function
  const handleProductPaymentChange = (amount: number) => {
    // Update the form data with the payment amount
    setFormData(prev => ({ ...prev, amount: amount }));
  };

  // Add function to handle product selection
  const handleProductSelection = (productId: string) => {
    setSelectedProductId(productId);
    // Reset the payment amount when switching products
    setFormData(prev => ({ ...prev, amount: 0 }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="p-0 max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="px-6 pt-6 pb-2">
          <div className="flex items-center gap-3">
            <div className="bg-purple-500/20 dark:bg-purple-500/30 p-2 rounded-xl">
              <CreditCard className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <DialogTitle className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
              {isEditing ? 'Edit Payment' : 'New Payment'}
            </DialogTitle>
          </div>
          <DialogDescription>
            {isEditing ? 'Edit payment details using the form below.' : 'Create a new payment by filling out the form below.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="p-6">
            {/* Customer/Order Selection Method - Only for new payments */}
            {!isEditing && (
              <div className="mb-6 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <h3 className="text-md font-semibold mb-3">Payment Selection Method</h3>
                
                <div className="flex space-x-4">
                  <div className="flex items-center">
                    <input
                      id="customer-method"
                      type="radio"
                      value="customer"
                      checked={selectionMethod === 'customer'}
                      onChange={() => setSelectionMethod('customer')}
                      className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500"
                    />
                    <label htmlFor="customer-method" className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Select by Customer
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      id="order-method"
                      type="radio"
                      value="order"
                      checked={selectionMethod === 'order'}
                      onChange={() => setSelectionMethod('order')}
                      className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500"
                    />
                    <label htmlFor="order-method" className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Enter Pre-Order ID
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Customer Selection */}
            {selectionMethod === 'customer' && !isEditing && (
              <div className="mb-6">
                <Label htmlFor="customer_search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Select Customer
                </Label>
                <div className="relative">
                  <Input
                    id="customer_search"
                    type="text"
                    placeholder="Search by name, phone, or Instagram ID"
                    value={customerSearchValue}
                    onChange={(e) => {
                      setCustomerSearchValue(e.target.value);
                      setCustomerSearchOpen(true);
                    }}
                    onClick={() => setCustomerSearchOpen(true)}
                    className="w-full"
                    disabled={isLoadingCustomers || isSubmitting}
                  />
                  
                  {customerSearchOpen && (
                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg">
                      <div className="max-h-[200px] overflow-y-auto py-1">
                        {isLoadingCustomers ? (
                          <div className="p-2 text-sm text-gray-500 dark:text-gray-400">Loading customers...</div>
                        ) : filteredCustomers.length === 0 ? (
                          <div className="p-2 text-sm text-gray-500 dark:text-gray-400">No customer found.</div>
                        ) : (
                          filteredCustomers.map((customer) => (
                            <div
                              key={customer.customer_id}
                              className="p-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
                              onClick={() => {
                                handleCustomerChange(customer.customer_id);
                                setCustomerSearchOpen(false);
                                setCustomerSearchValue(customer.name);
                              }}
                            >
                              <div className="flex items-center">
                                {formData.customer_id === customer.customer_id && (
                                  <Check className="mr-2 h-4 w-4" />
                                )}
                                <span className="font-medium">{customer.name}</span>
                              </div>
                              <div className="ml-6 text-xs text-gray-500 dark:text-gray-400">
                                {customer.phone_number && <span className="block">{customer.phone_number}</span>}
                                {customer.instagram_id && <span className="block">@{customer.instagram_id}</span>}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                  
                  {customerSearchOpen && (
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setCustomerSearchOpen(false)}
                    />
                  )}
                </div>
              </div>
            )}
            
            {/* Pre-Order ID Input */}
            {selectionMethod === 'order' && !isEditing && (
              <div className="mb-6">
                <Label htmlFor="preorder_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Enter Pre-Order ID
                </Label>
                <Input
                  id="preorder_id"
                  value={formData.preorder_id}
                  onChange={handlePreOrderIdInput}
                  placeholder="e.g., PRE-00012"
                  className="w-full"
                  disabled={isSubmitting}
                />
              </div>
            )}
            
            {/* Pre-Order Selection */}
            {selectionMethod === 'customer' && selectedCustomer && !isEditing && (
              <div className="mb-6">
                <Label htmlFor="preorder_search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Select Pre-Order
                </Label>
                <div className="relative">
                  <Input
                    id="preorder_search"
                    type="text"
                    placeholder="Search by ID or flight name"
                    value={preOrderSearchValue}
                    onChange={(e) => {
                      setPreOrderSearchValue(e.target.value);
                      setPreOrderSearchOpen(true);
                    }}
                    onClick={() => setPreOrderSearchOpen(true)}
                    className="w-full"
                    disabled={isLoadingPreOrders || isSubmitting}
                  />
                  
                  {preOrderSearchOpen && (
                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg">
                      <div className="max-h-[200px] overflow-y-auto py-1">
                        {isLoadingPreOrders ? (
                          <div className="p-2 text-sm text-gray-500 dark:text-gray-400">Loading pre-orders...</div>
                        ) : filteredPreOrders.length === 0 ? (
                          <div className="p-2 text-sm text-gray-500 dark:text-gray-400">No pre-orders found.</div>
                        ) : (
                          filteredPreOrders.map((preOrder) => (
                            <div
                              key={preOrder.preorder_id}
                              className="p-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
                              onClick={() => {
                                handlePreOrderChange(preOrder.preorder_id);
                                setPreOrderSearchOpen(false);
                                setPreOrderSearchValue(preOrder.preorder_id);
                              }}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                  {formData.preorder_id === preOrder.preorder_id && (
                                    <Check className="mr-2 h-4 w-4" />
                                  )}
                                  <span className="font-medium">{preOrder.preorder_id}</span>
                                </div>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {new Date(preOrder.created_at).toLocaleDateString()}
                                </span>
                              </div>
                              <div className="ml-6 text-xs text-gray-500 dark:text-gray-400">
                                {preOrder.flight?.flight_name && <span>Flight: {preOrder.flight.flight_name}</span>}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                  
                  {preOrderSearchOpen && (
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setPreOrderSearchOpen(false)}
                    />
                  )}
                </div>
              </div>
            )}

            {/* Selected Pre-Order Details */}
            {selectedPreOrder && (
              <div className="mb-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold text-lg text-gray-900 dark:text-white">Pre-Order Details</h3>
                </div>
                
                <div className="p-4">
                  {/* Customer and Order Summary Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {/* Left Column - Customer Details */}
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <User className="h-5 w-5 text-purple-500" />
                        <h4 className="font-medium text-gray-900 dark:text-white">Customer Information</h4>
                      </div>
                      <div className="ml-7 space-y-1">
                        <p className="text-gray-900 dark:text-white">{selectedPreOrder.customer?.name || 'N/A'}</p>
                        {selectedPreOrder.customer?.phone_number && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">{selectedPreOrder.customer.phone_number}</p>
                        )}
                        {selectedPreOrder.customer?.instagram_id && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">@{selectedPreOrder.customer.instagram_id}</p>
                        )}
                      </div>
                    </div>
                    
                    {/* Right Column - Order Details */}
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <Package className="h-5 w-5 text-purple-500" />
                        <h4 className="font-medium text-gray-900 dark:text-white">Order Information</h4>
                      </div>
                      <div className="ml-7 space-y-1">
                        <p className="text-gray-900 dark:text-white">ID: {selectedPreOrder.preorder_id}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Status: <span className="capitalize">{selectedPreOrder.order_status}</span>
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Created: {formatDate(selectedPreOrder.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Financial Summary */}
                  <div className="bg-gray-50 dark:bg-gray-800/80 p-4 rounded-md border border-gray-200 dark:border-gray-700 mb-4">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">Financial Summary</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                        <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(selectedPreOrder.subtotal)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Delivery:</span>
                        <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(selectedPreOrder.delivery_charges)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Total:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {formatCurrency(selectedPreOrder.subtotal + selectedPreOrder.delivery_charges)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Remaining:</span>
                        <span className="font-medium text-amber-600 dark:text-amber-400">
                          {formatCurrency(selectedPreOrder.remaining_amount || 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Products Section */}
                  {selectedProducts.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white mb-3">Products</h4>
                      <div className="space-y-3 mb-4">
                        {selectedProducts.map((product) => (
                          <div 
                            key={product.preorder_item_id} 
                            className={`p-3 border rounded-md ${
                              product.has_automatic_payment ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20' : 'border-gray-200 dark:border-gray-700'
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white">{product.product_name}</p>
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                  {product.shade && <span>Shade: {product.shade}</span>}
                                  {product.shade && product.size && <span> | </span>}
                                  {product.size && <span>Size: {product.size}</span>}
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-green-600 dark:text-green-400">
                                  Advance: {formatCurrency(product.original_advance_payment)}
                                </p>
                                {product.has_automatic_payment && (
                                  <p className="text-xs text-green-500 dark:text-green-400 mt-1">
                                    Auto-payment tracked
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Payment Info Section */}
            {selectedPreOrder && (
              <div className="mb-6">
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <div className="bg-purple-50 dark:bg-purple-900/20 p-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="font-semibold text-lg text-gray-900 dark:text-white">Payment Information</h3>
                  </div>
                  
                  <div className="p-4">
                    {/* Product Selection */}
                    <div className="mb-4">
                      <Label htmlFor="product-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Select Product for Payment
                      </Label>
                      <Select 
                        value={selectedProductId} 
                        onValueChange={handleProductSelection}
                        disabled={isSubmitting}
                      >
                        <SelectTrigger id="product-select" className="w-full">
                          <SelectValue placeholder="Select a product" />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700">
                          {selectedProducts.map((product) => (
                            <SelectItem key={product.preorder_item_id} value={product.preorder_item_id}>
                              {product.product_name} {product.shade && `(${product.shade})`} {product.size && `- ${product.size}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Payment Amount */}
                    <div className="mb-4">
                      <Label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Payment Amount
                      </Label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 sm:text-sm">$</span>
                        </div>
                        <Input
                          id="amount"
                          name="amount"
                          type="number"
                          step="0.01"
                          min="0"
                          value={displayAmount(formData.amount)}
                          onChange={handleInputChange}
                          className="pl-7"
                          placeholder="0.00"
                          required
                          disabled={isSubmitting || !selectedProductId}
                        />
                      </div>
                      
                      {/* Show calculated new total if product is selected */}
                      {selectedProductId && formData.amount > 0 && (() => {
                        const selectedProduct = selectedProducts.find(p => p.preorder_item_id === selectedProductId);
                        if (!selectedProduct) return null;
                        
                        return (
                          <div className="mt-2 flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-700">
                            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">New total advance:</div>
                            <div className="text-sm font-bold text-green-600 dark:text-green-400">
                              ${(selectedProduct.original_advance_payment + (formData.amount || 0)).toFixed(2)}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                    
                    {/* Payment Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Payment Purpose */}
                      <div>
                        <Label htmlFor="payment-purpose" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Payment Purpose
                        </Label>
                        <Select 
                          value={formData.payment_purpose} 
                          onValueChange={(value) => handleSelectChange('payment_purpose', value)}
                          disabled={isSubmitting}
                        >
                          <SelectTrigger id="payment-purpose" className="w-full">
                            <SelectValue placeholder="Select purpose" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="advance">Advance Payment</SelectItem>
                            <SelectItem value="final_remaining">Final Remaining Payment</SelectItem>
                            <SelectItem value="delivery_charges">Delivery Charges</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {/* Bank Account */}
                      <div>
                        <Label htmlFor="bank-account" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Bank Account
                        </Label>
                        <Select 
                          value={formData.bank_account} 
                          onValueChange={(value) => handleSelectChange('bank_account', value)}
                          disabled={isSubmitting}
                        >
                          <SelectTrigger id="bank-account" className="w-full">
                            <SelectValue placeholder="Select bank account" />
                          </SelectTrigger>
                          <SelectContent className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700">
                            <SelectItem value="HBL">HBL</SelectItem>
                            <SelectItem value="Meezan">Meezan</SelectItem>
                            <SelectItem value="JazzCash">JazzCash</SelectItem>
                            <SelectItem value="EasyPaisa">EasyPaisa</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {/* Payment Date */}
                      <div>
                        <Label htmlFor="payment-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Payment Date
                        </Label>
                        <Input
                          id="payment-date"
                          name="payment_date"
                          type="date"
                          value={formData.payment_date}
                          onChange={handleInputChange}
                          className="w-full"
                          required
                          disabled={isSubmitting}
                        />
                      </div>
                      
                      {/* Tally Checkbox */}
                      <div className="flex items-center h-full pt-5">
                        <Checkbox
                          id="tally"
                          checked={formData.tally}
                          onCheckedChange={handleCheckboxChange}
                          disabled={isSubmitting}
                        />
                        <Label htmlFor="tally" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                          Mark as tallied in accounting
                        </Label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Payment Screenshot */}
            {selectedPreOrder && (
              <div className="mb-6">
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <div className="bg-purple-50 dark:bg-purple-900/20 p-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="font-semibold text-lg text-gray-900 dark:text-white">Payment Screenshot</h3>
                  </div>
                  
                  <div className="p-4">
                    <div className="flex flex-col space-y-2">
                      <div className="flex items-center space-x-2">
                        <Input
                          ref={fileInputRef}
                          id="payment_screenshot_upload"
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          disabled={isSubmitting || isUploading}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isSubmitting || isUploading}
                          className="flex items-center"
                        >
                          {isUploading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Upload className="mr-2 h-4 w-4" />
                              Upload Screenshot
                            </>
                          )}
                        </Button>
                        
                        {previewUrl && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleRemoveFile}
                            disabled={isSubmitting || isUploading}
                            className="flex items-center text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                          >
                            <X className="mr-2 h-4 w-4" />
                            Remove
                          </Button>
                        )}
                      </div>
                      
                      {/* Preview */}
                      {previewUrl && (
                        <div className="mt-4 relative">
                          <div className="border border-gray-300 dark:border-gray-600 rounded-md overflow-hidden bg-white dark:bg-gray-800 p-2">
                            <div className="relative aspect-video w-full overflow-hidden rounded-md">
                              <img
                                src={previewUrl}
                                alt="Payment Screenshot"
                                className="object-contain w-full h-full"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Hidden input to store the URL */}
                      <Input
                        id="payment_screenshot"
                        name="payment_screenshot"
                        type="hidden"
                        value={formData.payment_screenshot || ''}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Footer Actions */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            
            <Button
              type="submit"
              disabled={isSubmitting || !selectedPreOrder || !selectedProductId}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {isSubmitting ? 'Saving...' : isEditing ? 'Update Payment' : 'Create Payment'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ImprovedPaymentModal; 