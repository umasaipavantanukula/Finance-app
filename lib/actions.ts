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

export async function createTransaction(formData: z.infer<typeof transactionSchema>): Promise<void> {
  const validated = transactionSchema.safeParse(formData);
  if (!validated.success) {
    throw new Error('Invalid data');
  }

  // Mock creation - just log it since we're using demo data
  console.log('Mock: Creating transaction', formData);
  
  // In a real app, this would save to Supabase
  // const { error } = await createClient().from('transactions').insert(formData);
  // if (error) throw new Error('Failed creating the transaction');
  
  // Mock success
  return Promise.resolve();
}

export async function updateTransaction(id: string, formData: z.infer<typeof transactionSchema>): Promise<void> {
  const validated = transactionSchema.safeParse(formData);
  if (!validated.success) {
    throw new Error('Invalid data');
  }

  // Mock update - just log it since we're using demo data
  console.log(`Mock: Updating transaction ${id}`, formData);
  
  // In a real app, this would update in Supabase
  // const { error } = await createClient().from('transactions').update(formData).eq('id', id);
  // if (error) throw new Error('Failed creating the transaction');
  
  // Mock success
  return Promise.resolve();
}

export async function fetchTransactions(range: DateRange, offset: number = 0, limit: number = 10): Promise<Transaction[]> {
  // Return mock data since authentication is bypassed
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

  // Simulate pagination
  const startIndex = offset;
  const endIndex = startIndex + limit;
  return mockTransactions.slice(startIndex, endIndex);
}

export async function deleteTransaction(id: string): Promise<void> {
  // Mock deletion - just log it since we're using demo data
  console.log(`Mock: Deleting transaction ${id}`);
  // In a real app, this would delete from Supabase
  // const supabase = createClient();
  // const { error } = await supabase.from('transactions').delete().eq('id', id);
  // if (error) throw new Error(`Could not delete the transaction ${id}`);
  
  // Mock success
  return Promise.resolve();
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
  const supabase = createClient();
  const file = formData.get('file') as File;
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random()}.${fileExt}`;
  
  const { error } = await supabase.storage
    .from('avatars')
    .upload(fileName, file);
  
  if (error) {
    return {
      error: true,
      message: 'Error uploading avatar'
    };
  }

  // Removing the old file
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) {
    return {
      error: true,
      message: 'Something went wrong, try again'
    };
  }

  const avatar = userData.user.user_metadata.avatar;
  if (avatar) {
    const { error } = await supabase.storage
      .from('avatars')
      .remove([avatar]);

    if (error) {
      return {
        error: true,
        message: 'Something went wrong, try again'
      };
    }
  }

  const { error: dataUpdateError } = await supabase.auth
    .updateUser({
      data: {
        avatar: fileName
      }
    });
  
  if (dataUpdateError) {
    return {
      error: true,
      message: 'Error associating the avatar with the user'
    };
  }

  return {
    message: 'Updated the user avatar'
  };
}

export async function updateSettings(
  prevState: UpdateSettingsState,
  formData: FormData
): Promise<UpdateSettingsState> {
  const supabase = createClient();
  const { error } = await supabase.auth
    .updateUser({
      data: {
        fullName: formData.get('fullName') as string,
        defaultView: formData.get('defaultView') as string
      }
    });
    
  if (error) {
    return {
      error: true,
      message: 'Failed updating setting'
    };
  }

  return {
    message: 'Updated user settings'
  };
}