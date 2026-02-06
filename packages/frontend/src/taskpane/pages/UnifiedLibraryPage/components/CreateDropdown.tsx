import React, { useState, useRef, useEffect } from 'react'
import { Plus, ChevronDown, FileText, Folder, Book, Sparkles, Layers } from 'lucide-react'
import { useNavigation } from '../../../hooks/use-navigation'
import './CreateDropdown.css'

interface CreateDropdownProps {
  activeTab: 'clauses' | 'projects' | 'playbooks'
  onCombinePlaybooks?: () => void
}

export const CreateDropdown: React.FC<CreateDropdownProps> = ({ activeTab, onCombinePlaybooks }) => {
  const { navigateTo } = useNavigation()
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getCreateOptions = () => {
    switch (activeTab) {
      case 'clauses':
        return [
          {
            label: 'New Clause',
            icon: <FileText size={16} />,
            onClick: () => {
              navigateTo('create-clause')
              setOpen(false)
            },
          },
          {
            label: 'Extract from Document',
            icon: <FileText size={16} />,
            onClick: () => {
              navigateTo('extract-clause')
              setOpen(false)
            },
          },
        ]
      case 'projects':
        return [
          {
            label: 'New Project',
            icon: <Folder size={16} />,
            onClick: () => {
              // TODO: Open project creation dialog
              setOpen(false)
            },
          },
        ]
      case 'playbooks':
        return [
          {
            label: 'Generate with AI',
            icon: <Sparkles size={16} />,
            onClick: () => {
              navigateTo('PlaybookGenerator')
              setOpen(false)
            },
          },
          {
            label: 'Create Manually',
            icon: <Book size={16} />,
            onClick: () => {
              navigateTo('ManualPlaybook')
              setOpen(false)
            },
          },
          {
            label: 'Combine Playbooks',
            icon: <Layers size={16} />,
            onClick: () => {
              onCombinePlaybooks?.()
              setOpen(false)
            },
          },
        ]
    }
  }

  const options = getCreateOptions()

  return (
    <div className="create-dropdown" ref={dropdownRef}>
      <button
        className="create-dropdown-trigger"
        onClick={() => setOpen(!open)}
      >
        <Plus size={16} />
        Create
        <ChevronDown size={14} className={open ? 'open' : ''} />
      </button>

      {open && (
        <div className="create-dropdown-menu">
          {options.map((option, index) => (
            <button
              key={index}
              className="create-dropdown-item"
              onClick={option.onClick}
            >
              {option.icon}
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

