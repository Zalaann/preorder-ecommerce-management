import React from 'react';
import { Flight } from '@/lib/types';

interface SearchAndFilterProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  flightFilter: string;
  onFlightFilterChange: (flightId: string) => void;
  flights: Flight[];
}

const SearchAndFilter: React.FC<SearchAndFilterProps> = ({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  flightFilter,
  onFlightFilterChange,
  flights,
}) => {
  const statuses = ['All Status', 'Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'];

  return (
    <div className="flex flex-col space-y-4 md:flex-row md:items-center md:space-y-0 md:space-x-4 mb-6">
      {/* Search */}
      <div className="relative flex-1">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <svg
            className="w-4 h-4 text-gray-500"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 20 20"
          >
            <path
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"
            />
          </svg>
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="block w-full p-2 pl-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Search by customer name, phone or order ID..."
        />
      </div>

      {/* Status Filter */}
      <div className="w-full md:w-48">
        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
          className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
        >
          {statuses.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      {/* Flight Filter */}
      <div className="w-full md:w-48">
        <select
          value={flightFilter}
          onChange={(e) => onFlightFilterChange(e.target.value)}
          className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
        >
          <option value="All Flights">All Flights</option>
          {flights.map((flight) => (
            <option key={flight.flight_id} value={flight.flight_id}>
              {flight.flight_name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default SearchAndFilter; 