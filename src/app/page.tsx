'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    if (!router) return;
    
    // Check auth and redirect
    async function checkAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push('/auth');
        } else {
          router.push('/admin');
        }
      } catch (_) {
        console.error('Error checking authentication');
        router.push('/auth');
      }
    }
    
    checkAuth();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 dark:border-blue-400 mb-4"></div>
        <h1 className="text-xl font-medium text-gray-800 dark:text-white">Redirecting...</h1>
      </div>
    </div>
  );
}
