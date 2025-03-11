'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import AuthForm from '@/components/AuthForm';

export default function AuthPage() {
  useEffect(() => {
    console.log('AuthPage: Component mounted');
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-md"
    >
      <AuthForm />
    </motion.div>
  );
} 