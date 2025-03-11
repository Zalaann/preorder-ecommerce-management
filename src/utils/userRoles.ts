import { supabase } from '@/lib/supabase';
import { UserProfile, Role } from '@/lib/types';

/**
 * Fetches the current user's profile including role information
 */
export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  try {
    // Get the current session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.log('No session found');
      return null;
    }
    
    console.log('Session found, user ID:', session.user.id);
    
    // Get the user profile from the users table
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', session.user.id)
      .single();
    
    // If user doesn't exist in the users table, create a new record
    if (error) {
      console.log('Error or user not found:', error);
      
      if (error.code === 'PGRST116') {
        console.log('User not found in users table, creating new record');
        
        // Create a minimal user record
        const userData = {
          user_id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
          role: 'employee'
        };
        
        console.log('Creating user with data:', userData);
        
        // Insert the user record
        const { data: newUser, error: insertError } = await supabase
          .from('users')
          .insert(userData)
          .select('*')
          .single();
        
        if (insertError) {
          console.error('Error creating user profile:', insertError);
          
          // Try a more minimal approach if the first attempt failed
          const minimalUserData = {
            user_id: session.user.id,
            email: session.user.email || '',
            role: 'employee'
          };
          
          console.log('Retrying with minimal data:', minimalUserData);
          
          const { data: minimalUser, error: minimalError } = await supabase
            .from('users')
            .insert(minimalUserData)
            .select('*')
            .single();
            
          if (minimalError) {
            console.error('Error creating minimal user profile:', minimalError);
            
            // As a last resort, create a fake profile for the current session
            console.log('Creating temporary profile for session');
            return {
              id: session.user.id,
              email: session.user.email || '',
              role: 'employee',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
          }
          
          return {
            id: minimalUser.user_id,
            email: minimalUser.email,
            role: minimalUser.role as Role,
            created_at: minimalUser.created_at || new Date().toISOString(),
            updated_at: minimalUser.updated_at || minimalUser.created_at || new Date().toISOString()
          };
        }
        
        return {
          id: newUser.user_id,
          email: newUser.email,
          role: newUser.role as Role,
          created_at: newUser.created_at || new Date().toISOString(),
          updated_at: newUser.updated_at || newUser.created_at || new Date().toISOString()
        };
      } else {
        console.error('Error fetching user profile:', error);
        return null;
      }
    }
    
    if (!data) {
      console.error('No data returned from user profile query');
      return null;
    }
    
    console.log('User profile found:', data);
    
    return {
      id: data.user_id,
      email: data.email,
      role: data.role as Role,
      created_at: data.created_at || new Date().toISOString(),
      updated_at: data.updated_at || data.created_at || new Date().toISOString()
    };
  } catch (error) {
    console.error('Error in getCurrentUserProfile:', error);
    return null;
  }
}

/**
 * Checks if the current user has admin role
 */
export async function isAdmin(): Promise<boolean> {
  const profile = await getCurrentUserProfile();
  return profile?.role === 'admin';
}

/**
 * Updates a user's role (admin only)
 */
export async function updateUserRole(userId: string, newRole: Role): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if current user is admin
    const isCurrentUserAdmin = await isAdmin();
    
    if (!isCurrentUserAdmin) {
      return { 
        success: false, 
        error: 'Only administrators can update user roles' 
      };
    }
    
    // Update the user's role
    const { error } = await supabase
      .from('users')
      .update({ role: newRole })
      .eq('user_id', userId);
    
    if (error) {
      return { 
        success: false, 
        error: error.message 
      };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error updating user role:', error);
    return { 
      success: false, 
      error: 'An unexpected error occurred' 
    };
  }
}

/**
 * Gets all users (admin only)
 */
export async function getAllUsers(): Promise<UserProfile[] | null> {
  try {
    // Check if current user is admin
    const isCurrentUserAdmin = await isAdmin();
    
    if (!isCurrentUserAdmin) {
      console.error('Only administrators can view all users');
      return null;
    }
    
    // Get all users
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching users:', error);
      return null;
    }
    
    return data.map(user => ({
      id: user.user_id,
      email: user.email,
      role: user.role as Role,
      created_at: user.created_at,
      updated_at: user.updated_at || user.created_at
    }));
  } catch (error) {
    console.error('Error in getAllUsers:', error);
    return null;
  }
} 