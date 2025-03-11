import React from 'react';
import { Flight, FlightStatus } from '@/lib/types';
import { formatDate, formatStatus, getStatusBadgeClass } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { X, Plane, Calendar, CheckCircle } from 'lucide-react';

interface FlightDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  flight: Flight | null;
  onStatusChange: (flightId: string, status: FlightStatus) => void;
  isUpdating: boolean;
  preOrders: any[]; // Assuming the type for preOrders
}

const FlightDetailModal: React.FC<FlightDetailModalProps> = ({
  isOpen,
  onClose,
  flight,
  onStatusChange,
  isUpdating,
  preOrders,
}) => {
  if (!isOpen || !flight) return null;

  // Ensure status has a valid value
  const currentStatus = flight.status || 'scheduled';
  
  // Ensure flight_id is valid
  const flightId = flight.flight_id;
  
  if (!flightId) {
    console.error('Flight ID is missing:', flight);
  }

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value as FlightStatus;
    console.log('Status change in modal:', { flightId, newStatus });
    onStatusChange(flightId, newStatus);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white/10 dark:bg-gray-800/90 backdrop-filter backdrop-blur-lg rounded-2xl shadow-2xl w-full max-w-[700px] max-h-[90vh] overflow-y-auto border border-white/20 dark:border-gray-700/50">
        <div className="p-8">
          <div className="flex justify-between items-center mb-8">
            <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
              <div className="bg-purple-500/20 dark:bg-purple-500/30 p-2 rounded-xl mr-3">
                <Plane className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              Flight Details
            </DialogTitle>
          </div>
          
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Flight Name</h3>
                <p className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                  <Plane className="w-5 h-5 text-purple-500 mr-2" />
                  {flight.flight_name}
                </p>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Shipment Date</h3>
                <p className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                  <Calendar className="w-5 h-5 text-purple-500 mr-2" />
                  {new Date(flight.shipment_date).toLocaleDateString()}
                </p>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</h3>
                <p className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                  <CheckCircle className="w-5 h-5 text-purple-500 mr-2" />
                  {flight.status}
                </p>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Created At</h3>
                <p className="text-lg font-medium text-gray-900 dark:text-white">
                  {new Date(flight.created_at).toLocaleString()}
                </p>
              </div>
            </div>
            
            <div className="pt-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Pre-Orders</h3>
              
              {preOrders.length > 0 ? (
                <div className="space-y-4">
                  {preOrders.map((preOrder) => (
                    <div 
                      key={preOrder.id} 
                      className="p-4 bg-gray-50/50 dark:bg-gray-700/50 rounded-xl border border-gray-300/50 dark:border-gray-600/50"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-base font-medium text-gray-900 dark:text-white">{preOrder.preorder_id}</h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {new Date(preOrder.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            Status: <span className="text-purple-600 dark:text-purple-400">{preOrder.order_status}</span>
                          </p>
                          {preOrder.total_amount && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Total: ${preOrder.total_amount.toFixed(2)}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {preOrder.customer && (
                        <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                          Customer: {preOrder.customer.name}
                          {preOrder.customer.instagram_id && (
                            <span> (@{preOrder.customer.instagram_id})</span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-center py-4">No pre-orders found for this flight.</p>
              )}
            </div>
            
            <div className="flex justify-end pt-6">
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100/80 dark:bg-gray-800/80 hover:bg-gray-200/80 dark:hover:bg-gray-700/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-200 shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FlightDetailModal; 