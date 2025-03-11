import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// This is a special endpoint that should only be used during initial setup
// It allows setting a user as admin by email
export async function POST(request: NextRequest) {
  try {
    const { email, setupKey } = await request.json();
    
    // Validate required fields
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }
    
    // Check setup key (this is a simple security measure)
    // In production, you should use a more secure approach
    const SETUP_KEY = process.env.ADMIN_SETUP_KEY || 'fatty-store-setup-key';
    if (setupKey !== SETUP_KEY) {
      return NextResponse.json(
        { error: 'Invalid setup key' },
        { status: 401 }
      );
    }
    
    // Update the user's role to admin
    const { data, error } = await supabase
      .from('users')
      .update({ role: 'admin' })
      .eq('email', email)
      .select('*')
      .single();
    
    if (error) {
      console.error('Error setting admin:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    if (!data) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: `User ${email} has been set as admin`,
      user: {
        id: data.user_id,
        email: data.email,
        role: data.role,
      }
    });
  } catch (error) {
    console.error('Error in admin setup:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 