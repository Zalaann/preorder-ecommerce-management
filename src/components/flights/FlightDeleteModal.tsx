import React from 'react';
import { Flight } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FlightDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  flight: Flight | null;
  onDelete: (flightId: string) => void;
  isDeleting: boolean;
}

const FlightDeleteModal: React.FC<FlightDeleteModalProps> = ({
  isOpen,
  onClose,
  flight,
  onDelete,
  isDeleting,
}) => {
  if (!isOpen || !flight) return null;

  const handleDelete = () => {
    onDelete(flight.flight_id);
  };

  // Format the date for display
  const formattedDate = flight.shipment_date ? formatDate(flight.shipment_date) : 'N/A';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-white">Delete Flight</DialogTitle>
          </div>
          
          <div className="mb-6">
            <p className="text-gray-700 dark:text-gray-300 mb-2">
              Are you sure you want to delete this flight?
            </p>
            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
              <p className="font-medium text-gray-900 dark:text-white">{flight.flight_name}</p>
              <p className="text-gray-600 dark:text-gray-400">Shipment Date: {formattedDate}</p>
              <p className="text-gray-600 dark:text-gray-400">Status: {flight.status.replace('_', ' ').toUpperCase()}</p>
            </div>
            <p className="text-red-600 dark:text-red-400 text-sm mt-3">
              This action cannot be undone. All data associated with this flight will be permanently removed.
            </p>
          </div>
          
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="px-4 py-2"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-4 py-2"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FlightDeleteModal; 