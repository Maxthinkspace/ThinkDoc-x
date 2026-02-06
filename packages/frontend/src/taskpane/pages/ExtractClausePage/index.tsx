import React, { useState, useEffect } from 'react'
import { Divider, Button as FButton, makeStyles } from '@fluentui/react-components'
import { FaArrowLeft } from 'react-icons/fa6'
import { Button, Tooltip } from '@fluentui/react-components'
import { useNavigation } from '../../hooks/use-navigation'
import { libraryApi } from '../../../services/libraryApi'
import { useToast } from '../../hooks/use-toast'
import { Loader2 } from 'lucide-react'
import { getSelectedText } from '../../../utils/annotationFilter'

const useStyles = makeStyles({
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '5px 19px 5px 19px',
  },
  headerTitle: {
    margin: '9px',
    fontWeight: 600,
    color: '#333333',
    fontSize: '15px',
  },
  headerIcon: {
    color: '#999999',
    border: 'none',
    backgroundColor: 'transparent',
  },
})

export const ExtractClausePage: React.FC = () => {
  const styles = useStyles()
  const { navigateTo } = useNavigation()
  const { toast } = useToast()
  const [selectedText, setSelectedText] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    // Load selected text from document
    const loadSelection = async () => {
      try {
        const text = await getSelectedText()
        if (text) {
          setSelectedText(text)
          setName(text.substring(0, 50).trim() + (text.length > 50 ? '...' : ''))
        } else {
          toast({
            title: 'No Selection',
            description: 'Please select text in the document first',
          })
          navigateTo('unified-library', { tab: 'clauses' })
        }
      } catch (error) {
        console.error('Failed to get selection:', error)
      }
    }
    loadSelection()
  }, [])

  const handleSave = async () => {
    if (!name.trim() || !selectedText.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Name and text are required',
      })
      return
    }

    try {
      setSaving(true)
      await libraryApi.createClause({
        name: name.trim(),
        description: description.trim() || undefined,
        text: selectedText.trim(),
        sourceType: 'extracted',
      })
      toast({
        title: 'Clause Saved',
        description: 'Clause has been saved successfully',
      })
      navigateTo('unified-library', { tab: 'clauses' })
    } catch (error) {
      console.error('Failed to save clause:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save clause',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className={styles.header}>
        <Tooltip
          appearance="inverted"
          content="Back to library"
          positioning="below"
          withArrow
          relationship="label"
        >
          <FButton
            icon={<FaArrowLeft style={{ fontSize: '12px' }} />}
            onClick={() => navigateTo('unified-library', { tab: 'clauses' })}
            className={styles.headerIcon}
          />
        </Tooltip>
        <p className={styles.headerTitle}>Extract Clause</p>
        <div style={{ width: '28px' }} />
      </div>
      <Divider />

      <div style={{ padding: '20px' }}>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>
            Selected Text Preview
          </label>
          <div
            style={{
              padding: '12px',
              background: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '13px',
              maxHeight: '200px',
              overflowY: 'auto',
              whiteSpace: 'pre-wrap',
            }}
          >
            {selectedText || 'No text selected'}
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>
            Name <span style={{ color: 'red' }}>*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter clause name"
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
            }}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description"
            rows={3}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              resize: 'vertical',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <Button
            appearance="secondary"
            onClick={() => navigateTo('unified-library', { tab: 'clauses' })}
          >
            Cancel
          </Button>
          <Button
            appearance="primary"
            onClick={handleSave}
            disabled={saving || !name.trim() || !selectedText.trim()}
          >
            {saving ? (
              <>
                <Loader2 size={14} style={{ animation: 'spin 1s linear infinite', marginRight: '6px' }} />
                Saving...
              </>
            ) : (
              'Save Clause'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

