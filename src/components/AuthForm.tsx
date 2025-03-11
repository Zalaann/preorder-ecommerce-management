"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Lock, Loader2, Github, User } from 'lucide-react';
import { toast } from 'sonner';
import { getCurrentUserProfile } from '@/utils/userRoles';

// Define a schema that includes all possible fields
const authSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type AuthFormValues = z.infer<typeof authSchema>;

interface AuthError {
  message: string;
}

export default function AuthForm() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showManualSubmit, setShowManualSubmit] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    trigger,
    clearErrors,
    getValues,
  } = useForm<AuthFormValues>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
    },
  });

  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    setError(null);
    reset();
    clearErrors();
  };

  // Add a timeout to show manual submit button if form submission takes too long
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (loading) {
      timer = setTimeout(() => {
        setShowManualSubmit(true);
      }, 3000); // Show manual submit button after 3 seconds of loading
    } else {
      setShowManualSubmit(false);
    }
    
    return () => {
      clearTimeout(timer);
    };
  }, [loading]);

  // Add a direct manual submission function
  const manualSubmit = async () => {
    try {
      const values = getValues();
      console.log('Manual submission with values:', values);
      
      if (!values.email || !values.password) {
        console.error('Missing required fields');
        setError('Email and password are required');
        return;
      }
      
      setLoading(true);
      
      if (isLogin) {
        console.log('Manual login attempt with:', values.email);
        const { data, error } = await supabase.auth.signInWithPassword({
          email: values.email,
          password: values.password,
        });
        
        if (error) {
          console.error('Manual login error:', error);
          setError(error.message);
          toast.error(error.message);
        } else {
          console.log('Manual login successful:', data);
          toast.success('Successfully signed in!');
          
          // Check user role and redirect accordingly
          setTimeout(async () => {
            try {
              const userProfile = await getCurrentUserProfile();
              if (userProfile?.role === 'admin') {
                router.push('/admin');
              } else {
                router.push('/employee');
              }
            } catch (err) {
              console.error('Error checking user role:', err);
              // Default to employee dashboard if role check fails
              router.push('/employee');
            }
          }, 500);
        }
      } else {
        if (!values.name) {
          setError('Name is required for signup');
          return;
        }
        
        console.log('Manual signup attempt with:', values.email);
        const { data, error } = await supabase.auth.signUp({
          email: values.email,
          password: values.password,
          options: {
            data: {
              name: values.name,
            }
          }
        });
        
        if (error) {
          console.error('Manual signup error:', error);
          setError(error.message);
          toast.error(error.message);
        } else {
          console.log('Manual signup successful:', data);
          toast.success('Account created! You can now sign in.');
          setIsLogin(true);
        }
      }
    } catch (err) {
      console.error('Manual submission error:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      toast.error(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Simplify the form submit handler
  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log('Direct form submit handler triggered');
    manualSubmit();
  };

  const handleGoogleSignIn = async () => {
    try {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
      });
    } catch (err: unknown) {
      const authError = err as AuthError;
      setError(authError.message);
      toast.error(authError.message);
    }
  };

  const handleGithubSignIn = async () => {
    try {
      await supabase.auth.signInWithOAuth({
        provider: 'github',
      });
    } catch (err: unknown) {
      const authError = err as AuthError;
      setError(authError.message);
      toast.error(authError.message);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-900/80 backdrop-blur-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center gradient-text">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </CardTitle>
            <CardDescription className="text-center">
              {isLogin 
                ? 'Enter your credentials to sign in to your account' 
                : 'Fill in the form below to create your account'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AnimatePresence mode="wait">
              <motion.form
                key={isLogin ? 'login' : 'signup'}
                initial={{ opacity: 0, x: isLogin ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: isLogin ? 20 : -20 }}
                transition={{ duration: 0.3 }}
                onSubmit={handleFormSubmit}
                className="space-y-4"
                autoComplete="on"
              >
                {!isLogin && (
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium">
                      Name
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400" />
                      <Input
                        id="name"
                        type="text"
                        placeholder="Your name"
                        className="pl-10"
                        autoComplete="name"
                        {...register('name')}
                      />
                    </div>
                    {errors.name && (
                      <motion.p 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="text-sm font-medium text-destructive"
                      >
                        {errors.name.message}
                      </motion.p>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@example.com"
                      className="pl-10"
                      autoComplete="email"
                      {...register('email')}
                    />
                  </div>
                  {errors.email && (
                    <motion.p 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="text-sm font-medium text-destructive"
                    >
                      {errors.email.message}
                    </motion.p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      className="pl-10"
                      autoComplete={isLogin ? "current-password" : "new-password"}
                      {...register('password')}
                    />
                  </div>
                  {errors.password && (
                    <motion.p 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="text-sm font-medium text-destructive"
                    >
                      {errors.password.message}
                    </motion.p>
                  )}
                </div>

                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 text-sm rounded-md bg-destructive/10 text-destructive"
                  >
                    {error}
                  </motion.div>
                )}

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-indigo-400 via-indigo-500 to-indigo-600 hover:opacity-90 transition-opacity"
                  disabled={loading}
                  onClick={(e) => {
                    // Prevent default to avoid double submission
                    e.preventDefault();
                    console.log('Button click handler triggered');
                    manualSubmit();
                  }}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isLogin ? 'Signing In...' : 'Creating Account...'}
                    </>
                  ) : (
                    <>{isLogin ? 'Sign In' : 'Sign Up'}</>
                  )}
                </Button>

                {/* Manual submission button that appears if form submission takes too long */}
                {showManualSubmit && (
                  <div className="mt-4">
                    <p className="text-sm text-amber-600 dark:text-amber-400 mb-2">
                      Having trouble submitting? Try the manual button below:
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full border-amber-500 text-amber-600 dark:text-amber-400"
                      onClick={() => {
                        console.log('Manual submission button clicked');
                        manualSubmit();
                      }}
                    >
                      Manual {isLogin ? 'Sign In' : 'Sign Up'}
                    </Button>
                  </div>
                )}
              </motion.form>
            </AnimatePresence>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400">
                    Or continue with
                  </span>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <Button 
                  variant="outline" 
                  onClick={handleGoogleSignIn}
                  className="btn-hover"
                >
                  <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12.545 10.239v3.821h5.445c-0.712 2.315-2.647 3.972-5.445 3.972-3.332 0-6.033-2.701-6.033-6.032s2.701-6.032 6.033-6.032c1.498 0 2.866 0.549 3.921 1.453l2.814-2.814c-1.798-1.677-4.203-2.701-6.735-2.701-5.539 0-10.032 4.493-10.032 10.032s4.493 10.032 10.032 10.032c8.445 0 10.452-7.888 9.629-11.732h-9.629z" />
                  </svg>
                  Google
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={handleGithubSignIn}
                  className="btn-hover"
                >
                  <Github className="h-5 w-5 mr-2" />
                  GitHub
                </Button>
              </div>
            </div>

            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={toggleAuthMode}
                className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
              </button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
} 