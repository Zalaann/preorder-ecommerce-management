import React, { useState, useEffect } from 'react';
import { Flight } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { X, Plane, Calendar, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { v4 as uuidv4 } from 'uuid';

interface FlightAddEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  flight: Flight | null;
  onSave: (flight: Flight) => void;
  isNew: boolean;
}

const FlightAddEditModal: React.FC<FlightAddEditModalProps> = ({
  isOpen,
  onClose,
  flight,
  onSave,
  isNew
}) => {
  const [formData, setFormData] = useState<Flight>({
    id: '',
    flight_id: '',
    flight_name: '',
    shipment_date: '',
    status: 'scheduled',
    created_at: new Date().toISOString()
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (flight) {
      setFormData(flight);
    } else {
      setFormData({
        id: '',
        flight_id: uuidv4(),
        flight_name: '',
        shipment_date: '',
        status: 'scheduled',
        created_at: new Date().toISOString()
      });
    }
    
    setErrors({});
  }, [flight, isOpen]);

  const handleInputChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.flight_name.trim()) {
      newErrors.flight_name = 'Flight name is required';
    }
    
    if (!formData.shipment_date) {
      newErrors.shipment_date = 'Shipment date is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      onSave(formData);
    } catch (error) {
      console.error('Error saving flight:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white/10 dark:bg-gray-800/90 backdrop-filter backdrop-blur-lg rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto border border-white/20 dark:border-gray-700/50">
        <DialogHeader className="sr-only">
          <DialogTitle>
            {isNew ? 'Add New Flight' : 'Edit Flight'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="p-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
              <div className="bg-purple-500/20 dark:bg-purple-500/30 p-2 rounded-xl mr-3">
                <Plane className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              {isNew ? 'Add New Flight' : 'Edit Flight'}
            </h2>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Flight Name */}
            <div className="space-y-2">
              <label htmlFor="flight_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 ml-1">
                Flight Name <span className="text-purple-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Plane className="h-5 w-5 text-purple-400" />
                </div>
                <input
                  type="text"
                  id="flight_name"
                  value={formData.flight_name}
                  onChange={(e) => handleInputChange('flight_name', e.target.value)}
                  className={`pl-12 block w-full rounded-xl border-0 bg-gray-50/50 dark:bg-gray-700/50 text-gray-900 dark:text-white shadow-sm ring-1 ring-inset ${
                    errors.flight_name 
                      ? 'ring-red-500 focus:ring-red-500' 
                      : 'ring-gray-300/50 dark:ring-gray-600/50 focus:ring-purple-500'
                  } focus:ring-2 focus:ring-inset transition-all duration-200 py-3 sm:text-sm`}
                  placeholder="Enter flight name"
                />
              </div>
              {errors.flight_name && (
                <p className="mt-1.5 text-sm text-red-500 dark:text-red-400 ml-1">{errors.flight_name}</p>
              )}
            </div>

            {/* Shipment Date */}
            <div className="space-y-2">
              <label htmlFor="shipment_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 ml-1">
                Shipment Date <span className="text-purple-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Calendar className="h-5 w-5 text-purple-400" />
                </div>
                <input
                  type="date"
                  id="shipment_date"
                  value={formData.shipment_date}
                  onChange={(e) => handleInputChange('shipment_date', e.target.value)}
                  className={`pl-12 block w-full rounded-xl border-0 bg-gray-50/50 dark:bg-gray-700/50 text-gray-900 dark:text-white shadow-sm ring-1 ring-inset ${
                    errors.shipment_date 
                      ? 'ring-red-500 focus:ring-red-500' 
                      : 'ring-gray-300/50 dark:ring-gray-600/50 focus:ring-purple-500'
                  } focus:ring-2 focus:ring-inset transition-all duration-200 py-3 sm:text-sm`}
                />
              </div>
              {errors.shipment_date && (
                <p className="mt-1.5 text-sm text-red-500 dark:text-red-400 ml-1">{errors.shipment_date}</p>
              )}
            </div>

            {/* Status */}
            <div className="space-y-2">
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 ml-1">
                Status
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <CheckCircle className="h-5 w-5 text-purple-400" />
                </div>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className="pl-12 block w-full rounded-xl border-0 bg-gray-50/50 dark:bg-gray-700/50 text-gray-900 dark:text-white shadow-sm ring-1 ring-inset ring-gray-300/50 dark:ring-gray-600/50 focus:ring-2 focus:ring-inset focus:ring-purple-500 transition-all duration-200 py-3 sm:text-sm"
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="in_transit">In Transit</option>
                  <option value="arrived">Arrived</option>
                  <option value="delayed">Delayed</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100/80 dark:bg-gray-800/80 hover:bg-gray-200/80 dark:hover:bg-gray-700/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-200 shadow-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md"
              >
                {isSubmitting ? 'Saving...' : isNew ? 'Create Flight' : 'Update Flight'}
              </button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FlightAddEditModal; 