import React, { useState, useEffect, useRef } from 'react'
import { libraryApi, type Tag } from '../../../services/libraryApi'
import { ChevronRight, ChevronDown, Plus, Edit2, Trash2, X } from 'lucide-react'
import './HierarchicalTagTree.css'

interface HierarchicalTagTreeProps {
  scope?: 'all' | 'clauses' | 'projects' | 'playbooks'
  selectedTagIds?: string[]
  onSelectionChange?: (tagIds: string[]) => void
  multiSelect?: boolean
  showActions?: boolean
  onTagSelect?: (tag: Tag) => void
}

export const HierarchicalTagTree: React.FC<HierarchicalTagTreeProps> = ({
  scope,
  selectedTagIds = [],
  onSelectionChange,
  multiSelect = false,
  showActions = false,
  onTagSelect,
}) => {
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [creatingParentId, setCreatingParentId] = useState<string | null>(null)
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState('#6B7280')

  useEffect(() => {
    loadTags()
  }, [scope])

  const loadTags = async () => {
    try {
      setLoading(true)
      const allTags = await libraryApi.getTags(scope)
      // Build hierarchical structure
      const tagMap = new Map<string, Tag>()
      const rootTags: Tag[] = []
      
      // First pass: create map
      allTags.forEach(tag => {
        tagMap.set(tag.id, { ...tag, children: [] })
      })
      
      // Second pass: build tree
      allTags.forEach(tag => {
        const tagWithChildren = tagMap.get(tag.id)!
        if (tag.parentId && tagMap.has(tag.parentId)) {
          const parent = tagMap.get(tag.parentId)!
          if (!parent.children) parent.children = []
          parent.children.push(tagWithChildren)
        } else {
          rootTags.push(tagWithChildren)
        }
      })
      
      setTags(rootTags)
      // Auto-expand root level
      const newExpanded = new Set(expanded)
      rootTags.forEach(t => newExpanded.add(t.id))
      setExpanded(newExpanded)
    } catch (error) {
      console.error('Failed to load tags:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleExpand = (tagId: string) => {
    const newExpanded = new Set(expanded)
    if (newExpanded.has(tagId)) {
      newExpanded.delete(tagId)
    } else {
      newExpanded.add(tagId)
    }
    setExpanded(newExpanded)
  }

  const handleTagClick = (tag: Tag) => {
    if (multiSelect) {
      const newSelection = selectedTagIds.includes(tag.id)
        ? selectedTagIds.filter(id => id !== tag.id)
        : [...selectedTagIds, tag.id]
      onSelectionChange?.(newSelection)
    } else {
      onTagSelect?.(tag)
    }
  }

  const handleCreateTag = async (parentId: string | null) => {
    if (!newTagName.trim()) return

    try {
      await libraryApi.createTag({
        name: newTagName.trim(),
        color: newTagColor,
        parentId: parentId || undefined,
        scope: scope || 'all',
      })
      setNewTagName('')
      setNewTagColor('#6B7280')
      setCreatingParentId(null)
      await loadTags()
      // Expand parent if creating child
      if (parentId) {
        const newExpanded = new Set(expanded)
        newExpanded.add(parentId)
        setExpanded(newExpanded)
      }
    } catch (error) {
      console.error('Failed to create tag:', error)
      alert('Failed to create tag. It may already exist.')
    }
  }

  const handleEditTag = async (tag: Tag, newName: string, newColor: string) => {
    if (!newName.trim()) return

    try {
      await libraryApi.updateTag(tag.id, {
        name: newName.trim(),
        color: newColor,
      })
      setEditingId(null)
      await loadTags()
    } catch (error) {
      console.error('Failed to update tag:', error)
      alert('Failed to update tag.')
    }
  }

  const handleDeleteTag = async (tag: Tag) => {
    if (!confirm(`Delete tag "${tag.name}"? ${tag.children && tag.children.length > 0 ? 'This will also delete child tags.' : ''}`)) {
      return
    }

    try {
      await libraryApi.deleteTag(tag.id, true)
      await loadTags()
    } catch (error) {
      console.error('Failed to delete tag:', error)
      alert('Failed to delete tag.')
    }
  }

  const renderTag = (tag: Tag, level: number = 0): React.ReactNode => {
    const hasChildren = tag.children && tag.children.length > 0
    const isExpanded = expanded.has(tag.id)
    const isSelected = selectedTagIds.includes(tag.id)
    const isEditing = editingId === tag.id
    const isCreating = creatingParentId === tag.id

    return (
      <div key={tag.id} className="tag-tree-item">
        <div
          className={`tag-tree-row ${isSelected ? 'selected' : ''}`}
          style={{ paddingLeft: `${level * 20 + 8}px` }}
        >
          <div className="tag-tree-content">
            {hasChildren ? (
              <button
                className="tag-tree-expand"
                onClick={() => toggleExpand(tag.id)}
                aria-label={isExpanded ? 'Collapse' : 'Expand'}
              >
                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
            ) : (
              <span className="tag-tree-spacer" />
            )}

            {isEditing ? (
              <TagEditForm
                tag={tag}
                onSave={(name, color) => handleEditTag(tag, name, color)}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <>
                <button
                  className={`tag-tree-label ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleTagClick(tag)}
                  style={{ color: tag.color || '#6B7280' }}
                >
                  <span
                    className="tag-color-dot"
                    style={{ backgroundColor: tag.color || '#6B7280' }}
                  />
                  <span>{tag.name}</span>
                </button>

                {showActions && (
                  <div className="tag-tree-actions">
                    <button
                      className="tag-action-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        setCreatingParentId(tag.id)
                      }}
                      title="Add child tag"
                    >
                      <Plus size={14} />
                    </button>
                    <button
                      className="tag-action-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditingId(tag.id)
                      }}
                      title="Edit tag"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      className="tag-action-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteTag(tag)
                      }}
                      title="Delete tag"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {isCreating && (
            <TagCreateForm
              parentId={tag.id}
              onSave={(_name, _color) => handleCreateTag(tag.id)}
              onCancel={() => {
                setCreatingParentId(null)
                setNewTagName('')
              }}
            />
          )}
        </div>

        {hasChildren && isExpanded && (
          <div className="tag-tree-children">
            {tag.children!.map(child => renderTag(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return <div className="tag-tree-loading">Loading tags...</div>
  }

  return (
    <div className="hierarchical-tag-tree">
      {showActions && (
        <div className="tag-tree-header">
          <button
            className="tag-tree-add-root"
            onClick={() => setCreatingParentId(null)}
          >
            <Plus size={16} />
            Add Root Tag
          </button>
        </div>
      )}

      {creatingParentId === null && showActions && (
        <TagCreateForm
          parentId={null}
          onSave={(_name, _color) => handleCreateTag(null)}
          onCancel={() => {
            setCreatingParentId(null)
            setNewTagName('')
          }}
        />
      )}

      <div className="tag-tree-list">
        {tags.length === 0 ? (
          <div className="tag-tree-empty">No tags yet. Create your first tag!</div>
        ) : (
          tags.filter(t => !t.parentId).map(tag => renderTag(tag, 0))
        )}
      </div>
    </div>
  )
}

interface TagEditFormProps {
  tag: Tag
  onSave: (name: string, color: string) => void
  onCancel: () => void
}

const TagEditForm: React.FC<TagEditFormProps> = ({ tag, onSave, onCancel }) => {
  const [name, setName] = useState(tag.name)
  const [color, setColor] = useState(tag.color || '#6B7280')

  return (
    <div className="tag-edit-form">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="tag-edit-input"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            onSave(name, color)
          } else if (e.key === 'Escape') {
            onCancel()
          }
        }}
      />
      <input
        type="color"
        value={color}
        onChange={(e) => setColor(e.target.value)}
        className="tag-color-input"
      />
      <button onClick={() => onSave(name, color)} className="tag-save-btn">Save</button>
      <button onClick={onCancel} className="tag-cancel-btn">
        <X size={14} />
      </button>
    </div>
  )
}

interface TagCreateFormProps {
  parentId: string | null
  onSave: (name: string, color: string) => void
  onCancel: () => void
}

const TagCreateForm: React.FC<TagCreateFormProps> = ({ onSave, onCancel }) => {
  const [name, setName] = useState('')
  const [color, setColor] = useState('#6B7280')

  return (
    <div className="tag-create-form">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Tag name"
        className="tag-edit-input"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === 'Enter' && name.trim()) {
            onSave(name, color)
          } else if (e.key === 'Escape') {
            onCancel()
          }
        }}
      />
      <input
        type="color"
        value={color}
        onChange={(e) => setColor(e.target.value)}
        className="tag-color-input"
      />
      <button onClick={() => name.trim() && onSave(name, color)} className="tag-save-btn">
        Add
      </button>
      <button onClick={onCancel} className="tag-cancel-btn">
        <X size={14} />
      </button>
    </div>
  )
}

