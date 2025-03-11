'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Package, Plane, Users, Home, CreditCard, Menu, X, LogOut, Moon, Sun, Banknote, Bell } from 'lucide-react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { getCurrentUserProfile } from '@/utils/userRoles';
import { UserProfile } from '@/lib/types';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  
  // Check if current route is active
  const isActive = (path: string) => {
    return pathname === path;
  };

  useEffect(() => {
    const checkUserAccess = async () => {
      try {
        setLoading(true);
        
        // Check if user is logged in
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          router.push('/auth');
          return;
        }
        
        // Check user role
        const profile = await getCurrentUserProfile();
        setUserProfile(profile);
        
        if (!profile) {
          router.push('/auth');
          return;
        }
        
        // If user is not admin, redirect to employee dashboard
        if (profile.role !== 'admin') {
          router.push('/employee');
          return;
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error checking user access:', error);
        router.push('/auth');
      }
    };
    
    checkUserAccess();
  }, [router]);

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/auth');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
          <p className="text-gray-600 dark:text-gray-300 animate-pulse">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const navItems = [
    { href: '/admin', icon: <Home className="w-5 h-5" />, label: 'Dashboard' },
    { href: '/admin/pre-orders', icon: <Package className="w-5 h-5" />, label: 'Pre-Orders' },
    { href: '/admin/flights', icon: <Plane className="w-5 h-5" />, label: 'Flights' },
    { href: '/admin/customers', icon: <Users className="w-5 h-5" />, label: 'Customers' },
    { href: '/admin/payments', icon: <CreditCard className="w-5 h-5" />, label: 'Payments' },
    { href: '/admin/transactions', icon: <Banknote className="w-5 h-5" />, label: 'Transactions' },
    { href: '/admin/reminders', icon: <Bell className="w-5 h-5" />, label: 'Reminders' },
  ];

  // Add User Management option only for admin users
  if (userProfile?.role === 'admin') {
    navItems.push({ href: '/admin/users', icon: <Users className="w-5 h-5" />, label: 'User Management' });
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      {/* Mobile Header */}
      <header className="md:hidden sticky top-0 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-xl font-bold gradient-text">Management Panel</h1>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="rounded-full"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="rounded-full"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="md:hidden fixed inset-x-0 top-[57px] z-30 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-lg"
          >
            <nav className="py-2">
              <ul className="space-y-1 px-2">
                {navItems.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex items-center px-4 py-3 rounded-lg transition-all duration-200 ${
                        isActive(item.href)
                          ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-medium'
                          : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      <span className="mr-3">{item.icon}</span>
                      {item.label}
                    </Link>
                  </li>
                ))}
                <li>
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center px-4 py-3 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200"
                  >
                    <LogOut className="w-5 h-5 mr-3" />
                    Sign Out
                  </button>
                </li>
              </ul>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-64 bg-white dark:bg-gray-800 shadow-md transition-all duration-300">
        <div className="sticky top-0 h-screen flex flex-col">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <h1 className="text-xl font-bold gradient-text">Management Panel</h1>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="rounded-full"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
          </div>
          <nav className="mt-4 flex-1 overflow-y-auto">
            <ul className="space-y-1 px-3">
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center px-4 py-3 rounded-lg transition-all duration-200 ${
                      isActive(item.href)
                        ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-medium'
                        : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <span className="mr-3">{item.icon}</span>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="p-4 border-t border-gray-100 dark:border-gray-700">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-center px-4 py-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200"
            >
              <LogOut className="w-5 h-5 mr-2" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>
      
      {/* Main content */}
      <main className="flex-1 overflow-x-hidden transition-all duration-300">
        <div className="p-4 md:p-8">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
} 