# PreOrder E-Commerce Management System

A comprehensive management system for pre-orders with advanced features for tracking customer orders, payments, shipping, and inventory.

## Key Features

- **Pre-Order Management**: Create, track, and update pre-orders with detailed product information
- **Customer Management**: Maintain customer database with contact information and purchase history
- **Payment Tracking**: Track advance payments and remaining balances with automatic payment records
- **Flight/Shipment Tracking**: Organize orders by shipping flight for efficient logistics
- **Role-Based Access**: Admin and employee roles with appropriate permissions
- **Responsive UI**: Works on desktop and mobile devices

## Automatic Payment System

This system includes an automatic payment tracking feature that creates payment records when advance payments are added to products in pre-orders. The SQL trigger function `update_payments_on_preorder_item_change()` handles this functionality.

Key aspects of the payment system:
- Automatically creates payment records when products are added with advance payments
- Updates existing payment records when product advance payments are modified
- Deletes payment records when products are removed or advance payments are set to zero
- Tracks individual product advance payments to maintain accurate financial records

## Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/preorder-ecommerce-management.git
cd preorder-ecommerce-management
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:
- Copy `.env.local.example` to `.env.local`
- Add your Supabase URL and anon key

4. Set up the database:
- Option 1: Import the complete schema dump from `sql/dumps/supabase_schema_dump.sql` into your Supabase project
- Option 2: Run the individual SQL scripts in the `sql` directory, particularly `payment_trigger.sql` to set up the automatic payment system

5. Start the development server:

```bash
npm run dev
```

## Technologies Used

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Supabase
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: Supabase Auth
- **Styling**: Tailwind CSS, Shadcn UI

## License

MIT
