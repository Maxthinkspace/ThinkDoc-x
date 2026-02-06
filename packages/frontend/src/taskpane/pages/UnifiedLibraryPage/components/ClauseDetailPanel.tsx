import React, { useState, useEffect } from 'react'
import { libraryApi, type Clause, type ClauseVersion } from '../../../../services/libraryApi'
import { X, Edit2, Trash2, Share2, History, Copy } from 'lucide-react'
import { VersionHistory } from '../../../components/library/VersionHistory'
import { ShareDialog } from '../../../components/library/ShareDialog'
import { useToast } from '../../../hooks/use-toast'
import './DetailPanel.css'

interface ClauseDetailPanelProps {
  clauseId: string
  onClose: () => void
  onEdit?: (clause: Clause) => void
  onDelete?: (clauseId: string) => void
}

export const ClauseDetailPanel: React.FC<ClauseDetailPanelProps> = ({
  clauseId,
  onClose,
  onEdit,
  onDelete,
}) => {
  const { toast } = useToast()
  const [clause, setClause] = useState<Clause | null>(null)
  const [currentVersion, setCurrentVersion] = useState<ClauseVersion | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'content' | 'versions' | 'sharing'>('content')
  const [shareDialogOpen, setShareDialogOpen] = useState(false)

  useEffect(() => {
    loadClause()
  }, [clauseId])

  const loadClause = async () => {
    try {
      setLoading(true)
      const clauseData = await libraryApi.getClause(clauseId)
      setClause(clauseData)
      
      if (clauseData.currentVersionId) {
        const versions = await libraryApi.getClauseVersions(clauseId)
        const latest = versions.find(v => v.id === clauseData.currentVersionId) || versions[0]
        setCurrentVersion(latest || null)
      }
    } catch (error) {
      console.error('Failed to load clause:', error)
      toast({
        title: 'Error',
        description: 'Failed to load clause details',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Delete clause "${clause?.name}"?`)) return
    
    try {
      await libraryApi.deleteClause(clauseId)
      onDelete?.(clauseId)
      onClose()
      toast({
        title: 'Clause Deleted',
        description: 'Clause has been deleted successfully',
      })
    } catch (error) {
      console.error('Failed to delete clause:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete clause',
      })
    }
  }

  const handleDuplicate = async () => {
    if (!clause || !currentVersion) return

    try {
      const newClause = await libraryApi.createClause({
        name: `${clause.name} (Copy)`,
        text: currentVersion.text,
        description: clause.description || undefined,
        clauseType: clause.clauseType || undefined,
        jurisdiction: clause.jurisdiction || undefined,
        tagIds: clause.tags?.map(t => t.id) || [],
        labelIds: clause.labels?.map(l => l.id) || [],
      })
      toast({
        title: 'Clause Duplicated',
        description: 'Clause has been duplicated successfully',
      })
      onClose()
    } catch (error) {
      console.error('Failed to duplicate clause:', error)
      toast({
        title: 'Error',
        description: 'Failed to duplicate clause',
      })
    }
  }

  if (loading) {
    return (
      <div className="detail-panel">
        <div className="detail-panel-loading">Loading...</div>
      </div>
    )
  }

  if (!clause) {
    return (
      <div className="detail-panel">
        <div className="detail-panel-error">Clause not found</div>
      </div>
    )
  }

  return (
    <div className="detail-panel">
      <div className="detail-panel-header">
        <div className="detail-panel-title-section">
          <h2 className="detail-panel-title">{clause.name}</h2>
          {clause.description && (
            <p className="detail-panel-description">{clause.description}</p>
          )}
        </div>
        <button className="detail-panel-close" onClick={onClose}>
          <X size={20} />
        </button>
      </div>

      <div className="detail-panel-actions">
        <button className="detail-panel-action-btn" onClick={() => onEdit?.(clause)}>
          <Edit2 size={16} />
          Edit
        </button>
        <button className="detail-panel-action-btn" onClick={handleDuplicate}>
          <Copy size={16} />
          Duplicate
        </button>
        <button className="detail-panel-action-btn" onClick={() => setShareDialogOpen(true)}>
          <Share2 size={16} />
          Share
        </button>
        <button className="detail-panel-action-btn" onClick={() => setActiveTab('versions')}>
          <History size={16} />
          Versions
        </button>
        <button className="detail-panel-action-btn danger" onClick={handleDelete}>
          <Trash2 size={16} />
          Delete
        </button>
      </div>

      <div className="detail-panel-tabs">
        <button
          className={`detail-panel-tab ${activeTab === 'content' ? 'active' : ''}`}
          onClick={() => setActiveTab('content')}
        >
          Content
        </button>
        <button
          className={`detail-panel-tab ${activeTab === 'versions' ? 'active' : ''}`}
          onClick={() => setActiveTab('versions')}
        >
          Versions
        </button>
        <button
          className={`detail-panel-tab ${activeTab === 'sharing' ? 'active' : ''}`}
          onClick={() => setActiveTab('sharing')}
        >
          Sharing
        </button>
      </div>

      <div className="detail-panel-content">
        {activeTab === 'content' && (
          <div className="detail-panel-content-section">
            <div className="detail-panel-meta">
              {clause.clauseType && (
                <span className="detail-panel-meta-item">Type: {clause.clauseType}</span>
              )}
              {clause.jurisdiction && (
                <span className="detail-panel-meta-item">Jurisdiction: {clause.jurisdiction}</span>
              )}
              {clause.language && (
                <span className="detail-panel-meta-item">Language: {clause.language}</span>
              )}
            </div>
            {clause.tags && clause.tags.length > 0 && (
              <div className="detail-panel-tags">
                {clause.tags.map(tag => (
                  <span key={tag.id} className="detail-panel-tag" style={{ color: tag.color || '#6B7280' }}>
                    {tag.name}
                  </span>
                ))}
              </div>
            )}
            <div className="detail-panel-text">
              <pre>{currentVersion?.text || 'No content available'}</pre>
            </div>
          </div>
        )}

        {activeTab === 'versions' && (
          <div className="detail-panel-content-section">
            <VersionHistory
              resourceType="clause"
              resourceId={clauseId}
              onVersionChange={loadClause}
            />
          </div>
        )}

        {activeTab === 'sharing' && (
          <div className="detail-panel-content-section">
            <ShareDialog
              open={shareDialogOpen}
              resourceType="clause"
              resourceId={clauseId}
              resourceName={clause.name}
              onClose={() => setShareDialogOpen(false)}
            />
          </div>
        )}
      </div>
    </div>
  )
}

