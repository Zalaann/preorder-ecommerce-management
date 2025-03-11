'use client';

import React, { useState, useEffect } from 'react';
import { PreOrderWithDetails, OrderStatus, PreOrderItem } from '@/lib/types';
import { formatDate, formatCurrency, formatStatus } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { X, User, Plane, Package, Calendar, Banknote, CreditCard, ShoppingBag } from 'lucide-react';
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
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<OrderStatus>('pending');

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

  // Handle status change from dropdown
  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setIsUpdating(true);
    setUpdateError(null);
    
    try {
      const newStatus = e.target.value as OrderStatus;
      console.log(`Updating order status from ${preOrder.order_status} to ${newStatus}`);
      onStatusChange(preOrder.preorder_id, newStatus);
      setIsUpdating(false);
    } catch (error) {
      console.error('Error in status change handler:', error);
      setUpdateError('Failed to update status. Please try again.');
      setIsUpdating(false);
    }
  };

  // Calculate total amount
  const totalAmount = preOrder.subtotal + preOrder.cod_amount;
  
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
            
            {/* Financial Info */}
            <div className="flex items-center space-x-2">
              <Banknote className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Subtotal</p>
                <p className="font-medium">{formatCurrency(preOrder.subtotal)}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">COD Amount</p>
                <p className="font-medium">{formatCurrency(preOrder.cod_amount)}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Advance Payment</p>
                <p className="font-medium">{formatCurrency(preOrder.advance_payment)}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Remaining Amount</p>
                <p className="font-medium">{formatCurrency(preOrder.remaining_amount || (totalAmount - preOrder.advance_payment))}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Banknote className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="font-medium font-bold">{formatCurrency(totalAmount)}</p>
              </div>
            </div>
          </div>
        </div>
        
        <Separator className="my-4" />
        
        {/* Product Details */}
        <div>
          <h3 className="font-semibold mb-2">Product Details</h3>
          
          {products.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-muted">
                    <th className="p-2 text-left">Product</th>
                    <th className="p-2 text-left">Shade</th>
                    <th className="p-2 text-left">Size</th>
                    <th className="p-2 text-right">Quantity</th>
                    <th className="p-2 text-right">Price</th>
                    <th className="p-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product, index) => (
                    <tr key={index} className="border-b border-muted">
                      <td className="p-2">{product.product_name}</td>
                      <td className="p-2">{product.shade || '-'}</td>
                      <td className="p-2">{product.size || '-'}</td>
                      <td className="p-2 text-right">{product.quantity}</td>
                      <td className="p-2 text-right">{formatCurrency(product.price)}</td>
                      <td className="p-2 text-right">{formatCurrency(product.price * product.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-semibold">
                    <td colSpan={5} className="p-2 text-right">Subtotal:</td>
                    <td className="p-2 text-right">{formatCurrency(preOrder.subtotal)}</td>
                  </tr>
                  <tr className="font-semibold">
                    <td colSpan={5} className="p-2 text-right">COD Amount:</td>
                    <td className="p-2 text-right">{formatCurrency(preOrder.cod_amount)}</td>
                  </tr>
                  <tr className="font-semibold">
                    <td colSpan={5} className="p-2 text-right">Advance Payment:</td>
                    <td className="p-2 text-right">{formatCurrency(preOrder.advance_payment)}</td>
                  </tr>
                  <tr className="font-semibold">
                    <td colSpan={5} className="p-2 text-right">Remaining Amount:</td>
                    <td className="p-2 text-right">{formatCurrency(preOrder.remaining_amount || (totalAmount - preOrder.advance_payment))}</td>
                  </tr>
                  <tr className="font-semibold text-lg">
                    <td colSpan={5} className="p-2 text-right">Total Amount:</td>
                    <td className="p-2 text-right">{formatCurrency(totalAmount)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <p className="text-muted-foreground italic">No product details available</p>
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