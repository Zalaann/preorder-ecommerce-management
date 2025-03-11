'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
import { Edit, Trash2 } from 'lucide-react';
import { Transaction } from '@/lib/types';

interface TransactionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction;
  onEdit: () => void;
  onDelete: () => void;
}

const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  isOpen,
  onClose,
  transaction,
  onEdit,
  onDelete,
}) => {
  // Get status badge class
  const getStatusBadgeClass = (status: 'Not Confirmed' | 'Confirmed') => {
    switch (status) {
      case 'Confirmed':
        return 'bg-green-100 text-green-800';
      case 'Not Confirmed':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Get payment status badge class
  const getPaymentStatusBadgeClass = (status: 'Paid' | 'Unpaid') => {
    switch (status) {
      case 'Paid':
        return 'bg-green-100 text-green-800';
      case 'Unpaid':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Transaction Details
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-medium">Transaction #{transaction.transaction_id}</h3>
              <div className="flex space-x-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(transaction.confirmation_status)}`}>
                  {transaction.confirmation_status}
                </span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusBadgeClass(transaction.pay_status)}`}>
                  {transaction.pay_status}
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">User</p>
                <p className="font-medium">{transaction.user?.email || 'Unknown User'}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Brand</p>
                <p className="font-medium">{transaction.brand}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Transaction Date</p>
                <p className="font-medium">{formatDate(transaction.transaction_date)}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Due Date</p>
                <p className="font-medium">{formatDate(transaction.due_date)}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Amount</p>
                <p className="font-medium">PKR {transaction.amount.toFixed(2)}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Last Updated</p>
                <p className="font-medium">{formatDate(transaction.updated_at)}</p>
              </div>
            </div>
            
            {transaction.remarks && (
              <div className="mt-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">Remarks</p>
                <p className="mt-1 text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                  {transaction.remarks}
                </p>
              </div>
            )}
            
            {transaction.change_description && (
              <div className="mt-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">Change Description</p>
                <p className="mt-1 text-sm text-gray-800 dark:text-gray-200">
                  {transaction.change_description}
                </p>
              </div>
            )}
          </div>
        </div>
        
        <DialogFooter>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={onEdit}
              className="flex items-center gap-2"
            >
              <Edit className="h-4 w-4" />
              Edit
            </Button>
            <Button
              variant="destructive"
              onClick={onDelete}
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TransactionDetailModal; 