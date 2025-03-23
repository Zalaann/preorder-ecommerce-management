import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    console.log(`Fetching pre-order with ID: ${id}`);
    
    // First fetch the pre-order
    const { data: preorderData, error: preorderError } = await supabase
      .from('preorders')
      .select('*')
      .eq('preorder_id', id)
      .single();
    
    if (preorderError) {
      console.error('Error fetching pre-order:', preorderError);
      return NextResponse.json(
        { error: `Failed to fetch pre-order: ${preorderError.message}` },
        { status: 500 }
      );
    }
    
    if (!preorderData) {
      return NextResponse.json(
        { error: 'Pre-order not found' },
        { status: 404 }
      );
    }
    
    // Fetch customer data
    let customerData = {};
    if (preorderData.customer_id) {
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('customer_id', preorderData.customer_id)
        .single();
      
      if (customerError) {
        console.error('Error fetching customer:', customerError);
        // Continue without customer data
      } else {
        customerData = customer || {};
      }
    }
    
    // Fetch flight data if needed
    const flightData = {
      flight_id: preorderData.flight_id || '',
      flight_name: 'Flight information unavailable',
      shipment_date: '',
      status: 'scheduled'
    };
    
    // Combine the data
    const transformedData = {
      ...preorderData,
      customer: customerData,
      flight: flightData
    };
    
    return NextResponse.json({ data: transformedData });
  } catch (error) {
    console.error('Error in GET pre-order API route:', error);
    return NextResponse.json(
      { error: `Failed to fetch pre-order: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    console.log(`Updating pre-order with ID: ${id}`, body);
    
    // Extract only the fields that belong to the preorder table
    const preorderFields = {
      customer_id: body.customer_id,
      flight_id: body.flight_id,
      order_status: body.order_status,
      product_details: body.product_details,
      subtotal: body.subtotal,
      advance_payment: body.advance_payment,
      delivery_charges: body.delivery_charges, // delivery_charges represents delivery charges
      total_amount: body.total_amount
    };
    
    const { data, error } = await supabase
      .from('preorders')
      .update(preorderFields)
      .eq('preorder_id', id)
      .select();
    
    if (error) {
      console.error('Error updating pre-order:', error);
      return NextResponse.json(
        { error: `Failed to update pre-order: ${error.message}` },
        { status: 500 }
      );
    }
    
    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'Pre-order not found' },
        { status: 404 }
      );
    }
    
    // Fetch customer data
    let customerData = {};
    if (data[0].customer_id) {
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('customer_id', data[0].customer_id)
        .single();
      
      if (customerError) {
        console.error('Error fetching customer:', customerError);
        // Continue without customer data
      } else {
        customerData = customer || {};
      }
    }
    
    // Fetch flight data if needed
    const flightData = {
      flight_id: data[0].flight_id || '',
      flight_name: 'Flight information unavailable',
      shipment_date: '',
      status: 'scheduled'
    };
    
    // Combine the data
    const transformedData = {
      ...data[0],
      customer: customerData,
      flight: flightData
    };
    
    return NextResponse.json({ data: transformedData });
  } catch (error) {
    console.error('Error in PUT pre-order API route:', error);
    return NextResponse.json(
      { error: `Failed to update pre-order: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  console.log(`Deleting pre-order with ID: ${id}`);

  try {
    // Check if the pre-order exists before attempting to delete
    const { data: existingPreOrder, error: fetchError } = await supabase
      .from('preorders')
      .select('*')
      .eq('preorder_id', id)
      .single();

    if (fetchError) {
      console.error('Error fetching pre-order:', fetchError);
      return NextResponse.json(
        { message: 'Error fetching pre-order', error: fetchError.message },
        { status: 500 }
      );
    }

    if (!existingPreOrder) {
      return NextResponse.json(
        { message: 'Pre-order not found' },
        { status: 404 }
      );
    }

    // Delete the pre-order
    const { error: deleteError } = await supabase
      .from('preorders')
      .delete()
      .eq('preorder_id', id);

    if (deleteError) {
      console.error('Error deleting pre-order:', deleteError);
      return NextResponse.json(
        { message: 'Error deleting pre-order', error: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Pre-order deleted successfully' },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Unexpected error deleting pre-order:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { message: 'Unexpected error deleting pre-order', error: errorMessage },
      { status: 500 }
    );
  }
} 