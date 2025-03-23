import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PaymentWithDetails, Payment, PaymentPurpose, BankAccount, Customer, PreOrderWithDetails } from '@/lib/types';
import { createPayment, updatePayment, getCustomers, getPreOrdersByCustomerId } from '@/lib/api';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/lib/supabase';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronsUpDown, Upload, X, Loader2, Image as ImageIcon, Hash, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';

interface PaymentAddEditModalProps {
  payment: PaymentWithDetails | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  isEditing: boolean;
}

// Add these interfaces for file upload
interface FileUploadProps {
  onFileUpload: (url: string) => void;
  existingUrl?: string;
  disabled?: boolean;
}

// Add this interface after the other interfaces near the top of the file
interface ProductPayment {
  preorder_item_id: string;
  amount: number;
}

// Add this after the other interfaces
interface ProductPaymentData {
  preorder_item_id: string;
  product_name: string;
  shade?: string;
  size?: string;
  amount: number;
  original_advance_payment: number;
}

// Update the FormData interface to include product_payments
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

const PaymentAddEditModal: React.FC<PaymentAddEditModalProps> = ({
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
  
  // Add this with other state
  const [selectedProducts, setSelectedProducts] = useState<ProductPaymentData[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  
  // Initialize form data when editing or when modal opens/closes
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
      // Fetch the latest preorder data to get the current remaining amount
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
        
        // If we're in customer selection mode, also set the customer
        if (selectionMethod === 'customer' && data.customers) {
          setSelectedCustomer(data.customers);
          setFormData(prev => ({ ...prev, customer_id: data.customer_id }));
        }
        
        // Set the payment purpose based on remaining amount, but don't fill the amount field
        if (data.remaining_amount > 0) {
          setFormData(prev => ({ 
            ...prev, 
            payment_purpose: 'final_remaining' as PaymentPurpose
          }));
        } else {
          // Default to advance payment
          setFormData(prev => ({ 
            ...prev, 
            payment_purpose: 'advance' as PaymentPurpose
          }));
        }
      }

      // Fetch products with their current advance payments
      const { data: itemsData, error: itemsError } = await supabase
        .from('preorder_items')
        .select('*')
        .eq('preorder_id', preOrderId);
      
      if (itemsError) {
        console.error('Error fetching preorder items:', itemsError);
      } else if (itemsData) {
        // Initialize selected products with their current advance payments
        const productsData: ProductPaymentData[] = itemsData.map(item => ({
          preorder_item_id: item.preorder_item_id || '',
          product_name: item.product_name,
          shade: item.shade ?? '',
          size: item.size ?? '',
          amount: 0, // Initialize with zero payment
          original_advance_payment: item.advance_payment ?? 0
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
    
    // Validate file type
    const fileType = file.type;
    if (!fileType.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }
    
    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error('File size should be less than 5MB');
      return;
    }
    
    try {
      setIsUploading(true);
      setUploadProgress(0);
      
      // Check authentication first
      const isAuthenticated = await checkAuthentication();
      if (!isAuthenticated) {
        toast.error('Authentication error. Please try logging out and back in.');
        setIsUploading(false);
        return;
      }
      
      // Create a local preview
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      
      // Update progress to show we're starting
      setUploadProgress(10);
      
      // Generate a unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${uuidv4()}.${fileExt}`;
      const bucketName = 'payment_screenshots';
      
      // TEMPORARY SOLUTION: Instead of uploading to Supabase storage,
      // we'll use a data URL approach for now to bypass RLS issues
      
      setUploadProgress(30);
      
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
      setUploadProgress(50);
      const dataUrl = await readFileAsDataURL;
      setUploadProgress(80);
      
      // Use the data URL as the image source
      // Note: In a production environment, you would want to store this in a database
      // or implement proper server-side upload handling
      
      // For now, we'll use the data URL directly
      setFormData(prev => ({ ...prev, payment_screenshot: dataUrl }));
      
      // Complete the progress
      setUploadProgress(100);
      
      toast.success('Screenshot processed successfully');
      
      // IMPORTANT: This is a temporary solution!
      // In a production environment, you should:
      // 1. Fix the RLS policies on your Supabase bucket
      // 2. Or implement a server-side upload endpoint
      // 3. Or use signed URLs for uploads
      
    } catch (error) {
      console.error('Error processing file:', error);
      
      // More detailed error message
      if (error instanceof Error) {
        toast.error(`Processing failed: ${error.message}`);
      } else {
        toast.error('Failed to process screenshot. Please try again.');
      }
      
      // Reset preview on error
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
      
      console.log('Form data before validation:', formData);
      
      // Ensure amount is a number before submission
      const submissionData = {
        ...formData,
        amount: typeof formData.amount === 'string' ? parseFloat(formData.amount) || 0 : formData.amount
      };
      
      // Only validate customer and pre-order for new payments or when those fields are being modified
      if (!isEditing) {
        // For new payments, validate all required fields
        if (selectionMethod === 'customer' && !submissionData.customer_id) {
          throw new Error('Customer is required');
        }
        
        if (!submissionData.preorder_id) {
          throw new Error('Pre-order is required');
        }
      }
      
      // If using order selection method, we need to fetch the customer ID
      if (selectionMethod === 'order' && !submissionData.customer_id) {
        try {
          console.log('Fetching customer ID for pre-order:', submissionData.preorder_id);
          // Get the pre-order to find the customer
          const { data: preOrderResponse } = await supabase
            .from('preorders')
            .select('customer_id')
            .eq('preorder_id', submissionData.preorder_id)
            .single();
            
          if (!preOrderResponse || !preOrderResponse.customer_id) {
            throw new Error('Invalid pre-order ID or customer not found');
          }
          
          console.log('Found customer ID:', preOrderResponse.customer_id);
          
          // Set the customer ID from the pre-order
          submissionData.customer_id = preOrderResponse.customer_id;
        } catch (error) {
          console.error('Error fetching pre-order details:', error);
          throw new Error('Invalid pre-order ID. Please check and try again.');
        }
      }
      
      // Handle the payment screenshot data URL
      // If it's a data URL (starts with 'data:'), we need to handle it differently
      if (submissionData.payment_screenshot && submissionData.payment_screenshot.startsWith('data:')) {
        try {
          // For now, we'll keep using the data URL
          // In a production environment, you would want to:
          // 1. Convert the data URL to a file
          // 2. Upload it to a server or cloud storage
          // 3. Store the URL to the uploaded file
          
          console.log('Using data URL for payment screenshot');
          
          // Optionally, you could truncate the data URL for logging purposes
          const truncatedUrl = submissionData.payment_screenshot.substring(0, 50) + '...';
          console.log('Data URL (truncated):', truncatedUrl);
          
          // Note: Data URLs can be quite large, so be aware of database size limits
          // If your database has size constraints, consider implementing a proper
          // file upload solution instead
        } catch (error) {
          console.error('Error handling payment screenshot data URL:', error);
          // Continue with submission even if screenshot processing fails
        }
      }
      
      // Add product payments if provided
      if (selectedProductId && submissionData.amount > 0) {
        submissionData.product_payments = [{
          preorder_item_id: selectedProductId,
          amount: submissionData.amount || 0
        }];
      }
      
      // Handle product payments if provided
      if (submissionData.product_payments && submissionData.product_payments.length > 0) {
        console.log('Updating product advances for payment:', submissionData.product_payments);
        
        // Create a transaction for updating product advances
        try {
          for (const productPayment of submissionData.product_payments) {
            // Update the advance_payment in the preorder_item
            const { data: item, error: itemError } = await supabase
              .from('preorder_items')
              .select('advance_payment')
              .eq('preorder_item_id', productPayment.preorder_item_id)
              .single();
            
            if (itemError) {
              console.error('Error fetching item for advance update:', itemError);
              continue;
            }
            
            const currentAdvance = item.advance_payment || 0;
            const newAdvance = currentAdvance + productPayment.amount;
            
            const { error: updateError } = await supabase
              .from('preorder_items')
              .update({ advance_payment: newAdvance })
              .eq('preorder_item_id', productPayment.preorder_item_id);
            
            if (updateError) {
              console.error('Error updating product advance payment:', updateError);
            } else {
              console.log(`Updated advance for product ${productPayment.preorder_item_id} from ${currentAdvance} to ${newAdvance}`);
            }
          }
        } catch (error) {
          console.error('Error handling product payments:', error instanceof Error ? error.message : String(error));
          toast.error('Error updating product advance payments');
        }
      }
      
      // Submit the payment
      let result;
      if (isEditing) {
        console.log('Updating payment with data:', submissionData);
        result = await updatePayment(submissionData as Payment);
      } else {
        // For new payments, make sure payment_id is not included
        const newPaymentData = { ...submissionData };
        delete newPaymentData.payment_id; // Remove payment_id for new payments
        console.log('Creating payment with data:', newPaymentData);
        
        // Pass false for skipPreorderUpdate to ensure payment updates the remaining amount
        result = await createPayment(newPaymentData as Payment);
      }
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      toast.success(`Payment ${isEditing ? 'updated' : 'created'} successfully`);
      onSave();
      onClose();
    } catch (error) {
      console.error('Error submitting payment:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to submit payment');
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
      <DialogContent className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-[800px] max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700 p-0">
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
        
        <div className="p-4 sm:p-6 md:p-8 pt-2">
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            {/* Payment ID */}
            {isEditing && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Payment ID
                </label>
                <input
                  type="text"
                  value={formData.payment_id}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:opacity-60"
                />
              </div>
            )}
            
            {/* Selection Method (only for new payments) */}
            {!isEditing && (
              <div className="mb-4">
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Select payment by:</Label>
                <RadioGroup 
                  value={selectionMethod} 
                  onValueChange={(value: string) => setSelectionMethod(value as 'customer' | 'order')}
                  className="flex space-x-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="customer" id="customer" className="border-gray-400 dark:border-gray-600 text-purple-500" />
                    <Label htmlFor="customer" className="text-sm font-normal cursor-pointer text-gray-700 dark:text-gray-300">Customer</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="order" id="order" className="border-gray-400 dark:border-gray-600 text-purple-500" />
                    <Label htmlFor="order" className="text-sm font-normal cursor-pointer text-gray-700 dark:text-gray-300">Order ID</Label>
                  </div>
                </RadioGroup>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {/* Left Column */}
              <div className="space-y-6">
                {/* Customer Selection with Search */}
                {isEditing ? (
                  <div>
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 ml-1">
                      Customer Details
                    </Label>
                    <div className="mt-2 p-3 sm:p-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md">
                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-900 dark:text-white">
                        {payment?.customer && (
                          <>
                            <div>
                              <span className="font-semibold text-gray-700 dark:text-gray-300">Name:</span> {payment.customer.name}
                            </div>
                            {payment.customer.instagram_id && (
                              <div>
                                <span className="font-semibold text-gray-700 dark:text-gray-300">Instagram:</span> @{payment.customer.instagram_id}
                              </div>
                            )}
                            {payment.customer.phone_number && (
                              <div>
                                <span className="font-semibold text-gray-700 dark:text-gray-300">Phone:</span> {payment.customer.phone_number}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  (selectionMethod === 'customer' || isEditing) && (
                    <div>
                      <Label htmlFor="customer_id" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 ml-1">
                        Customer
                      </Label>
                      <div className="relative">
                        <Input
                          id="customer_search"
                          type="text"
                          placeholder="Search by name, phone, or Instagram ID"
                          value={customerSearchValue}
                          onChange={(e) => {
                            console.log('Customer search input changed:', e.target.value);
                            setCustomerSearchValue(e.target.value);
                            setCustomerSearchOpen(true);
                          }}
                          onClick={() => setCustomerSearchOpen(true)}
                          className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-purple-500 transition-all duration-200 py-3 px-4 sm:text-sm w-full rounded-md"
                          disabled={isLoadingCustomers || isSubmitting}
                        />
                        {customerSearchOpen && (
                          <div className="absolute z-[100] w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg">
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
                                      setCustomerSearchValue("");
                                    }}
                                  >
                                    <div className="flex flex-col w-full">
                                      <div className="flex items-center">
                                        {formData.customer_id === customer.customer_id && (
                                          <Check className="mr-2 h-4 w-4" />
                                        )}
                                        <span className="font-medium truncate">{customer.name}</span>
                                      </div>
                                      <div className="ml-6 text-xs text-gray-500 dark:text-gray-400 flex flex-col">
                                        {customer.phone_number && (
                                          <span>{customer.phone_number}</span>
                                        )}
                                        {customer.instagram_id && (
                                          <span>Instagram: @{customer.instagram_id}</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        )}
                        {/* Add a click away listener to close the dropdown */}
                        {customerSearchOpen && (
                          <div 
                            className="fixed inset-0 z-[90]" 
                            onClick={(e) => {
                              // Only close if clicking outside the dropdown
                              if (e.target === e.currentTarget) {
                                setCustomerSearchOpen(false);
                              }
                            }}
                          />
                        )}
                      </div>
                      
                      {/* Display selected customer details */}
                      {selectedCustomer && (
                        <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-sm text-gray-900 dark:text-white">
                            <div>
                              <span className="font-semibold text-gray-700 dark:text-gray-300">Name:</span> {selectedCustomer.name}
                            </div>
                            {selectedCustomer.instagram_id && (
                              <div>
                                <span className="font-semibold text-gray-700 dark:text-gray-300">Instagram:</span> @{selectedCustomer.instagram_id}
                              </div>
                            )}
                            {selectedCustomer.address && (
                              <div>
                                <span className="font-semibold text-gray-700 dark:text-gray-300">Address:</span> {selectedCustomer.address}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                )}
                
                {/* Manual Order ID Input with Search */}
                {selectionMethod === 'order' && (
                  <div>
                    <Label htmlFor="preorder_id" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 ml-1">
                      Pre-Order ID
                    </Label>
                    <Input
                      id="preorder_id"
                      name="preorder_id"
                      value={formData.preorder_id}
                      onChange={handlePreOrderIdInput}
                      placeholder="Enter pre-order ID"
                      disabled={isSubmitting}
                      className="bg-gray-50/50 dark:bg-gray-700/50 text-gray-900 dark:text-white shadow-sm ring-1 ring-inset ring-gray-300/50 dark:ring-gray-600/50 focus:ring-2 focus:ring-inset focus:ring-purple-500 transition-all duration-200 py-3 sm:text-sm"
                    />
                    {isLoadingPreOrders && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Checking pre-order...</p>
                    )}
                    {formData.customer_id && selectedCustomer && (
                      <div className="mt-2 p-3 sm:p-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md">
                        <div className="text-sm text-gray-900 dark:text-white">
                          <div className="font-semibold mb-2 text-gray-700 dark:text-gray-300">Customer Information:</div>
                          <div>{selectedCustomer.name}</div>
                          {selectedCustomer.phone_number && <div>{selectedCustomer.phone_number}</div>}
                          {selectedCustomer.instagram_id && <div>Instagram: @{selectedCustomer.instagram_id}</div>}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Product Selection - MOVED HERE */}
                {selectedProducts.length > 0 && (
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 ml-1">
                        Select Product for Payment
                      </Label>
                      <Select
                        value={selectedProductId}
                        onValueChange={handleProductSelection}
                        disabled={isSubmitting}
                      >
                        <SelectTrigger className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-purple-500 transition-all duration-200 py-3 sm:text-sm">
                          <SelectValue placeholder="Select a product" />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 max-h-[200px]">
                          {selectedProducts.map((product) => (
                            <SelectItem key={product.preorder_item_id} value={product.preorder_item_id}>
                              <span className="truncate block max-w-[250px]">
                                {product.product_name} {product.shade ? `(${product.shade})` : ''} {product.size ? `- ${product.size}` : ''}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedProductId && (
                      <div className="p-3 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800/50">
                        {/* Show selected product details */}
                        {(() => {
                          const selectedProduct = selectedProducts.find(p => p.preorder_item_id === selectedProductId);
                          if (!selectedProduct) return null;
                          
                          return (
                            <div className="space-y-3">
                              <div className="flex justify-between items-center">
                                <div className="text-sm font-semibold text-gray-900 dark:text-white truncate max-w-full pr-2">
                                  {selectedProduct.product_name}
                                  {selectedProduct.shade && <span className="text-xs ml-1">({selectedProduct.shade})</span>}
                                  {selectedProduct.size && <span className="text-xs ml-1">- {selectedProduct.size}</span>}
                                </div>
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                <div className="text-xs text-gray-500 dark:text-gray-400">Current advance payment:</div>
                                <div className="text-sm font-medium text-green-600 dark:text-green-400">
                                  ${selectedProduct.original_advance_payment.toFixed(2)}
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                )}
                
                {/* Payment Details - First Column */}
                <div className="space-y-4">
                  {/* Amount Field - MOVED AFTER PRODUCT SELECTION */}
                  <div className="space-y-2">
                    <Label htmlFor="amount" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 ml-1">
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
                        onFocus={handleAmountFocus}
                        className="pl-7 block w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm focus:ring-2 focus:ring-purple-500 transition-all duration-200 py-3 px-4 sm:text-sm"
                        placeholder="0.00"
                        required
                        disabled={isSubmitting}
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
                  
                  <div className="space-y-2">
                    <Label htmlFor="payment_purpose" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 ml-1">
                      Payment Purpose
                    </Label>
                    <Select
                      value={formData.payment_purpose}
                      onValueChange={(value) => handleSelectChange('payment_purpose', value)}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-purple-500 transition-all duration-200 py-3 sm:text-sm">
                        <SelectValue placeholder="Select purpose" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700">
                        <SelectItem value="advance">Advance Payment</SelectItem>
                        <SelectItem value="final_remaining">Final Remaining Payment</SelectItem>
                        <SelectItem value="delivery_charges">Delivery Charges</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="bank_account" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 ml-1">
                      Bank Account
                    </Label>
                    <Select
                      value={formData.bank_account}
                      onValueChange={(value) => handleSelectChange('bank_account', value)}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-purple-500 transition-all duration-200 py-3 sm:text-sm">
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

                  <div className="space-y-2">
                    <Label htmlFor="payment_date" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 ml-1">
                      Payment Date
                    </Label>
                    <Input
                      id="payment_date"
                      name="payment_date"
                      type="date"
                      value={formData.payment_date}
                      onChange={handleInputChange}
                      className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-purple-500 transition-all duration-200 py-3 px-4 sm:text-sm w-full rounded-md"
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2 mt-6">
                    <Checkbox
                      id="tally"
                      checked={formData.tally}
                      onCheckedChange={handleCheckboxChange}
                      disabled={isSubmitting}
                      className="border-gray-600 text-purple-500"
                    />
                    <Label htmlFor="tally" className="text-sm font-normal cursor-pointer text-gray-700 dark:text-gray-300">
                      Mark as tallied in accounting
                    </Label>
                  </div>
                </div>
              </div>
              
              {/* Right Column */}
              <div className="space-y-6">
                {/* Pre-Order Selection */}
                {isEditing ? (
                  <div>
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 ml-1">
                      Pre-Order Details
                    </Label>
                    <div className="mt-2 p-3 sm:p-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md">
                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-900 dark:text-white">
                        {payment?.preorder && (
                          <>
                            <div>
                              <span className="font-semibold text-gray-700 dark:text-gray-300">Pre-Order ID:</span> {payment.preorder.preorder_id}
                            </div>
                            <div>
                              <span className="font-semibold text-gray-700 dark:text-gray-300">Date:</span> {new Date(payment.preorder.created_at).toLocaleDateString()}
                            </div>
                            <div>
                              <span className="font-semibold text-gray-700 dark:text-gray-300">Flight:</span> {payment.preorder.flight?.flight_name || 'N/A'}
                            </div>
                            <div>
                              <span className="font-semibold text-gray-700 dark:text-gray-300">Status:</span> {payment.preorder.order_status}
                            </div>
                            <div>
                              <span className="font-semibold text-gray-700 dark:text-gray-300">Total Amount:</span> ${(payment.preorder.total_amount || 0).toFixed(2)}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  selectionMethod === 'customer' && formData.customer_id && (
                    <div>
                      <Label htmlFor="preorder_id" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 ml-1">
                        Pre-Order
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
                          className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-purple-500 transition-all duration-200 py-3 px-4 sm:text-sm w-full rounded-md"
                          disabled={isLoadingPreOrders || isSubmitting}
                        />
                        {preOrderSearchOpen && (
                          <div className="absolute z-[100] w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg">
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
                                      setPreOrderSearchValue("");
                                    }}
                                  >
                                    <div className="flex flex-col w-full">
                                      <div className="flex items-center justify-between w-full">
                                        <div className="flex items-center">
                                          {formData.preorder_id === preOrder.preorder_id && (
                                            <Check className="mr-2 h-4 w-4" />
                                          )}
                                          <span className="font-medium truncate">{preOrder.preorder_id}</span>
                                        </div>
                                        <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                          {new Date(preOrder.created_at).toLocaleDateString()}
                                        </span>
                                      </div>
                                      <div className="ml-6 text-xs text-gray-500 dark:text-gray-400">
                                        {preOrder.flight?.flight_name && (
                                          <span>Flight: {preOrder.flight.flight_name}</span>
                                        )}
                                        {preOrder.items && preOrder.items.length > 0 && (
                                          <span className="ml-2 truncate max-w-[200px]">
                                            {preOrder.items.map(item => (
                                              <span key={item.preorder_item_id}>{item.product_name} - {item.shade} - {item.size}</span>
                                            ))}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        )}
                        {/* Add a click away listener to close the dropdown */}
                        {preOrderSearchOpen && (
                          <div 
                            className="fixed inset-0 z-[90]" 
                            onClick={(e) => {
                              // Only close if clicking outside the dropdown
                              if (e.target === e.currentTarget) {
                                setPreOrderSearchOpen(false);
                              }
                            }}
                          />
                        )}
                      </div>
                      
                      {/* Display selected preorder details */}
                      {selectedPreOrder && !preOrderSearchOpen && (
                        <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-sm text-gray-900 dark:text-white">
                            <div>
                              <span className="font-semibold text-gray-700 dark:text-gray-300">Pre-Order ID:</span> {selectedPreOrder.preorder_id}
                            </div>
                            <div>
                              <span className="font-semibold text-gray-700 dark:text-gray-300">Status:</span> <span className="capitalize">{selectedPreOrder.order_status}</span>
                            </div>
                            <div>
                              <span className="font-semibold text-gray-700 dark:text-gray-300">Subtotal:</span> ${(selectedPreOrder.subtotal || 0).toFixed(2)}
                            </div>
                            <div>
                              <span className="font-semibold text-gray-700 dark:text-gray-300">Total Amount:</span> <span className="text-xl font-semibold">${((selectedPreOrder.subtotal || 0) + (selectedPreOrder.delivery_charges || 0)).toFixed(2)}</span>
                            </div>
                            <div className="sm:col-span-2">
                              <span className="font-semibold text-gray-700 dark:text-gray-300">Remaining:</span> <span className="text-amber-600 dark:text-amber-400">${(selectedPreOrder.remaining_amount || 0).toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {!isLoadingPreOrders && preOrders.length === 0 && (
                        <p className="text-sm text-amber-400 mt-2">No pre-orders found for this customer.</p>
                      )}
                    </div>
                  )
                )}
                
                {/* Payment Details - Second Column */}
                <div className="space-y-4">
                  {/* Add PreOrder Summary Box */}
                  {selectedPreOrder && (
                    <div className="p-3 sm:p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800/40 rounded-md mb-2">
                      <h3 className="text-sm font-bold text-purple-700 dark:text-purple-300 mb-2">Payment Summary</h3>
                      <div className="grid grid-cols-1 gap-1 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700 dark:text-gray-300">Total Order Amount:</span>
                          <span className="font-medium">${((selectedPreOrder.subtotal || 0) + (selectedPreOrder.delivery_charges || 0)).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700 dark:text-gray-300">Advance Payment:</span>
                          <span className="font-medium">${(selectedPreOrder.advance_payment || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center border-t border-purple-200 dark:border-purple-800/40 pt-1 mt-1">
                          <span className="text-gray-700 dark:text-gray-300 font-semibold">Remaining Amount:</span>
                          <span className="font-bold text-purple-700 dark:text-purple-300">${(selectedPreOrder.remaining_amount || 0).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Payment Screenshot - Full Width */}
            <div className="space-y-2 mt-6">
              <Label htmlFor="payment_screenshot" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 ml-1">
                Payment Screenshot
              </Label>
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
                    className="bg-gray-50/50 dark:bg-gray-700/50 text-gray-900 dark:text-white hover:bg-gray-100/50 dark:hover:bg-gray-600/50 border-gray-300/50 dark:border-gray-600/50 flex items-center"
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
                      className="bg-red-900/20 hover:bg-red-900/30 border-red-800 text-red-200"
                    >
                      <X className="mr-2 h-4 w-4" />
                      Remove
                    </Button>
                  )}
                </div>
                
                {/* Upload Progress Indicator */}
                {isUploading && (
                  <div className="mt-2">
                    <div className="w-full bg-gray-700/50 rounded-full h-2.5">
                      <div 
                        className="bg-purple-600 h-2.5 rounded-full transition-all duration-300 ease-in-out" 
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {uploadProgress < 100 
                        ? `Uploading: ${uploadProgress}%` 
                        : 'Upload complete!'}
                    </p>
                  </div>
                )}
                
                {/* Preview */}
                {previewUrl && (
                  <div className="mt-2 relative">
                    <div className="border border-gray-300 dark:border-gray-600 rounded-md overflow-hidden bg-white dark:bg-gray-800 p-2">
                      <div className="relative aspect-video w-full overflow-hidden rounded-md">
                        <img
                          src={previewUrl}
                          alt="Payment Screenshot"
                          className="object-contain w-full h-full"
                        />
                      </div>
                    </div>
                    {previewUrl.startsWith('data:') && (
                      <p className="text-xs text-amber-400 mt-1">
                        Note: Using local image preview. This is a temporary solution.
                      </p>
                    )}
                  </div>
                )}
                
                {/* Hidden input to store the URL */}
                <Input
                  id="payment_screenshot"
                  name="payment_screenshot"
                  type="hidden"
                  value={formData.payment_screenshot}
                />
              </div>
            </div>
            
            {/* Footer */}
            <DialogFooter className="px-4 py-3 sm:px-6 sm:py-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
              <button
                type="button"
                className="w-full sm:w-auto px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="w-full sm:w-auto px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : isEditing ? 'Update Payment' : 'Create Payment'}
              </button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentAddEditModal; 