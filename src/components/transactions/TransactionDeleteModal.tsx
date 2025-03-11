'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface TransactionDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isSubmitting: boolean;
  transactionId: number;
}

const TransactionDeleteModal: React.FC<TransactionDeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting,
  transactionId,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Confirm Deletion
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete transaction #{transactionId}? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Deleting this transaction will permanently remove it from the system. Any associated data will also be deleted.
          </p>
        </div>
        
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Deleting...' : 'Delete Transaction'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TransactionDeleteModal; 