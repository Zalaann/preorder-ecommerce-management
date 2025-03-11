'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Customer } from '@/lib/types';
import CustomerAddEditModal from '@/components/customers/CustomerAddEditModal';
import CustomerDeleteModal from '@/components/customers/CustomerDeleteModal';
import { getCustomers, createCustomer, updateCustomer, deleteCustomer } from '@/lib/api';
import { 
  PlusCircle, 
  Search, 
  MapPin, 
  Filter, 
  Users, 
  UserCheck, 
  Building,
  Package
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await getCustomers();
      
      if (error) throw error;
      
      if (data) {
        // Filter customers based on search query
        let filteredCustomers = [...data];
        
        if (searchQuery) {
          const lowerQuery = searchQuery.toLowerCase();
          filteredCustomers = filteredCustomers.filter(customer => 
            customer.name.toLowerCase().includes(lowerQuery) ||
            customer.customer_id.toLowerCase().includes(lowerQuery) ||
            (customer.instagram_id && customer.instagram_id.toLowerCase().includes(lowerQuery)) ||
            (customer.phone_number && customer.phone_number.toLowerCase().includes(lowerQuery))
          );
        }
        
        // Apply city filter
        if (cityFilter) {
          filteredCustomers = filteredCustomers.filter(customer => 
            customer.city === cityFilter
          );
        }
        
        setCustomers(filteredCustomers);
        
        // Extract unique cities for filter dropdown
        const cities = [...new Set(data.map((customer: Customer) => customer.city))];
        setAvailableCities(cities);
      }
    } catch (err) {
      console.error('Error fetching customers:', err);
      setError('Failed to load customers. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, cityFilter]);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/auth');
        return;
      }
      
      fetchCustomers();
    };
    
    checkUser();
  }, [router, fetchCustomers]);

  const handleAddCustomer = () => {
    setSelectedCustomer(null);
    setIsAddModalOpen(true);
  };

  const handleEditCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsEditModalOpen(true);
  };

  const handleDeleteCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsDeleteModalOpen(true);
  };

  const handleSaveCustomer = async (customerData: Customer) => {
    setIsSubmitting(true);
    try {
      // Ensure required fields are present
      const customer = {
        ...customerData,
        customer_id: customerData.customer_id || uuidv4()
      };

      const { error } = await supabase
        .from('customers')
        .upsert([customer], {
          onConflict: 'customer_id'
        });

      if (error) throw error;

      // Refresh customer list
      fetchCustomers();
      setIsAddModalOpen(false);
      setIsEditModalOpen(false);
    } catch (error) {
      console.error('Error saving customer:', error);
      setError('Failed to save customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async (customerId: string) => {
    setIsDeleting(true);
    
    try {
      const { success, error } = await deleteCustomer(customerId);
      
      if (error) throw new Error(error);
      
      if (success) {
        // Refresh customer list
        fetchCustomers();
        
        // Close modal
        setIsDeleteModalOpen(false);
      }
    } catch (err) {
      console.error('Error deleting customer:', err);
      setError('Failed to delete customer. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Calculate pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentCustomers = customers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(customers.length / itemsPerPage);

  // Change page
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  return (
    <main className="w-full overflow-hidden">
      <div className="container mx-auto px-4 py-10">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10">
            <div>
              <h1 className="text-3xl font-bold gradient-text">Customer Management</h1>
              <p className="text-gray-600 mt-1">View and manage your customer database</p>
            </div>
            <button
              onClick={handleAddCustomer}
              className="mt-4 md:mt-0 inline-flex items-center px-5 py-2.5 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors"
            >
              <PlusCircle className="w-5 h-5 mr-2" />
              New Customer
            </button>
          </div>

          {/* Statistics Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700 transition-all hover:shadow-md">
              <div className="flex items-center">
                <div className="bg-blue-100 dark:bg-blue-900/20 p-3 rounded-full">
                  <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Customers</h3>
                  <div className="mt-1 text-3xl font-semibold text-gray-900 dark:text-white">{customers.length}</div>
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700 transition-all hover:shadow-md">
              <div className="flex items-center">
                <div className="bg-green-100 dark:bg-green-900/20 p-3 rounded-full">
                  <UserCheck className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Customers</h3>
                  <div className="mt-1 text-3xl font-semibold text-gray-900 dark:text-white">{customers.length}</div>
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700 transition-all hover:shadow-md">
              <div className="flex items-center">
                <div className="bg-purple-100 dark:bg-purple-900/20 p-3 rounded-full">
                  <Building className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Cities Covered</h3>
                  <div className="mt-1 text-3xl font-semibold text-gray-900 dark:text-white">{availableCities.length}</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Filters */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700 mb-6">
            <h2 className="text-lg font-medium mb-4">Filters</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    placeholder="Search by name, instagram, or phone..."
                    className="focus:ring-brand focus:border-brand block w-full pl-10 sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md h-10"
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="cityFilter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  City
                </label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MapPin className="h-5 w-5 text-gray-400" />
                  </div>
                  <select
                    id="cityFilter"
                    value={cityFilter}
                    onChange={(e) => setCityFilter(e.target.value)}
                    className="focus:ring-brand focus:border-brand block w-full pl-10 sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md h-10 appearance-none"
                  >
                    <option value="">All Cities</option>
                    {availableCities.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            
            <div className="mt-4 flex justify-end">
              <button
                onClick={fetchCustomers}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-200"
              >
                Apply Filters
              </button>
            </div>
          </div>
          
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Customer Table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 w-full">
            <div className="overflow-x-auto">
              <table className="w-full table-fixed divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-[15%]">
                      Name
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-[15%]">
                      Instagram
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-[15%]">
                      Phone
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-[10%]">
                      City
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-[30%]">
                      Address
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-[15%]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex justify-center items-center space-x-2">
                          <svg className="animate-spin h-5 w-5 text-purple-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Loading customers...</span>
                        </div>
                      </td>
                    </tr>
                  ) : customers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                        No customers found. Try adjusting your filters.
                      </td>
                    </tr>
                  ) : (
                    currentCustomers.map((customer) => (
                      <tr key={customer.customer_id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white truncate">
                          {customer.name}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-300 truncate">
                          {customer.instagram_id}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-300 truncate">
                          {customer.phone_number}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-300 truncate">
                          {customer.city}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-300 truncate">
                          {customer.address}
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-medium">
                          <button
                            onClick={() => handleEditCustomer(customer)}
                            className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 mr-3"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteCustomer(customer)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Pagination */}
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row items-center justify-between">
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-4 sm:mb-0">
                Showing <span className="font-medium">{indexOfFirstItem + 1}</span> to <span className="font-medium">{Math.min(indexOfLastItem, customers.length)}</span> of <span className="font-medium">{customers.length}</span> results
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
                  disabled={currentPage >= Math.ceil(customers.length / itemsPerPage)}
                  className={`relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md ${
                    currentPage >= Math.ceil(customers.length / itemsPerPage)
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
      <CustomerAddEditModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        customer={null}
        onSave={(customer) => handleSaveCustomer(customer)}
        isNew={true}
      />

      <CustomerAddEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        customer={selectedCustomer}
        onSave={(customer) => handleSaveCustomer(customer)}
        isNew={false}
      />

      <CustomerDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        customer={selectedCustomer}
        onDelete={handleDeleteConfirm}
        isDeleting={isDeleting}
      />
    </main>
  );
} 