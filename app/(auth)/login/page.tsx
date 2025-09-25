import { redirect } from 'next/navigation';

interface PageProps {
  searchParams?: {
    error?: string;
    details?: string;
  };
}

export default function Page({ searchParams }: PageProps) {
  // Skip authentication and go directly to dashboard
  redirect('/dashboard');
}