'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabase';
import { UserProfile } from '@/lib/supabase';
import { Transaction } from '@/lib/types';

interface TransactionAddEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  onSave: (transaction: Transaction) => void;
  isSubmitting: boolean;
}

const TransactionAddEditModal: React.FC<TransactionAddEditModalProps> = ({
  isOpen,
  onClose,
  transaction,
  onSave,
  isSubmitting,
}) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [formData, setFormData] = useState<Partial<Transaction>>({
    user_id: '',
    transaction_date: new Date().toISOString().split('T')[0],
    amount: 0,
    brand: '',
    confirmation_status: 'Not Confirmed',
    pay_status: 'Unpaid',
    remarks: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [editingFields, setEditingFields] = useState<Record<string, boolean>>({});

  // Load users for dropdown
  useEffect(() => {
    const fetchUsers = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, role');
      
      if (error) {
        console.error('Error fetching users:', error);
        return;
      }
      
      setUsers(data || []);
    };
    
    fetchUsers();
  }, []);

  // Initialize form data when transaction changes
  useEffect(() => {
    if (transaction) {
      setFormData({
        transaction_id: transaction.transaction_id,
        user_id: transaction.user_id,
        transaction_date: transaction.transaction_date,
        amount: transaction.amount,
        brand: transaction.brand,
        confirmation_status: transaction.confirmation_status,
        pay_status: transaction.pay_status,
        remarks: transaction.remarks,
      });
    } else {
      setFormData({
        user_id: '',
        transaction_date: new Date().toISOString().split('T')[0],
        amount: 0,
        brand: '',
        confirmation_status: 'Not Confirmed',
        pay_status: 'Unpaid',
        remarks: '',
      });
    }
    
    setErrors({});
  }, [transaction]);

  // Handle input focus for number fields
  const handleNumberFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Clear the field when it's focused and the value is 0
    if (parseFloat(value) === 0) {
      setEditingFields(prev => ({
        ...prev,
        [name]: true,
      }));
    }
  };

  // Handle number field blur
  const handleNumberBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name } = e.target;
    setEditingFields(prev => ({
      ...prev,
      [name]: false,
    }));
    
    // Ensure value is properly formatted when user leaves the field
    const value = formData[name as keyof typeof formData];
    if (typeof value === 'number' && (value === 0 || isNaN(value))) {
      setFormData(prev => ({
        ...prev,
        [name]: 0
      }));
    }
  };

  // Handle form change
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target as HTMLInputElement;
    
    if (name === 'amount') {
      if (value === '') {
        // Mark this field as being edited
        setEditingFields(prev => ({
          ...prev,
          [name]: true,
        }));
      } else {
        // If we have a value now, remove from editing set
        setEditingFields(prev => ({
          ...prev,
          [name]: false,
        }));
        // Update the form data with the numeric value
        setFormData((prev) => ({
          ...prev,
          [name]: parseFloat(value) || 0
        }));
      }
    } else {
      // For non-numeric fields, just update the value
      setFormData((prev) => ({
        ...prev,
        [name]: value
      }));
    }
    
    // Clear any error for this field
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.user_id) {
      newErrors.user_id = 'User is required';
    }
    
    if (!formData.transaction_date) {
      newErrors.transaction_date = 'Transaction date is required';
    }
    
    if (!formData.brand) {
      newErrors.brand = 'Brand is required';
    }
    
    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    onSave(formData as Transaction);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {transaction ? 'Edit Transaction' : 'Add New Transaction'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {/* User Selection */}
          <div className="mb-4">
            <Label htmlFor="user_id">User</Label>
            <div className="relative mt-1">
              <select
                id="user_id"
                name="user_id"
                value={formData.user_id || ''}
                onChange={handleChange}
                className="block w-full rounded-lg border-0 bg-gray-50/50 dark:bg-gray-700/50 text-gray-900 dark:text-white shadow-sm ring-1 ring-inset ring-gray-300/50 dark:ring-gray-600/50 focus:ring-2 focus:ring-inset focus:ring-purple-500 transition-all duration-200 py-2 px-3 sm:text-sm"
              >
                <option value="">Select User</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.email} ({user.role})
                  </option>
                ))}
              </select>
              {errors.user_id && (
                <p className="text-red-500 text-xs mt-1">{errors.user_id}</p>
              )}
            </div>
          </div>
          
          {/* Transaction Date */}
          <div className="mb-4">
            <Label htmlFor="transaction_date">Transaction Date</Label>
            <div className="relative mt-1">
              <Input
                id="transaction_date"
                name="transaction_date"
                type="date"
                value={formData.transaction_date || ''}
                onChange={handleChange}
              />
              {errors.transaction_date && (
                <p className="text-red-500 text-xs mt-1">{errors.transaction_date}</p>
              )}
            </div>
          </div>
          
          {/* Brand */}
          <div className="mb-4">
            <Label htmlFor="brand">Brand</Label>
            <div className="relative mt-1">
              <Input
                id="brand"
                name="brand"
                type="text"
                value={formData.brand || ''}
                onChange={handleChange}
                placeholder="Enter brand name"
              />
              {errors.brand && (
                <p className="text-red-500 text-xs mt-1">{errors.brand}</p>
              )}
            </div>
          </div>
          
          {/* Amount */}
          <div className="mb-4">
            <Label htmlFor="amount">Amount</Label>
            <div className="relative mt-1">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500 dark:text-gray-400 pointer-events-none">
                PKR
              </span>
              <Input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                min="0"
                value={editingFields.amount ? '' : formData.amount}
                onChange={handleChange}
                onFocus={handleNumberFocus}
                onBlur={handleNumberBlur}
                className="pl-12"
              />
              {errors.amount && (
                <p className="text-red-500 text-xs mt-1">{errors.amount}</p>
              )}
            </div>
          </div>
          
          {/* Confirmation Status */}
          <div className="mb-4">
            <Label htmlFor="confirmation_status">Confirmation Status</Label>
            <div className="relative mt-1">
              <select
                id="confirmation_status"
                name="confirmation_status"
                value={formData.confirmation_status || 'Not Confirmed'}
                onChange={handleChange}
                className="block w-full rounded-lg border-0 bg-gray-50/50 dark:bg-gray-700/50 text-gray-900 dark:text-white shadow-sm ring-1 ring-inset ring-gray-300/50 dark:ring-gray-600/50 focus:ring-2 focus:ring-inset focus:ring-purple-500 transition-all duration-200 py-2 px-3 sm:text-sm"
              >
                <option value="Not Confirmed">Not Confirmed</option>
                <option value="Confirmed">Confirmed</option>
              </select>
            </div>
          </div>
          
          {/* Payment Status */}
          <div className="mb-4">
            <Label htmlFor="pay_status">Payment Status</Label>
            <div className="relative mt-1">
              <select
                id="pay_status"
                name="pay_status"
                value={formData.pay_status || 'Unpaid'}
                onChange={handleChange}
                className="block w-full rounded-lg border-0 bg-gray-50/50 dark:bg-gray-700/50 text-gray-900 dark:text-white shadow-sm ring-1 ring-inset ring-gray-300/50 dark:ring-gray-600/50 focus:ring-2 focus:ring-inset focus:ring-purple-500 transition-all duration-200 py-2 px-3 sm:text-sm"
              >
                <option value="Unpaid">Unpaid</option>
                <option value="Paid">Paid</option>
              </select>
            </div>
          </div>
          
          {/* Remarks */}
          <div className="mb-4">
            <Label htmlFor="remarks">Remarks</Label>
            <div className="relative mt-1">
              <Textarea
                id="remarks"
                name="remarks"
                value={formData.remarks || ''}
                onChange={handleChange}
                placeholder="Enter any additional notes"
                className="block w-full rounded-lg border-0 bg-gray-50/50 dark:bg-gray-700/50 text-gray-900 dark:text-white shadow-sm ring-1 ring-inset ring-gray-300/50 dark:ring-gray-600/50 focus:ring-2 focus:ring-inset focus:ring-purple-500 transition-all duration-200 py-2 px-3 sm:text-sm"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : transaction ? 'Update Transaction' : 'Add Transaction'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TransactionAddEditModal; 