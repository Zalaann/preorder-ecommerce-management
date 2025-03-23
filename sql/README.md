# User Management System

This directory contains SQL scripts for setting up the user management system with role-based access control.

## Overview

The user management system connects Supabase Auth with a custom `users` table to enable role-based access control. This allows you to:

1. Assign roles to users (admin, employee)
2. Restrict access to certain features based on user roles
3. Manage users and their permissions

## Setup Instructions

1. Run the SQL script `enhance_users_table.sql` in your Supabase SQL editor to:
   - Connect your users table to Supabase Auth
   - Enable Row Level Security (RLS)
   - Create triggers to automatically create user records
   - Set up RLS policies for proper access control

2. Set an admin user by uncommenting and modifying the last line in the script:
   ```sql
   UPDATE users SET role = 'admin' WHERE email = 'your-admin-email@example.com';
   ```

3. After running the script, you can manage users through the `/admin/users` page (admin access only).

## User Roles

- **Admin**: Can manage all users, change roles, and access all features
- **Employee**: Regular user with limited permissions

## How It Works

1. When a user signs up through Supabase Auth, a trigger automatically creates a record in the `users` table
2. The user is assigned the 'employee' role by default
3. Admins can promote users to admin role through the user management interface
4. RLS policies ensure that users can only access data they're authorized to see

## Troubleshooting

If users aren't being created in the `users` table:

1. Check that the trigger is properly installed
2. Verify that the `users` table has the correct structure
3. Check for any errors in the Supabase logs 