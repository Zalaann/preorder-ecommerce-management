'use client';

import React from 'react';
import { PreOrderWithDetails } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
import { AlertTriangle } from 'lucide-react';

interface PreOrderDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  preOrder: PreOrderWithDetails | null;
  onDelete: (preOrderId: string) => void;
}

const PreOrderDeleteModal: React.FC<PreOrderDeleteModalProps> = ({
  isOpen,
  onClose,
  preOrder,
  onDelete,
}) => {
  if (!isOpen || !preOrder) return null;

  const handleDelete = () => {
    onDelete(preOrder.preorder_id);
  };

  const customerName = preOrder.customer?.name || 'Unknown Customer';
  const flightName = preOrder.flight?.flight_name || 'Unknown Flight';
  const createdDate = formatDate(preOrder.created_at);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Confirm Deletion
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this pre-order? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="font-medium">Pre-Order ID:</div>
            <div>{preOrder.preorder_id}</div>
            
            <div className="font-medium">Customer:</div>
            <div>{customerName}</div>
            
            <div className="font-medium">Flight:</div>
            <div>{flightName}</div>
            
            <div className="font-medium">Created On:</div>
            <div>{createdDate}</div>
            
            <div className="font-medium">Status:</div>
            <div>{preOrder.order_status}</div>
          </div>
          
          <div className="text-sm text-destructive font-medium">
            This will permanently delete the pre-order and all associated product items.
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" onClick={handleDelete}>Delete Pre-Order</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PreOrderDeleteModal; 