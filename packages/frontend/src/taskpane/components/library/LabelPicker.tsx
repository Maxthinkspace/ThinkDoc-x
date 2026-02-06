import React, { useState, useEffect } from 'react'
import { libraryApi, type Label } from '../../../services/libraryApi'
import { Plus, X } from 'lucide-react'
import './LabelPicker.css'

interface LabelPickerProps {
  category?: 'risk_level' | 'status' | 'priority' | 'jurisdiction' | 'position'
  selectedLabelIds?: string[]
  onSelectionChange?: (labelIds: string[]) => void
  multiSelect?: boolean
  showCreate?: boolean
}

const CATEGORY_LABELS: Record<string, string> = {
  risk_level: 'Risk Level',
  status: 'Status',
  priority: 'Priority',
  jurisdiction: 'Jurisdiction',
  position: 'Position',
}

export const LabelPicker: React.FC<LabelPickerProps> = ({
  category,
  selectedLabelIds = [],
  onSelectionChange,
  multiSelect = true,
  showCreate = false,
}) => {
  const [labels, setLabels] = useState<Label[]>([])
  const [loading, setLoading] = useState(true)
  const [creatingCategory, setCreatingCategory] = useState<string | null>(null)
  const [newLabelName, setNewLabelName] = useState('')
  const [newLabelColor, setNewLabelColor] = useState('#6B7280')

  useEffect(() => {
    loadLabels()
  }, [category])

  const loadLabels = async () => {
    try {
      setLoading(true)
      const allLabels = await libraryApi.getLabels(category)
      setLabels(allLabels || [])
    } catch (error) {
      console.error('Failed to load labels:', error)
      setLabels([])
    } finally {
      setLoading(false)
    }
  }

  const handleLabelClick = (label: Label) => {
    if (multiSelect) {
      const newSelection = selectedLabelIds.includes(label.id)
        ? selectedLabelIds.filter(id => id !== label.id)
        : [...selectedLabelIds, label.id]
      onSelectionChange?.(newSelection)
    } else {
      onSelectionChange?.([label.id])
    }
  }

  const handleCreateLabel = async (cat: string) => {
    if (!newLabelName.trim()) return

    try {
      await libraryApi.createLabel({
        name: newLabelName.trim(),
        color: newLabelColor,
        category: cat as any,
      })
      setNewLabelName('')
      setNewLabelColor('#6B7280')
      setCreatingCategory(null)
      await loadLabels()
    } catch (error) {
      console.error('Failed to create label:', error)
      alert('Failed to create label. It may already exist.')
    }
  }

  const handleRemoveLabel = async (labelId: string) => {
    try {
      await libraryApi.deleteLabel(labelId)
      await loadLabels()
      // Remove from selection if selected
      if (selectedLabelIds.includes(labelId)) {
        onSelectionChange?.(selectedLabelIds.filter(id => id !== labelId))
      }
    } catch (error) {
      console.error('Failed to delete label:', error)
      alert('Failed to delete label.')
    }
  }

  // Group labels by category
  const labelsByCategory = labels.reduce((acc, label) => {
    if (!acc[label.category]) {
      acc[label.category] = []
    }
    acc[label.category].push(label)
    return acc
  }, {} as Record<string, Label[]>)

  // Sort categories
  const categories = Object.keys(labelsByCategory).sort()

  if (loading) {
    return <div className="label-picker-loading">Loading labels...</div>
  }

  return (
    <div className="label-picker">
      {category ? (
        // Single category mode
        <div className="label-picker-single">
          <div className="label-picker-category-header">
            <h4 className="label-picker-category-title">
              {CATEGORY_LABELS[category] || category}
            </h4>
            {showCreate && (
              <button
                className="label-picker-add-btn"
                onClick={() => setCreatingCategory(category)}
              >
                <Plus size={14} />
                Add
              </button>
            )}
          </div>

          {creatingCategory === category && (
            <LabelCreateForm
              category={category}
              onSave={(_name, _color) => handleCreateLabel(category)}
              onCancel={() => {
                setCreatingCategory(null)
                setNewLabelName('')
              }}
            />
          )}

          <div className="label-picker-badges">
            {labelsByCategory[category]?.map(label => (
              <LabelBadge
                key={label.id}
                label={label}
                selected={selectedLabelIds.includes(label.id)}
                onClick={() => handleLabelClick(label)}
                onRemove={showCreate ? () => handleRemoveLabel(label.id) : undefined}
              />
            ))}
            {(!labelsByCategory[category] || labelsByCategory[category].length === 0) && (
              <div className="label-picker-empty">No labels in this category</div>
            )}
          </div>
        </div>
      ) : (
        // All categories mode
        <div className="label-picker-multi">
          {categories.map(cat => (
            <div key={cat} className="label-picker-category">
              <div className="label-picker-category-header">
                <h4 className="label-picker-category-title">
                  {CATEGORY_LABELS[cat] || cat}
                </h4>
                {showCreate && (
                  <button
                    className="label-picker-add-btn"
                    onClick={() => setCreatingCategory(cat)}
                  >
                    <Plus size={14} />
                    Add
                  </button>
                )}
              </div>

              {creatingCategory === cat && (
                <LabelCreateForm
                  category={cat}
                  onSave={(_name, _color) => handleCreateLabel(cat)}
                  onCancel={() => {
                    setCreatingCategory(null)
                    setNewLabelName('')
                  }}
                />
              )}

              <div className="label-picker-badges">
                {labelsByCategory[cat]?.map(label => (
                  <LabelBadge
                    key={label.id}
                    label={label}
                    selected={selectedLabelIds.includes(label.id)}
                    onClick={() => handleLabelClick(label)}
                    onRemove={showCreate ? () => handleRemoveLabel(label.id) : undefined}
                  />
                ))}
              </div>
            </div>
          ))}

          {categories.length === 0 && (
            <div className="label-picker-empty">No labels yet. Create your first label!</div>
          )}
        </div>
      )}
    </div>
  )
}

interface LabelBadgeProps {
  label: Label
  selected: boolean
  onClick: () => void
  onRemove?: () => void
}

const LabelBadge: React.FC<LabelBadgeProps> = ({ label, selected, onClick, onRemove }) => {
  return (
    <button
      className={`label-badge ${selected ? 'selected' : ''}`}
      onClick={onClick}
      style={{
        backgroundColor: selected ? label.color : `${label.color}20`,
        borderColor: label.color,
        color: selected ? 'white' : label.color,
      }}
    >
      <span className="label-badge-text">{label.name}</span>
      {onRemove && (
        <button
          className="label-badge-remove"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
        >
          <X size={12} />
        </button>
      )}
    </button>
  )
}

interface LabelCreateFormProps {
  category: string
  onSave: (name: string, color: string) => void
  onCancel: () => void
}

const LabelCreateForm: React.FC<LabelCreateFormProps> = ({ category, onSave, onCancel }) => {
  const [name, setName] = useState('')
  const [color, setColor] = useState('#6B7280')

  return (
    <div className="label-create-form">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={`New ${CATEGORY_LABELS[category] || category} label`}
        className="label-create-input"
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
        className="label-color-input"
      />
      <button onClick={() => name.trim() && onSave(name, color)} className="label-save-btn">
        Add
      </button>
      <button onClick={onCancel} className="label-cancel-btn">
        <X size={14} />
      </button>
    </div>
  )
}

