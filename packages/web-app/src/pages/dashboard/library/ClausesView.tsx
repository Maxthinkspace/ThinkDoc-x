import { useState, useEffect } from 'react'
import { libraryApi, type Clause } from '@/services/libraryApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Plus, Search, Loader2, Trash2, Edit2, Eye } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from '@/hooks/use-toast'

export const ClausesView = () => {
  const navigate = useNavigate()
  const [clauses, setClauses] = useState<Clause[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchClauses()
  }, [])

  const fetchClauses = async () => {
    try {
      setLoading(true)
      const clausesList = await libraryApi.getClauses()
      setClauses(clausesList || [])
    } catch (error) {
      console.error('Failed to fetch clauses:', error)
      toast({
        title: 'Error',
        description: 'Failed to load clauses',
        variant: 'destructive',
      })
      setClauses([])
    } finally {
      setLoading(false)
    }
  }

  const filteredClauses = clauses.filter(clause =>
    searchQuery.trim() === '' ||
    clause.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    clause.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this clause?')) return

    try {
      await libraryApi.deleteClause(id)
      setClauses(prev => prev.filter(c => c.id !== id))
      toast({
        title: 'Success',
        description: 'Clause deleted successfully',
      })
    } catch (error) {
      console.error('Failed to delete clause:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete clause',
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
          <h1 className="text-2xl font-semibold text-foreground">Clauses</h1>
          <p className="text-muted-foreground">Manage your clause library</p>
        </div>
        <Button onClick={() => navigate('/library/clauses/create')}>
          <Plus className="h-4 w-4 mr-2" />
          New Clause
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search clauses..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {filteredClauses.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">
            {searchQuery ? 'No clauses match your search' : 'No clauses yet. Create your first clause!'}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClauses.map((clause) => (
            <Card key={clause.id} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-medium text-foreground">{clause.name}</h3>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleDelete(clause.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
              {clause.description && (
                <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                  {clause.description}
                </p>
              )}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {clause.jurisdiction && <span>{clause.jurisdiction}</span>}
                {clause.clauseType && <span>• {clause.clauseType}</span>}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

