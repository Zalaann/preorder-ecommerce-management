import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const payment = searchParams.get('payment') || '';
    const sortColumn = searchParams.get('sortColumn') || 'transaction_date';
    const sortDirection = searchParams.get('sortDirection') || 'desc';
    
    // Build query
    let query = supabase
      .from('transactions')
      .select(`
        *,
        user:user_id (
          email,
          role
        )
      `, { count: 'exact' });
    
    // Apply filters
    if (search) {
      query = query.or(`brand.ilike.%${search}%,remarks.ilike.%${search}%`);
    }
    
    if (status) {
      query = query.eq('confirmation_status', status);
    }
    
    if (payment) {
      query = query.eq('pay_status', payment);
    }
    
    // Apply sorting
    query = query.order(sortColumn, { ascending: sortDirection === 'asc' });
    
    // Apply pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);
    
    // Execute query
    const { data, error, count } = await query;
    
    if (error) {
      throw error;
    }
    
    // Calculate total pages
    const totalPages = count ? Math.ceil(count / pageSize) : 0;
    
    return NextResponse.json({
      data,
      totalItems: count || 0,
      page,
      pageSize,
      totalPages,
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.user_id || !body.transaction_date || !body.brand || body.amount <= 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Insert transaction
    const { data, error } = await supabase
      .from('transactions')
      .insert({
        user_id: body.user_id,
        transaction_date: body.transaction_date,
        amount: body.amount,
        brand: body.brand,
        confirmation_status: body.confirmation_status || 'Not Confirmed',
        pay_status: body.pay_status || 'Unpaid',
        remarks: body.remarks,
        updated_by: body.updated_by,
        change_description: 'Transaction created'
      })
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Failed to create transaction' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.transaction_id || !body.user_id || !body.transaction_date || !body.brand || body.amount <= 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Update transaction
    const { data, error } = await supabase
      .from('transactions')
      .update({
        user_id: body.user_id,
        transaction_date: body.transaction_date,
        amount: body.amount,
        brand: body.brand,
        confirmation_status: body.confirmation_status,
        pay_status: body.pay_status,
        remarks: body.remarks,
        updated_by: body.updated_by,
        change_description: body.change_description || 'Transaction updated',
        updated_at: new Date().toISOString()
      })
      .eq('transaction_id', body.transaction_id)
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Failed to update transaction' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Transaction ID is required' },
        { status: 400 }
      );
    }
    
    // Delete transaction
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('transaction_id', id);
    
    if (error) {
      throw error;
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Failed to delete transaction' },
      { status: 500 }
    );
  }
} 