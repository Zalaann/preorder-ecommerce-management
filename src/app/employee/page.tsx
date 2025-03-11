'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { UserCircle, Package, Plane, Users, BarChart3, Clock, LogOut, CreditCard, Bell } from 'lucide-react';
import { UserProfile } from '@/lib/types';
import { getCurrentUserProfile } from '@/utils/userRoles';

const EmployeeDashboardPage: React.FC = () => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingOrders, setPendingOrders] = useState(0);
  const [untalliedPayments, setUntalliedPayments] = useState(0);

  useEffect(() => {
    if (!router) return;
    
    console.log('Employee page: Checking session');
    
    // Check for session
    async function loadUser() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        console.log('Employee page: Session check result', session ? 'Session found' : 'No session');
        
        if (!session) {
          router.push('/auth');
        } else {
          setUser(session.user);
          
          // Get user profile with role information
          const profile = await getCurrentUserProfile();
          setUserProfile(profile);
          
          // If user is admin, redirect to admin dashboard
          if (profile?.role === 'admin') {
            router.push('/admin');
            return;
          }
          
          setLoading(false);
          console.log('Employee page: User loaded, loading set to false');
        }
      } catch (error) {
        console.error('Error checking authentication', error);
        router.push('/auth');
      }
    }
    
    loadUser();
    
    // Set up auth state listener
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Employee page: Auth state changed', event);
      
      if (event === 'SIGNED_OUT') {
        router.push('/auth');
      } else if (event === 'SIGNED_IN' && session) {
        setUser(session.user);
        
        // Get user profile with role information
        getCurrentUserProfile().then(profile => {
          setUserProfile(profile);
          
          // If user is admin, redirect to admin dashboard
          if (profile?.role === 'admin') {
            router.push('/admin');
          }
        });
        
        setLoading(false);
        console.log('Employee page: User signed in, loading set to false');
      }
    });
    
    return () => {
      data.subscription.unsubscribe();
    };
  }, [router]);

  useEffect(() => {
    // Fetch counts for pending orders and untallied payments
    const fetchCounts = async () => {
      try {
        // Fetch pending orders count
        const { data: preOrders } = await supabase
          .from('preorders')
          .select('preorder_id')
          .eq('order_status', 'pending');
        
        // Fetch untallied payments count
        const { data: payments } = await supabase
          .from('payments')
          .select('payment_id')
          .eq('tally', false);

        setPendingOrders(preOrders?.length || 0);
        setUntalliedPayments(payments?.length || 0);
      } catch (error) {
        console.error('Error fetching counts:', error);
      }
    };

    fetchCounts();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/auth');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand mb-4"></div>
        <h1 className="text-xl font-medium text-gray-800 ml-4">
          Loading dashboard...
        </h1>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold gradient-text">Employee Dashboard</h1>
        <p className="text-gray-600 mt-1">Welcome back, {user?.email}</p>
      </div>

      {/* User Profile Card */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-8 border border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-16 h-16 rounded-full bg-brand-light flex items-center justify-center text-brand text-2xl font-bold">
              {user?.email?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="ml-4">
              <h2 className="text-xl font-semibold">{user?.email}</h2>
              <p className="text-sm text-gray-500">User ID: {user?.id?.substring(0, 8)}...</p>
              {userProfile && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 bg-blue-100 text-blue-800">
                  <UserCircle className="mr-1 h-3 w-3" />
                  {userProfile.role}
                </span>
              )}
            </div>
          </div>
          <button 
            onClick={handleSignOut}
            className="flex items-center px-4 py-2 bg-red-50 text-red-600 rounded-md hover:bg-red-100 transition-colors"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </button>
        </div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-gray-500">Last Sign In</p>
            <p className="mt-1 text-gray-800">
              {user?.last_sign_in_at 
                ? new Date(user.last_sign_in_at).toLocaleString() 
                : 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Account Created</p>
            <p className="mt-1 text-gray-800">
              {user?.created_at 
                ? new Date(user.created_at).toLocaleString() 
                : 'N/A'}
            </p>
          </div>
        </div>
      </div>

      {/* Main Dashboard Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link href="/employee/pre-orders">
          <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Pre-Orders</h3>
              <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                <Package className="w-6 h-6" />
              </div>
            </div>
            <p className="text-gray-600">
              Manage pre-orders, update status, and track customer information.
            </p>
          </div>
        </Link>
            
        <Link href="/employee/flights">
          <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Flights</h3>
              <div className="p-3 rounded-full bg-indigo-100 text-indigo-600">
                <Plane className="w-6 h-6" />
              </div>
            </div>
            <p className="text-gray-600">
              Manage flights, update shipment dates, and track flight status.
            </p>
          </div>
        </Link>
            
        <Link href="/employee/customers">
          <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Customers</h3>
              <div className="p-3 rounded-full bg-green-100 text-green-600">
                <Users className="w-6 h-6" />
              </div>
            </div>
            <p className="text-gray-600">
              View and manage customer information and order history.
            </p>
          </div>
        </Link>
            
        <Link href="/employee/payments">
          <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Payments</h3>
              <div className="p-3 rounded-full bg-emerald-100 text-emerald-600">
                <CreditCard className="w-6 h-6" />
              </div>
            </div>
            <p className="text-gray-600">
              Manage payments, track transactions, and record financial data.
            </p>
          </div>
        </Link>

        <Link href="/employee/reminders">
          <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Reminders</h3>
              <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                <Bell className="w-6 h-6" />
              </div>
            </div>
            <p className="text-gray-600">
              Manage reminders with a Kanban board to track tasks and deadlines.
            </p>
          </div>
        </Link>

        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Quick Stats</h3>
            <div className="p-3 rounded-full bg-purple-100 text-purple-600">
              <BarChart3 className="w-6 h-6" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div 
              onClick={() => router.push('/employee/pre-orders?status=pending')}
              className="bg-blue-50 p-4 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors"
            >
              <p className="text-sm text-gray-500">Pending Orders</p>
              <p className="text-2xl font-bold text-blue-700">{pendingOrders}</p>
            </div>
            <div 
              onClick={() => router.push('/employee/payments?tally=false')}
              className="bg-amber-50 p-4 rounded-lg cursor-pointer hover:bg-amber-100 transition-colors"
            >
              <p className="text-sm text-gray-500">Untallied Payments</p>
              <p className="text-2xl font-bold text-amber-700">{untalliedPayments}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
            <div className="p-3 rounded-full bg-amber-100 text-amber-600">
              <Clock className="w-6 h-6" />
            </div>
          </div>
          <div className="space-y-3">
            <p className="text-gray-500 text-sm">No recent activity to display.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboardPage; 