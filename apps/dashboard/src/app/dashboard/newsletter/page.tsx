'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { Loader2, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react'

export default function NewsletterPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [beehiivApiKey, setBeehiivApiKey] = useState('')
  const [publicationId, setPublicationId] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadUser = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      // Check if already connected
      const { data: credentials } = await supabase
        .from('api_credentials')
        .select('*')
        .single()

      if (credentials?.beehiiv_key_encrypted) {
        setIsConnected(true)
        // Don't show the actual encrypted key
        setBeehiivApiKey('••••••••••••••••')
      }

      setLoading(false)
    }

    loadUser()
  }, [])

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaving(true)
    setSyncStatus('idle')

    try {
      const supabase = createClient()

      // Get or create tenant
      let { data: tenant } = await supabase
        .from('tenants')
        .select('*')
        .single()

      if (!tenant) {
        const { data: newTenant, error: tenantError } = await supabase
          .from('tenants')
          .insert({
            slug: user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '-'),
            name: user.email.split('@')[0],
            status: 'active',
            plan: 'starter',
          })
          .select()
          .single()

        if (tenantError) throw tenantError
        tenant = newTenant
      }

      // Store API credentials (in production, this would be encrypted server-side)
      const { error: credError } = await supabase
        .from('api_credentials')
        .upsert({
          tenant_id: tenant.id,
          // Note: In production, encryption should happen server-side
          beehiiv_key_encrypted: beehiivApiKey,
          created_by: user.id,
        })

      if (credError) throw credError

      // Create or update newsletter record
      const { error: newsletterError } = await supabase
        .from('newsletters')
        .upsert({
          tenant_id: tenant.id,
          external_id: publicationId,
          provider: 'beehiiv',
          name: 'My Newsletter', // Will be updated after sync
          visibility: 'public',
        })

      if (newsletterError) throw newsletterError

      setIsConnected(true)
      
      // Trigger sync
      await triggerSync(tenant.id)

    } catch (err: any) {
      setError(err.message || 'Failed to connect newsletter')
      setSyncStatus('error')
    } finally {
      setSaving(false)
    }
  }

  const triggerSync = async (tenantId: string) => {
    setSyncStatus('syncing')
    
    try {
      // Call MCP service to trigger sync
      const response = await fetch(`${process.env.NEXT_PUBLIC_MCP_API_URL}/sync/trigger`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tenantId }),
      })

      if (!response.ok) throw new Error('Sync failed')

      setSyncStatus('success')
    } catch (err) {
      setSyncStatus('error')
      setError('Sync failed. Please try again.')
    }
  }

  if (loading) {
    return (
      <DashboardLayout user={user || {}}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout user={user || {}}>
      <div className="max-w-3xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Newsletter Connection</h1>
          <p className="mt-2 text-slate-600">
            Connect your Beehiiv newsletter to start creating your ChatGPT app
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Beehiiv Integration</CardTitle>
            <CardDescription>
              Enter your Beehiiv API credentials to sync your newsletter content
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleConnect} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="apiKey">Beehiiv API Key</Label>
                <Input
                  id="apiKey"
                  type="password"
                  placeholder="Enter your Beehiiv API key"
                  value={beehiivApiKey}
                  onChange={(e) => setBeehiivApiKey(e.target.value)}
                  required
                  disabled={saving || isConnected}
                />
                <p className="text-sm text-muted-foreground">
                  Find your API key in{' '}
                  <a
                    href="https://app.beehiiv.com/settings/integrations"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    Beehiiv Settings
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="publicationId">Publication ID</Label>
                <Input
                  id="publicationId"
                  type="text"
                  placeholder="pub_xxxxxxxx"
                  value={publicationId}
                  onChange={(e) => setPublicationId(e.target.value)}
                  required
                  disabled={saving || isConnected}
                />
                <p className="text-sm text-muted-foreground">
                  Your publication ID from Beehiiv dashboard
                </p>
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}

              {syncStatus === 'syncing' && (
                <div className="flex items-center gap-2 rounded-md bg-blue-50 p-3 text-sm text-blue-700">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Syncing your newsletter content...
                </div>
              )}

              {syncStatus === 'success' && (
                <div className="flex items-center gap-2 rounded-md bg-green-50 p-3 text-sm text-green-700">
                  <CheckCircle2 className="h-4 w-4" />
                  Newsletter connected and synced successfully!
                </div>
              )}

              <Button
                type="submit"
                disabled={saving || isConnected}
                className="w-full sm:w-auto"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : isConnected ? (
                  'Connected'
                ) : (
                  'Connect Newsletter'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {isConnected && (
          <Card>
            <CardHeader>
              <CardTitle>Sync Status</CardTitle>
              <CardDescription>
                Your newsletter content is automatically synced every 30 minutes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium">Active</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => triggerSync(user.id)}
                  disabled={syncStatus === 'syncing'}
                >
                  {syncStatus === 'syncing' ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    'Sync Now'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}

