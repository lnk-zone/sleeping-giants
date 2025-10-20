'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Edit2, Trash2, Loader2 } from 'lucide-react'
import { UseCaseDialog } from './use-case-dialog'

interface UseCase {
  id: string
  priority: 'P0' | 'P1' | 'P2'
  title: string
  persona?: string
  context?: string
  success_criteria?: string
  status: 'active' | 'planned' | 'archived'
  tools_required?: string[]
}

export function UseCasesTab() {
  const [useCases, setUseCases] = useState<UseCase[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingUseCase, setEditingUseCase] = useState<UseCase | null>(null)

  useEffect(() => {
    loadUseCases()
  }, [])

  const loadUseCases = async () => {
    setLoading(true)
    try {
      // TODO: Implement API call
      // const response = await fetch('/api/use-cases')
      // const data = await response.json()
      // setUseCases(data)
      setUseCases([]) // Placeholder
    } catch (error) {
      console.error('Failed to load use cases:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingUseCase(null)
    setDialogOpen(true)
  }

  const handleEdit = (useCase: UseCase) => {
    setEditingUseCase(useCase)
    setDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this use case?')) return
    
    try {
      // TODO: Implement API call
      // await fetch(`/api/use-cases/${id}`, { method: 'DELETE' })
      await loadUseCases()
    } catch (error) {
      console.error('Failed to delete use case:', error)
    }
  }

  const handleSave = async () => {
    await loadUseCases()
    setDialogOpen(false)
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'P0': return 'bg-red-100 text-red-800'
      case 'P1': return 'bg-amber-100 text-amber-800'
      case 'P2': return 'bg-blue-100 text-blue-800'
      default: return 'bg-slate-100 text-slate-800'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'planned': return 'bg-blue-100 text-blue-800'
      case 'archived': return 'bg-slate-100 text-slate-800'
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
          <h3 className="text-lg font-semibold text-slate-900">Use Cases</h3>
          <p className="text-sm text-slate-600">
            Define scenarios where users will interact with your ChatGPT app
          </p>
        </div>
        <Button onClick={handleCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Use Case
        </Button>
      </div>

      {/* Empty state */}
      {useCases.length === 0 && (
        <Card className="border-2 border-dashed border-slate-300">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 mb-4">
              <Plus className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No use cases yet</h3>
            <p className="text-sm text-slate-600 text-center mb-6 max-w-md">
              Start by defining the key scenarios where users will interact with your ChatGPT app.
              Use cases help guide your metadata optimization.
            </p>
            <Button onClick={handleCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Your First Use Case
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Use cases list */}
      {useCases.length > 0 && (
        <div className="grid gap-4">
          {useCases.map((useCase) => (
            <Card key={useCase.id} className="border-slate-200 hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${getPriorityColor(useCase.priority)}`}>
                        {useCase.priority}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(useCase.status)}`}>
                        {useCase.status}
                      </span>
                    </div>
                    <CardTitle className="text-xl">{useCase.title}</CardTitle>
                    {useCase.persona && (
                      <CardDescription className="mt-2">
                        <strong>Persona:</strong> {useCase.persona}
                      </CardDescription>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(useCase)}
                      className="gap-2"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(useCase.id)}
                      className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {(useCase.context || useCase.success_criteria || useCase.tools_required) && (
                <CardContent className="space-y-3">
                  {useCase.context && (
                    <div>
                      <p className="text-sm font-medium text-slate-700 mb-1">Context</p>
                      <p className="text-sm text-slate-600">{useCase.context}</p>
                    </div>
                  )}
                  {useCase.success_criteria && (
                    <div>
                      <p className="text-sm font-medium text-slate-700 mb-1">Success Criteria</p>
                      <p className="text-sm text-slate-600">{useCase.success_criteria}</p>
                    </div>
                  )}
                  {useCase.tools_required && useCase.tools_required.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-slate-700 mb-1">Tools Required</p>
                      <div className="flex flex-wrap gap-2">
                        {useCase.tools_required.map((tool, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded"
                          >
                            {tool}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Dialog */}
      <UseCaseDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        useCase={editingUseCase}
        onSave={handleSave}
      />
    </div>
  )
}

