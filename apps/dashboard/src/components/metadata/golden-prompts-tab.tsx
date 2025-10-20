'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Edit2, Trash2, Loader2, Upload, Download } from 'lucide-react'
import { GoldenPromptDialog } from './golden-prompt-dialog'

interface GoldenPrompt {
  id: string
  priority: 'P0' | 'P1' | 'P2'
  prompt_text: string
  use_case_id?: string
  expected_outcome?: string
  tags?: string[]
}

export function GoldenPromptsTab() {
  const [prompts, setPrompts] = useState<GoldenPrompt[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingPrompt, setEditingPrompt] = useState<GoldenPrompt | null>(null)
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadPrompts()
  }, [])

  const loadPrompts = async () => {
    setLoading(true)
    try {
      // TODO: Implement API call
      // const response = await fetch('/api/golden-prompts')
      // const data = await response.json()
      // setPrompts(data)
      setPrompts([]) // Placeholder
    } catch (error) {
      console.error('Failed to load golden prompts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingPrompt(null)
    setDialogOpen(true)
  }

  const handleEdit = (prompt: GoldenPrompt) => {
    setEditingPrompt(prompt)
    setDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this prompt?')) return
    
    try {
      // TODO: Implement API call
      // await fetch(`/api/golden-prompts/${id}`, { method: 'DELETE' })
      await loadPrompts()
    } catch (error) {
      console.error('Failed to delete prompt:', error)
    }
  }

  const handleSave = async () => {
    await loadPrompts()
    setDialogOpen(false)
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImporting(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      // TODO: Implement API call
      // await fetch('/api/golden-prompts/import-csv', {
      //   method: 'POST',
      //   body: formData,
      // })
      
      await loadPrompts()
    } catch (error) {
      console.error('Failed to import CSV:', error)
      alert('Failed to import CSV. Please check the file format.')
    } finally {
      setImporting(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleExportTemplate = () => {
    const csv = 'priority,prompt_text,use_case_id,expected_outcome,tags\nP1,"Find articles about AI",,,ai,technology\nP2,"Show me the latest newsletter",,,"Should return recent posts",newsletter,latest'
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'golden-prompts-template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'P0': return 'bg-red-100 text-red-800'
      case 'P1': return 'bg-amber-100 text-amber-800'
      case 'P2': return 'bg-blue-100 text-blue-800'
      default: return 'bg-slate-100 text-slate-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Golden Prompts</h3>
          <p className="text-sm text-slate-600">
            Test queries to validate your ChatGPT app's responses
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportTemplate} className="gap-2">
            <Download className="h-4 w-4" />
            Template
          </Button>
          <Button variant="outline" onClick={handleImportClick} disabled={importing} className="gap-2">
            {importing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Import CSV
              </>
            )}
          </Button>
          <Button onClick={handleCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Prompt
          </Button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Empty state */}
      {prompts.length === 0 && (
        <Card className="border-2 border-dashed border-slate-300">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 mb-4">
              <Plus className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No golden prompts yet</h3>
            <p className="text-sm text-slate-600 text-center mb-6 max-w-md">
              Create test queries to validate how your ChatGPT app responds to user inputs.
              You can add prompts manually or import from a CSV file.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleImportClick} className="gap-2">
                <Upload className="h-4 w-4" />
                Import CSV
              </Button>
              <Button onClick={handleCreate} className="gap-2">
                <Plus className="h-4 w-4" />
                Create Your First Prompt
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Prompts list */}
      {prompts.length > 0 && (
        <div className="grid gap-4">
          {prompts.map((prompt) => (
            <Card key={prompt.id} className="border-slate-200 hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${getPriorityColor(prompt.priority)}`}>
                        {prompt.priority}
                      </span>
                      {prompt.tags && prompt.tags.length > 0 && (
                        prompt.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 text-xs font-medium bg-slate-100 text-slate-700 rounded"
                          >
                            {tag}
                          </span>
                        ))
                      )}
                    </div>
                    <CardTitle className="text-lg font-mono">{prompt.prompt_text}</CardTitle>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(prompt)}
                      className="gap-2"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(prompt.id)}
                      className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {prompt.expected_outcome && (
                <CardContent>
                  <p className="text-sm font-medium text-slate-700 mb-1">Expected Outcome</p>
                  <p className="text-sm text-slate-600">{prompt.expected_outcome}</p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Dialog */}
      <GoldenPromptDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        prompt={editingPrompt}
        onSave={handleSave}
      />
    </div>
  )
}

