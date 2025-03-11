import React from 'react';
import { OrderStatus } from '@/lib/types';

type StatusBadgeProps = {
  status: OrderStatus;
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getStatusStyles = () => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'ordered' as OrderStatus:
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'shipped' as OrderStatus:
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'delivered' as OrderStatus:
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled' as OrderStatus:
        return 'bg-red-100 text-red-800 border-red-200';
      case 'Out_of_stock' as OrderStatus:
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <span
      className={`px-2.5 py-0.5 text-xs font-medium rounded-full border ${getStatusStyles()}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

export default StatusBadge; 