import { useState, useEffect } from 'react'
import { promptsApi, type Prompt, type CreatePromptRequest } from '@/services/promptsApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { 
  Plus, 
  Search, 
  Loader2, 
  Trash2, 
  Edit2, 
  Star, 
  MessageSquare,
  Copy,
  MoreHorizontal
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

const CATEGORY_LABELS: Record<Prompt['category'], string> = {
  draft: 'Draft',
  assist: 'Assist',
  review: 'Review',
  research: 'Research',
  custom: 'Custom',
}

const CATEGORY_COLORS: Record<Prompt['category'], string> = {
  draft: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  assist: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  review: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  research: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  custom: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
}

interface PromptDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  prompt?: Prompt | null
  onSave: (data: CreatePromptRequest) => Promise<void>
}

const PromptDialog = ({ open, onOpenChange, prompt, onSave }: PromptDialogProps) => {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState<Prompt['category']>('custom')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (prompt) {
      setName(prompt.name)
      setDescription(prompt.description || '')
      setContent(prompt.content)
      setCategory(prompt.category)
    } else {
      setName('')
      setDescription('')
      setContent('')
      setCategory('custom')
    }
  }, [prompt, open])

  const handleSave = async () => {
    if (!name.trim() || !content.trim()) {
      toast({
        title: 'Error',
        description: 'Name and content are required',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)
    try {
      await onSave({
        name: name.trim(),
        description: description.trim() || undefined,
        content: content.trim(),
        category,
      })
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to save prompt:', error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{prompt ? 'Edit Prompt' : 'Create New Prompt'}</DialogTitle>
          <DialogDescription>
            {prompt ? 'Update your saved prompt' : 'Save a new prompt to your library for quick access'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Contract Summary Request"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of what this prompt does"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={(value) => setCategory(value as Prompt['category'])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="assist">Assist</SelectItem>
                <SelectItem value="review">Review</SelectItem>
                <SelectItem value="research">Research</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="content">Prompt Content</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter your prompt text here..."
              className="min-h-[150px] font-mono text-sm"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {prompt ? 'Update' : 'Create'} Prompt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export const PromptsView = () => {
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null)

  useEffect(() => {
    fetchPrompts()
  }, [])

  const fetchPrompts = async () => {
    try {
      setLoading(true)
      const promptsList = await promptsApi.getPrompts()
      setPrompts(promptsList || [])
    } catch (error) {
      console.error('Failed to fetch prompts:', error)
      toast({
        title: 'Error',
        description: 'Failed to load prompts',
        variant: 'destructive',
      })
      setPrompts([])
    } finally {
      setLoading(false)
    }
  }

  const filteredPrompts = prompts.filter(prompt => {
    // Category filter
    if (categoryFilter !== 'all' && categoryFilter !== 'starred') {
      if (prompt.category !== categoryFilter) return false
    }
    if (categoryFilter === 'starred' && !prompt.isStarred) return false

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      return (
        prompt.name.toLowerCase().includes(query) ||
        prompt.description?.toLowerCase().includes(query) ||
        prompt.content.toLowerCase().includes(query)
      )
    }
    return true
  })

  // Separate starred and non-starred prompts
  const starredPrompts = filteredPrompts.filter(p => p.isStarred)
  const regularPrompts = filteredPrompts.filter(p => !p.isStarred)

  const handleCreate = () => {
    setEditingPrompt(null)
    setDialogOpen(true)
  }

  const handleEdit = (prompt: Prompt) => {
    setEditingPrompt(prompt)
    setDialogOpen(true)
  }

  const handleSave = async (data: CreatePromptRequest) => {
    try {
      if (editingPrompt) {
        await promptsApi.updatePrompt(editingPrompt.id, data)
        toast({
          title: 'Success',
          description: 'Prompt updated successfully',
        })
      } else {
        await promptsApi.createPrompt(data)
        toast({
          title: 'Success',
          description: 'Prompt created successfully',
        })
      }
      fetchPrompts()
    } catch (error) {
      console.error('Failed to save prompt:', error)
      toast({
        title: 'Error',
        description: 'Failed to save prompt',
        variant: 'destructive',
      })
      throw error
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this prompt?')) return

    try {
      await promptsApi.deletePrompt(id)
      setPrompts(prev => prev.filter(p => p.id !== id))
      toast({
        title: 'Success',
        description: 'Prompt deleted successfully',
      })
    } catch (error) {
      console.error('Failed to delete prompt:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete prompt',
        variant: 'destructive',
      })
    }
  }

  const handleToggleStar = async (id: string) => {
    try {
      const updated = await promptsApi.toggleStar(id)
      if (updated) {
        setPrompts(prev => prev.map(p => p.id === id ? updated : p))
      }
    } catch (error) {
      console.error('Failed to toggle star:', error)
      toast({
        title: 'Error',
        description: 'Failed to update prompt',
        variant: 'destructive',
      })
    }
  }

  const handleCopyPrompt = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content)
      toast({
        title: 'Copied',
        description: 'Prompt copied to clipboard',
      })
    } catch (error) {
      console.error('Failed to copy:', error)
      toast({
        title: 'Error',
        description: 'Failed to copy prompt',
        variant: 'destructive',
      })
    }
  }

  const handleUsePrompt = async (prompt: Prompt) => {
    await promptsApi.incrementUseCount(prompt.id)
    await navigator.clipboard.writeText(prompt.content)
    toast({
      title: 'Prompt copied!',
      description: 'Paste it in the chat to use it',
    })
  }

  const PromptCard = ({ prompt }: { prompt: Prompt }) => (
    <div className="flex items-center justify-between py-3 px-4 hover:bg-muted/50 rounded-lg transition-colors group">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <button
          onClick={() => handleToggleStar(prompt.id)}
          className={cn(
            "shrink-0 transition-colors",
            prompt.isStarred ? "text-amber-500" : "text-muted-foreground hover:text-amber-500"
          )}
        >
          <Star className={cn("h-4 w-4", prompt.isStarred && "fill-current")} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground truncate">{prompt.name}</span>
            <Badge variant="outline" className={cn("shrink-0 text-xs", CATEGORY_COLORS[prompt.category])}>
              {CATEGORY_LABELS[prompt.category]}
            </Badge>
          </div>
          {prompt.description && (
            <p className="text-sm text-muted-foreground truncate">{prompt.description}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="sm" onClick={() => handleUsePrompt(prompt)}>
          Use
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleCopyPrompt(prompt.content)}>
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleEdit(prompt)}>
              <Edit2 className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => handleDelete(prompt.id)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Prompts</h1>
          <p className="text-muted-foreground">Save and manage your frequently used prompts</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          New Prompt
        </Button>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4 border-2">
          <div className="flex items-start gap-3">
            <MessageSquare className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <h3 className="font-medium text-foreground">Prompts</h3>
              <p className="text-sm text-muted-foreground">
                A prompt is a question or instruction you ask the assistant. Save prompts here to quickly reuse them.
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search prompts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="starred">Starred</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="assist">Assist</SelectItem>
            <SelectItem value="review">Review</SelectItem>
            <SelectItem value="research">Research</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Prompts List */}
      {filteredPrompts.length === 0 ? (
        <Card className="p-12 text-center">
          <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">
            {searchQuery || categoryFilter !== 'all' 
              ? 'No prompts match your filters' 
              : 'No prompts yet. Create your first prompt!'}
          </p>
          {!searchQuery && categoryFilter === 'all' && (
            <Button className="mt-4" onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Create Prompt
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Starred Prompts */}
          {starredPrompts.length > 0 && categoryFilter !== 'starred' && (
            <div>
              <h2 className="text-sm font-medium text-muted-foreground mb-2">Starred prompts</h2>
              <Card className="divide-y">
                {starredPrompts.map((prompt) => (
                  <PromptCard key={prompt.id} prompt={prompt} />
                ))}
              </Card>
            </div>
          )}

          {/* All/Filtered Prompts */}
          {regularPrompts.length > 0 && categoryFilter !== 'starred' && (
            <div>
              {starredPrompts.length > 0 && (
                <h2 className="text-sm font-medium text-muted-foreground mb-2">All prompts</h2>
              )}
              <Card className="divide-y">
                {regularPrompts.map((prompt) => (
                  <PromptCard key={prompt.id} prompt={prompt} />
                ))}
              </Card>
            </div>
          )}

          {/* When filtering by starred only */}
          {categoryFilter === 'starred' && starredPrompts.length > 0 && (
            <Card className="divide-y">
              {starredPrompts.map((prompt) => (
                <PromptCard key={prompt.id} prompt={prompt} />
              ))}
            </Card>
          )}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <PromptDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        prompt={editingPrompt}
        onSave={handleSave}
      />
    </div>
  )
}


