-- This script will properly set up the users table and connect it to Supabase Auth
-- Based on the actual structure of your database

-- First, let's make sure the users table has the correct structure
DO $$
BEGIN
  -- Check if the users table exists
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
    -- Table exists, check if it has the correct primary key
    IF NOT EXISTS (
      SELECT FROM pg_constraint 
      WHERE conrelid = 'public.users'::regclass 
      AND contype = 'p'
    ) THEN
      -- Add primary key if missing
      ALTER TABLE public.users ADD PRIMARY KEY (user_id);
    END IF;
  ELSE
    -- Create the users table if it doesn't exist
    CREATE TABLE public.users (
      user_id UUID PRIMARY KEY,
      name TEXT,
      email TEXT NOT NULL,
      password TEXT,
      role TEXT NOT NULL DEFAULT 'employee',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  END IF;
END
$$;

-- Make sure all required columns exist
DO $$
BEGIN
  -- Add user_id column if it doesn't exist
  IF NOT EXISTS (SELECT FROM information_schema.columns 
                 WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'user_id') THEN
    ALTER TABLE public.users ADD COLUMN user_id UUID;
    ALTER TABLE public.users ADD PRIMARY KEY (user_id);
  END IF;

  -- Add email column if it doesn't exist
  IF NOT EXISTS (SELECT FROM information_schema.columns 
                 WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'email') THEN
    ALTER TABLE public.users ADD COLUMN email TEXT NOT NULL;
  END IF;

  -- Add role column if it doesn't exist
  IF NOT EXISTS (SELECT FROM information_schema.columns 
                 WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'role') THEN
    ALTER TABLE public.users ADD COLUMN role TEXT NOT NULL DEFAULT 'employee';
  END IF;

  -- Add created_at column if it doesn't exist
  IF NOT EXISTS (SELECT FROM information_schema.columns 
                 WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'created_at') THEN
    ALTER TABLE public.users ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
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

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_constraint 
    WHERE conrelid = 'public.users'::regclass 
    AND conname = 'users_auth_user_id_fk'
  ) THEN
    -- Add foreign key constraint
    BEGIN
      ALTER TABLE public.users 
      ADD CONSTRAINT users_auth_user_id_fk 
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    EXCEPTION
      WHEN others THEN
        RAISE NOTICE 'Could not add foreign key constraint: %', SQLERRM;
    END;
  END IF;
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

-- Policy to allow inserts during signup
DROP POLICY IF EXISTS "Allow inserts during signup" ON users;
CREATE POLICY "Allow inserts during signup" ON users
  FOR INSERT WITH CHECK (true);

-- Policy to allow admins to delete users
DROP POLICY IF EXISTS "Admins can delete users" ON users;
CREATE POLICY "Admins can delete users" ON users
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Migrate existing auth users to the users table
INSERT INTO users (user_id, email, name, role, created_at)
SELECT 
  id, 
  email, 
  COALESCE(raw_user_meta_data->>'name', split_part(email, '@', 1)) as name,
  'employee' as role,
  created_at
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM users WHERE user_id IS NOT NULL)
ON CONFLICT (user_id) DO NOTHING;

-- Set a specific user as admin (replace with your email)
UPDATE users
SET role = 'admin'
WHERE email = 'your-email@example.com';  -- Replace with your email

-- Output the results to verify
SELECT u.email, u.role, u.created_at
FROM users u
ORDER BY u.role, u.email; 