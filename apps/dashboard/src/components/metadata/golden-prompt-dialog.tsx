'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, X } from 'lucide-react'

interface GoldenPrompt {
  id: string
  priority: 'P0' | 'P1' | 'P2'
  prompt_text: string
  use_case_id?: string
  expected_outcome?: string
  tags?: string[]
}

interface GoldenPromptDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  prompt: GoldenPrompt | null
  onSave: () => void
}

export function GoldenPromptDialog({ open, onOpenChange, prompt, onSave }: GoldenPromptDialogProps) {
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    priority: 'P1' as 'P0' | 'P1' | 'P2',
    prompt_text: '',
    expected_outcome: '',
    tags: [] as string[],
  })
  const [tagInput, setTagInput] = useState('')

  useEffect(() => {
    if (prompt) {
      setFormData({
        priority: prompt.priority,
        prompt_text: prompt.prompt_text,
        expected_outcome: prompt.expected_outcome || '',
        tags: prompt.tags || [],
      })
    } else {
      setFormData({
        priority: 'P1',
        prompt_text: '',
        expected_outcome: '',
        tags: [],
      })
    }
  }, [prompt, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      // TODO: Implement API call
      // const url = prompt ? `/api/golden-prompts/${prompt.id}` : '/api/golden-prompts'
      // const method = prompt ? 'PUT' : 'POST'
      // await fetch(url, { method, body: JSON.stringify(formData) })
      
      onSave()
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to save golden prompt:', error)
    } finally {
      setSaving(false)
    }
  }

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tagInput.trim()],
      })
      setTagInput('')
    }
  }

  const removeTag = (index: number) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((_, i) => i !== index),
    })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-2xl font-bold text-slate-900">
            {prompt ? 'Edit Golden Prompt' : 'Create Golden Prompt'}
          </h2>
          <button
            onClick={() => onOpenChange(false)}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5 text-slate-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Priority */}
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

          {/* Prompt Text */}
          <div className="space-y-2">
            <Label htmlFor="prompt_text">Prompt Text</Label>
            <textarea
              id="prompt_text"
              value={formData.prompt_text}
              onChange={(e) => setFormData({ ...formData, prompt_text: e.target.value })}
              placeholder="e.g., Find articles about artificial intelligence"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary min-h-[100px] font-mono text-sm"
              required
            />
            <p className="text-xs text-slate-500">
              Enter the exact query a user might type when interacting with your ChatGPT app
            </p>
          </div>

          {/* Expected Outcome */}
          <div className="space-y-2">
            <Label htmlFor="expected_outcome">Expected Outcome (Optional)</Label>
            <textarea
              id="expected_outcome"
              value={formData.expected_outcome}
              onChange={(e) => setFormData({ ...formData, expected_outcome: e.target.value })}
              placeholder="Describe what should happen when this prompt is used"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary min-h-[100px]"
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags (Optional)</Label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="e.g., ai, technology"
              />
              <Button type="button" onClick={addTag} variant="outline">
                Add
              </Button>
            </div>
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-slate-100 text-slate-700 rounded-full"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(index)}
                      className="hover:text-slate-900"
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
                prompt ? 'Update Prompt' : 'Create Prompt'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

