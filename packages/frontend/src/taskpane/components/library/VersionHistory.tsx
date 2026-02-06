import React, { useState, useEffect, useMemo } from 'react'
import { libraryApi, type ClauseVersion, type PlaybookVersion } from '../../../services/libraryApi'
import {
  Clock,
  RotateCcw,
  Eye,
  FileText,
  Book,
  GitBranch,
  Plus,
  Edit3,
  History,
  GitMerge,
  X,
  ChevronDown,
  ChevronUp,
  ArrowLeftRight,
} from 'lucide-react'
import './VersionHistory.css'

interface VersionHistoryProps {
  resourceType: 'clause' | 'playbook'
  resourceId: string
  onRestore?: (versionId: string) => void
  onVersionChange?: () => void
}

type ChangeType = 'created' | 'edited' | 'restored' | 'merged' | null | undefined

export const VersionHistory: React.FC<VersionHistoryProps> = ({
  resourceType,
  resourceId,
  onRestore,
  onVersionChange,
}) => {
  const [versions, setVersions] = useState<(ClauseVersion | PlaybookVersion)[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null)
  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(new Set())
  const [comparingVersions, setComparingVersions] = useState<{
    left: string | null
    right: string | null
  }>({ left: null, right: null })
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false)
  const [versionToRestore, setVersionToRestore] = useState<string | null>(null)
  const [isRestoring, setIsRestoring] = useState(false)

  useEffect(() => {
    loadVersions()
  }, [resourceType, resourceId])

  const loadVersions = async () => {
    try {
      setLoading(true)
      if (resourceType === 'clause') {
        const clauseVersions = await libraryApi.getClauseVersions(resourceId)
        setVersions(clauseVersions)
      } else {
        const playbookVersions = await libraryApi.getPlaybookVersions(resourceId)
        setVersions(playbookVersions)
      }
    } catch (error) {
      console.error('Failed to load versions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRestoreClick = (versionId: string) => {
    setVersionToRestore(versionId)
    setRestoreDialogOpen(true)
  }

  const handleRestoreConfirm = async () => {
    if (!versionToRestore) return

    try {
      setIsRestoring(true)
      if (resourceType === 'clause') {
        await libraryApi.restoreClauseVersion(resourceId, versionToRestore)
      } else {
        await libraryApi.restorePlaybookVersion(resourceId, versionToRestore)
      }
      onRestore?.(versionToRestore)
      onVersionChange?.()
      await loadVersions()
      setRestoreDialogOpen(false)
      setVersionToRestore(null)
    } catch (error) {
      console.error('Failed to restore version:', error)
    } finally {
      setIsRestoring(false)
    }
  }

  const toggleVersionExpanded = (versionId: string) => {
    const newExpanded = new Set(expandedVersions)
    if (newExpanded.has(versionId)) {
      newExpanded.delete(versionId)
    } else {
      newExpanded.add(versionId)
    }
    setExpandedVersions(newExpanded)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return formatDate(dateString)
  }

  const getChangeTypeIcon = (changeType: ChangeType) => {
    switch (changeType) {
      case 'created':
        return <Plus size={14} />
      case 'edited':
        return <Edit3 size={14} />
      case 'restored':
        return <History size={14} />
      case 'merged':
        return <GitMerge size={14} />
      default:
        return <GitBranch size={14} />
    }
  }

  const getChangeTypeLabel = (changeType: ChangeType) => {
    switch (changeType) {
      case 'created':
        return 'Created'
      case 'edited':
        return 'Edited'
      case 'restored':
        return 'Restored'
      case 'merged':
        return 'Merged'
      default:
        return 'Modified'
    }
  }

  const getChangeTypeColor = (changeType: ChangeType) => {
    switch (changeType) {
      case 'created':
        return { bg: '#dcfce7', color: '#15803d', border: '#86efac' }
      case 'edited':
        return { bg: '#dbeafe', color: '#1d4ed8', border: '#93c5fd' }
      case 'restored':
        return { bg: '#f3e8ff', color: '#7c3aed', border: '#c4b5fd' }
      case 'merged':
        return { bg: '#fef3c7', color: '#b45309', border: '#fcd34d' }
      default:
        return { bg: '#f3f4f6', color: '#4b5563', border: '#d1d5db' }
    }
  }

  if (loading) {
    return (
      <div className="version-history-loading">
        <div className="version-history-loading-spinner" />
        <span>Loading version history...</span>
      </div>
    )
  }

  if (versions.length === 0) {
    return (
      <div className="version-history-empty">
        <GitBranch size={32} strokeWidth={1.5} />
        <span>No version history available</span>
      </div>
    )
  }

  // Sort versions by version number (newest first)
  const sortedVersions = [...versions].sort((a, b) => b.versionNumber - a.versionNumber)

  return (
    <div className="version-history">
      <div className="version-history-header">
        <h3 className="version-history-title">
          {resourceType === 'clause' ? <FileText size={18} /> : <Book size={18} />}
          Version History
          <span className="version-count">{versions.length} versions</span>
        </h3>
        {comparingVersions.left && comparingVersions.right && (
          <button
            className="version-compare-close"
            onClick={() => setComparingVersions({ left: null, right: null })}
          >
            <X size={14} />
            Close Comparison
          </button>
        )}
      </div>

      {comparingVersions.left && comparingVersions.right ? (
        <VersionComparison
          resourceType={resourceType}
          versions={sortedVersions}
          leftId={comparingVersions.left}
          rightId={comparingVersions.right}
        />
      ) : (
        <div className="version-timeline">
          {sortedVersions.map((version, index) => {
            const isLatest = index === 0
            const isLast = index === sortedVersions.length - 1
            const prevVersion = index < sortedVersions.length - 1 ? sortedVersions[index + 1] : null
            const isExpanded = expandedVersions.has(version.id)
            const changeType = version.changeType as ChangeType
            const changeTypeStyle = getChangeTypeColor(changeType)

            return (
              <div key={version.id} className="version-timeline-item">
                {/* Timeline connector */}
                <div className="version-timeline-connector">
                  <div
                    className="version-timeline-dot"
                    style={{
                      backgroundColor: changeTypeStyle.color,
                      boxShadow: `0 0 0 4px ${changeTypeStyle.bg}`,
                    }}
                  >
                    {getChangeTypeIcon(changeType)}
                  </div>
                  {!isLast && <div className="version-timeline-line" />}
                </div>

                {/* Version content */}
                <div className={`version-item ${isExpanded ? 'expanded' : ''}`}>
                  <div
                    className="version-item-header"
                    onClick={() => toggleVersionExpanded(version.id)}
                  >
                    <div className="version-item-info">
                      <div className="version-number-row">
                        <span className="version-number-badge">v{version.versionNumber}</span>
                        {isLatest && <span className="version-latest-badge">Current</span>}
                        <span
                          className="version-change-badge"
                          style={{
                            backgroundColor: changeTypeStyle.bg,
                            color: changeTypeStyle.color,
                            borderColor: changeTypeStyle.border,
                          }}
                        >
                          {getChangeTypeIcon(changeType)}
                          {getChangeTypeLabel(changeType)}
                        </span>
                      </div>
                      <div className="version-meta">
                        <span className="version-date" title={formatDate(version.createdAt)}>
                          <Clock size={12} />
                          {formatRelativeTime(version.createdAt)}
                        </span>
                      </div>
                    </div>
                    <div className="version-expand-icon">
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </div>

                  {version.changeDescription && (
                    <div className="version-description">{version.changeDescription}</div>
                  )}

                  {isExpanded && (
                    <div className="version-item-expanded">
                      <div className="version-item-actions">
                        <button
                          className="version-action-btn"
                          onClick={e => {
                            e.stopPropagation()
                            setSelectedVersion(selectedVersion === version.id ? null : version.id)
                          }}
                        >
                          <Eye size={14} />
                          {selectedVersion === version.id ? 'Hide' : 'View'}
                        </button>
                        {prevVersion && (
                          <button
                            className="version-action-btn compare"
                            onClick={e => {
                              e.stopPropagation()
                              setComparingVersions({
                                left: prevVersion.id,
                                right: version.id,
                              })
                            }}
                          >
                            <ArrowLeftRight size={14} />
                            Compare
                          </button>
                        )}
                        {!isLatest && (
                          <button
                            className="version-action-btn restore"
                            onClick={e => {
                              e.stopPropagation()
                              handleRestoreClick(version.id)
                            }}
                          >
                            <RotateCcw size={14} />
                            Restore
                          </button>
                        )}
                      </div>

                      {selectedVersion === version.id && (
                        <VersionContentView
                          resourceType={resourceType}
                          version={version}
                          onClose={() => setSelectedVersion(null)}
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Restore Confirmation Dialog */}
      {restoreDialogOpen && (
        <div className="version-restore-overlay" onClick={() => setRestoreDialogOpen(false)}>
          <div className="version-restore-dialog" onClick={e => e.stopPropagation()}>
            <div className="version-restore-dialog-header">
              <History size={24} />
              <h4>Restore Version</h4>
            </div>
            <p className="version-restore-dialog-text">
              This will create a new version with the content from the selected version. The current
              version will remain in history.
            </p>
            <div className="version-restore-dialog-actions">
              <button
                className="version-restore-dialog-btn cancel"
                onClick={() => setRestoreDialogOpen(false)}
                disabled={isRestoring}
              >
                Cancel
              </button>
              <button
                className="version-restore-dialog-btn confirm"
                onClick={handleRestoreConfirm}
                disabled={isRestoring}
              >
                {isRestoring ? 'Restoring...' : 'Restore Version'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface VersionContentViewProps {
  resourceType: 'clause' | 'playbook'
  version: ClauseVersion | PlaybookVersion
  onClose: () => void
}

const VersionContentView: React.FC<VersionContentViewProps> = ({
  resourceType,
  version,
  onClose,
}) => {
  if (resourceType === 'clause') {
    const clauseVersion = version as ClauseVersion
    return (
      <div className="version-content-view">
        <div className="version-content-header">
          <h4>Version {clauseVersion.versionNumber} Content</h4>
          <button onClick={onClose} className="version-close-btn" aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <div className="version-content-text">{clauseVersion.text}</div>
        {clauseVersion.summary && (
          <div className="version-summary">
            <strong>Summary:</strong> {clauseVersion.summary}
          </div>
        )}
      </div>
    )
  } else {
    const playbookVersion = version as PlaybookVersion
    return (
      <div className="version-content-view">
        <div className="version-content-header">
          <h4>Version {playbookVersion.versionNumber} Rules Snapshot</h4>
          <button onClick={onClose} className="version-close-btn" aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <div className="version-content-rules">
          <pre>{JSON.stringify(playbookVersion.rulesSnapshot, null, 2)}</pre>
        </div>
      </div>
    )
  }
}

interface VersionComparisonProps {
  resourceType: 'clause' | 'playbook'
  versions: (ClauseVersion | PlaybookVersion)[]
  leftId: string
  rightId: string
}

// Simple diff algorithm that computes word-level differences
interface DiffSegment {
  type: 'unchanged' | 'added' | 'removed'
  text: string
}

function computeWordDiff(oldText: string, newText: string): DiffSegment[] {
  const oldWords = oldText.split(/(\s+)/)
  const newWords = newText.split(/(\s+)/)

  // LCS (Longest Common Subsequence) approach for better diff
  const lcsMatrix: number[][] = []
  for (let i = 0; i <= oldWords.length; i++) {
    lcsMatrix[i] = []
    for (let j = 0; j <= newWords.length; j++) {
      if (i === 0 || j === 0) {
        lcsMatrix[i][j] = 0
      } else if (oldWords[i - 1] === newWords[j - 1]) {
        lcsMatrix[i][j] = lcsMatrix[i - 1][j - 1] + 1
      } else {
        lcsMatrix[i][j] = Math.max(lcsMatrix[i - 1][j], lcsMatrix[i][j - 1])
      }
    }
  }

  // Backtrack to find the diff
  const result: DiffSegment[] = []
  let i = oldWords.length
  let j = newWords.length

  const tempResult: DiffSegment[] = []

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldWords[i - 1] === newWords[j - 1]) {
      tempResult.unshift({ type: 'unchanged', text: oldWords[i - 1] })
      i--
      j--
    } else if (j > 0 && (i === 0 || lcsMatrix[i][j - 1] >= lcsMatrix[i - 1][j])) {
      tempResult.unshift({ type: 'added', text: newWords[j - 1] })
      j--
    } else if (i > 0) {
      tempResult.unshift({ type: 'removed', text: oldWords[i - 1] })
      i--
    }
  }

  // Merge consecutive segments of the same type
  for (const segment of tempResult) {
    if (result.length > 0 && result[result.length - 1].type === segment.type) {
      result[result.length - 1].text += segment.text
    } else {
      result.push({ ...segment })
    }
  }

  return result
}

const VersionComparison: React.FC<VersionComparisonProps> = ({
  resourceType,
  versions,
  leftId,
  rightId,
}) => {
  const leftVersion = versions.find(v => v.id === leftId)
  const rightVersion = versions.find(v => v.id === rightId)

  const diffResult = useMemo(() => {
    if (!leftVersion || !rightVersion) return null

    if (resourceType === 'clause') {
      const left = leftVersion as ClauseVersion
      const right = rightVersion as ClauseVersion
      return computeWordDiff(left.text, right.text)
    }
    return null
  }, [leftVersion, rightVersion, resourceType])

  if (!leftVersion || !rightVersion) {
    return <div className="version-comparison-error">Versions not found</div>
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (resourceType === 'clause') {
    const left = leftVersion as ClauseVersion
    const right = rightVersion as ClauseVersion

    return (
      <div className="version-comparison">
        <div className="version-comparison-header">
          <div className="version-comparison-side older">
            <span className="version-comparison-badge">v{left.versionNumber}</span>
            <span className="version-comparison-label">Previous</span>
            <span className="version-comparison-date">{formatDate(left.createdAt)}</span>
          </div>
          <div className="version-comparison-divider">
            <ArrowLeftRight size={16} />
          </div>
          <div className="version-comparison-side newer">
            <span className="version-comparison-badge">v{right.versionNumber}</span>
            <span className="version-comparison-label">Selected</span>
            <span className="version-comparison-date">{formatDate(right.createdAt)}</span>
          </div>
        </div>

        {/* Unified diff view */}
        <div className="version-comparison-unified">
          <div className="version-comparison-unified-header">
            <span>Changes</span>
            <div className="version-comparison-legend">
              <span className="legend-item removed">Removed</span>
              <span className="legend-item added">Added</span>
            </div>
          </div>
          <div className="version-comparison-unified-content">
            {diffResult?.map((segment, idx) => (
              <span
                key={idx}
                className={`diff-segment ${segment.type}`}
                data-type={segment.type}
              >
                {segment.text}
              </span>
            ))}
          </div>
        </div>

        {/* Side-by-side view */}
        <div className="version-comparison-sidebyside">
          <div className="version-comparison-side-header">
            <span>Side-by-Side Comparison</span>
          </div>
          <div className="version-comparison-content">
            <div className="version-comparison-pane left">
              <div className="version-comparison-pane-header">Previous (v{left.versionNumber})</div>
              <div className="version-comparison-pane-content">{left.text}</div>
            </div>
            <div className="version-comparison-pane right">
              <div className="version-comparison-pane-header">Selected (v{right.versionNumber})</div>
              <div className="version-comparison-pane-content">{right.text}</div>
            </div>
          </div>
        </div>
      </div>
    )
  } else {
    const left = leftVersion as PlaybookVersion
    const right = rightVersion as PlaybookVersion

    return (
      <div className="version-comparison">
        <div className="version-comparison-header">
          <div className="version-comparison-side older">
            <span className="version-comparison-badge">v{left.versionNumber}</span>
            <span className="version-comparison-label">Previous</span>
            <span className="version-comparison-date">{formatDate(left.createdAt)}</span>
          </div>
          <div className="version-comparison-divider">
            <ArrowLeftRight size={16} />
          </div>
          <div className="version-comparison-side newer">
            <span className="version-comparison-badge">v{right.versionNumber}</span>
            <span className="version-comparison-label">Selected</span>
            <span className="version-comparison-date">{formatDate(right.createdAt)}</span>
          </div>
        </div>
        <div className="version-comparison-content">
          <div className="version-comparison-pane left">
            <div className="version-comparison-pane-header">Previous Rules</div>
            <div className="version-comparison-pane-content playbook">
              <pre>{JSON.stringify(left.rulesSnapshot, null, 2)}</pre>
            </div>
          </div>
          <div className="version-comparison-pane right">
            <div className="version-comparison-pane-header">Selected Rules</div>
            <div className="version-comparison-pane-content playbook">
              <pre>{JSON.stringify(right.rulesSnapshot, null, 2)}</pre>
            </div>
          </div>
        </div>
      </div>
    )
  }
}

export default VersionHistory
