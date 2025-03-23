import { createClient } from '@supabase/supabase-js';

/**
 * Supabase Configuration
 * 
 * These environment variables must be set in .env.local:
 * - NEXT_PUBLIC_SUPABASE_URL: The URL of your Supabase project
 * - NEXT_PUBLIC_SUPABASE_ANON_KEY: The anon/public key of your Supabase project
 * 
 * The "as string" type assertion is used because we know these values will be
 * available at runtime, and TypeScript needs this assurance.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

/**
 * Supabase Client
 * 
 * This is the main Supabase client that will be used throughout the application.
 * It's initialized with the URL and anon key from environment variables.
 * 
 * Import this client when you need to interact with Supabase services:
 * - Authentication
 * - Database
 * - Storage
 * - Functions
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * User Profile Type
 * 
 * Represents a user profile in the application.
 * This is used for type safety when working with user data.
 * 
 * @property id - The unique identifier for the user
 * @property email - The user's email address
 * @property avatar_url - Optional URL to the user's avatar image
 * @property role - The user's role in the system (admin or employee)
 */
export type UserProfile = {
  id: string;
  email: string;
  avatar_url?: string;
  role?: 'admin' | 'employee';
}; 
