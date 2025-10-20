'use client'

import { useState } from 'react'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TestTube, Sparkles } from 'lucide-react'
import { UseCasesTab } from '@/components/metadata/use-cases-tab'
import { GoldenPromptsTab } from '@/components/metadata/golden-prompts-tab'

export default function MetadataPage() {
  const [activeTab, setActiveTab] = useState<'use-cases' | 'golden-prompts'>('use-cases')
  const [user, setUser] = useState<any>(null)

  return (
    <DashboardLayout user={user || {}}>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Metadata Optimization</h1>
          <p className="mt-2 text-slate-600">
            Define use cases and test prompts to optimize your ChatGPT app's discoverability
          </p>
        </div>

        {/* Tabs */}
        <Card className="border-slate-200">
          <div className="border-b border-slate-200">
            <nav className="flex gap-4 px-6">
              <button
                onClick={() => setActiveTab('use-cases')}
                className={`flex items-center gap-2 px-4 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'use-cases'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                <TestTube className="h-4 w-4" />
                Use Cases
              </button>
              <button
                onClick={() => setActiveTab('golden-prompts')}
                className={`flex items-center gap-2 px-4 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'golden-prompts'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                <Sparkles className="h-4 w-4" />
                Golden Prompts
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'use-cases' && <UseCasesTab />}
            {activeTab === 'golden-prompts' && <GoldenPromptsTab />}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  )
}

