import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { libraryApi, type Playbook as LibraryPlaybook } from '../../../../services/libraryApi'
import { backendApi, type Playbook } from '../../../../services/api'
import { authService } from '../../../../services/auth'
import { Loader2 } from 'lucide-react'
import { useNavigation } from '../../../hooks/use-navigation'
import { useToast } from '../../../hooks/use-toast'
import { MergeRegular } from '@fluentui/react-icons'
import { Button } from '@fluentui/react-components'

// Import from new playbook components location
import PlaybookCard from '../components/playbooks/PlaybookCard'
import PlaybookFilter, { FilterValues } from '../components/playbooks/PlaybookFilter'
import { DeletePlaybookDialog } from '../components/playbooks/DeletePlaybookDialog'
import { EditPlaybookDialog } from '../components/playbooks/EditPlaybookDialog'
import '../styles/PlaybookCard.css'
import '../styles/PlaybookFilter.css'

interface PlaybooksTabProps {
  selectionMode?: boolean
  selectedIds?: Set<string>
  onSelectionChange?: (id: string, selected: boolean) => void
  onPlaybooksLoaded?: (playbooks: Playbook[]) => void
  onCancelSelection?: () => void
  onCombineClick?: () => void
}

export const PlaybooksTab: React.FC<PlaybooksTabProps> = ({
  selectionMode = false,
  selectedIds = new Set(),
  onSelectionChange,
  onPlaybooksLoaded,
  onCancelSelection,
  onCombineClick,
}) => {
  const { navigateTo } = useNavigation()
  const { toast } = useToast()

  // Data state
  const [allPlaybooks, setAllPlaybooks] = useState<Playbook[]>([])
  const [playbooks, setPlaybooks] = useState<Playbook[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Pagination state
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)

  // Filter state
  const [filters, setFilters] = useState<FilterValues>({
    searchText: '',
    type: 'All Types',
    jurisdiction: 'All Jurisdictions',
    selectedTags: [],
  })

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [playbookToDelete, setPlaybookToDelete] = useState<Playbook | null>(null)

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [playbookToEdit, setPlaybookToEdit] = useState<Playbook | null>(null)

  // Convert LibraryPlaybook to Playbook format
  const convertLibraryPlaybookToPlaybook = (libPlaybook: LibraryPlaybook): Playbook => {
    return {
      id: libPlaybook.id,
      userId: libPlaybook.userId,
      playbookName: libPlaybook.name,
      description: libPlaybook.description || undefined,
      playbookType: libPlaybook.playbookType || undefined,
      userPosition: libPlaybook.userPosition || undefined,
      jurisdiction: libPlaybook.jurisdiction || undefined,
      tags: libPlaybook.tags?.map(t => t.name).join(',') || undefined,
      rules: libPlaybook.rules || [],
      metadata: libPlaybook.metadata,
      createdAt: libPlaybook.createdAt,
      updatedAt: libPlaybook.updatedAt,
    }
  }

  // Fetch playbooks - use backendApi as primary source (where playbooks are created)
  // Then merge with libraryApi for any synced playbooks
  const fetchPlaybooks = useCallback(async (pageNum: number = 1, reset: boolean = false) => {
    try {
      setLoading(true)
      setError(null)
      
      // Use backendApi as primary source (this is where playbooks are created)
      await authService.setupDevAuth()
      const response = await backendApi.getPlaybooks(pageNum, 50)
      const backendPlaybooks = response.data || []
      
      // Also try to fetch from libraryApi and merge (for web app synced playbooks)
      let mergedPlaybooks = [...backendPlaybooks]
      try {
        const limit = 50
        const offset = reset ? 0 : (pageNum - 1) * 10
        const libraryPlaybooks = await libraryApi.getPlaybooks({ limit, offset })
        const convertedLibraryPlaybooks = libraryPlaybooks.map(convertLibraryPlaybookToPlaybook)
        
        // Merge and dedupe by id (backend playbooks take priority)
        const existingIds = new Set(backendPlaybooks.map(p => p.id))
        const uniqueLibraryPlaybooks = convertedLibraryPlaybooks.filter(p => !existingIds.has(p.id))
        mergedPlaybooks = [...backendPlaybooks, ...uniqueLibraryPlaybooks]
      } catch (libErr) {
        // Library API failed, just use backend playbooks
        console.log('Library API unavailable, using backend playbooks only:', libErr)
      }

      if (reset) {
        setAllPlaybooks(mergedPlaybooks)
        setPlaybooks(mergedPlaybooks)
      } else {
        setAllPlaybooks((prev) => [...prev, ...mergedPlaybooks])
        setPlaybooks((prev) => [...prev, ...mergedPlaybooks])
      }

      // Simple pagination: has more if we got a full page
      setHasMore(response.pagination?.hasMore || false)
      setPage(pageNum)
      onPlaybooksLoaded?.(reset ? mergedPlaybooks : [...allPlaybooks, ...mergedPlaybooks])
    } catch (err) {
      console.error('Failed to fetch playbooks:', err)
      setError(err instanceof Error ? err.message : 'Failed to load playbooks')
      setPlaybooks([])
    } finally {
      setLoading(false)
    }
  }, [allPlaybooks, onPlaybooksLoaded])

  useEffect(() => {
    fetchPlaybooks(1, true)
  }, [])

  const handleLoadMore = () => {
    if (hasMore && !loading) {
      fetchPlaybooks(page + 1, false)
    }
  }

  // Filter logic
  const filterPlaybooks = useCallback((playbooksToFilter: Playbook[], filterValues: FilterValues): Playbook[] => {
    return playbooksToFilter.filter((playbook) => {
      // Search text filter
      if (filterValues.searchText.trim()) {
        const searchLower = filterValues.searchText.toLowerCase().trim()
        const nameMatch = playbook.playbookName?.toLowerCase().includes(searchLower) || false
        const descMatch = playbook.description?.toLowerCase().includes(searchLower) || false

        const playbookTags: string[] = playbook.tags
          ? typeof playbook.tags === 'string'
            ? playbook.tags.split(',').map((t: string) => t.trim().toLowerCase())
            : Array.isArray(playbook.tags)
            ? (playbook.tags as string[]).map((t: string) => t.toLowerCase())
            : []
          : []
        const tagsMatch = playbookTags.some((tag: string) => tag.includes(searchLower))

        if (!nameMatch && !descMatch && !tagsMatch) {
          return false
        }
      }

      // Type filter
      if (filterValues.type !== 'All Types') {
        const playbookType = playbook.playbookType?.toLowerCase() || ''
        if (filterValues.type === 'Contract Review' && !playbookType.includes('review')) {
          return false
        }
        if (filterValues.type === 'Contract Drafting') {
          const hasDraft = playbookType.includes('draft') || playbookType.includes('drafting')
          if (!hasDraft) return false
        }
      }

      // Jurisdiction filter
      if (filterValues.jurisdiction !== 'All Jurisdictions') {
        if (playbook.jurisdiction !== filterValues.jurisdiction) {
          return false
        }
      }

      // Tags filter
      if (filterValues.selectedTags.length > 0) {
        let playbookTags: string[] = []
        if (playbook.tags) {
          if (typeof playbook.tags === 'string') {
            playbookTags = playbook.tags.split(',').map((t: string) => t.trim().toLowerCase()).filter(Boolean)
          } else if (Array.isArray(playbook.tags)) {
            playbookTags = (playbook.tags as string[]).map((t: string) => t.trim().toLowerCase()).filter(Boolean)
          }
        }

        const hasMatchingTag = filterValues.selectedTags.some((selectedTag) => {
          const selectedLower = selectedTag.toLowerCase()
          return playbookTags.some((playbookTag: string) =>
            playbookTag.includes(selectedLower) || selectedLower.includes(playbookTag)
          )
        })

        if (!hasMatchingTag) return false
      }

      return true
    })
  }, [])

  // Apply filters when filters or allPlaybooks change
  useEffect(() => {
    const filtered = filterPlaybooks(allPlaybooks, filters)
    setPlaybooks(filtered)
  }, [filters, allPlaybooks, filterPlaybooks])

  // Extract unique tags for filter dropdown
  const availableTags = useMemo(() => {
    const tagSet = new Set<string>()
    allPlaybooks.forEach((playbook) => {
      if (playbook.tags) {
        const tags = typeof playbook.tags === 'string'
          ? playbook.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
          : Array.isArray(playbook.tags)
          ? playbook.tags
          : []
        tags.forEach((tag: string) => tagSet.add(tag))
      }
    })
    return Array.from(tagSet).sort()
  }, [allPlaybooks])

  const handleFilterChange = (newFilters: FilterValues) => {
    setFilters(newFilters)
  }

  // Handlers
  const handleUse = (id: string | number) => {
    const playbook = playbooks.find((p) => p.id === String(id))
    if (playbook) {
      localStorage.setItem('playbook', JSON.stringify(playbook))
      sessionStorage.removeItem('rulesConfigurationComplete')

      const conditionalRulesCategory = playbook.rules?.find(
        (r: any) => r.type === 'Conditional Rules for Contract Amendments'
      )
      const conditionalRules = conditionalRulesCategory?.rules || []

      if (conditionalRules.length > 0) {
        navigateTo('RulesConfiguration')
      } else {
        navigateTo('PlaybookRulesTabs')
      }
    }
  }

  const handleBrowse = (id: string | number) => {
    const playbook = playbooks.find((p) => p.id === String(id))
    if (playbook) {
      localStorage.setItem('playbook', JSON.stringify(playbook))
      localStorage.removeItem('generationContexts')
      localStorage.removeItem('rules')
      navigateTo('rules')
    }
  }

  const handleEdit = (id: string | number) => {
    const playbook = playbooks.find((p) => p.id === String(id))
    if (playbook) {
      setPlaybookToEdit(playbook)
      setEditDialogOpen(true)
    }
  }

  const handleDelete = (id: string | number) => {
    const playbook = playbooks.find((p) => p.id === String(id))
    if (playbook) {
      setPlaybookToDelete(playbook)
      setDeleteDialogOpen(true)
    }
  }

  const confirmDelete = async () => {
    if (!playbookToDelete) return
    try {
      // Try libraryApi first (synced with web app)
      try {
        await libraryApi.deletePlaybook(String(playbookToDelete.id))
      } catch (libErr) {
        // Fallback to backendApi
        await backendApi.deletePlaybook(String(playbookToDelete.id))
      }
      setAllPlaybooks((prev) => prev.filter((p) => p.id !== playbookToDelete.id))
      setPlaybooks((prev) => prev.filter((p) => p.id !== playbookToDelete.id))
      toast({ title: 'Playbook Deleted', description: 'Playbook has been deleted successfully' })
    } catch (err) {
      console.error('Failed to delete playbook:', err)
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to delete playbook' })
    } finally {
      setDeleteDialogOpen(false)
      setPlaybookToDelete(null)
    }
  }

  const handleEditSaved = (updatedPlaybook: Playbook) => {
    setAllPlaybooks((prev) => prev.map((p) => (p.id === updatedPlaybook.id ? updatedPlaybook : p)))
    setPlaybooks((prev) => prev.map((p) => (p.id === updatedPlaybook.id ? updatedPlaybook : p)))
  }

  const handleDuplicate = async (id: string | number) => {
    console.log('Duplicate playbook', id)
    // TODO: Implement when API available
  }

  // Loading state
  if (loading && playbooks.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px', gap: '10px' }}>
        <Loader2 style={{ width: '20px', height: '20px', animation: 'spin 1s linear infinite' }} />
        <span>Loading playbooks...</span>
      </div>
    )
  }

  return (
    <div style={{ padding: '12px', paddingBottom: selectionMode ? '100px' : '12px' }}>
      {/* Filter */}
      <PlaybookFilter onFilterChange={handleFilterChange} availableTags={availableTags} />

      {/* Error */}
      {error && (
        <div style={{ padding: '20px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#dc2626', marginBottom: '20px' }}>
          <p>Error: {error}</p>
          <button onClick={() => fetchPlaybooks(1, true)} style={{ marginTop: '10px', padding: '6px 12px', cursor: 'pointer' }}>
            Retry
          </button>
        </div>
      )}

      {/* Empty state */}
      {playbooks.length === 0 && !loading && !error && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#6b7280' }}>
          <p>No playbooks found. Create your first playbook to get started!</p>
        </div>
      )}

      {/* Playbook list */}
      <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
        {playbooks.map((playbook) => (
          <PlaybookCard
            key={playbook.id}
            playbook={{
              id: playbook.id,
              title: playbook.playbookName,
              updatedAt: playbook.updatedAt || '',
              type: playbook.playbookType || '',
              position: playbook.userPosition || '',
              jurisdiction: playbook.jurisdiction || '',
              description: playbook.description || '',
              tags: playbook.tags
                ? typeof playbook.tags === 'string'
                  ? playbook.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
                  : Array.isArray(playbook.tags)
                  ? playbook.tags
                  : []
                : [],
              rules: Array.isArray(playbook.rules) ? playbook.rules : [],
            }}
            onUse={handleUse}
            onBrowse={handleBrowse}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onDuplicate={handleDuplicate}
            selectionMode={selectionMode}
            isSelected={selectedIds.has(playbook.id)}
            onSelectionChange={(id, selected) => onSelectionChange?.(String(id), selected)}
          />
        ))}
      </div>

      {/* Load More */}
      {hasMore && !selectionMode && (
        <div style={{ textAlign: 'center', margin: '20px 0' }}>
          <button
            onClick={handleLoadMore}
            disabled={loading}
            style={{
              padding: '10px 20px',
              backgroundColor: '#3c98e8',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}

      {/* Selection Bar */}
      {selectionMode && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          backgroundColor: '#EBF5FF', padding: '8px 12px',
          display: 'flex', flexDirection: 'column', zIndex: 100,
          boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.08)',
          border: '1px solid #0F62FE', borderBottom: 'none',
        }}>
          <div style={{ textAlign: 'center', marginBottom: '8px', fontSize: '13px', color: '#0F62FE', fontWeight: 500 }}>
            {selectedIds.size} playbook{selectedIds.size !== 1 ? 's' : ''} selected
            {selectedIds.size < 2 && ' · Select at least 2 to combine'}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button appearance="secondary" onClick={onCancelSelection} style={{ flex: 1 }}>
              Cancel
            </Button>
            <Button
              className="brand-btn"
              appearance="primary"
              onClick={onCombineClick}
              disabled={selectedIds.size < 2}
              icon={<MergeRegular />}
              style={{
                flex: 1,
                background: selectedIds.size < 2 ? '#94a3b8' : 'var(--brand-gradient)',
                color: 'var(--text-on-brand)',
                border: 'none',
              }}
            >
              Combine
            </Button>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <DeletePlaybookDialog
        open={deleteDialogOpen}
        playbookName={playbookToDelete?.playbookName || ''}
        onConfirm={confirmDelete}
        onCancel={() => { setDeleteDialogOpen(false); setPlaybookToDelete(null) }}
      />

      <EditPlaybookDialog
        open={editDialogOpen}
        playbook={playbookToEdit}
        onClose={() => { setEditDialogOpen(false); setPlaybookToEdit(null) }}
        onSaved={handleEditSaved}
      />
    </div>
  )
}