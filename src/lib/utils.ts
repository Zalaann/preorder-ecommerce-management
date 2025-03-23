import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { OrderStatus, FlightStatus, PreOrderWithDetails, PreOrderItem } from "./types"

/**
 * Utility function for merging Tailwind CSS classes
 * 
 * This function combines clsx and tailwind-merge to provide a convenient way
 * to conditionally apply Tailwind CSS classes while properly handling conflicts.
 * 
 * @param inputs - Class values to be merged
 * @returns Merged class string with conflicts resolved
 * 
 * @example
 * // Basic usage
 * cn('text-red-500', 'bg-blue-500')
 * 
 * // With conditional classes
 * cn('text-red-500', isActive && 'bg-blue-500')
 * 
 * // With object syntax
 * cn('text-red-500', { 'bg-blue-500': isActive })
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a date string to a more readable format
 * @param dateString - The date string to format
 * @returns Formatted date string (e.g., "Jan 1, 2023")
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString;
  }
}

/**
 * Format a number as currency
 * @param amount - The amount to format
 * @returns Formatted currency string (e.g., "PKR 100.00")
 */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return 'N/A';
  
  try {
    // Using a custom formatter for PKR since Intl.NumberFormat doesn't handle PKR well in all browsers
    const formattedNumber = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
    
    return `PKR ${formattedNumber}`;
  } catch (error) {
    console.error('Error formatting currency:', error);
    return `PKR ${amount}`;
  }
}

/**
 * Format order status to display with appropriate styling
 * @param status - The order status
 * @returns CSS class name for the status
 */
export function formatStatus(status: OrderStatus | null | undefined): string {
  if (!status) return 'status-badge-info';
  
  switch (status) {
    case 'pending':
      return 'status-badge-pending';
    case 'ordered':
    case 'shipped':
    case 'delivered':
      return 'status-badge-success';
    case 'cancelled':
    case 'Out_of_stock':
      return 'status-badge-error';
    default:
      return 'status-badge-info';
  }
}

/**
 * Get the appropriate CSS class for a flight status
 * @param status - The flight status
 * @returns CSS class name for the status badge
 */
export function getStatusBadgeClass(status: FlightStatus | null | undefined): string {
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

/**
 * Export pre-orders data to CSV format for download
 * 
 * This function takes an array of pre-order objects and converts them to CSV format.
 * It extracts specific fields from each pre-order, formats them appropriately,
 * and generates a downloadable CSV file.
 * 
 * @param preOrders - Array of pre-order objects to export
 * 
 * The function:
 * 1. Defines which fields to include in the export
 * 2. Creates a CSV header row with human-readable column names
 * 3. Converts each pre-order object to an array of values
 * 4. Combines the header and data rows
 * 5. Creates a Blob with the CSV content
 * 6. Generates a download link and triggers the download
 */
export const exportPreOrdersToCSV = (preOrders: any[]) => {
  // Define the fields we want to export
  const fields = [
    'preorder_id',
    'customer_name',
    'phone_number',
    'flight_name',
    'order_status',
    'delivery_charges',
    'subtotal',
    'total_amount',
    'remaining_amount',
    'product_details',
    'created_at'
  ];

  // Create CSV header
  const header = [
    'Pre-Order ID',
    'Customer Name',
    'Phone Number',
    'Flight Name',
    'Order Status',
    'Delivery Charges (PKR)',
    'Subtotal (PKR)',
    'Total Amount (PKR)',
    'Remaining Amount (PKR)',
    'Product Details',
    'Created At'
  ];

  // Convert data to CSV format
  const formattedData = preOrders.map(order => ({
    preorder_id: order.preorder_id,
    customer_name: order.customer?.name || 'N/A',
    phone_number: order.customer?.phone_number || 'N/A',
    flight_name: order.flight?.flight_name || 'N/A',
    order_status: order.order_status,
    delivery_charges: order.delivery_charges || 0,
    subtotal: order.subtotal || 0,
    total_amount: order.total_amount || (order.subtotal || 0) + (order.delivery_charges || 0),
    remaining_amount: order.remaining_amount || 0,
    product_details: order.items?.map((item: PreOrderItem) => 
      `${item.product_name} (${item.quantity}x) - ${formatCurrency(item.price)}`
    ).join('; ') || 'No products',
    created_at: formatDate(order.created_at)
  }));

  // Combine header and data
  const csvContent = [
    header.join(','),
    ...formattedData.map(row => Object.values(row).join(','))
  ].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `pre-orders-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
