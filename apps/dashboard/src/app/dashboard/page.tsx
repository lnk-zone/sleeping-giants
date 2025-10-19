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
          <h1 className="text-4xl font-bold text-slate-900">
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
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary shadow-lg">
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
              <Card className="border-2 border-slate-200 hover:border-primary hover:shadow-md transition-all cursor-pointer">
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <Zap className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900 group-hover:text-primary transition-colors">
                      Connect Newsletter
                    </h3>
                    <p className="text-sm text-slate-500">
                      Link your Beehiiv account
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </CardContent>
              </Card>
            </Link>

            <Link href="/dashboard/metadata" className="group">
              <Card className="border-2 border-slate-200 hover:border-accent hover:shadow-md transition-all cursor-pointer">
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
                    <Sparkles className="h-6 w-6 text-accent" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900 group-hover:text-accent transition-colors">
                      Optimize Metadata
                    </h3>
                    <p className="text-sm text-slate-500">
                      Improve discoverability
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-accent group-hover:translate-x-1 transition-all" />
                </CardContent>
              </Card>
            </Link>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

