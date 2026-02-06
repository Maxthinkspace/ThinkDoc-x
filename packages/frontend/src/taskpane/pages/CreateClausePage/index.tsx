import React, { useState } from 'react'
import { Divider, Button as FButton, makeStyles } from '@fluentui/react-components'
import { FaArrowLeft } from 'react-icons/fa6'
import { Button, Tooltip } from '@fluentui/react-components'
import { useNavigation } from '../../hooks/use-navigation'
import { libraryApi } from '../../../services/libraryApi'
import { useToast } from '../../hooks/use-toast'
import { Loader2 } from 'lucide-react'

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

export const CreateClausePage: React.FC = () => {
  const styles = useStyles()
  const { navigateTo } = useNavigation()
  const { toast } = useToast()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!name.trim() || !text.trim()) {
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
        text: text.trim(),
        sourceType: 'manual',
      })
      toast({
        title: 'Clause Created',
        description: 'Clause has been saved successfully',
      })
      navigateTo('unified-library', { tab: 'clauses' })
    } catch (error) {
      console.error('Failed to create clause:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create clause',
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
        <p className={styles.headerTitle}>Create Clause</p>
        <div style={{ width: '28px' }} />
      </div>
      <Divider />

      <div style={{ padding: '20px' }}>
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

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>
            Clause Text <span style={{ color: 'red' }}>*</span>
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter clause text"
            rows={10}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              resize: 'vertical',
              fontFamily: 'monospace',
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
            disabled={saving || !name.trim() || !text.trim()}
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

