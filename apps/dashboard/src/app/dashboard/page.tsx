import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-white">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <h1 className="text-xl font-bold text-primary">Envelope AI</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user.email}</span>
          </div>
        </div>
      </header>
      <main className="flex-1 bg-slate-50 p-8">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold">Welcome to Envelope AI</h2>
          <p className="mt-2 text-muted-foreground">
            Your dashboard is being built. Check back soon!
          </p>
        </div>
      </main>
    </div>
  )
}

