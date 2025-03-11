'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { 
  DollarSign, 
  Package, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Users, 
  UserPlus, 
  Repeat, 
  Bell, 
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Calendar,
  Banknote
} from 'lucide-react';
import { getCurrentUserProfile } from '@/utils/userRoles';
import { UserProfile, PreOrderWithDetails, Reminder } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { BarChart } from '@/components/ui/bar-chart';

const DashboardPage: React.FC = () => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Key metrics state
  const [totalRevenue, setTotalRevenue] = useState({ month: 0, lifetime: 0 });
  const [unpaidAmount, setUnpaidAmount] = useState(0);
  const [preorderStats, setPreorderStats] = useState({
    total: 0,
    pending: 0,
    completed: 0,
    cancelled: 0
  });
  const [monthlyRevenue, setMonthlyRevenue] = useState<{name: string, value: number}[]>([]);

  // Define a type for top customers
  interface TopCustomer {
    customer_id: string;
    name: string;
    total_spent: number;
  }

  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([]);
  const [newCustomers, setNewCustomers] = useState(0);
  const [repeatCustomers, setRepeatCustomers] = useState(0);
  const [reminders, setReminders] = useState<{today: Reminder[], thisWeek: Reminder[]}>({
    today: [],
    thisWeek: []
  });

  useEffect(() => {
    if (!router) return;
    
    // Check for session
    async function loadUser() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          router.push('/auth');
        } else {
          setUser(session.user);
          
          // Get user profile with role information
          const profile = await getCurrentUserProfile();
          setUserProfile(profile);
          
          // Load dashboard data
          await loadDashboardData();
          
          setLoading(false);
        }
      } catch (error) {
        console.error('Error checking authentication', error);
        router.push('/auth');
      }
    }
    
    loadUser();
    
    // Set up auth state listener
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        router.push('/auth');
      } else if (event === 'SIGNED_IN' && session) {
        setUser(session.user);
        
        // Get user profile with role information
        getCurrentUserProfile().then(profile => {
          setUserProfile(profile);
        });
        
        loadDashboardData();
        setLoading(false);
      }
    });
    
    return () => {
      data.subscription.unsubscribe();
    };
  }, [router]);

  const loadDashboardData = async () => {
    try {
      // Fetch total revenue (this month & lifetime)
      await fetchTotalRevenue();
      
      // Fetch unpaid amount
      await fetchUnpaidAmount();
      
      // Fetch preorder stats
      await fetchPreorderStats();
      
      // Fetch monthly revenue for graph
      await fetchMonthlyRevenue();
      
      // Fetch customer insights
      await fetchCustomerInsights();
      
      // Fetch reminders
      await fetchReminders();
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const fetchTotalRevenue = async () => {
    try {
      // Get current month's first and last day
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
      
      // Fetch this month's revenue
      const { data: monthData, error: monthError } = await supabase
        .from('preorders')
        .select('total_amount')
        .gte('created_at', firstDay)
        .lte('created_at', lastDay);
      
      if (monthError) throw monthError;
      
      // Fetch lifetime revenue
      const { data: lifetimeData, error: lifetimeError } = await supabase
        .from('preorders')
        .select('total_amount');
      
      if (lifetimeError) throw lifetimeError;
      
      // Calculate totals
      const monthTotal = monthData?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;
      const lifetimeTotal = lifetimeData?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;
      
      setTotalRevenue({
        month: monthTotal,
        lifetime: lifetimeTotal
      });
    } catch (error) {
      console.error('Error fetching total revenue:', error);
    }
  };

  const fetchUnpaidAmount = async () => {
    try {
      const { data, error } = await supabase
        .from('preorders')
        .select('cod_amount, advance_payment')
        .eq('order_status', 'pending');
      
      if (error) throw error;
      
      const total = data?.reduce((sum, order) => {
        return sum + (order.cod_amount || 0) + (order.advance_payment || 0);
      }, 0) || 0;
      
      setUnpaidAmount(total);
    } catch (error) {
      console.error('Error fetching unpaid amount:', error);
    }
  };

  const fetchPreorderStats = async () => {
    try {
      // Get current month's first and last day
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
      
      // Fetch total preorders this month
      const { data: totalData, error: totalError } = await supabase
        .from('preorders')
        .select('preorder_id')
        .gte('created_at', firstDay)
        .lte('created_at', lastDay);
      
      if (totalError) throw totalError;
      
      // Fetch pending preorders
      const { data: pendingData, error: pendingError } = await supabase
        .from('preorders')
        .select('preorder_id')
        .eq('order_status', 'pending');
      
      if (pendingError) throw pendingError;
      
      // Fetch completed preorders
      const { data: completedData, error: completedError } = await supabase
        .from('preorders')
        .select('preorder_id')
        .eq('order_status', 'delivered');
      
      if (completedError) throw completedError;
      
      // Fetch cancelled preorders
      const { data: cancelledData, error: cancelledError } = await supabase
        .from('preorders')
        .select('preorder_id')
        .eq('order_status', 'cancelled');
      
      if (cancelledError) throw cancelledError;
      
      setPreorderStats({
        total: totalData?.length || 0,
        pending: pendingData?.length || 0,
        completed: completedData?.length || 0,
        cancelled: cancelledData?.length || 0
      });
    } catch (error) {
      console.error('Error fetching preorder stats:', error);
    }
  };

  const fetchMonthlyRevenue = async () => {
    try {
      // Get data for the last 6 months
      const months = [];
      const now = new Date();
      
      for (let i = 5; i >= 0; i--) {
        const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
        
        const { data, error } = await supabase
          .from('preorders')
          .select('total_amount')
          .gte('created_at', month.toISOString())
          .lte('created_at', monthEnd.toISOString());
        
        if (error) throw error;
        
        const total = data?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;
        
        months.push({
          name: month.toLocaleString('default', { month: 'short' }),
          value: total
        });
      }
      
      setMonthlyRevenue(months);
    } catch (error) {
      console.error('Error fetching monthly revenue:', error);
    }
  };

  const fetchCustomerInsights = async () => {
    try {
      // Fetch top customers by total spending using a direct query instead of RPC
      const { data: orders, error: ordersError } = await supabase
        .from('preorders')
        .select('customer_id, total_amount, customer:customers(name)');
      
      if (ordersError) throw ordersError;
      
      // Group by customer and sum total_amount
      const customerTotals: Record<string, TopCustomer> = {};
      
      orders?.forEach(order => {
        const customerId = order.customer_id;
        const customerName = (order.customer as any)?.name || 'Unknown';
        const amount = order.total_amount || 0;
        
        if (!customerTotals[customerId]) {
          customerTotals[customerId] = { customer_id: customerId, name: customerName, total_spent: 0 };
        }
        
        customerTotals[customerId].total_spent += amount;
      });
      
      // Convert to array and sort
      const topCustomers = Object.values(customerTotals)
        .sort((a, b) => b.total_spent - a.total_spent)
        .slice(0, 5);
      
      setTopCustomers(topCustomers);
      
      // For new customers, use preorders created in the last 30 days instead
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      // Count unique customers who placed their first order in the last 30 days
      const { data: recentOrders, error: recentError } = await supabase
        .from('preorders')
        .select('customer_id, created_at')
        .gte('created_at', thirtyDaysAgo.toISOString());
      
      if (recentError) throw recentError;
      
      // Get all orders to determine which customers are new
      const { data: allOrders, error: allOrdersError } = await supabase
        .from('preorders')
        .select('customer_id, created_at')
        .order('created_at', { ascending: true });
      
      if (allOrdersError) throw allOrdersError;
      
      // Group orders by customer and find their first order date
      const customerFirstOrderDate: Record<string, string> = {};
      allOrders?.forEach(order => {
        const customerId = order.customer_id;
        if (!customerFirstOrderDate[customerId] || order.created_at < customerFirstOrderDate[customerId]) {
          customerFirstOrderDate[customerId] = order.created_at;
        }
      });
      
      // Count customers whose first order was in the last 30 days
      const newCustomerCount = Object.entries(customerFirstOrderDate)
        .filter(([_, firstOrderDate]) => {
          const orderDate = new Date(firstOrderDate);
          return orderDate >= thirtyDaysAgo;
        }).length;
      
      setNewCustomers(newCustomerCount);
      
      // Count customers with more than one order (repeat customers)
      const customerOrderCounts: Record<string, number> = {};
      allOrders?.forEach(order => {
        const customerId = order.customer_id;
        customerOrderCounts[customerId] = (customerOrderCounts[customerId] || 0) + 1;
      });
      
      const repeatCustomerCount = Object.values(customerOrderCounts)
        .filter(count => count > 1)
        .length;
      
      setRepeatCustomers(repeatCustomerCount);
    } catch (error) {
      console.error('Error fetching customer insights:', error);
    }
  };

  const fetchReminders = async () => {
    try {
      // Get today's date
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Get end of current week
      const endOfWeek = new Date(today);
      endOfWeek.setDate(today.getDate() + (7 - today.getDay()));
      
      // Fetch reminders due today
      const { data: todayData, error: todayError } = await supabase
        .from('reminders')
        .select('*')
        .gte('due_date', today.toISOString())
        .lt('due_date', new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString());
      
      if (todayError) throw todayError;
      
      // Fetch reminders due this week
      const { data: weekData, error: weekError } = await supabase
        .from('reminders')
        .select('*')
        .gt('due_date', new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString())
        .lte('due_date', endOfWeek.toISOString());
      
      if (weekError) throw weekError;
      
      setReminders({
        today: todayData || [],
        thisWeek: weekData || []
      });
    } catch (error) {
      console.error('Error fetching reminders:', error);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/auth');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600 mb-4"></div>
        <h1 className="text-xl font-medium text-gray-800 dark:text-gray-200 ml-4">
          Loading dashboard...
        </h1>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Welcome back, {user?.email}</p>
      </div>

      {/* Key Metrics (Top Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* Total Revenue Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium flex items-center">
              <Banknote className="w-5 h-5 mr-2 text-green-500" />
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(totalRevenue.lifetime)}
            </div>
            <div className="mt-1 flex items-center">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                This Month: {formatCurrency(totalRevenue.month)}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Unpaid Amount Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium flex items-center">
              <AlertCircle className="w-5 h-5 mr-2 text-amber-500" />
              Unpaid Amount
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(unpaidAmount)}
            </div>
            <div className="mt-1 flex items-center">
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                Pending Payments
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Preorders Summary Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium flex items-center">
              <Package className="w-5 h-5 mr-2 text-blue-500" />
              Preorders Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {preorderStats.total}
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <div className="flex flex-col items-center">
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 mb-1">
                  <Clock className="w-3 h-3 mr-1" />
                  {preorderStats.pending}
                </Badge>
                <span className="text-xs text-gray-500">Pending</span>
              </div>
              <div className="flex flex-col items-center">
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 mb-1">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  {preorderStats.completed}
                </Badge>
                <span className="text-xs text-gray-500">Completed</span>
              </div>
              <div className="flex flex-col items-center">
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 mb-1">
                  <XCircle className="w-3 h-3 mr-1" />
                  {preorderStats.cancelled}
                </Badge>
                <span className="text-xs text-gray-500">Cancelled</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Monthly Revenue Graph */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="text-lg font-medium flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-purple-500" />
              Monthly Revenue
            </CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            {monthlyRevenue.length > 0 ? (
              <BarChart 
                data={monthlyRevenue}
                index="name"
                categories={["value"]}
                colors={["purple"]}
                valueFormatter={(value: number) => formatCurrency(value)}
                yAxisWidth={80}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">No revenue data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Customer Insights */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="text-lg font-medium flex items-center">
              <Users className="w-5 h-5 mr-2 text-indigo-500" />
              Customer Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2 flex items-center">
                  <TrendingUp className="w-4 h-4 mr-1 text-green-500" />
                  Top Customers
                </h4>
                <div className="space-y-2">
                  {topCustomers.length > 0 ? (
                    topCustomers.map((customer, index) => (
                      <div key={customer.customer_id || index} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="flex items-center">
                          <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-700 dark:text-indigo-300 text-xs font-medium mr-2">
                            {index + 1}
                          </div>
                          <span className="text-sm font-medium">{customer.name || 'Unknown'}</span>
                        </div>
                        <span className="text-sm font-medium text-green-600 dark:text-green-400">
                          {formatCurrency(customer.total_spent || 0)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm">No customer data available</p>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                  <div className="flex items-center mb-1">
                    <UserPlus className="w-4 h-4 mr-1 text-blue-500" />
                    <h4 className="text-sm font-medium">New Customers</h4>
                  </div>
                  <p className="text-2xl font-bold">{newCustomers}</p>
                  <p className="text-xs text-gray-500">Last 30 days</p>
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                  <div className="flex items-center mb-1">
                    <Repeat className="w-4 h-4 mr-1 text-purple-500" />
                    <h4 className="text-sm font-medium">Repeat Customers</h4>
                  </div>
                  <p className="text-2xl font-bold">{repeatCustomers}</p>
                  <p className="text-xs text-gray-500">Ordered more than once</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reminder System */}
      <Card className="mb-8">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-medium flex items-center">
            <Bell className="w-5 h-5 mr-2 text-amber-500" />
            Reminder System
          </CardTitle>
          <Link href="/admin/reminders">
            <Button variant="ghost" size="sm" className="h-8 gap-1">
              View All <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Due Today */}
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2 flex items-center">
                <Calendar className="w-4 h-4 mr-1 text-red-500" />
                Due Today ({reminders.today.length})
              </h4>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {reminders.today.length > 0 ? (
                  reminders.today.map((reminder) => (
                    <div key={reminder.reminder_id} className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30 rounded-lg">
                      <div className="flex justify-between">
                        <h5 className="font-medium text-gray-900 dark:text-white">{reminder.title}</h5>
                        <Badge variant="outline" className={`
                          ${reminder.priority === 'Low' ? 'bg-green-50 text-green-700 border-green-200' : 
                            reminder.priority === 'Medium' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                            reminder.priority === 'High' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                            'bg-red-50 text-red-700 border-red-200'}
                        `}>
                          {reminder.priority}
                        </Badge>
                      </div>
                      {reminder.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-1">{reminder.description}</p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">No reminders due today</p>
                )}
              </div>
            </div>
            
            {/* Due This Week */}
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2 flex items-center">
                <Calendar className="w-4 h-4 mr-1 text-amber-500" />
                Due This Week ({reminders.thisWeek.length})
              </h4>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {reminders.thisWeek.length > 0 ? (
                  reminders.thisWeek.map((reminder) => (
                    <div key={reminder.reminder_id} className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/30 rounded-lg">
                      <div className="flex justify-between">
                        <h5 className="font-medium text-gray-900 dark:text-white">{reminder.title}</h5>
                        <Badge variant="outline" className={`
                          ${reminder.priority === 'Low' ? 'bg-green-50 text-green-700 border-green-200' : 
                            reminder.priority === 'Medium' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                            reminder.priority === 'High' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                            'bg-red-50 text-red-700 border-red-200'}
                        `}>
                          {reminder.priority}
                        </Badge>
                      </div>
                      {reminder.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-1">{reminder.description}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        Due: {new Date(reminder.due_date).toLocaleDateString()}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">No reminders due this week</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/admin/pre-orders">
          <Button variant="outline" className="w-full h-auto py-4 flex flex-col items-center justify-center gap-2">
            <Package className="h-5 w-5" />
            <span>Pre-Orders</span>
          </Button>
        </Link>
        <Link href="/admin/payments">
          <Button variant="outline" className="w-full h-auto py-4 flex flex-col items-center justify-center gap-2">
            <Banknote className="h-5 w-5" />
            <span>Payments</span>
          </Button>
        </Link>
        <Link href="/admin/customers">
          <Button variant="outline" className="w-full h-auto py-4 flex flex-col items-center justify-center gap-2">
            <Users className="h-5 w-5" />
            <span>Customers</span>
          </Button>
        </Link>
        <Link href="/admin/reminders">
          <Button variant="outline" className="w-full h-auto py-4 flex flex-col items-center justify-center gap-2">
            <Bell className="h-5 w-5" />
            <span>Reminders</span>
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default DashboardPage; 