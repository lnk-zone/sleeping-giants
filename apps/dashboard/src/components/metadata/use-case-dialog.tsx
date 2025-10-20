'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, X } from 'lucide-react'

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

interface UseCaseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  useCase: UseCase | null
  onSave: () => void
}

export function UseCaseDialog({ open, onOpenChange, useCase, onSave }: UseCaseDialogProps) {
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    priority: 'P1' as 'P0' | 'P1' | 'P2',
    title: '',
    persona: '',
    context: '',
    success_criteria: '',
    status: 'active' as 'active' | 'planned' | 'archived',
    tools_required: [] as string[],
  })
  const [toolInput, setToolInput] = useState('')

  useEffect(() => {
    if (useCase) {
      setFormData({
        priority: useCase.priority,
        title: useCase.title,
        persona: useCase.persona || '',
        context: useCase.context || '',
        success_criteria: useCase.success_criteria || '',
        status: useCase.status,
        tools_required: useCase.tools_required || [],
      })
    } else {
      setFormData({
        priority: 'P1',
        title: '',
        persona: '',
        context: '',
        success_criteria: '',
        status: 'active',
        tools_required: [],
      })
    }
  }, [useCase, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      // TODO: Implement API call
      // const url = useCase ? `/api/use-cases/${useCase.id}` : '/api/use-cases'
      // const method = useCase ? 'PUT' : 'POST'
      // await fetch(url, { method, body: JSON.stringify(formData) })
      
      onSave()
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to save use case:', error)
    } finally {
      setSaving(false)
    }
  }

  const addTool = () => {
    if (toolInput.trim()) {
      setFormData({
        ...formData,
        tools_required: [...formData.tools_required, toolInput.trim()],
      })
      setToolInput('')
    }
  }

  const removeTool = (index: number) => {
    setFormData({
      ...formData,
      tools_required: formData.tools_required.filter((_, i) => i !== index),
    })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-2xl font-bold text-slate-900">
            {useCase ? 'Edit Use Case' : 'Create Use Case'}
          </h2>
          <button
            onClick={() => onOpenChange(false)}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5 text-slate-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Priority & Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <select
                id="priority"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                required
              >
                <option value="P0">P0 - Critical</option>
                <option value="P1">P1 - High</option>
                <option value="P2">P2 - Medium</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                required
              >
                <option value="active">Active</option>
                <option value="planned">Planned</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Content Discovery"
              required
            />
          </div>

          {/* Persona */}
          <div className="space-y-2">
            <Label htmlFor="persona">Persona (Optional)</Label>
            <Input
              id="persona"
              value={formData.persona}
              onChange={(e) => setFormData({ ...formData, persona: e.target.value })}
              placeholder="e.g., Newsletter reader looking for specific topic"
            />
          </div>

          {/* Context */}
          <div className="space-y-2">
            <Label htmlFor="context">Context (Optional)</Label>
            <textarea
              id="context"
              value={formData.context}
              onChange={(e) => setFormData({ ...formData, context: e.target.value })}
              placeholder="Describe the scenario where this use case applies"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary min-h-[100px]"
            />
          </div>

          {/* Success Criteria */}
          <div className="space-y-2">
            <Label htmlFor="success_criteria">Success Criteria (Optional)</Label>
            <textarea
              id="success_criteria"
              value={formData.success_criteria}
              onChange={(e) => setFormData({ ...formData, success_criteria: e.target.value })}
              placeholder="What defines success for this use case?"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary min-h-[100px]"
            />
          </div>

          {/* Tools Required */}
          <div className="space-y-2">
            <Label>Tools Required (Optional)</Label>
            <div className="flex gap-2">
              <Input
                value={toolInput}
                onChange={(e) => setToolInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTool())}
                placeholder="e.g., search_articles"
              />
              <Button type="button" onClick={addTool} variant="outline">
                Add
              </Button>
            </div>
            {formData.tools_required.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.tools_required.map((tool, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-purple-100 text-purple-800 rounded-full"
                  >
                    {tool}
                    <button
                      type="button"
                      onClick={() => removeTool(index)}
                      className="hover:text-purple-900"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="flex-1">
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                useCase ? 'Update Use Case' : 'Create Use Case'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

