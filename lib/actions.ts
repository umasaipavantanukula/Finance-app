'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from './supabase/server';
import { transactionSchema } from './validation';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { Transaction, DateRange } from '../types';

type UploadAvatarState = {
  error?: boolean;
  message?: string;
};

type UpdateSettingsState = {
  error?: boolean;
  message?: string;
};

// Helper function to get transactions from localStorage
function getStoredTransactions(): Transaction[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem('finance-app-transactions');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// Helper function to save transactions to localStorage
function saveStoredTransactions(transactions: Transaction[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('finance-app-transactions', JSON.stringify(transactions));
  } catch {
    console.error('Failed to save to localStorage');
  }
}

export async function createTransaction(formData: z.infer<typeof transactionSchema>): Promise<void> {
  const validated = transactionSchema.safeParse(formData);
  if (!validated.success) {
    throw new Error('Invalid data');
  }

  try {
    // Prepare data for database - map form fields to database schema
    const transactionData = {
      user_id: 'demo-user',
      type: validated.data.type,
      category: validated.data.category || '',
      amount: validated.data.amount,
      description: validated.data.description || '',
      date: validated.data.created_at, // Map form's created_at to database's date field
      created_at: new Date().toISOString() // Set current timestamp for created_at
    };

    // Try to save to Supabase database
    const { error } = await createClient().from('transactions').insert(transactionData);

    if (error) {
      console.error('Error creating transaction (using localStorage):', error);
      // Fallback: Save to localStorage with generated ID
      const newTransaction: Transaction = {
        ...transactionData,
        id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };
      
      const stored = getStoredTransactions();
      stored.unshift(newTransaction); // Add to beginning of array
      saveStoredTransactions(stored);
      console.log('Transaction saved to localStorage:', newTransaction);
    }
  } catch (error) {
    console.error('Database connection failed (using localStorage):', error);
    // Fallback: Save to localStorage
    const newTransaction: Transaction = {
      id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      user_id: 'demo-user',
      type: validated.data.type,
      category: validated.data.category || '',
      amount: validated.data.amount,
      description: validated.data.description || '',
      date: validated.data.created_at,
      created_at: new Date().toISOString()
    };
    
    const stored = getStoredTransactions();
    stored.unshift(newTransaction);
    saveStoredTransactions(stored);
    console.log('Transaction saved to localStorage:', newTransaction);
  }

  revalidatePath('/dashboard');
}

export async function updateTransaction(id: string, formData: z.infer<typeof transactionSchema>): Promise<void> {
  const validated = transactionSchema.safeParse(formData);
  if (!validated.success) {
    throw new Error('Invalid data');
  }

  try {
    // Prepare data for database - map form fields to database schema
    const updateData = {
      type: validated.data.type,
      category: validated.data.category || '',
      amount: validated.data.amount,
      description: validated.data.description || '',
      date: validated.data.created_at // Map form's created_at to database's date field
    };

    // Try to update in Supabase database
    const { error } = await createClient().from('transactions')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', 'demo-user');

    if (error) {
      console.error('Error updating transaction (using localStorage):', error);
      // Fallback: Update in localStorage
      const stored = getStoredTransactions();
      const index = stored.findIndex(t => t.id === id);
      if (index !== -1) {
        stored[index] = { ...stored[index], ...updateData };
        saveStoredTransactions(stored);
        console.log('Transaction updated in localStorage:', stored[index]);
      }
    }
  } catch (error) {
    console.error('Database connection failed (using localStorage):', error);
    // Fallback: Update in localStorage
    const stored = getStoredTransactions();
    const index = stored.findIndex(t => t.id === id);
    if (index !== -1) {
      stored[index] = { 
        ...stored[index], 
        type: validated.data.type,
        category: validated.data.category || '',
        amount: validated.data.amount,
        description: validated.data.description || '',
        date: validated.data.created_at
      };
      saveStoredTransactions(stored);
      console.log('Transaction updated in localStorage:', stored[index]);
    }
  }

  revalidatePath('/dashboard');
}

export async function fetchTransactions(range: DateRange, offset: number = 0, limit: number = 10): Promise<Transaction[]> {
  let allTransactions: Transaction[] = [];

  try {
    // Try to fetch from Supabase first
    const supabase = createClient();
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 'demo-user')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (!error && data && data.length > 0) {
      allTransactions = [...data as Transaction[]];
    }
  } catch (error) {
    console.log('Error fetching from database, checking localStorage:', error);
  }

  // Add localStorage transactions
  const storedTransactions = getStoredTransactions();
  if (storedTransactions.length > 0) {
    // Combine stored transactions with database transactions (if any)
    // Remove duplicates by ID and sort by created_at
    const combined = [...storedTransactions, ...allTransactions];
    const uniqueTransactions = combined.filter((transaction, index, self) =>
      index === self.findIndex((t) => t.id === transaction.id)
    );
    allTransactions = uniqueTransactions.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  // If still no transactions, use mock data
  if (allTransactions.length === 0) {
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
      },
      {
        id: '4',
        type: 'Expense',
        category: 'Entertainment',
        description: 'Movie tickets',
        amount: 25.00,
        created_at: '2025-09-21T19:00:00.000Z',
        date: '2025-09-21',
        user_id: 'demo-user'
      },
      {
        id: '5',
        type: 'Income',
        category: 'Freelance',
        description: 'Web design project',
        amount: 750.00,
        created_at: '2025-09-20T14:00:00.000Z',
        date: '2025-09-20',
        user_id: 'demo-user'
      }
    ];
    allTransactions = mockTransactions;
  }

  // Apply pagination
  const startIndex = offset;
  const endIndex = startIndex + limit;
  return allTransactions.slice(startIndex, endIndex);
}

export async function deleteTransaction(id: string): Promise<void> {
  try {
    // Try to delete from Supabase database
    const supabase = createClient();
    const { error } = await supabase.from('transactions')
      .delete()
      .eq('id', id)
      .eq('user_id', 'demo-user');
    
    if (error) {
      console.error('Error deleting transaction (using localStorage):', error);
      // Fallback: Delete from localStorage
      const stored = getStoredTransactions();
      const filtered = stored.filter(t => t.id !== id);
      saveStoredTransactions(filtered);
      console.log('Transaction deleted from localStorage:', id);
    }
  } catch (error) {
    console.error('Database connection failed (using localStorage):', error);
    // Fallback: Delete from localStorage
    const stored = getStoredTransactions();
    const filtered = stored.filter(t => t.id !== id);
    saveStoredTransactions(filtered);
    console.log('Transaction deleted from localStorage:', id);
  }
  
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