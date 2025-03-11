'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Flight, FlightStatus } from '@/lib/types';
import { 
  getFlights, 
  createFlight, 
  updateFlight, 
  updateFlightStatus, 
  deleteFlight 
} from '@/lib/api';
import { formatDate, formatStatus, getStatusBadgeClass } from '@/lib/utils';
import FlightAddEditModal from '@/components/flights/FlightAddEditModal';
import FlightDeleteModal from '@/components/flights/FlightDeleteModal';
import FlightDetailModal from '@/components/flights/FlightDetailModal';
import { 
  PlusCircle, 
  Search, 
  Calendar, 
  Filter, 
  Plane, 
  Clock, 
  CheckCircle, 
  AlertTriangle 
} from 'lucide-react';

const FlightsPage = () => {
  const router = useRouter();
  const [flights, setFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FlightStatus | ''>('');
  const [shipmentDate, setShipmentDate] = useState('');
  
  // Sorting state
  const [sortColumn, setSortColumn] = useState('shipment_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [flightPreOrders, setFlightPreOrders] = useState<any[]>([]);

  const fetchFlights = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Call getFlights without parameters as per its definition in the API
      const { data, error } = await getFlights();
      
      if (error) throw error;
      
      if (data) {
        // Filter and sort the flights client-side based on the current filters
        let filteredFlights = [...data];
        
        // Apply search filter
        if (searchQuery) {
          filteredFlights = filteredFlights.filter(flight => 
            flight.flight_name.toLowerCase().includes(searchQuery.toLowerCase())
          );
        }
        
        // Apply status filter
        if (statusFilter) {
          filteredFlights = filteredFlights.filter(flight => 
            flight.status === statusFilter
          );
        }
        
        // Apply date filter
        if (shipmentDate) {
          const filterDate = new Date(shipmentDate).toISOString().split('T')[0];
          filteredFlights = filteredFlights.filter(flight => {
            const flightDate = new Date(flight.shipment_date).toISOString().split('T')[0];
            return flightDate === filterDate;
          });
        }
        
        // Apply sorting
        filteredFlights.sort((a, b) => {
          const aValue = a[sortColumn as keyof Flight];
          const bValue = b[sortColumn as keyof Flight];
          
          if (typeof aValue === 'string' && typeof bValue === 'string') {
            return sortDirection === 'asc' 
              ? aValue.localeCompare(bValue) 
              : bValue.localeCompare(aValue);
          }
          
          // Handle date sorting
          if (sortColumn === 'shipment_date') {
            const dateA = new Date(a.shipment_date).getTime();
            const dateB = new Date(b.shipment_date).getTime();
            return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
          }
          
          return 0;
        });
        
        setFlights(filteredFlights);
      }
    } catch (err) {
      console.error('Error fetching flights:', err);
      setError('Failed to load flights. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter, shipmentDate, sortColumn, sortDirection]);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/auth');
        return;
      }
      
      fetchFlights();
    };
    
    checkUser();
  }, [router, fetchFlights]);

  const handleSort = (column: string) => {
    if (column === sortColumn) {
      // Toggle sort direction if clicking the same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new sort column and default to ascending
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const handleAddFlight = () => {
    setSelectedFlight(null);
    setIsAddModalOpen(true);
  };

  const handleEditFlight = (flight: Flight) => {
    setSelectedFlight(flight);
    setIsEditModalOpen(true);
  };

  const handleDeleteFlight = (flight: Flight) => {
    setSelectedFlight(flight);
    setIsDeleteModalOpen(true);
  };

  const handleViewFlight = (flight: Flight) => {
    setSelectedFlight(flight);
    setIsDetailModalOpen(true);
    
    // Fetch pre-orders for this flight
    if (flight && flight.flight_id) {
      fetchPreOrdersForFlight(flight.flight_id);
    } else {
      setFlightPreOrders([]);
    }
  };

  const fetchPreOrdersForFlight = async (flightId: string) => {
    try {
      if (!flightId || typeof flightId !== 'string' || flightId.trim() === '') {
        console.warn('Invalid or empty flight ID provided to fetchPreOrdersForFlight');
        setFlightPreOrders([]);
        return;
      }
      
      console.log(`Fetching pre-orders for flight ID: ${flightId}`);
      
      // Check if the table name is correct - it might be 'preorders' instead of 'pre_orders'
      const { data, error } = await supabase
        .from('preorders')  // Using 'preorders' as the table name
        .select(`
          *,
          customer:customer_id (*)
        `)
        .eq('flight_id', flightId);
        
      if (error) {
        console.error('Supabase error fetching pre-orders:', error);
        console.error('Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }
      
      console.log(`Found ${data?.length || 0} pre-orders for flight ${flightId}`);
      setFlightPreOrders(data || []);
    } catch (err) {
      console.error('Error fetching pre-orders for flight:', err);
      // Log more details about the error
      if (err instanceof Error) {
        console.error('Error message:', err.message);
        console.error('Error stack:', err.stack);
      }
      // Set empty array to avoid UI issues
      setFlightPreOrders([]);
    }
  };

  const handleSaveFlight = async (flight: Flight, isNew: boolean) => {
    try {
      const { error } = await supabase
        .from('flights')
        .upsert([flight])
        .select();

      if (error) throw error;
      
      // Refresh flight list
      fetchFlights();
      setIsAddModalOpen(false);
      setIsEditModalOpen(false);
    } catch (error) {
      console.error('Error saving flight:', error);
      setError(error instanceof Error ? error.message : 'An error occurred');
    }
  };

  const handleDeleteConfirm = async (flightId: string) => {
    setIsDeleting(true);
    
    try {
      const { success, error } = await deleteFlight(flightId);
      
      if (error) throw new Error(error);
      
      if (success) {
        // Refresh flight list
        fetchFlights();
        
        // Close modal
        setIsDeleteModalOpen(false);
      }
    } catch (err) {
      console.error('Error deleting flight:', err);
      setError('Failed to delete flight. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleStatusChange = async (flightId: string, status: FlightStatus) => {
    setIsUpdatingStatus(true);
    setError(null); // Clear any previous errors
    
    try {
      console.log('Attempting to update flight status:', { flightId, status });
      
      if (!flightId) {
        throw new Error('Flight ID is missing or invalid');
      }
      
      const { data, error } = await updateFlightStatus(flightId, status);
      
      if (error) {
        console.error('API returned error:', error);
        throw new Error(error);
      }
      
      if (!data) {
        console.error('No data returned from API');
        throw new Error('No data returned from API');
      }
      
      console.log('Flight status updated successfully:', data);
      
      // Update the selected flight with the new status
      if (selectedFlight) {
        setSelectedFlight({ ...selectedFlight, status });
      }
      
      // Refresh flight list
      fetchFlights();
      
    } catch (err) {
      console.error('Error updating flight status:', err);
      setError(`Failed to update flight status: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Calculate pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentFlights = flights.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(flights.length / itemsPerPage);

  // Change page
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  // Get sort indicator
  const getSortIndicator = (column: string) => {
    if (column !== sortColumn) return null;
    
    return sortDirection === 'asc' ? (
      <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  // Function to format flight status text
  function formatFlightStatus(status: FlightStatus | null | undefined): string {
    if (!status) return 'Unknown';
    
    switch (status) {
      case 'scheduled':
        return 'Scheduled';
      case 'in_transit':
        return 'In Transit';
      case 'arrived':
        return 'Arrived';
      case 'delayed':
        return 'Delayed';
      default:
        return status;
    }
  }

  // Fix the getStatusClass function to use FlightStatus
  function getStatusClass(status: FlightStatus | null | undefined): string {
    if (!status) return 'bg-gray-400';
    
    switch (status) {
      case 'scheduled':
        return 'bg-blue-500';
      case 'in_transit':
        return 'bg-yellow-500';
      case 'arrived':
        return 'bg-green-500';
      case 'delayed':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  }

  return (
    <div className="container mx-auto px-4 py-10 max-w-7xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10">
          <div>
            <h1 className="text-3xl font-bold gradient-text">Flight Management</h1>
            <p className="text-gray-600 mt-1">Manage flights, update status, and track shipments</p>
          </div>
          <button
            onClick={handleAddFlight}
            className="mt-4 md:mt-0 inline-flex items-center px-5 py-2.5 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors"
          >
            <PlusCircle className="w-5 h-5 mr-2" />
            Add New Flight
          </button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700 transition-all hover:shadow-md">
            <div className="flex items-center">
              <div className="p-2 rounded-full bg-indigo-100 dark:bg-indigo-900">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Flights</h3>
                <p className="text-2xl font-semibold">{flights.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700 transition-all hover:shadow-md">
            <div className="flex items-center">
              <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Scheduled</h3>
                <p className="text-2xl font-semibold">{flights.filter(flight => flight.status === 'scheduled').length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700 transition-all hover:shadow-md">
            <div className="flex items-center">
              <div className="p-2 rounded-full bg-yellow-100 dark:bg-yellow-900">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">In Transit</h3>
                <p className="text-2xl font-semibold">{flights.filter(flight => flight.status === 'in_transit').length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700 transition-all hover:shadow-md">
            <div className="flex items-center">
              <div className="p-2 rounded-full bg-green-100 dark:bg-green-900">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Arrived</h3>
                <p className="text-2xl font-semibold">{flights.filter(flight => flight.status === 'arrived').length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700 mb-6">
          <h2 className="text-lg font-medium mb-4">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="searchQuery" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Search
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  id="searchQuery"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by flight name..."
                  className="focus:ring-brand focus:border-brand block w-full pl-10 sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md h-10"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="statusFilter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Filter className="h-5 w-5 text-gray-400" />
                </div>
                <select
                  id="statusFilter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as FlightStatus | '')}
                  className="focus:ring-brand focus:border-brand block w-full pl-10 sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md h-10 appearance-none"
                >
                  <option value="">All Statuses</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="in_transit">In Transit</option>
                  <option value="arrived">Arrived</option>
                  <option value="delayed">Delayed</option>
                </select>
              </div>
            </div>
            
            <div>
              <label htmlFor="shipmentDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Shipment Date
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Calendar className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="date"
                  id="shipmentDate"
                  value={shipmentDate}
                  onChange={(e) => setShipmentDate(e.target.value)}
                  placeholder="dd/mm/yyyy"
                  className="focus:ring-brand focus:border-brand block w-full pl-10 sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md h-10"
                />
              </div>
            </div>
          </div>
          
          <div className="mt-4 flex justify-end">
            <button
              onClick={fetchFlights}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-200"
            >
              Apply Filters
            </button>
          </div>
        </div>
        
        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 p-4 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Flights Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden border border-gray-100 dark:border-gray-700">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('flight_name')}>
                    <div className="flex items-center">
                      Flight Name
                      {getSortIndicator('flight_name')}
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('shipment_date')}>
                    <div className="flex items-center">
                      Shipment Date
                      {getSortIndicator('shipment_date')}
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('status')}>
                    <div className="flex items-center">
                      Status
                      {getSortIndicator('status')}
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex justify-center items-center space-x-2">
                        <svg className="animate-spin h-5 w-5 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Loading flights...</span>
                      </div>
                    </td>
                  </tr>
                ) : flights.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 dark:text-gray-400">
                      No flights found. Try adjusting your filters.
                    </td>
                  </tr>
                ) : (
                  currentFlights.map((flight) => (
                    <tr key={flight.flight_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {flight.flight_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {formatDate(flight.shipment_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusClass(flight.status)}`}>
                          {formatFlightStatus(flight.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => handleViewFlight(flight)}
                            className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                            title="View Details"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                              <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleEditFlight(flight)}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                            title="Edit"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteFlight(flight)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                            title="Delete"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Showing <span className="font-medium">{indexOfFirstItem + 1}</span> to <span className="font-medium">{Math.min(indexOfLastItem, flights.length)}</span> of <span className="font-medium">{flights.length}</span> results
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => paginate(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md ${
                    currentPage === 1
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  Previous
                </button>
                <button
                  onClick={() => paginate(currentPage + 1)}
                  disabled={currentPage >= Math.ceil(flights.length / itemsPerPage)}
                  className={`relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md ${
                    currentPage >= Math.ceil(flights.length / itemsPerPage)
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Modals */}
      {selectedFlight && (
        <>
          <FlightDetailModal
            isOpen={isDetailModalOpen}
            onClose={() => setIsDetailModalOpen(false)}
            flight={selectedFlight}
            onStatusChange={handleStatusChange}
            isUpdating={isUpdatingStatus}
            preOrders={flightPreOrders}
          />
          
          <FlightAddEditModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            flight={selectedFlight}
            onSave={(flight) => handleSaveFlight(flight, false)}
            isNew={false}
          />
          
          <FlightDeleteModal
            isOpen={isDeleteModalOpen}
            onClose={() => setIsDeleteModalOpen(false)}
            flight={selectedFlight}
            onDelete={handleDeleteConfirm}
            isDeleting={isDeleting}
          />
        </>
      )}
      
      <FlightAddEditModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        flight={null}
        onSave={(flight) => handleSaveFlight(flight, true)}
        isNew={true}
      />
    </div>
  );
};

export default FlightsPage; 