import { supabase } from '@/lib/supabase';
import { Provider } from '@supabase/supabase-js';

export async function signUp(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error signing up:', error);
    return { data: null, error };
  }
}

export async function signIn(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error signing in:', error);
    return { data: null, error };
  }
}

export async function signInWithProvider(provider: Provider) {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error signing in with provider:', error);
    return { data: null, error };
  }
}

export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    
    // Clear any cached session data
    await supabase.auth.getSession();
    
    if (error) {
      console.error('Error signing out:', error);
      return { error };
    }
    
    return { error: null };
  } catch (error) {
    console.error('Error signing out:', error);
    return { error };
  }
}

export async function getCurrentUser() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) throw error;
    
    if (!session) {
      return { user: null, error: null };
    }
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) throw userError;
    
    return { user, error: null };
  } catch (error) {
    console.error('Error getting current user:', error);
    return { user: null, error };
  }
} 