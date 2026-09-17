import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { error } = await supabase.auth.getUser()

  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">Written</h1>
      <p className="text-gray-600">
        Supabase client initialized. Auth check error: {error ? error.message : 'none'}
      </p>
    </main>
  )
}
