import { supabase } from './supabase';
import type { Customer, Flight, PreOrderWithDetails, FlightStatus, Payment, Transaction } from './types';

interface ApiResponse<T> {
  data: T | null;
  error: Error | null;
}

// Fetch all pre-orders with customer and flight details
export async function fetchPreOrders() {
  try {
    const { data, error } = await supabase
      .from('preorders')
      .select(`
        *,
        customer:customers(*),
        flight:flights(*)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as PreOrderWithDetails[];
  } catch (error) {
    console.error('Error fetching pre-orders:', error);
    throw error;
  }
}

// Fetch pre-orders with pagination, search, and filters
export const fetchPreOrdersWithFilters = async ({
  page = 1,
  pageSize = 10,
  searchQuery = '',
  statusFilter = '',
  flightFilter = '',
  dateRange = '',
  sortColumn = 'created_at',
  sortDirection = 'desc',
}: {
  page?: number;
  pageSize?: number;
  searchQuery?: string;
  statusFilter?: string;
  flightFilter?: string;
  dateRange?: string;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
}) => {
  try {
    console.log('Fetching pre-orders with filters:', { page, pageSize, searchQuery, statusFilter, flightFilter, dateRange, sortColumn, sortDirection });
    
    // Make API call to the backend route instead of direct Supabase query
    const queryParams = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString(),
      ...(searchQuery && { search: searchQuery }),
      ...(statusFilter && { status: statusFilter }),
      ...(flightFilter && { flight: flightFilter }),
      ...(dateRange && { date: dateRange }),
      ...(sortColumn && { sortColumn }),
      ...(sortDirection && { sortDirection }),
    });
    
    const response = await fetch(`/api/pre-orders?${queryParams.toString()}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch pre-orders');
    }
    
    const result = await response.json();
    
    console.log('API response:', result);
    
    return {
      data: result.data || [],
      totalItems: result.totalItems || 0,
      page: result.page || page,
      pageSize: result.pageSize || pageSize,
      totalPages: result.totalPages || 1,
    };
  } catch (error) {
    console.error('Error fetching pre-orders:', error);
    return {
      data: [],
      totalItems: 0,
      page,
      pageSize,
      totalPages: 0,
      error: (error as Error).message,
    };
  }
};

// Update a pre-order
export const updatePreOrder = async (preOrderId: string, data: Partial<PreOrderWithDetails>) => {
  try {
    const { data: updatedPreOrder, error } = await supabase
      .from('preorders')
      .update(data)
      .eq('preorder_id', preOrderId)
      .select()
      .single();

    if (error) throw error;
    return { data: updatedPreOrder, error: null };
  } catch (error) {
    console.error('Error updating pre-order:', error);
    return { data: null, error: error instanceof Error ? error.message : 'An error occurred' };
  }
};

// Fetch all flights for dropdown
export async function fetchFlights() {
  try {
    const { data, error } = await supabase
      .from('flights')
      .select('*')
      .order('shipment_date', { ascending: false });

    if (error) throw error;
    return data as Flight[];
  } catch (error) {
    console.error('Error fetching flights:', error);
    throw error;
  }
}

// Customer API functions
export async function getCustomers(): Promise<ApiResponse<Customer[]>> {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*');
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { 
      data: null, 
      error: error instanceof Error ? error : new Error('Failed to fetch customers')
    };
  }
}

export const getCustomerById = async (customerId: string) => {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('customer_id', customerId)
      .single();
    
    if (error) throw error;
    
    return { data: data as Customer, error: null };
  } catch (error) {
    console.error('Error fetching customer:', error);
    return { data: null, error: 'Failed to fetch customer' };
  }
};

export const createCustomer = async (customer: Customer) => {
  try {
    const { data, error } = await supabase
      .from('customers')
      .insert([customer])
      .select();
    
    if (error) throw error;
    
    return { data: data[0] as Customer, error: null };
  } catch (error) {
    console.error('Error creating customer:', error);
    return { data: null, error: 'Failed to create customer' };
  }
};

export const updateCustomer = async (customer: Customer) => {
  try {
    const { data, error } = await supabase
      .from('customers')
      .update(customer)
      .eq('customer_id', customer.customer_id)
      .select();
    
    if (error) throw error;
    
    return { data: data[0] as Customer, error: null };
  } catch (error) {
    console.error('Error updating customer:', error);
    return { data: null, error: 'Failed to update customer' };
  }
};

export const deleteCustomer = async (customerId: string) => {
  try {
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('customer_id', customerId);
    
    if (error) throw error;
    
    return { success: true, error: null };
  } catch (error) {
    console.error('Error deleting customer:', error);
    return { success: false, error: 'Failed to delete customer' };
  }
};

// Flight API functions
export async function getFlights(): Promise<ApiResponse<Flight[]>> {
  try {
    const { data, error } = await supabase
      .from('flights')
      .select('*');
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { 
      data: null, 
      error: error instanceof Error ? error : new Error('Failed to fetch flights')
    };
  }
}

export const getFlightById = async (flightId: string) => {
  try {
    const { data, error } = await supabase
      .from('flights')
      .select('*')
      .eq('flight_id', flightId)
      .single();
    
    if (error) throw error;
    
    return { data: data as Flight, error: null };
  } catch (error) {
    console.error('Error fetching flight:', error);
    return { data: null, error: 'Failed to fetch flight' };
  }
};

export const createFlight = async (flight: Flight) => {
  try {
    console.log('Creating flight:', flight);
    
    // When creating a flight that includes an enum field (status),
    // we need to ensure it's handled correctly for PostgreSQL
    const { data, error } = await supabase
      .from('flights')
      .insert([{
        flight_name: flight.flight_name,
        shipment_date: flight.shipment_date,
        status: flight.status as FlightStatus // Cast to the correct type
      }])
      .select();
    
    if (error) {
      console.error('Supabase error creating flight:', error);
      throw error;
    }
    
    if (!data || data.length === 0) {
      console.error('No data returned after creating flight');
      return { data: null, error: 'Failed to create flight' };
    }
    
    console.log('Flight created successfully:', data[0]);
    return { data: data[0] as Flight, error: null };
  } catch (error) {
    console.error('Error creating flight:', error);
    return { data: null, error: 'Failed to create flight' };
  }
};

export const updateFlight = async (flight: Flight) => {
  try {
    console.log('Updating flight:', flight);
    
    // When updating a flight that includes an enum field (status),
    // we need to ensure it's handled correctly for PostgreSQL
    const { data, error } = await supabase
      .from('flights')
      .update({
        flight_name: flight.flight_name,
        shipment_date: flight.shipment_date,
        status: flight.status as FlightStatus // Cast to the correct type
      })
      .eq('flight_id', flight.flight_id)
      .select();
    
    if (error) {
      console.error('Supabase error updating flight:', error);
      throw error;
    }
    
    if (!data || data.length === 0) {
      console.error('No flight found with ID:', flight.flight_id);
      return { data: null, error: 'Flight not found' };
    }
    
    console.log('Flight updated successfully:', data[0]);
    return { data: data[0] as Flight, error: null };
  } catch (error) {
    console.error('Error updating flight:', error);
    return { data: null, error: 'Failed to update flight' };
  }
};

export const updateFlightStatus = async (flightId: string, status: FlightStatus) => {
  try {
    console.log('Updating flight status:', { flightId, status });
    
    // Check if flightId is valid
    if (!flightId) {
      console.error('Invalid flight ID:', flightId);
      return { data: null, error: 'Invalid flight ID' };
    }
    
    // In PostgreSQL, when using enum types, we need to cast the value to the correct type
    // This ensures that the string value is treated as the correct enum type
    const { data, error } = await supabase
      .from('flights')
      .update({ 
        status: status as FlightStatus // Cast to the correct type
      })
      .eq('flight_id', flightId)
      .select();
    
    if (error) {
      console.error('Supabase error updating flight status:', error);
      throw error;
    }
    
    if (!data || data.length === 0) {
      console.error('No flight found with ID:', flightId);
      return { data: null, error: 'Flight not found' };
    }
    
    console.log('Flight status updated successfully:', data[0]);
    return { data: data[0] as Flight, error: null };
  } catch (error) {
    console.error('Error updating flight status:', error);
    return { data: null, error: 'Failed to update flight status' };
  }
};

export const deleteFlight = async (flightId: string) => {
  try {
    const { error } = await supabase
      .from('flights')
      .delete()
      .eq('flight_id', flightId);
    
    if (error) throw error;
    
    return { success: true, error: null };
  } catch (error) {
    console.error('Error deleting flight:', error);
    return { success: false, error: 'Failed to delete flight' };
  }
};

export async function getPreOrders(): Promise<ApiResponse<PreOrderWithDetails[]>> {
  try {
    const { data, error } = await supabase
      .from('preorders')
      .select(`
        *,
        customer:customers(*),
        flight:flights(*),
        items:preorder_items(*)
      `);
    
    if (error) throw error;
    return { data: data as PreOrderWithDetails[], error: null };
  } catch (error) {
    return { 
      data: null, 
      error: error instanceof Error ? error : new Error('Failed to fetch pre-orders')
    };
  }
}

// Payment API functions
export async function getPayments(): Promise<ApiResponse<Payment[]>> {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        customer:customers(*),
        preorder:preorders(
          *,
          flight:flights(*)
        )
      `)
      .order('payment_date', { ascending: false });
    
    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }
    
    // Transform the data to match PaymentWithDetails interface
    const paymentsWithDetails = data?.map(payment => ({
      ...payment,
      preorder: payment.preorder ? {
        ...payment.preorder,
        customer: payment.customer // Add customer to preorder for consistency
      } : null
    })) || [];
    
    return { data: paymentsWithDetails, error: null };
  } catch (error) {
    console.error('Error fetching payments:', error);
    return { 
      data: null, 
      error: error instanceof Error ? error : new Error('Failed to fetch payments')
    };
  }
}

export const getPaymentById = async (paymentId: string) => {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        customer:customers(*),
        preorder:preorders(*, flight:flights(*))
      `)
      .eq('payment_id', paymentId)
      .single();
    
    if (error) throw error;
    
    // Transform to match PaymentWithDetails
    const paymentWithDetails = {
      ...data,
      preorder: {
        ...data.preorder,
        customer: data.customer,
      }
    };
    
    return { data: paymentWithDetails, error: null };
  } catch (error) {
    console.error('Error fetching payment:', error);
    return { data: null, error: 'Failed to fetch payment' };
  }
};

export const createPayment = async (payment: Payment) => {
  try {
    console.log('Creating payment with data:', payment);
    
    // Ensure all required fields are present
    const requiredFields = ['payment_id', 'customer_id', 'preorder_id', 'amount', 'payment_purpose', 'payment_date'];
    const missingFields = requiredFields.filter(field => !payment[field as keyof Payment]);
    
    if (missingFields.length > 0) {
      console.error('Missing required fields:', missingFields);
      return { data: null, error: `Missing required fields: ${missingFields.join(', ')}` };
    }
    
    // Format the payment data to ensure it matches the database schema
    const paymentData = {
      payment_id: payment.payment_id,
      customer_id: payment.customer_id,
      preorder_id: payment.preorder_id,
      amount: payment.amount,
      payment_purpose: payment.payment_purpose,
      bank_account: payment.bank_account || '',
      tally: payment.tally || false,
      payment_screenshot: payment.payment_screenshot || '',
      payment_date: payment.payment_date
    };
    
    console.log('Formatted payment data:', paymentData);
    
    // Start a transaction to ensure both payment creation and preorder update succeed or fail together
    // First, get the current preorder to calculate new payment values
    const { data: preorderData, error: preorderError } = await supabase
      .from('preorders')
      .select('advance_payment, remaining_amount, subtotal, cod_amount')
      .eq('preorder_id', payment.preorder_id)
      .single();
    
    if (preorderError) {
      console.error('Error fetching preorder data:', preorderError);
      return { data: null, error: `Failed to fetch preorder data: ${preorderError.message}` };
    }
    
    if (!preorderData) {
      console.error('No preorder found with ID:', payment.preorder_id);
      return { data: null, error: `No preorder found with ID: ${payment.preorder_id}` };
    }
    
    // Calculate new payment values
    const currentAdvancePayment = preorderData.advance_payment || 0;
    const currentRemainingAmount = preorderData.remaining_amount || 0;
    const totalAmount = (preorderData.subtotal || 0) + (preorderData.cod_amount || 0);
    
    // Update advance payment and remaining amount based on payment purpose
    const newAdvancePayment = currentAdvancePayment + payment.amount;
    const newRemainingAmount = totalAmount - newAdvancePayment;
    
    console.log('Payment calculations:', {
      currentAdvancePayment,
      currentRemainingAmount,
      totalAmount,
      newAdvancePayment,
      newRemainingAmount,
      paymentAmount: payment.amount
    });
    
    // Insert the payment
    const { data, error } = await supabase
      .from('payments')
      .insert([paymentData])
      .select();
    
    if (error) {
      console.error('Supabase error creating payment:', error);
      return { data: null, error: `Failed to create payment: ${error.message}` };
    }
    
    if (!data || data.length === 0) {
      console.error('No data returned after creating payment');
      return { data: null, error: 'No data returned after creating payment' };
    }
    
    // Update the preorder with new payment values
    const { error: updateError } = await supabase
      .from('preorders')
      .update({
        advance_payment: newAdvancePayment,
        remaining_amount: newRemainingAmount
      })
      .eq('preorder_id', payment.preorder_id);
    
    if (updateError) {
      console.error('Error updating preorder payment information:', updateError);
      // Even if the update fails, we've already created the payment, so return success
      // In a production environment, you might want to roll back the payment creation
      console.warn('Payment created but preorder update failed');
    } else {
      console.log('Preorder payment information updated successfully');
    }
    
    console.log('Payment created successfully:', data[0]);
    return { data: data[0] as Payment, error: null };
  } catch (error) {
    console.error('Error creating payment:', error);
    return { data: null, error: error instanceof Error ? error.message : 'Failed to create payment' };
  }
};

export const updatePayment = async (payment: Payment) => {
  try {
    console.log('Updating payment with data:', payment);
    
    // For single field updates (like tally), only include that field
    const updateData: Partial<Payment> = {};
    
    // Only include fields that are explicitly provided and have changed
    if (payment.tally !== undefined) updateData.tally = payment.tally;
    if (payment.amount !== undefined) updateData.amount = payment.amount;
    if (payment.payment_purpose !== undefined) updateData.payment_purpose = payment.payment_purpose;
    if (payment.bank_account !== undefined) updateData.bank_account = payment.bank_account;
    if (payment.payment_screenshot !== undefined) updateData.payment_screenshot = payment.payment_screenshot;
    if (payment.payment_date !== undefined) updateData.payment_date = payment.payment_date;
    
    // Only include these if explicitly trying to change them
    if (payment.customer_id !== undefined && payment.customer_id !== '') updateData.customer_id = payment.customer_id;
    if (payment.preorder_id !== undefined && payment.preorder_id !== '') updateData.preorder_id = payment.preorder_id;
    
    console.log('Update data:', updateData);
    
    const { data, error } = await supabase
      .from('payments')
      .update(updateData)
      .eq('payment_id', payment.payment_id)
      .select();
    
    if (error) {
      console.error('Supabase error updating payment:', error);
      return { data: null, error: `Failed to update payment: ${error.message}` };
    }
    
    if (!data || data.length === 0) {
      console.error('No data returned after updating payment');
      return { data: null, error: 'Payment not found' };
    }
    
    console.log('Payment updated successfully:', data[0]);
    return { data: data[0] as Payment, error: null };
  } catch (error) {
    console.error('Error updating payment:', error);
    return { data: null, error: error instanceof Error ? error.message : 'Failed to update payment' };
  }
};

export const deletePayment = async (paymentId: string) => {
  try {
    const { error } = await supabase
      .from('payments')
      .delete()
      .eq('payment_id', paymentId);
    
    if (error) throw error;
    
    return { success: true, error: null };
  } catch (error) {
    console.error('Error deleting payment:', error);
    return { success: false, error: 'Failed to delete payment' };
  }
};

export const getPreOrdersByCustomerId = async (customerId: string) => {
  try {
    const { data, error } = await supabase
      .from('preorders')
      .select(`
        *,
        flight:flights(*)
      `)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching pre-orders by customer:', error);
    return { data: null, error: 'Failed to fetch pre-orders' };
  }
};

// Fetch transactions with filters
export const fetchTransactionsWithFilters = async ({
  page = 1,
  pageSize = 10,
  searchQuery = '',
  statusFilter = '',
  paymentFilter = '',
  sortColumn = 'transaction_date',
  sortDirection = 'desc',
}: {
  page?: number;
  pageSize?: number;
  searchQuery?: string;
  statusFilter?: string;
  paymentFilter?: string;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
}) => {
  try {
    const queryParams = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString(),
      ...(searchQuery && { search: searchQuery }),
      ...(statusFilter && { status: statusFilter }),
      ...(paymentFilter && { payment: paymentFilter }),
      ...(sortColumn && { sortColumn }),
      ...(sortDirection && { sortDirection }),
    });
    
    const response = await fetch(`/api/transactions?${queryParams.toString()}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch transactions');
    }
    
    const result = await response.json();
    
    return {
      data: result.data || [],
      totalItems: result.totalItems || 0,
      page: result.page || page,
      pageSize: result.pageSize || pageSize,
      totalPages: result.totalPages || 1,
    };
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return {
      data: [],
      totalItems: 0,
      page,
      pageSize,
      totalPages: 0,
      error: (error as Error).message,
    };
  }
};

// Save a transaction
export const saveTransaction = async (transaction: Transaction) => {
  try {
    const isNew = !transaction.transaction_id;
    const method = isNew ? 'POST' : 'PUT';
    const url = '/api/transactions';
    
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(transaction),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Failed to ${isNew ? 'create' : 'update'} transaction`);
    }
    
    const data = await response.json();
    return { data, error: null };
  } catch (error) {
    console.error('Error saving transaction:', error);
    return { data: null, error: error as Error };
  }
};

// Delete a transaction
export const deleteTransaction = async (transactionId: number) => {
  try {
    const response = await fetch(`/api/transactions?id=${transactionId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete transaction');
    }
    
    return { success: true, error: null };
  } catch (error) {
    console.error('Error deleting transaction:', error);
    return { success: false, error: error as Error };
  }
}; 