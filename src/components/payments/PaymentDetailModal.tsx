import React, { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { formatDate, formatCurrency } from '@/lib/utils';
import { CreditCard, User, Package, Calendar, Banknote, Building, CheckCircle, Hash, Image, X } from 'lucide-react';
import { PaymentWithDetails, PaymentPurpose } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

interface PaymentDetailModalProps {
  payment: PaymentWithDetails;
  isOpen: boolean;
  onClose: () => void;
}

const PaymentDetailModal: React.FC<PaymentDetailModalProps> = ({
  payment,
  isOpen,
  onClose,
}) => {
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  // Format payment purpose for display
  const formatPaymentPurpose = (purpose: PaymentPurpose) => {
    switch (purpose) {
      case 'advance':
        return 'Advance Payment';
      case 'final_remaining':
        return 'Final Remaining Payment';
      case 'cod':
        return 'Cash on Delivery';
      default:
        return purpose;
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden bg-transparent border-none">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden"
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Payment Details</h2>
                <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {/* Payment Amount */}
                <div className="bg-gray-50/50 dark:bg-gray-700/50 p-3 rounded-md">
                  <div className="flex items-center mb-2">
                    <Banknote className="h-4 w-4 text-purple-500 mr-2" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">Amount:</span>
                  </div>
                  <p className="text-gray-900 dark:text-white font-medium">{formatCurrency(payment.amount)}</p>
                </div>
                
                {/* Payment Purpose */}
                <div className="bg-gray-50/50 dark:bg-gray-700/50 p-3 rounded-md">
                  <div className="flex items-center mb-2">
                    <CreditCard className="h-4 w-4 text-purple-500 mr-2" />
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Purpose</p>
                  </div>
                  <p className="text-gray-900 dark:text-white font-medium">{formatPaymentPurpose(payment.payment_purpose)}</p>
                </div>
              
                {/* Customer Information */}
                <div className="col-span-2 bg-gray-50/50 dark:bg-gray-700/50 p-3 rounded-md">
                  <div className="flex items-center mb-2">
                    <User className="h-4 w-4 text-purple-500 mr-2" />
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Customer Information</p>
                  </div>
                  <p className="text-gray-900 dark:text-white font-medium">{payment.customer?.name || 'Unknown'}</p>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">{payment.customer?.phone_number || 'No phone'}</p>
                </div>
                
                {/* Order Information */}
                <div className="col-span-2 bg-gray-50/50 dark:bg-gray-700/50 p-3 rounded-md">
                  <div className="flex items-center mb-2">
                    <Package className="h-4 w-4 text-purple-500 mr-2" />
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Order Information</p>
                  </div>
                  <p className="text-gray-900 dark:text-white font-medium">
                    Order ID: {payment.preorder_id || 'N/A'}
                  </p>
                  {payment.preorder && (
                    <p className="text-gray-600 dark:text-gray-300 text-sm">
                      Status: {payment.preorder.order_status}
                    </p>
                  )}
                </div>
                
                {/* Payment Date */}
                <div className="bg-gray-50/50 dark:bg-gray-700/50 p-3 rounded-md">
                  <div className="flex items-center mb-2">
                    <Calendar className="h-4 w-4 text-purple-500 mr-2" />
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Payment Date</p>
                  </div>
                  <p className="text-gray-900 dark:text-white">{formatDate(payment.payment_date)}</p>
                </div>
                
                {/* Bank Account */}
                <div className="bg-gray-50/50 dark:bg-gray-700/50 p-3 rounded-md">
                  <div className="flex items-center mb-2">
                    <Building className="h-4 w-4 text-purple-500 mr-2" />
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Bank Account</p>
                  </div>
                  <p className="text-gray-900 dark:text-white">{payment.bank_account}</p>
                </div>
                
                {/* Tally Status */}
                <div className="bg-gray-50/50 dark:bg-gray-700/50 p-3 rounded-md">
                  <div className="flex items-center mb-2">
                    <CheckCircle className="h-4 w-4 text-purple-500 mr-2" />
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Tally Status</p>
                  </div>
                  <p className="text-gray-900 dark:text-white">{payment.tally ? 'Tallied' : 'Not Tallied'}</p>
                </div>
                
                {/* Payment ID */}
                <div className="bg-gray-50/50 dark:bg-gray-700/50 p-3 rounded-md">
                  <div className="flex items-center mb-2">
                    <Hash className="h-4 w-4 text-purple-500 mr-2" />
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Payment ID</p>
                  </div>
                  <p className="text-gray-900 dark:text-white">{payment.payment_id || 'N/A'}</p>
                </div>
                
                {/* Payment Screenshot */}
                {payment.payment_screenshot && (
                  <div className="col-span-2 bg-gray-50/50 dark:bg-gray-700/50 p-3 rounded-md">
                    <div className="flex items-center mb-2">
                      <Image className="h-4 w-4 text-purple-500 mr-2" />
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Payment Screenshot</p>
                    </div>
                    <div className="mt-2">
                      <Button 
                        variant="outline" 
                        onClick={() => setIsImageModalOpen(true)}
                        className="w-full"
                      >
                        View Screenshot
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </DialogContent>
      </Dialog>
      
      {/* Image Modal */}
      {payment.payment_screenshot && (
        <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
          <DialogContent className="sm:max-w-[800px] p-0 overflow-hidden bg-transparent border-none">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
              <div className="p-4 flex justify-between items-center">
                <h3 className="text-lg font-medium">Payment Screenshot</h3>
                <Button variant="ghost" size="icon" onClick={() => setIsImageModalOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="p-4">
                <img 
                  src={payment.payment_screenshot} 
                  alt="Payment Screenshot" 
                  className="w-full h-auto max-h-[70vh] object-contain"
                />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default PaymentDetailModal; 