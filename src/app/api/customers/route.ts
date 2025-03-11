import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const searchQuery = url.searchParams.get('search') || '';
    const limit = parseInt(url.searchParams.get('limit') || '10');

    console.log(`Searching customers with query: "${searchQuery}", limit: ${limit}`);

    let query = supabase
      .from('customers')
      .select('*');

    // Apply search filter if provided
    if (searchQuery) {
      query = query.or(
        `customer_id.ilike.%${searchQuery}%,name.ilike.%${searchQuery}%,phone_number.ilike.%${searchQuery}%,instagram_id.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%`
      );
    }

    // Apply limit
    query = query.limit(limit);

    const { data: customers, error } = await query;

    if (error) {
      console.error('Error fetching customers:', error);
      return NextResponse.json(
        { error: `Failed to fetch customers: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: customers || [],
    });
  } catch (error) {
    console.error('Error in customers API route:', error);
    return NextResponse.json(
      { error: `Failed to fetch customers: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Creating new customer with data:', body);
    
    const { data, error } = await supabase
      .from('customers')
      .insert([body])
      .select();
    
    if (error) {
      console.error('Error creating customer:', error);
      throw error;
    }
    
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error in POST customers API route:', error);
    return NextResponse.json(
      { error: `Failed to create customer: ${(error as Error).message}` },
      { status: 500 }
    );
  }
} 