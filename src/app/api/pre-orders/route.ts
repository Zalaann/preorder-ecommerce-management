import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '10');
    const searchQuery = url.searchParams.get('search') || '';
    const statusFilter = url.searchParams.get('status') || '';
    const flightFilter = url.searchParams.get('flight') || '';
    const dateRange = url.searchParams.get('date') || '';
    const sortColumn = url.searchParams.get('sortColumn') || 'created_at';
    const sortDirection = url.searchParams.get('sortDirection') || 'desc';

    console.log('API Route - Fetching pre-orders with params:', {
      page, pageSize, searchQuery, statusFilter, flightFilter, dateRange, sortColumn, sortDirection
    });

    // First, fetch the pre-orders
    let query = supabase
      .from('preorders')
      .select('*', { count: 'exact' });

    // Apply search filter
    if (searchQuery) {
      query = query.or(
        `product_details.ilike.%${searchQuery}%`
      );
    }

    // Apply status filter
    if (statusFilter) {
      query = query.eq('order_status', statusFilter);
    }
    
    // Apply flight filter
    if (flightFilter) {
      query = query.eq('flight_id', flightFilter);
    }

    // Apply date filter
    if (dateRange) {
      const startDate = new Date(dateRange);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(dateRange);
      endDate.setHours(23, 59, 59, 999);
      
      query = query.gte('created_at', startDate.toISOString()).lte('created_at', endDate.toISOString());
    }

    // Apply sorting
    if (sortColumn === 'created_at' || sortColumn === 'order_status' || sortColumn === 'subtotal') {
      query = query.order(sortColumn, { ascending: sortDirection === 'asc' });
    }

    // Apply pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    console.log('Executing query...');
    const { data: preorders, count, error } = await query;

    if (error) {
      console.error('Query error:', error);
      return NextResponse.json(
        { error: `Failed to fetch pre-orders: ${error.message}` },
        { status: 500 }
      );
    }

    console.log('Query result:', { count, dataLength: preorders?.length });

    // If we have pre-orders, fetch the related customer data
    let transformedData = [];
    if (preorders && preorders.length > 0) {
      // Get unique customer IDs
      const customerIds = [...new Set(preorders.map(p => p.customer_id))].filter(Boolean);
      
      // Fetch customers if we have customer IDs
      let customers = [];
      if (customerIds.length > 0) {
        const { data: customersData, error: customersError } = await supabase
          .from('customers')
          .select('*')
          .in('customer_id', customerIds);
        
        if (customersError) {
          console.error('Error fetching customers:', customersError);
        } else {
          customers = customersData || [];
        }
      }
      
      // Map customers to pre-orders
      transformedData = preorders.map(preorder => {
        const customer = customers.find(c => c.customer_id === preorder.customer_id) || {};
        
        return {
          ...preorder,
          customer,
          flight: { 
            flight_id: preorder.flight_id || '',
            flight_name: 'Flight information unavailable',
            shipment_date: '',
            status: 'scheduled'
          }
        };
      });
    }

    return NextResponse.json({
      data: transformedData,
      totalItems: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    });
  } catch (error) {
    console.error('Error in pre-orders API route:', error);
    return NextResponse.json(
      { error: `Failed to fetch pre-orders: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Creating new pre-order with data:', body);
    
    const { data, error } = await supabase
      .from('preorders')
      .insert([body])
      .select();
    
    if (error) {
      console.error('Error creating pre-order:', error);
      throw error;
    }
    
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error in POST pre-orders API route:', error);
    return NextResponse.json(
      { error: `Failed to create pre-order: ${(error as Error).message}` },
      { status: 500 }
    );
  }
} 