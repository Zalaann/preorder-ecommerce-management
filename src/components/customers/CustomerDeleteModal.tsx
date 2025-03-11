import React from 'react';
import { Customer } from '@/lib/types';

interface CustomerDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  onDelete: (customerId: string) => void;
  isDeleting: boolean;
}

const CustomerDeleteModal: React.FC<CustomerDeleteModalProps> = ({
  isOpen,
  onClose,
  customer,
  onDelete,
  isDeleting,
}) => {
  if (!isOpen || !customer) return null;

  const handleDelete = () => {
    onDelete(customer.customer_id);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Delete Customer</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          
          <div className="mb-6">
            <p className="text-gray-700 mb-2">
              Are you sure you want to delete this customer?
            </p>
            <div className="bg-gray-50 p-3 rounded-md">
              <p className="font-medium text-gray-900">{customer.name}</p>
              <p className="text-gray-600">@{customer.instagram_id}</p>
              <p className="text-gray-600">{customer.phone_number}</p>
              <p className="text-gray-600">{customer.city}</p>
            </div>
            <p className="text-red-600 text-sm mt-3">
              This action cannot be undone. All data associated with this customer will be permanently removed.
            </p>
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerDeleteModal; 