-- This script will:
-- 1. Check and fix the users table structure
-- 2. Ensure all columns are properly defined
-- 3. Set up triggers to automatically create user records

-- First, let's check if the users table exists and create it if not
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
    CREATE TABLE public.users (
      user_id UUID PRIMARY KEY,
      email TEXT NOT NULL,
      name TEXT,
      password TEXT,
      role TEXT NOT NULL DEFAULT 'employee',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
    );
    
    -- Add foreign key if auth.users exists
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'auth' AND tablename = 'users') THEN
      ALTER TABLE public.users 
      ADD CONSTRAINT users_auth_user_id_fk 
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
  END IF;
END
$$;

-- Make sure all required columns exist and have the right types
DO $$
BEGIN
  -- Add user_id column if it doesn't exist
  IF NOT EXISTS (SELECT FROM information_schema.columns 
                 WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'user_id') THEN
    ALTER TABLE public.users ADD COLUMN user_id UUID PRIMARY KEY;
  END IF;

  -- Add email column if it doesn't exist
  IF NOT EXISTS (SELECT FROM information_schema.columns 
                 WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'email') THEN
    ALTER TABLE public.users ADD COLUMN email TEXT;
  END IF;

  -- Add role column if it doesn't exist
  IF NOT EXISTS (SELECT FROM information_schema.columns 
                 WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'role') THEN
    ALTER TABLE public.users ADD COLUMN role TEXT NOT NULL DEFAULT 'employee';
  END IF;

  -- Add created_at column if it doesn't exist
  IF NOT EXISTS (SELECT FROM information_schema.columns 
                 WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'created_at') THEN
    ALTER TABLE public.users ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL;
  END IF;
END
$$;

-- Make sure all columns that should be nullable are nullable
DO $$
BEGIN
  -- Make password nullable if it's not already
  BEGIN
    ALTER TABLE public.users ALTER COLUMN password DROP NOT NULL;
  EXCEPTION
    WHEN undefined_column THEN
      -- Column doesn't exist, ignore
    WHEN others THEN
      -- Column exists but might already be nullable, ignore
  END;
  
  -- Make name nullable if it's not already
  BEGIN
    ALTER TABLE public.users ALTER COLUMN name DROP NOT NULL;
  EXCEPTION
    WHEN undefined_column THEN
      -- Column doesn't exist, ignore
    WHEN others THEN
      -- Column exists but might already be nullable, ignore
  END;
END
$$;

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create trigger function to automatically create a user record when someone signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert with minimal required fields
  INSERT INTO public.users (user_id, email, role, name)
  VALUES (
    new.id, 
    new.email, 
    'employee', 
    COALESCE(
      (new.raw_user_meta_data->>'name'),
      split_part(new.email, '@', 1)
    )
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create RLS policies

-- Policy to allow users to read their own data
DROP POLICY IF EXISTS "Users can view own user data" ON users;
CREATE POLICY "Users can view own user data" ON users
  FOR SELECT USING (auth.uid() = user_id);

-- Policy to allow users to update their own data (except role)
DROP POLICY IF EXISTS "Users can update own user data" ON users;
CREATE POLICY "Users can update own user data" ON users
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND (NEW.role = OLD.role OR auth.uid() IN (
    SELECT user_id FROM users WHERE role = 'admin'
  )));

-- Policy to allow admins to read all user data
DROP POLICY IF EXISTS "Admins can view all user data" ON users;
CREATE POLICY "Admins can view all user data" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Policy to allow admins to update all user data
DROP POLICY IF EXISTS "Admins can update all user data" ON users;
CREATE POLICY "Admins can update all user data" ON users
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Policy to allow admins to insert new users
DROP POLICY IF EXISTS "Admins can insert new users" ON users;
CREATE POLICY "Admins can insert new users" ON users
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE user_id = auth.uid() AND role = 'admin'
    ) OR auth.uid() IS NULL
  );

-- Policy to allow admins to delete users
DROP POLICY IF EXISTS "Admins can delete users" ON users;
CREATE POLICY "Admins can delete users" ON users
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Set specific users as admins (replace this email with your actual admin email)
UPDATE users
SET role = 'admin'
WHERE email = 'your-email@example.com';  -- Replace with your email

-- Output the results to verify
SELECT u.email, u.role, u.created_at
FROM users u
ORDER BY u.role, u.email; 