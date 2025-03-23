'use client';

import React, { useState, useEffect } from 'react';
import { PreOrderWithDetails, OrderStatus, PreOrderItem } from '@/lib/types';
import { formatDate, formatCurrency, formatStatus } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { X, User, Plane, Package, Calendar, Banknote, CreditCard, ShoppingBag, ExternalLink } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface PreOrderDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  preOrder: PreOrderWithDetails | null;
  onStatusChange: (preOrderId: string, newStatus: OrderStatus) => Promise<any>;
}

const PreOrderDetailModal: React.FC<PreOrderDetailModalProps> = ({
  isOpen,
  onClose,
  preOrder,
  onStatusChange,
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [products, setProducts] = useState<PreOrderItem[]>([]);

  // Fetch product items when preOrder changes
  useEffect(() => {
    if (!preOrder || !preOrder.preorder_id) {
      setProducts([]);
      return;
    }
    
    const fetchItems = async () => {
      try {
        const { data, error } = await supabase
          .from('preorder_items')
          .select('*')
          .eq('preorder_id', preOrder.preorder_id);
        
        if (error) {
          console.error('Error fetching product items:', error);
          return;
        }
        
        if (data && data.length > 0) {
          setProducts(data);
        } else {
          setProducts([]);
        }
      } catch (error) {
        console.error('Error in fetchItems:', error);
        setProducts([]);
      }
    };
    
    fetchItems();
  }, [preOrder]);

  if (!isOpen || !preOrder) return null;

  // Calculate total amount
  const totalAmount = preOrder.total_amount || (preOrder.subtotal + preOrder.delivery_charges);
  const totalAdvancePayment = products.reduce((sum, item) => sum + (item.advance_payment || 0), 0);
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <DialogTitle className="text-xl font-bold">Pre-Order Details</DialogTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {/* Left Column */}
          <div className="space-y-4">
            {/* Pre-Order ID */}
            <div className="flex items-center space-x-2">
              <ShoppingBag className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Pre-Order ID</p>
                <p className="font-medium">{preOrder.preorder_id}</p>
              </div>
            </div>
            
            {/* Customer Info */}
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Customer</p>
                <p className="font-medium">{preOrder.customer?.name || 'N/A'}</p>
                <p className="text-sm">{preOrder.customer?.phone_number || 'No phone'}</p>
              </div>
            </div>
            
            {/* Flight Info */}
            <div className="flex items-center space-x-2">
              <Plane className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Flight</p>
                <p className="font-medium">{preOrder.flight?.flight_name || 'N/A'}</p>
                <p className="text-sm">{preOrder.flight?.shipment_date ? formatDate(preOrder.flight.shipment_date) : 'No date'}</p>
              </div>
            </div>
            
            {/* Date */}
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Created On</p>
                <p className="font-medium">{formatDate(preOrder.created_at)}</p>
              </div>
            </div>
          </div>
          
          {/* Right Column */}
          <div className="space-y-4">
            {/* Status */}
            <div className="flex items-center space-x-2">
              <Package className="h-5 w-5 text-primary" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Status</p>
                <div className="flex items-center space-x-2">
                  <Badge className={`${getStatusBadgeClass(preOrder.order_status)}`}>
                    {formatStatus(preOrder.order_status)}
                  </Badge>
                  
                  <Select defaultValue={preOrder.order_status} onValueChange={(value) => onStatusChange(preOrder.preorder_id, value as OrderStatus)}>
                    <SelectTrigger className="w-[140px] h-8">
                      <SelectValue placeholder="Change status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="ordered">Ordered</SelectItem>
                      <SelectItem value="shipped">Shipped</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="Out_of_stock">Out of Stock</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {updateError && <p className="text-sm text-destructive mt-1">{updateError}</p>}
              </div>
            </div>
          </div>
        </div>
        
        <Separator className="my-4" />
        
        {/* Product Details */}
        <div>
          <h3 className="font-semibold mb-4">Product Details</h3>
          
          {products.length > 0 ? (
            <div className="space-y-4">
              {/* Product Cards */}
              <div className="space-y-3">
                {products.map((product, index) => (
                  <div key={index} className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex flex-col md:flex-row justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 dark:text-white">{product.product_name}</p>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                          {product.shade && (
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Shade:</span> {product.shade}
                            </div>
                          )}
                          {product.size && (
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Size:</span> {product.size}
                            </div>
                          )}
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Quantity:</span> {product.quantity}
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Price:</span> {formatCurrency(product.price)}
                          </div>
                          {(product.advance_payment ?? 0) > 0 && (
                            <div className="col-span-2">
                              <span className="text-green-600 dark:text-green-400 font-medium">
                                Advance Payment: {formatCurrency(product.advance_payment ?? 0)}
                              </span>
                            </div>
                          )}
                        </div>
                        {product.link && (
                          <div className="mt-2">
                            <a 
                              href={product.link.startsWith('http') ? product.link : `https://${product.link}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 dark:text-blue-400 text-sm hover:underline flex items-center"
                            >
                              <ExternalLink className="h-3 w-3 mr-1" />
                              View Product Link
                            </a>
                          </div>
                        )}
                      </div>
                      <div className="md:ml-4 mt-4 md:mt-0 text-right">
                        <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(product.price * product.quantity)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Order Summary */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-5 border border-gray-200 dark:border-gray-700">
                <h4 className="font-semibold mb-3 text-gray-900 dark:text-white">Order Summary</h4>
                <div className="space-y-2">
                  <div className="flex justify-between py-1">
                    <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(preOrder.subtotal)}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-600 dark:text-gray-400">Delivery Charges:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(preOrder.delivery_charges)}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-600 dark:text-gray-400">Total Advance Payment:</span>
                    <span className="font-medium text-green-600 dark:text-green-400">{formatCurrency(totalAdvancePayment)}</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between py-1">
                    <span className="font-semibold text-gray-900 dark:text-white">Total Amount:</span>
                    <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(totalAmount)}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="font-semibold text-gray-900 dark:text-white">Remaining Amount:</span>
                    <span className="font-bold text-primary">{formatCurrency(preOrder.remaining_amount || 0)}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-center">
              <p className="text-gray-500 dark:text-gray-400">No products found for this pre-order.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Helper function to get status badge class
const getStatusBadgeClass = (status: OrderStatus): string => {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100';
    case 'ordered':
      return 'bg-blue-100 text-blue-800 hover:bg-blue-100';
    case 'shipped':
      return 'bg-purple-100 text-purple-800 hover:bg-purple-100';
    case 'delivered':
      return 'bg-green-100 text-green-800 hover:bg-green-100';
    case 'cancelled':
      return 'bg-red-100 text-red-800 hover:bg-red-100';
    case 'Out_of_stock':
      return 'bg-gray-100 text-gray-800 hover:bg-gray-100';
    default:
      return 'bg-gray-100 text-gray-800 hover:bg-gray-100';
  }
};

export default PreOrderDetailModal; 