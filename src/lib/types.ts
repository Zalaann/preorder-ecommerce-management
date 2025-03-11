// Pre-order related types
export type OrderStatus = 'pending' | 'ordered' | 'shipped' | 'delivered' | 'cancelled' | 'Out_of_stock';
export type FlightStatus = 'scheduled' | 'in_transit' | 'arrived' | 'delayed' | 'in_progress' | 'completed' | 'cancelled';
export type PaymentPurpose = 'advance' | 'final_remaining' | 'cod';
export type BankAccount = 'Ibrahim_Hbl' | 'Fatima_hbl' | 'Fatima_jazzcash' | 'Fatima_Easypaisa';

// Reminder related types
export type ReminderStatus = 'Pending' | 'In Progress' | 'Completed';
export type ReminderPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export interface Customer {
  customer_id: string;
  name: string;
  phone_number: string;
  instagram_id?: string;
  city: string;
  address: string;
}

export interface Flight {
  id: string;
  flight_id: string;
  flight_name: string;
  shipment_date: string;
  status: FlightStatus;
  created_at: string;
}

export interface PreOrderItem {
  preorder_item_id: string;
  preorder_id: string;
  product_name: string;
  shade: string;
  size: string;
  quantity: number;
  price: number;
  link: string;
}

export interface PreOrder {
  preorder_id: string;
  customer_id: string;
  flight_id?: string;
  order_status: OrderStatus;
  subtotal: number;
  advance_payment: number;
  cod_amount: number;
  total_amount: number;
  remaining_amount: number;
  created_at: string;
}

export interface PreOrderWithDetails extends PreOrder {
  customer: Customer;
  flight?: Flight;
  items?: PreOrderItem[];
}

export interface Payment {
  payment_id: string; // UUID
  customer_id: string; // UUID
  preorder_id: string; // UUID
  amount: number;
  payment_purpose: PaymentPurpose;
  bank_account: BankAccount;
  tally: boolean;
  payment_screenshot: string;
  payment_date: string;
}

export interface PaymentWithDetails extends Payment {
  customer?: Customer;
  preorder?: PreOrderWithDetails;
}

// Transaction related types
export type ConfirmationStatus = 'Not Confirmed' | 'Confirmed';
export type PayStatus = 'Paid' | 'Unpaid';

export interface Transaction {
  transaction_id: number;
  user_id: string;
  transaction_date: string;
  due_date: string;
  amount: number;
  brand: string;
  confirmation_status: ConfirmationStatus;
  pay_status: PayStatus;
  remarks: string | null;
  updated_at: string;
  updated_by: string | null;
  change_description: string | null;
  user?: {
    email: string;
    role: string;
  };
}

// User related types
export type Role = 'admin' | 'employee';

export interface UserProfile {
  id: string;
  email: string;
  role: Role;
  created_at: string;
  updated_at: string;
}

export interface Reminder {
  reminder_id: string;
  preorder_id: string;
  user_id: string;
  title: string;
  description?: string;
  status: ReminderStatus;
  priority: ReminderPriority;
  due_date: string;
  created_at: string;
  updated_at: string;
}

export interface ReminderWithDetails extends Reminder {
  preorder?: PreOrderWithDetails;
} 