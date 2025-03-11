# Preorder E-commerce Management System

A modern e-commerce management system built with Next.js, TypeScript, Tailwind CSS, and Supabase for authentication and database.

## Features

- Next.js with TypeScript for maintainability
- Tailwind CSS for a modern, responsive UI
- Supabase Auth for email/password login
- Dark mode support
- Framer Motion for smooth UI animations
- React Hook Form + Zod for form validation
- Modern UI with glassmorphism design
- Comprehensive pre-order management system
- Customer management with CRUD operations
- Flight scheduling and tracking
- Payment processing and tracking
- Reminder system with Kanban board
- Role-based access control (Admin and Employee roles)
- Advanced filtering and sorting capabilities
- Responsive data tables with pagination

## Getting Started

### Prerequisites

- Node.js 18.x or later
- npm or yarn
- Supabase account and project

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/preorder-ecommerce-management.git
cd preorder-ecommerce-management
```

2. Install dependencies:

```bash
npm install
# or
yarn install
```

3. Copy `.env.local.example` to `.env.local` and update with your Supabase credentials:

```bash
cp .env.local.example .env.local
```

Then edit `.env.local` with your actual credentials:
```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

4. Set up the database:

Import the `supabase_schema.sql` file into your Supabase project using the SQL Editor. This will create all the necessary tables, functions, and triggers.

5. Start the development server:

```bash
npm run dev
# or
yarn dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
/preorder-ecommerce-management
│── /src
│   ├── /app
│   │   ├── page.tsx  → Redirects to /auth or /dashboard based on auth state
│   │   ├── /auth
│   │   │   ├── page.tsx  → Login & Signup page
│   │   ├── /admin
│   │   │   ├── page.tsx  → Admin dashboard
│   │   │   ├── /customers
│   │   │   │   ├── page.tsx  → Customer management
│   │   │   ├── /pre-orders
│   │   │   │   ├── page.tsx  → Pre-order management
│   │   │   ├── /flights
│   │   │   │   ├── page.tsx  → Flight management
│   │   │   ├── /payments
│   │   │   │   ├── page.tsx  → Payment management
│   │   │   ├── /reminders
│   │   │   │   ├── page.tsx  → Reminder management
│   │   ├── /employee
│   │   │   ├── page.tsx  → Employee dashboard
│   │   │   ├── /pre-orders
│   │   │   │   ├── page.tsx  → Pre-order management (employee view)
│   │   │   ├── /payments
│   │   │   │   ├── page.tsx  → Payment management (employee view)
│   │   │   ├── /reminders
│   │   │   │   ├── page.tsx  → Reminder management (employee view)
│   ├── /components
│   │   ├── /ui  → Shadcn UI components
│   │   ├── /customers
│   │   │   ├── CustomerAddEditModal.tsx
│   │   ├── /pre-orders
│   │   │   ├── PreOrderAddEditModal.tsx
│   │   │   ├── PreOrderDetailModal.tsx
│   │   ├── /flights
│   │   │   ├── FlightAddEditModal.tsx
│   │   ├── /payments
│   │   │   ├── PaymentAddEditModal.tsx
│   │   │   ├── PaymentDetailModal.tsx
│   │   ├── /reminders
│   │   │   ├── ReminderCard.tsx
│   │   │   ├── KanbanBoard.tsx
│   ├── /lib
│   │   ├── supabase.ts  → Initializes Supabase client
│   │   ├── types.ts  → TypeScript type definitions
│   │   ├── utils.ts  → Utility functions
│   │   ├── api.ts  → API functions
│   ├── /utils
│   │   ├── userRoles.ts  → Role-based access control functions
│   ├── middleware.ts  → Supabase auth middleware
```

## Database Schema

The application uses Supabase with the following main tables:
- `customers`: Store customer information
- `flights`: Manage flight schedules
- `preorders`: Track pre-orders with customer and flight relationships
- `preorder_items`: Store items within pre-orders
- `payments`: Track payments related to pre-orders
- `reminders`: Store reminders for tasks and follow-ups
- `users`: Store user information and roles

The complete database schema is available in the `supabase_schema.sql` file. To set up the database:

1. Create a new Supabase project
2. Go to the SQL Editor in the Supabase dashboard
3. Copy and paste the entire contents of the `supabase_schema.sql` file
4. Run the SQL to create the complete database schema

## Role-Based Access Control

The application implements role-based access control (RBAC) to manage user permissions:

### User Roles

- **Admin**: Full access to all features, including user management
- **Employee**: Limited access to basic features

### Implementation Details

1. **Users Table**: Connected to Supabase Auth to store role information
2. **Automatic User Creation**: New users are automatically assigned the employee role
3. **Role-Based UI**: Different navigation and features based on user role
4. **User Management**: Admins can manage users and their roles

## Deployment

This project can be deployed on Vercel, Netlify, or any other platform that supports Next.js. Make sure to:

1. Set up your environment variables in your deployment platform
2. Configure your Supabase project settings
3. Import the database schema into your Supabase project

## License

This project is licensed under the MIT License.
