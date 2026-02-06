import { useState, useEffect } from 'react'
import { libraryApi, type Playbook } from '@/services/libraryApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Plus, Search, Loader2, Trash2, Book } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

export const PlaybooksView = () => {
  const [playbooks, setPlaybooks] = useState<Playbook[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchPlaybooks()
  }, [])

  const fetchPlaybooks = async () => {
    try {
      setLoading(true)
      const playbooksList = await libraryApi.getPlaybooks()
      setPlaybooks(playbooksList || [])
    } catch (error) {
      console.error('Failed to fetch playbooks:', error)
      toast({
        title: 'Error',
        description: 'Failed to load playbooks',
        variant: 'destructive',
      })
      setPlaybooks([])
    } finally {
      setLoading(false)
    }
  }

  const filteredPlaybooks = playbooks.filter(playbook =>
    searchQuery.trim() === '' ||
    playbook.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    playbook.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this playbook?')) return

    try {
      await libraryApi.deletePlaybook(id)
      setPlaybooks(prev => prev.filter(p => p.id !== id))
      toast({
        title: 'Success',
        description: 'Playbook deleted successfully',
      })
    } catch (error) {
      console.error('Failed to delete playbook:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete playbook',
        variant: 'destructive',
      })
    }
  }

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
          <h1 className="text-2xl font-semibold text-foreground">Playbooks</h1>
          <p className="text-muted-foreground">Manage your playbook library</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Playbook
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search playbooks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {filteredPlaybooks.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">
            {searchQuery ? 'No playbooks match your search' : 'No playbooks yet. Create your first playbook!'}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPlaybooks.map((playbook) => (
            <Card key={playbook.id} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Book className="h-5 w-5 text-primary" />
                  <h3 className="font-medium text-foreground">{playbook.name}</h3>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleDelete(playbook.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              {playbook.description && (
                <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                  {playbook.description}
                </p>
              )}
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                {playbook.jurisdiction && <span>{playbook.jurisdiction}</span>}
                {playbook.ruleCount !== null && playbook.ruleCount !== undefined && (
                  <span>{playbook.ruleCount} rules</span>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

