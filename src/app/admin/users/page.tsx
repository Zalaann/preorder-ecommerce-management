'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { UserProfile, Role } from '@/lib/types';
import { getCurrentUserProfile, getAllUsers, updateUserRole } from '@/utils/userRoles';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Shield, User, AlertCircle } from 'lucide-react';

export default function UsersManagementPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  useEffect(() => {
    async function checkAccess() {
      try {
        // Check if user is logged in
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          router.push('/auth');
          return;
        }
        
        // Get current user profile
        const userProfile = await getCurrentUserProfile();
        setCurrentUser(userProfile);
        
        if (!userProfile || userProfile.role !== 'admin') {
          setIsAdmin(false);
          toast.error('You do not have permission to access this page');
          router.push('/admin');
          return;
        }
        
        setIsAdmin(true);
        
        // Fetch all users
        const allUsers = await getAllUsers();
        if (allUsers) {
          setUsers(allUsers);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error checking access:', error);
        router.push('/admin');
      }
    }
    
    checkAccess();
  }, [router]);

  const handleRoleChange = async (userId: string, newRole: Role) => {
    try {
      setUpdatingUserId(userId);
      
      const result = await updateUserRole(userId, newRole);
      
      if (result.success) {
        toast.success(`User role updated to ${newRole}`);
        
        // Update local state
        setUsers(prevUsers => 
          prevUsers.map(user => 
            user.id === userId ? { ...user, role: newRole } : user
          )
        );
      } else {
        toast.error(result.error || 'Failed to update user role');
      }
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('An error occurred while updating the role');
    } finally {
      setUpdatingUserId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertCircle className="mr-2 h-5 w-5 text-destructive" />
              Access Denied
            </CardTitle>
            <CardDescription>
              You do not have permission to access this page.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => router.push('/admin')} className="w-full">
              Return to Dashboard
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">User Management</h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <User className="mr-2 h-5 w-5" />
            Users
          </CardTitle>
          <CardDescription>
            Manage user roles and permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {users.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.role === 'admin' 
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' 
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                        }`}>
                          {user.role === 'admin' ? (
                            <Shield className="mr-1 h-3 w-3" />
                          ) : (
                            <User className="mr-1 h-3 w-3" />
                          )}
                          {user.role}
                        </span>
                      </TableCell>
                      <TableCell>
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Select
                          defaultValue={user.role}
                          onValueChange={(value) => handleRoleChange(user.id, value as Role)}
                          disabled={updatingUserId === user.id || user.id === currentUser?.id}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="employee">Employee</SelectItem>
                          </SelectContent>
                        </Select>
                        {user.id === currentUser?.id && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Cannot change your own role
                          </p>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No users found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 