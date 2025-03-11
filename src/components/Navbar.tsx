"use client";

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { 
  LayoutDashboard, 
  Package, 
  LogOut, 
  Menu, 
  X, 
  ChevronDown,
  Bell
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface NavbarProps {
  user: User | null;
}

export default function Navbar({ user }: NavbarProps) {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      const offset = window.scrollY;
      if (offset > 10) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const handleSignOut = async () => {
    if (!router || isSigningOut) return;
    
    setIsSigningOut(true);
    
    try {
      await supabase.auth.signOut();
      router.push('/auth');
    } catch (_) {
      console.error('Error signing out');
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <motion.nav 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.3 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled 
          ? 'bg-white/80 dark:bg-gray-900/80 backdrop-blur-md shadow-md py-2' 
          : 'bg-white dark:bg-gray-900 py-4'
      }`}
    >
      <div className="container mx-auto px-4 flex justify-between items-center">
        <Link href="/" className="flex items-center space-x-2">
          <motion.div
            whileHover={{ rotate: 10, scale: 1.1 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            <Package className="h-8 w-8 text-indigo-500" />
          </motion.div>
          <motion.span 
            className="text-xl font-bold text-indigo-500"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            Fatty&apos;s Store
          </motion.span>
        </Link>
        
        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-6">
          {user ? (
            <>
              <Link 
                href="/admin" 
                className="flex items-center space-x-1 text-gray-700 dark:text-gray-300 hover:text-indigo-500 dark:hover:text-indigo-500 animated-border"
              >
                <LayoutDashboard className="h-4 w-4" />
                <span>Dashboard</span>
              </Link>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-1">
                    <span>Management</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Management</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push('/admin/pre-orders')}>
                    Pre-Orders
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push('/admin/customers')}>
                    Customers
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push('/admin/flights')}>
                    Flights
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push('/admin/reminders')}>
                    <Bell className="mr-2 h-4 w-4" />
                    Reminders
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.user_metadata?.avatar_url} />
                      <AvatarFallback>{user.email?.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="hidden lg:inline">{user.email}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} disabled={isSigningOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>{isSigningOut ? 'Signing Out...' : 'Sign Out'}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button asChild className="bg-indigo-500 hover:bg-indigo-600">
              <Link href="/auth">Sign In</Link>
            </Button>
          )}
          
          <ThemeToggle />
        </div>
        
        {/* Mobile Menu Button */}
        <div className="flex items-center space-x-4 md:hidden">
          <ThemeToggle />
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </Button>
        </div>
      </div>
      
      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
          className="md:hidden bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800"
        >
          <div className="container mx-auto px-4 py-4 flex flex-col space-y-4">
            {user ? (
              <>
                <Link 
                  href="/admin" 
                  className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <LayoutDashboard className="h-5 w-5" />
                  <span>Dashboard</span>
                </Link>
                
                <div className="border-t border-gray-200 dark:border-gray-800 pt-2">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Management</p>
                  <Link 
                    href="/admin/pre-orders" 
                    className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Package className="h-5 w-5" />
                    <span>Pre-Orders</span>
                  </Link>
                  <Link 
                    href="/admin/customers" 
                    className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Package className="h-5 w-5" />
                    <span>Customers</span>
                  </Link>
                  <Link 
                    href="/admin/flights" 
                    className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Package className="h-5 w-5" />
                    <span>Flights</span>
                  </Link>
                  <Link 
                    href="/admin/reminders" 
                    className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Bell className="h-5 w-5" />
                    <span>Reminders</span>
                  </Link>
                </div>
                
                <Button 
                  variant="destructive" 
                  onClick={handleSignOut} 
                  disabled={isSigningOut}
                  className="w-full justify-center"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {isSigningOut ? 'Signing Out...' : 'Sign Out'}
                </Button>
              </>
            ) : (
              <Button asChild className="w-full bg-indigo-500 hover:bg-indigo-600">
                <Link 
                  href="/auth"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign In
                </Link>
              </Button>
            )}
          </div>
        </motion.div>
      )}
    </motion.nav>
  );
} 