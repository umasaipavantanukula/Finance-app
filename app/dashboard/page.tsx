import { Suspense } from "react"
import TransactionListFallback from "./components/transaction-list-fallback"
import Trend from "./components/trend"
import TrendFallback from "./components/trend-fallback"
import Link from 'next/link'
import { PlusCircle } from 'lucide-react'
import { sizes, variants } from "@/lib/variants"
import { ErrorBoundary } from "react-error-boundary";
import { types } from "@/lib/consts"
import Range from "./components/range"
import TransactionListWrapper from "./components/transaction-list-wrapper"
import { createClient } from "@/lib/supabase/server"
import { convertRangeToDateRange } from "@/lib/utils"

export default async function Page({ searchParams }) {
  const supabase = createClient()
  
  // Handle case where user might not be authenticated (since we bypassed auth)
  let settings = null;
  try {
    const { data: { user } } = await supabase.auth.getUser()
    settings = user?.user_metadata || null;
  } catch (error) {
    // If auth fails, continue without user settings
    console.log('No user authenticated, using default settings');
  }
  
  const rangeString = searchParams?.range ?? settings?.defaultView ?? 'last30days'
  const range = convertRangeToDateRange(rangeString)

  return (<div className="space-y-8">
    <section className="flex justify-between items-center">
      <h1 className="text-4xl font-semibold">Summary</h1>
      <aside>
        <Range defaultView={settings?.defaultView} />
      </aside>
    </section>

    <section className="grid grid-cols-2 lg:grid-cols-4 gap-8">
      {types.map(type => <ErrorBoundary key={type} fallback={<div className="text-red-500">Cannot fetch {type} trend data</div>}>
        <Suspense fallback={<TrendFallback />}>
          <Trend type={type} range={range} />
        </Suspense>
      </ErrorBoundary>)}
    </section>

    <section className="flex justify-between items-center">
      <h2 className="text-2xl">Transactions</h2>
      <Link href="/dashboard/transaction/add" className={`flex items-center space-x-1 ${variants['outline']} ${sizes['sm']}`}>
        <PlusCircle className="w-4 h-4" />
        <div>Add</div>
      </Link>
    </section>

    <Suspense fallback={<TransactionListFallback />}>
      <TransactionListWrapper range={range} />
    </Suspense>
  </div>)
}