import React, { useState, useEffect, useMemo } from 'react'
import { libraryApi, type Clause } from '../../../../services/libraryApi'
import { Loader2 } from 'lucide-react'
import ClauseFilter from '../../ClauseLibraryPage/components/ClauseFilter'
import ClauseCard from '../../ClauseLibraryPage/components/ClauseCard'
import { DeleteClauseDialog } from '../../ClauseLibraryPage/components/DeleteClauseDialog'
import { EditClauseDialog } from '../../ClauseLibraryPage/components/EditClauseDialog'
import { useToast } from '../../../hooks/use-toast'
import type { ClauseFilterValues } from '../../ClauseLibraryPage/components/ClauseFilter'

export const ClausesTab: React.FC = () => {
  const { toast } = useToast()
  const [clauses, setClauses] = useState<Clause[]>([])
  const [allClauses, setAllClauses] = useState<Clause[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<ClauseFilterValues>({
    searchText: '',
    category: 'All Categories',
    selectedTags: [],
  })

  // Dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [clauseToDelete, setClauseToDelete] = useState<Clause | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [clauseToEdit, setClauseToEdit] = useState<Clause | null>(null)

  useEffect(() => {
    fetchClauses()
  }, [])

  const fetchClauses = async () => {
    try {
      setLoading(true)
      setError(null)
      const clausesList = await libraryApi.getClauses()
      setAllClauses(clausesList || [])
      setClauses(clausesList || [])
    } catch (err) {
      console.error('Failed to fetch clauses:', err)
      setError(err instanceof Error ? err.message : 'Failed to load clauses')
      setAllClauses([])
      setClauses([])
    } finally {
      setLoading(false)
    }
  }

  const filterClauses = useMemo(() => {
    return (clausesToFilter: Clause[], filterValues: ClauseFilterValues): Clause[] => {
      return clausesToFilter.filter((clause) => {
        // Search text filter
        if (filterValues.searchText.trim()) {
          const searchLower = filterValues.searchText.toLowerCase().trim()
          const nameMatch = clause.name?.toLowerCase().includes(searchLower) || false
          const descMatch = clause.description?.toLowerCase().includes(searchLower) || false
          const clauseTags = (clause.tags || []).map((t: any) => t.name?.toLowerCase() || '')
          const tagsMatch = clauseTags.some((tag: string) => tag.includes(searchLower))
          
          if (!nameMatch && !descMatch && !tagsMatch) {
            return false
          }
        }

        // Category filter (using clauseType as category)
        if (filterValues.category !== 'All Categories') {
          if (clause.clauseType !== filterValues.category) {
            return false
          }
        }

        // Tags filter
        if (filterValues.selectedTags.length > 0) {
          const clauseTagNames = (clause.tags || []).map((t: any) => t.name?.toLowerCase() || '')
          const hasMatchingTag = filterValues.selectedTags.some((selectedTag) => {
            const selectedLower = selectedTag.toLowerCase()
            return clauseTagNames.some((clauseTag: string) => 
              clauseTag.includes(selectedLower) || selectedLower.includes(clauseTag)
            )
          })
          
          if (!hasMatchingTag) {
            return false
          }
        }

        return true
      })
    }
  }, [])

  useEffect(() => {
    const filtered = filterClauses(allClauses, filters)
    setClauses(filtered)
  }, [filters, allClauses, filterClauses])

  const availableTags = useMemo(() => {
    const tagSet = new Set<string>()
    allClauses.forEach((clause) => {
      if (clause.tags && Array.isArray(clause.tags)) {
        clause.tags.forEach((tag: any) => {
          if (tag.name) tagSet.add(tag.name)
        })
      }
    })
    return Array.from(tagSet).sort()
  }, [allClauses])

  const availableCategories = useMemo(() => {
    const categorySet = new Set<string>()
    allClauses.forEach((clause) => {
      if (clause.clauseType) {
        categorySet.add(clause.clauseType)
      }
    })
    return Array.from(categorySet).sort()
  }, [allClauses])

  const handleEdit = (id: string) => {
    const clause = clauses.find((c) => c.id === id)
    if (clause) {
      setClauseToEdit(clause)
      setEditDialogOpen(true)
    }
  }

  const handleDelete = (id: string) => {
    const clause = clauses.find((c) => c.id === id)
    if (clause) {
      setClauseToDelete(clause)
      setDeleteDialogOpen(true)
    }
  }

  const confirmDelete = async () => {
    if (!clauseToDelete) return

    try {
      await libraryApi.deleteClause(clauseToDelete.id)
      setAllClauses((prev) => prev.filter((c) => c.id !== clauseToDelete.id))
      setClauses((prev) => prev.filter((c) => c.id !== clauseToDelete.id))
      
      toast({
        title: 'Clause Deleted',
        description: 'Clause has been deleted successfully',
      })
    } catch (err) {
      console.error('Failed to delete clause:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete clause')
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to delete clause',
      })
    } finally {
      setDeleteDialogOpen(false)
      setClauseToDelete(null)
    }
  }

  const handleClauseUpdated = async (updatedClause: any) => {
    if (!clauseToEdit) return
    
    // Reload the clause from the API to get the latest data
    try {
      const refreshedClause = await libraryApi.getClause(clauseToEdit.id)
      setAllClauses((prev) =>
        prev.map((c) => (c.id === refreshedClause.id ? refreshedClause : c))
      )
      setClauses((prev) =>
        prev.map((c) => (c.id === refreshedClause.id ? refreshedClause : c))
      )
    } catch (error) {
      console.error('Failed to refresh clause:', error)
      // Fallback: update with what we have
      const libraryClause: Clause = {
        ...clauseToEdit,
        name: updatedClause.name,
        description: updatedClause.description || null,
        clauseType: updatedClause.category || null,
      }
      setAllClauses((prev) =>
        prev.map((c) => (c.id === libraryClause.id ? libraryClause : c))
      )
      setClauses((prev) =>
        prev.map((c) => (c.id === libraryClause.id ? libraryClause : c))
      )
    }
  }

  const handleDuplicate = async (id: string) => {
    const clause = clauses.find((c) => c.id === id)
    if (!clause) return

    try {
      // Get full clause with version text
      const fullClause = await libraryApi.getClause(id)
      const versions = await libraryApi.getClauseVersions(id)
      const latestVersion = versions[0] // Assuming sorted by version number desc

      const newClause = await libraryApi.createClause({
        name: `${clause.name} (Copy)`,
        text: latestVersion?.text || '',
        description: clause.description || undefined,
        clauseType: clause.clauseType || undefined,
        jurisdiction: clause.jurisdiction || undefined,
        tagIds: clause.tags?.map((t: any) => t.id) || [],
        labelIds: clause.labels?.map((l: any) => l.id) || [],
      })

      setAllClauses((prev) => [newClause, ...prev])
      setClauses((prev) => [newClause, ...prev])
      
      toast({
        title: 'Clause Duplicated',
        description: 'Clause has been duplicated successfully',
      })
    } catch (err) {
      console.error('Failed to duplicate clause:', err)
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to duplicate clause',
      })
    }
  }

  if (loading && clauses.length === 0) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '200px',
        gap: '10px',
      }}>
        <Loader2
          style={{ width: '20px', height: '20px', animation: 'spin 1s linear infinite' }}
        />
        <span>Loading clauses...</span>
      </div>
    )
  }

  return (
    <div>
      <ClauseFilter 
        onFilterChange={setFilters} 
        availableTags={availableTags}
        availableCategories={availableCategories}
      />

      {error && (
        <div style={{
          padding: '20px',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          color: '#dc2626',
          margin: '20px',
        }}>
          <p>Error: {error}</p>
        </div>
      )}

      {clauses.length === 0 && !loading && !error && (
        <div style={{
          textAlign: 'center',
          padding: '40px 20px',
          color: '#6b7280',
        }}>
          <p>No clauses found. Create your first clause to get started!</p>
        </div>
      )}

      <div
        style={{
          display: 'flex',
          gap: '10px',
          flexDirection: 'column',
          padding: '8px',
        }}
      >
        {clauses.map((clause) => (
          <ClauseCard
            key={clause.id}
            clause={{
              id: clause.id,
              name: clause.name,
              text: '', // Will be loaded when viewing
              category: clause.clauseType || undefined,
              tags: clause.tags?.map((t: any) => t.name) || [],
              description: clause.description || undefined,
              sourceDocument: clause.sourceDocumentName || undefined,
              createdAt: clause.createdAt,
              updatedAt: clause.updatedAt,
            }}
            onView={() => {}}
            onEdit={() => handleEdit(clause.id)}
            onDelete={() => handleDelete(clause.id)}
            onDuplicate={() => handleDuplicate(clause.id)}
          />
        ))}
      </div>

      <DeleteClauseDialog
        open={deleteDialogOpen}
        clauseName={clauseToDelete?.name || ''}
        onConfirm={confirmDelete}
        onCancel={() => {
          setDeleteDialogOpen(false)
          setClauseToDelete(null)
        }}
      />

      <EditClauseDialog
        open={editDialogOpen}
        clause={clauseToEdit ? {
          id: clauseToEdit.id,
          name: clauseToEdit.name,
          text: '', // Will be loaded from version
          category: clauseToEdit.clauseType || undefined,
          tags: clauseToEdit.tags?.map((t: any) => t.name) || [],
          description: clauseToEdit.description || undefined,
          sourceDocument: clauseToEdit.sourceDocumentName || undefined,
        } : null}
        onClose={() => {
          setEditDialogOpen(false)
          setClauseToEdit(null)
        }}
        onSaved={handleClauseUpdated}
      />
    </div>
  )
}

