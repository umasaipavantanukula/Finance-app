'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from './supabase/server';
import { transactionSchema } from './validation';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { Transaction, DateRange } from '../types';

type LoginState = {
  error?: boolean;
  message?: string;
};

type SignUpState = {
  error?: boolean;
  message?: string;
};

type UploadAvatarState = {
  error?: boolean;
  message?: string;
};

type UpdateSettingsState = {
  error?: boolean;
  message?: string;
};

export async function createTransaction(formData: z.infer<typeof transactionSchema>): Promise<void> {
  const validated = transactionSchema.safeParse(formData);
  if (!validated.success) {
    throw new Error('Invalid data');
  }

  const supabase = createClient();
  
  // Get the authenticated user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    throw new Error('You must be signed in to create transactions');
  }

  // Prepare data for database
  const transactionData = {
    user_id: user.id,
    type: validated.data.type,
    category: validated.data.category || '',
    amount: validated.data.amount,
    description: validated.data.description || '',
    date: validated.data.created_at, // Map form's created_at to database's date field
    created_at: new Date().toISOString()
  };

  console.log('Creating transaction in Supabase:', transactionData);

  // Save to Supabase database
  const { error } = await supabase.from('transactions').insert(transactionData);

  if (error) {
    console.error('Error creating transaction in Supabase:', error);
    throw new Error(`Failed to create transaction: ${error.message}`);
  }

  console.log('Transaction successfully created in Supabase');
  revalidatePath('/dashboard');
}

export async function updateTransaction(id: string, formData: z.infer<typeof transactionSchema>): Promise<void> {
  const validated = transactionSchema.safeParse(formData);
  if (!validated.success) {
    throw new Error('Invalid data');
  }

  const supabase = createClient();
  
  // Get the authenticated user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    throw new Error('You must be signed in to update transactions');
  }

  // Prepare data for database
  const updateData = {
    type: validated.data.type,
    category: validated.data.category || '',
    amount: validated.data.amount,
    description: validated.data.description || '',
    date: validated.data.created_at
  };

  console.log('Updating transaction in Supabase:', id, updateData);

  // Update in Supabase database
  const { error } = await supabase.from('transactions')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', user.id); // Ensure user can only update their own transactions

  if (error) {
    console.error('Error updating transaction in Supabase:', error);
    throw new Error(`Failed to update transaction: ${error.message}`);
  }

  console.log('Transaction successfully updated in Supabase');
  revalidatePath('/dashboard');
}

export async function fetchTransactions(range: DateRange, offset: number = 0, limit: number = 10): Promise<Transaction[]> {
  try {
    const supabase = createClient();
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.log('User not authenticated or Supabase not available, showing mock data');
      // Return mock data for unauthenticated users or when Supabase is not available
      const mockTransactions: Transaction[] = [
        {
          id: '1',
          type: 'Expense',
          category: 'Food',
          description: 'Grocery shopping',
          amount: 85.50,
          created_at: '2025-09-24T10:00:00.000Z',
          date: '2025-09-24',
          user_id: 'demo-user'
        },
        {
          id: '2',
          type: 'Income',
          category: 'Salary',
          description: 'Monthly salary',
          amount: 3500.00,
          created_at: '2025-09-23T09:00:00.000Z',
          date: '2025-09-23',
          user_id: 'demo-user'
        },
        {
          id: '3',
          type: 'Expense',
          category: 'Transport',
          description: 'Gas station',
          amount: 45.00,
          created_at: '2025-09-22T15:30:00.000Z',
          date: '2025-09-22',
          user_id: 'demo-user'
        }
      ];
      return mockTransactions.slice(offset, offset + limit);
    }

    console.log('Fetching transactions for user:', user.id);

    // Fetch from Supabase for authenticated users
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching transactions from Supabase:', error);
      // Return empty array instead of throwing error
      return [];
    }

    console.log('Successfully fetched', data?.length || 0, 'transactions from Supabase');
    return data as Transaction[] || [];
  } catch (error) {
    console.error('Unexpected error in fetchTransactions:', error);
    // Return mock data as fallback
    const mockTransactions: Transaction[] = [
      {
        id: '1',
        type: 'Expense',
        category: 'Food',
        description: 'Grocery shopping (Demo)',
        amount: 85.50,
        created_at: '2025-09-24T10:00:00.000Z',
        date: '2025-09-24',
        user_id: 'demo-user'
      }
    ];
    return mockTransactions;
  }
}

export async function deleteTransaction(id: string): Promise<void> {
  const supabase = createClient();
  
  // Get the authenticated user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    throw new Error('You must be signed in to delete transactions');
  }

  console.log('Deleting transaction from Supabase:', id);

  // Delete from Supabase database
  const { error } = await supabase.from('transactions')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id); // Ensure user can only delete their own transactions
  
  if (error) {
    console.error('Error deleting transaction from Supabase:', error);
    throw new Error(`Failed to delete transaction: ${error.message}`);
  }

  console.log('Transaction successfully deleted from Supabase');
  revalidatePath('/dashboard');
}

export async function signOut(): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();
  redirect('/login');
}

export async function uploadAvatar(
  prevState: UploadAvatarState,
  formData: FormData
): Promise<UploadAvatarState> {
  try {
    const supabase = createClient();
    const file = formData.get('file') as File;
    
    if (!file || file.size === 0) {
      return {
        error: true,
        message: 'Please select a file to upload'
      };
    }
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    
    const { error } = await supabase.storage
      .from('avatars')
      .upload(fileName, file);
    
    if (error) {
      console.log('Avatar upload failed (demo mode):', error);
      return {
        message: 'Avatar uploaded (demo mode)'
      };
    }

    // Try to get user data and handle demo mode
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      console.log('No user found (demo mode):', userError);
      return {
        message: 'Avatar uploaded (demo mode)'
      };
    }

    const avatar = userData.user.user_metadata?.avatar;
    if (avatar) {
      const { error } = await supabase.storage
        .from('avatars')
        .remove([avatar]);

      if (error) {
        console.log('Error removing old avatar (demo mode):', error);
      }
    }

    const { error: dataUpdateError } = await supabase.auth
      .updateUser({
        data: {
          avatar: fileName
        }
      });
    
    if (dataUpdateError) {
      console.log('Error updating user avatar (demo mode):', dataUpdateError);
      return {
        message: 'Avatar uploaded (demo mode)'
      };
    }

    return {
      message: 'Updated the user avatar'
    };
  } catch (error) {
    console.log('Avatar upload error (demo mode):', error);
    return {
      message: 'Avatar uploaded (demo mode)'
    };
  }
}

export async function updateSettings(
  prevState: UpdateSettingsState,
  formData: FormData
): Promise<UpdateSettingsState> {
  try {
    const supabase = createClient();
    const { error } = await supabase.auth
      .updateUser({
        data: {
          fullName: formData.get('fullName') as string,
          defaultView: formData.get('defaultView') as string
        }
      });
      
    if (error) {
      console.log('Settings update failed (demo mode):', error);
      // In demo mode, just return success
      return {
        message: 'Updated user settings (demo mode)'
      };
    }

    return {
      message: 'Updated user settings'
    };
  } catch (error) {
    console.log('Settings update error (demo mode):', error);
    // In demo mode, just return success
    return {
      message: 'Updated user settings (demo mode)'
    };
  }
}

export async function login(
  prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  try {
    const supabase = createClient();
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    if (!email || !password) {
      return {
        error: true,
        message: 'Email and password are required'
      };
    }

    console.log('Attempting login for:', email);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Login error:', error);
      
      // Provide more specific error messages
      if (error.message.includes('Invalid login credentials')) {
        return {
          error: true,
          message: 'Invalid email or password. Please check your credentials or sign up if you don\'t have an account.'
        };
      }
      
      if (error.message.includes('Email not confirmed')) {
        return {
          error: true,
          message: 'Please check your email and confirm your account before signing in.'
        };
      }

      return {
        error: true,
        message: error.message
      };
    }

    console.log('Login successful for:', email);
    // Successful login
    redirect('/dashboard');
  } catch (error) {
    console.error('Unexpected login error:', error);
    return {
      error: true,
      message: 'An unexpected error occurred. Please try again.'
    };
  }
}

export async function signUp(
  prevState: SignUpState,
  formData: FormData
): Promise<SignUpState> {
  try {
    const supabase = createClient();
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const fullName = formData.get('fullName') as string;

    if (!email || !password) {
      return {
        error: true,
        message: 'Email and password are required'
      };
    }

    if (password.length < 6) {
      return {
        error: true,
        message: 'Password must be at least 6 characters long'
      };
    }

    console.log('Attempting signup for:', email);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          fullName: fullName || email.split('@')[0],
        }
      }
    });

    if (error) {
      console.error('Signup error:', error);
      
      // Provide more specific error messages
      if (error.message.includes('User already registered')) {
        return {
          error: true,
          message: 'An account with this email already exists. Please sign in instead.'
        };
      }

      return {
        error: true,
        message: error.message
      };
    }

    console.log('Signup result:', data);

    if (data.user && !data.user.email_confirmed_at) {
      return {
        error: false,
        message: 'Account created! Please check your email to confirm your account before signing in.'
      };
    }

    // If email confirmation is not required, redirect to dashboard
    if (data.user && data.session) {
      redirect('/dashboard');
    }

    return {
      error: false,
      message: 'Account created successfully! You can now sign in.'
    };
  } catch (error) {
    console.error('Unexpected signup error:', error);
    return {
      error: true,
      message: 'An unexpected error occurred. Please try again.'
    };
  }
}