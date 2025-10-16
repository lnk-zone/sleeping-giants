import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowRight, Zap, Users, TrendingUp } from 'lucide-react'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check if user has connected Beehiiv
  const { data: tenant } = await supabase
    .from('tenants')
    .select('*, api_credentials(*)')
    .single()

  const hasBeehiivConnected = tenant?.api_credentials?.beehiiv_key_encrypted

  return (
    <DashboardLayout user={user}>
      <div className="space-y-8">
        {/* Welcome section */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Welcome to Envelope AI
          </h1>
          <p className="mt-2 text-slate-600">
            Transform your newsletter into a ChatGPT app and reach 800M+ users
          </p>
        </div>

        {/* Onboarding card */}
        {!hasBeehiivConnected && (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Get Started
              </CardTitle>
              <CardDescription>
                Connect your Beehiiv newsletter to create your ChatGPT app
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/dashboard/newsletter">
                <Button className="gap-2">
                  Connect Beehiiv
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Stats grid */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Impressions
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">
                Connect your newsletter to start tracking
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                New Subscribers
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">
                From ChatGPT this month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Metadata Score
              </CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
              <p className="text-xs text-muted-foreground">
                Run your first test
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common tasks to manage your ChatGPT app
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Link href="/dashboard/newsletter">
              <div className="flex items-center gap-4 rounded-lg border p-4 hover:bg-slate-50 transition-colors cursor-pointer">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Connect Newsletter</p>
                  <p className="text-sm text-muted-foreground">
                    Link your Beehiiv account
                  </p>
                </div>
              </div>
            </Link>

            <Link href="/dashboard/metadata">
              <div className="flex items-center gap-4 rounded-lg border p-4 hover:bg-slate-50 transition-colors cursor-pointer">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                  <TrendingUp className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="font-medium">Optimize Metadata</p>
                  <p className="text-sm text-muted-foreground">
                    Improve discoverability
                  </p>
                </div>
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

