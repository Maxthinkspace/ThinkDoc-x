import React, { useState, useEffect, useRef } from 'react'
import { libraryApi, type LibrarySearchResult } from '../../../services/libraryApi'
import { Search, X, Clock, FileText, Folder, Book } from 'lucide-react'
import './UnifiedSearchBar.css'

interface UnifiedSearchBarProps {
  onResultSelect?: (result: LibrarySearchResult) => void
  placeholder?: string
  autoFocus?: boolean
}

const MAX_RECENT_SEARCHES = 5
const SEARCH_DEBOUNCE_MS = 300

export const UnifiedSearchBar: React.FC<UnifiedSearchBarProps> = ({
  onResultSelect,
  placeholder = 'Search clauses, projects, and playbooks...',
  autoFocus = false,
}) => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<LibrarySearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [selectedTypes, setSelectedTypes] = useState<Set<'clause' | 'project' | 'playbook'>>(
    new Set(['clause', 'project', 'playbook'] as const)
  )
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const searchTimeoutRef = useRef<NodeJS.Timeout>()
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Load recent searches from localStorage
    const stored = localStorage.getItem('library_recent_searches')
    if (stored) {
      try {
        setRecentSearches(JSON.parse(stored))
      } catch (e) {
        // ignore
      }
    }
  }, [])

  useEffect(() => {
    // Close results when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    // Debounce search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (query.trim().length < 2) {
      setResults([])
      setLoading(false)
      return () => {
        if (searchTimeoutRef.current) {
          clearTimeout(searchTimeoutRef.current)
        }
      }
    }

    setLoading(true)
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const searchResults = await libraryApi.search({
          query: query.trim(),
          types: Array.from(selectedTypes) as ('clause' | 'project' | 'playbook')[],
          limit: 10,
        })
        setResults(searchResults)
        setShowResults(true)
      } catch (error) {
        console.error('Search failed:', error)
        setResults([])
      } finally {
        setLoading(false)
      }
    }, SEARCH_DEBOUNCE_MS)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [query, selectedTypes])

  const handleSearch = (searchQuery: string) => {
    setQuery(searchQuery)
    // Save to recent searches
    if (searchQuery.trim()) {
      const updated = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(
        0,
        MAX_RECENT_SEARCHES
      )
      setRecentSearches(updated)
      localStorage.setItem('library_recent_searches', JSON.stringify(updated))
    }
  }

  const handleResultClick = (result: LibrarySearchResult) => {
    onResultSelect?.(result)
    setShowResults(false)
    handleSearch(result.name)
  }

  const handleTypeToggle = (type: 'clause' | 'project' | 'playbook') => {
    const newTypes = new Set(selectedTypes) as Set<'clause' | 'project' | 'playbook'>
    if (newTypes.has(type)) {
      newTypes.delete(type)
    } else {
      newTypes.add(type)
    }
    setSelectedTypes(newTypes)
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'clause':
        return <FileText size={14} />
      case 'project':
        return <Folder size={14} />
      case 'playbook':
        return <Book size={14} />
      default:
        return null
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'clause':
        return 'Clause'
      case 'project':
        return 'Project'
      case 'playbook':
        return 'Playbook'
      default:
        return type
    }
  }

  return (
    <div className="unified-search-bar" ref={containerRef}>
      <div className="search-input-container">
        <Search size={18} className="search-icon" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (query.trim().length >= 2 || recentSearches.length > 0) {
              setShowResults(true)
            }
          }}
          placeholder={placeholder}
          className="search-input"
          autoFocus={autoFocus}
        />
        {query && (
          <button
            className="search-clear"
            onClick={() => {
              setQuery('')
              setResults([])
              setShowResults(false)
            }}
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Type Filters */}
      <div className="search-type-filters">
        {(['clause', 'project', 'playbook'] as const).map(type => (
          <button
            key={type}
            className={`search-type-filter ${selectedTypes.has(type) ? 'active' : ''}`}
            onClick={() => handleTypeToggle(type)}
          >
            {getTypeIcon(type)}
            {getTypeLabel(type)}
          </button>
        ))}
      </div>

      {/* Results Dropdown */}
      {showResults && (
        <div className="search-results">
          {loading ? (
            <div className="search-results-loading">Searching...</div>
          ) : query.trim().length < 2 && recentSearches.length > 0 ? (
            <div className="search-results-section">
              <div className="search-results-header">
                <Clock size={14} />
                Recent Searches
              </div>
              {recentSearches.map((search, index) => (
                <button
                  key={index}
                  className="search-result-item recent"
                  onClick={() => handleSearch(search)}
                >
                  <Clock size={14} />
                  {search}
                </button>
              ))}
            </div>
          ) : results.length > 0 ? (
            <div className="search-results-section">
              <div className="search-results-header">
                Results ({results.length})
              </div>
              {results.map((result, index) => (
                <button
                  key={`${result.type}-${result.id}-${index}`}
                  className="search-result-item"
                  onClick={() => handleResultClick(result)}
                >
                  <div className="search-result-icon">{getTypeIcon(result.type)}</div>
                  <div className="search-result-content">
                    <div className="search-result-name">{result.name}</div>
                    {result.description && (
                      <div className="search-result-description">{result.description}</div>
                    )}
                    <div className="search-result-type">{getTypeLabel(result.type)}</div>
                  </div>
                  {result.relevanceScore !== undefined && (
                    <div className="search-result-score">
                      {Math.round(result.relevanceScore * 100)}%
                    </div>
                  )}
                </button>
              ))}
            </div>
          ) : query.trim().length >= 2 ? (
            <div className="search-results-empty">No results found</div>
          ) : null}
        </div>
      )}
    </div>
  )
}

