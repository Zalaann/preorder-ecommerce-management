import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PaymentWithDetails } from '@/lib/types';
import { deletePayment } from '@/lib/api';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface PaymentDeleteModalProps {
  payment: PaymentWithDetails;
  isOpen: boolean;
  onClose: () => void;
  onDelete: () => void;
}

const PaymentDeleteModal: React.FC<PaymentDeleteModalProps> = ({
  payment,
  isOpen,
  onClose,
  onDelete,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      
      const response = await deletePayment(payment.payment_id);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete payment');
      }
      
      toast.success('Payment deleted successfully');
      onDelete();
    } catch (error) {
      console.error('Error deleting payment:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete payment');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center text-red-600">
            <AlertTriangle className="mr-2 h-5 w-5" />
            Delete Payment
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this payment? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        
        <div className="bg-red-50 border border-red-100 rounded-md p-4 my-4">
          <p className="text-sm text-red-800">
            <span className="font-medium">Warning:</span> Deleting this payment will permanently remove it from the system.
          </p>
        </div>
        
        <div className="space-y-2">
          <p className="text-sm font-medium">Payment Details:</p>
          <div className="bg-gray-50 p-3 rounded-md">
            <p className="text-sm"><span className="font-medium">Payment ID:</span> {payment.payment_id}</p>
            <p className="text-sm"><span className="font-medium">Customer:</span> {payment.customer?.name || 'Unknown'}</p>
            <p className="text-sm"><span className="font-medium">Order ID:</span> {payment.preorder?.preorder_id || 'N/A'}</p>
            <p className="text-sm"><span className="font-medium">Amount:</span> ${payment.amount.toFixed(2)}</p>
          </div>
        </div>
        
        <DialogFooter className="mt-6">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
            className="ml-2"
          >
            {isDeleting ? (
              <>
                <span className="animate-spin mr-2">⟳</span>
                Deleting...
              </>
            ) : (
              'Delete Payment'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentDeleteModal; 