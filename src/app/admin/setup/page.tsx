'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function AdminSetupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [setupKey, setSetupKey] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSetAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error('Please enter an email address');
      return;
    }
    
    if (!setupKey) {
      toast.error('Please enter the setup key');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/admin/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, setupKey }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to set admin');
      }
      
      toast.success(data.message || `${email} has been set as admin`);
      setEmail('');
      setSetupKey('');
    } catch (error) {
      console.error('Error setting admin:', error);
      toast.error(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Admin Setup</CardTitle>
            <CardDescription>
              Use this page to set up your first admin user
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSetAdmin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <p className="text-sm text-muted-foreground">
                  Enter the email address of the user you want to set as admin
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="setupKey">Setup Key</Label>
                <Input
                  id="setupKey"
                  type="password"
                  placeholder="Enter setup key"
                  value={setupKey}
                  onChange={(e) => setSetupKey(e.target.value)}
                  required
                />
                <p className="text-sm text-muted-foreground">
                  The default key is 'fatty-store-setup-key' unless you've set ADMIN_SETUP_KEY in your environment
                </p>
              </div>
              
              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? 'Setting Admin...' : 'Set as Admin'}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => router.push('/admin')}>
              Back to Dashboard
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
} 