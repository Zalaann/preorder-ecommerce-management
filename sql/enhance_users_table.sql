-- Modify users table to connect with auth.users
ALTER TABLE users
ADD CONSTRAINT users_auth_user_id_fk
FOREIGN KEY (user_id) REFERENCES auth.users(id)
ON DELETE CASCADE;

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create trigger function to automatically create a user record when someone signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (user_id, email, role)
  VALUES (new.id, new.email, 'employee')
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
CREATE POLICY "Users can view own user data" ON users
  FOR SELECT USING (auth.uid() = user_id);

-- Policy to allow users to update their own data (except role)
CREATE POLICY "Users can update own user data" ON users
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND (NEW.role = OLD.role OR auth.uid() IN (
    SELECT user_id FROM users WHERE role = 'admin'
  )));

-- Policy to allow admins to read all user data
CREATE POLICY "Admins can view all user data" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Policy to allow admins to update all user data
CREATE POLICY "Admins can update all user data" ON users
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Policy to allow admins to insert new users
CREATE POLICY "Admins can insert new users" ON users
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Policy to allow admins to delete users
CREATE POLICY "Admins can delete users" ON users
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Set an existing user as admin (you'll need to replace with an actual user_id)
-- Uncomment and modify this when you're ready to set an admin
-- UPDATE users SET role = 'admin' WHERE email = 'your-admin-email@example.com'; 