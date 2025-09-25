import { redirect } from 'next/navigation'

export default async function Home() {
  // Skip authentication and go directly to dashboard
  redirect('/dashboard')
}
