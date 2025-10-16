import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowRight, Zap, Users, TrendingUp, Sparkles } from 'lucide-react'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check if tenant exists, create if not
  let { data: tenant } = await supabase
    .from('tenants')
    .select('*, api_credentials(*)')
    .eq('created_by', user.id)
    .single()

  if (!tenant) {
    // Create tenant for new user
    const { data: newTenant } = await supabase
      .from('tenants')
      .insert({
        slug: user.email!.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '-'),
        name: user.email!.split('@')[0],
        status: 'active',
        plan: 'starter',
        created_by: user.id,
      })
      .select('*, api_credentials(*)')
      .single()
    
    tenant = newTenant
  }

  const hasBeehiivConnected = tenant?.api_credentials?.beehiiv_key_encrypted

  return (
    <DashboardLayout user={user}>
      <div className="space-y-8">
        {/* Welcome section */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Welcome to Envelope AI
          </h1>
          <p className="text-lg text-slate-600">
            Transform your newsletter into a ChatGPT app and reach 800M+ users
          </p>
        </div>

        {/* Onboarding card */}
        {!hasBeehiivConnected && (
          <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-white to-accent/5 shadow-lg">
            <CardHeader className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-dark shadow-lg">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-2xl">Get Started</CardTitle>
                  <CardDescription className="text-base">
                    Connect your Beehiiv newsletter to create your ChatGPT app
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Link href="/dashboard/newsletter">
                <Button size="lg" className="gap-2 shadow-lg hover:shadow-xl transition-all">
                  <Zap className="h-5 w-5" />
                  Connect Beehiiv
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Stats grid */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="border-slate-200 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">
                Total Impressions
              </CardTitle>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-3xl font-bold text-slate-900">0</div>
              <p className="text-sm text-slate-500">
                Connect your newsletter to start tracking
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">
                New Subscribers
              </CardTitle>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-3xl font-bold text-slate-900">0</div>
              <p className="text-sm text-slate-500">
                From ChatGPT this month
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">
                Metadata Score
              </CardTitle>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50">
                <Zap className="h-5 w-5 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-3xl font-bold text-slate-900">—</div>
              <p className="text-sm text-slate-500">
                Run your first test
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick actions */}
        <Card className="border-slate-200 shadow-md">
          <CardHeader>
            <CardTitle className="text-xl">Quick Actions</CardTitle>
            <CardDescription className="text-base">
              Common tasks to manage your ChatGPT app
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Link href="/dashboard/newsletter" className="group">
              <div className="flex items-center gap-4 rounded-xl border-2 border-slate-200 bg-white p-5 hover:border-primary hover:bg-primary/5 transition-all cursor-pointer shadow-sm hover:shadow-md">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-dark shadow-md group-hover:shadow-lg transition-shadow">
                  <Zap className="h-7 w-7 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-900 text-lg">Connect Newsletter</p>
                  <p className="text-sm text-slate-600">
                    Link your Beehiiv account
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-primary transition-colors" />
              </div>
            </Link>

            <Link href="/dashboard/metadata" className="group">
              <div className="flex items-center gap-4 rounded-xl border-2 border-slate-200 bg-white p-5 hover:border-accent hover:bg-accent/5 transition-all cursor-pointer shadow-sm hover:shadow-md">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent-dark shadow-md group-hover:shadow-lg transition-shadow">
                  <TrendingUp className="h-7 w-7 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-900 text-lg">Optimize Metadata</p>
                  <p className="text-sm text-slate-600">
                    Improve discoverability
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-accent transition-colors" />
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

