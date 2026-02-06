import React, { useState, useEffect } from 'react'
import { libraryApi, type LibraryShare, type CreateShareRequest } from '../../../services/libraryApi'
import { X, Search, User, Mail, Copy, Trash2, Calendar } from 'lucide-react'
import './ShareDialog.css'

interface ShareDialogProps {
  open: boolean
  resourceType: 'clause' | 'project' | 'playbook' | 'chat_session' | 'document'
  resourceId: string
  resourceName: string
  onClose: () => void
}

const PERMISSION_OPTIONS = [
  { value: 'view', label: 'View', description: 'Can view only' },
  { value: 'use', label: 'Use', description: 'Can use in workflows' },
  { value: 'edit', label: 'Edit', description: 'Can edit content' },
  { value: 'remix', label: 'Remix', description: 'Can create copies' },
  { value: 'admin', label: 'Admin', description: 'Full control' },
] as const

export const ShareDialog: React.FC<ShareDialogProps> = ({
  open,
  resourceType,
  resourceId,
  resourceName,
  onClose,
}) => {
  const [shares, setShares] = useState<LibraryShare[]>([])
  const [teamShares, setTeamShares] = useState<any[]>([])
  const [teams, setTeams] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [selectedEmail, setSelectedEmail] = useState('')
  const [selectedTeamId, setSelectedTeamId] = useState<string>('')
  const [shareType, setShareType] = useState<'individual' | 'team'>('individual')
  const [permission, setPermission] = useState<'view' | 'use' | 'edit' | 'remix' | 'admin'>('view')
  const [expiresAt, setExpiresAt] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (open) {
      loadShares()
      loadTeams()
    }
  }, [open, resourceType, resourceId])

  const loadShares = async () => {
    try {
      setLoading(true)
      // Note: This will throw until backend implements sharing routes
      const existingShares = await libraryApi.getShares(resourceType, resourceId)
      setShares(existingShares)
    } catch (error) {
      // Sharing API not implemented yet - show empty state
      setShares([])
    } finally {
      setLoading(false)
    }
  }

  const loadTeams = async () => {
    try {
      const teamsList = await libraryApi.getTeams()
      setTeams(teamsList)
      // Load team shares for each team
      const teamSharesPromises = teamsList.map(async (team) => {
        try {
          const shares = await libraryApi.getTeamShares(team.id)
          return shares.filter((s: any) => s.resourceType === resourceType && s.resourceId === resourceId)
        } catch {
          return []
        }
      })
      const allTeamShares = await Promise.all(teamSharesPromises)
      setTeamShares(allTeamShares.flat())
    } catch (error) {
      console.error('Failed to load teams:', error)
      setTeams([])
    }
  }

  const handleCreateShare = async () => {
    if (shareType === 'individual') {
      if (!selectedUserId && !selectedEmail) {
        alert('Please enter a user ID or email')
        return
      }

      try {
        setCreating(true)
        const request: CreateShareRequest = {
          resourceType,
          resourceId,
          sharedWithUserId: selectedUserId || undefined,
          sharedWithEmail: selectedEmail || undefined,
          permission,
          expiresAt: expiresAt || undefined,
        }
        await libraryApi.createShare(request)
        setSelectedUserId('')
        setSelectedEmail('')
        setPermission('view')
        setExpiresAt('')
        await loadShares()
      } catch (error) {
        console.error('Failed to create share:', error)
        alert('Failed to share. Sharing API may not be implemented yet.')
      } finally {
        setCreating(false)
      }
    } else {
      // Team sharing
      if (!selectedTeamId) {
        alert('Please select a team')
        return
      }

      try {
        setCreating(true)
        await libraryApi.shareWithTeam(selectedTeamId, resourceType, resourceId, permission)
        setSelectedTeamId('')
        setPermission('view')
        await loadTeams()
      } catch (error) {
        console.error('Failed to share with team:', error)
        alert('Failed to share with team. Please try again.')
      } finally {
        setCreating(false)
      }
    }
  }

  const handleDeleteShare = async (shareId: string) => {
    if (!confirm('Remove this share?')) return

    try {
      await libraryApi.deleteShare(shareId)
      await loadShares()
    } catch (error) {
      console.error('Failed to delete share:', error)
      alert('Failed to remove share')
    }
  }

  const handleCopyLink = () => {
    // TODO: Generate shareable link when backend supports it
    const link = `${window.location.origin}/shared/${resourceType}/${resourceId}`
    navigator.clipboard.writeText(link)
    alert('Link copied to clipboard')
  }

  if (!open) return null

  return (
    <div className="share-dialog-overlay" onClick={onClose}>
      <div className="share-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="share-dialog-header">
          <h2 className="share-dialog-title">Share {resourceName}</h2>
          <button className="share-dialog-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="share-dialog-content">
          {/* Share Link Section */}
          <div className="share-section">
            <h3 className="share-section-title">Shareable Link</h3>
            <div className="share-link-container">
              <button className="share-link-btn" onClick={handleCopyLink}>
                <Copy size={16} />
                Copy Link
              </button>
              <p className="share-link-note">
                Anyone with this link can access this {resourceType} (based on permissions)
              </p>
            </div>
          </div>

          {/* Add Share Section */}
          <div className="share-section">
            <h3 className="share-section-title">Share with People</h3>
            <div className="share-form">
              {/* Share Type Toggle */}
              <div className="share-form-row">
                <label className="share-label">Share Type</label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setShareType('individual')}
                    style={{
                      padding: '6px 12px',
                      border: shareType === 'individual' ? '2px solid #0078d4' : '1px solid #ccc',
                      background: shareType === 'individual' ? '#e6f2ff' : 'white',
                      cursor: 'pointer',
                    }}
                  >
                    Individual
                  </button>
                  <button
                    type="button"
                    onClick={() => setShareType('team')}
                    style={{
                      padding: '6px 12px',
                      border: shareType === 'team' ? '2px solid #0078d4' : '1px solid #ccc',
                      background: shareType === 'team' ? '#e6f2ff' : 'white',
                      cursor: 'pointer',
                    }}
                  >
                    Team
                  </button>
                </div>
              </div>

              {shareType === 'individual' ? (
                <>
                  <div className="share-form-row">
                    <div className="share-input-group">
                      <User size={16} className="share-input-icon" />
                      <input
                        type="text"
                        placeholder="User ID"
                        value={selectedUserId}
                        onChange={(e) => {
                          setSelectedUserId(e.target.value)
                          setSelectedEmail('')
                        }}
                        className="share-input"
                      />
                    </div>
                    <span className="share-form-divider">or</span>
                    <div className="share-input-group">
                      <Mail size={16} className="share-input-icon" />
                      <input
                        type="email"
                        placeholder="Email address"
                        value={selectedEmail}
                        onChange={(e) => {
                          setSelectedEmail(e.target.value)
                          setSelectedUserId('')
                        }}
                        className="share-input"
                      />
                    </div>
                  </div>

                  <div className="share-form-row">
                    <label className="share-label">
                      <Calendar size={14} />
                      Expires (optional)
                    </label>
                    <input
                      type="datetime-local"
                      value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                      className="share-input"
                    />
                  </div>
                </>
              ) : (
                <div className="share-form-row">
                  <label className="share-label">Select Team</label>
                  <select
                    value={selectedTeamId}
                    onChange={(e) => setSelectedTeamId(e.target.value)}
                    className="share-select"
                  >
                    <option value="">Choose a team...</option>
                    {teams.map(team => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="share-form-row">
                <label className="share-label">Permission</label>
                <select
                  value={permission}
                  onChange={(e) => setPermission(e.target.value as any)}
                  className="share-select"
                >
                  {PERMISSION_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label} - {opt.description}
                    </option>
                  ))}
                </select>
              </div>

              <button
                className="share-submit-btn"
                onClick={handleCreateShare}
                disabled={creating || (shareType === 'individual' && !selectedUserId && !selectedEmail) || (shareType === 'team' && !selectedTeamId)}
              >
                {creating ? 'Sharing...' : 'Share'}
              </button>
            </div>
          </div>

          {/* Existing Shares */}
          <div className="share-section">
            <h3 className="share-section-title">Shared With</h3>
            {loading ? (
              <div className="share-loading">Loading shares...</div>
            ) : shares.length === 0 && teamShares.length === 0 ? (
              <div className="share-empty">No shares yet</div>
            ) : (
              <div className="share-list">
                {shares.map(share => (
                  <div key={share.id} className="share-item">
                    <div className="share-item-info">
                      <div className="share-item-name">
                        {share.sharedWithEmail || `User ${share.sharedWithUserId}`}
                      </div>
                      <div className="share-item-meta">
                        <span className="share-item-permission">{share.permission}</span>
                        {share.expiresAt && (
                          <span className="share-item-expires">
                            Expires: {new Date(share.expiresAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      className="share-item-delete"
                      onClick={() => handleDeleteShare(share.id)}
                      title="Remove share"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                {teamShares.map((share: any) => {
                  const team = teams.find(t => t.id === share.teamId)
                  return (
                    <div key={share.id} className="share-item">
                      <div className="share-item-info">
                        <div className="share-item-name">
                          Team: {team?.name || share.teamId}
                        </div>
                        <div className="share-item-meta">
                          <span className="share-item-permission">{share.permission}</span>
                        </div>
                      </div>
                      <button
                        className="share-item-delete"
                        onClick={async () => {
                          if (confirm('Remove team share?')) {
                            try {
                              await libraryApi.unshareFromTeam(share.id)
                              await loadTeams()
                            } catch (error) {
                              console.error('Failed to remove team share:', error)
                              alert('Failed to remove team share')
                            }
                          }
                        }}
                        title="Remove share"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

