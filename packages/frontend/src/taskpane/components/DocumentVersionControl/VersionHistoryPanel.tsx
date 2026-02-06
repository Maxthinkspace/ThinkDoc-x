import React, { useState, useEffect } from 'react';
import {
  Clock,
  RotateCcw,
  Eye,
  FileText,
  X,
  ChevronDown,
  ChevronUp,
  ArrowLeftRight,
  GitBranch,
} from 'lucide-react';
import { documentVersionApi, type VersionTree, type DocumentVersion, type DocumentSubVersion } from '../../../services/documentVersionApi';
import './DocumentVersionControl.css';

interface VersionHistoryPanelProps {
  documentId: string;
  onRestore?: (versionId: string, isSubVersion: boolean) => void;
  onCompare?: (versionAId: string, versionBId: string, isSubVersionA: boolean, isSubVersionB: boolean) => void;
  onView?: (versionId: string, isSubVersion: boolean) => void;
}

export const VersionHistoryPanel: React.FC<VersionHistoryPanelProps> = ({
  documentId,
  onRestore,
  onCompare,
  onView,
}) => {
  const [versionTree, setVersionTree] = useState<VersionTree | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(new Set());
  const [selectedVersion, setSelectedVersion] = useState<{ id: string; isSubVersion: boolean } | null>(null);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [versionToRestore, setVersionToRestore] = useState<{ id: string; isSubVersion: boolean } | null>(null);

  useEffect(() => {
    loadVersionHistory();
  }, [documentId]);

  const loadVersionHistory = async () => {
    try {
      setLoading(true);
      const tree = await documentVersionApi.getVersionHistory(documentId);
      setVersionTree(tree);
      // Expand first version by default
      if (tree.versions.length > 0) {
        setExpandedVersions(new Set([tree.versions[0].version.id]));
      }
    } catch (error) {
      console.error('Failed to load version history:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleVersionExpanded = (versionId: string) => {
    const newExpanded = new Set(expandedVersions);
    if (newExpanded.has(versionId)) {
      newExpanded.delete(versionId);
    } else {
      newExpanded.add(versionId);
    }
    setExpandedVersions(newExpanded);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateString);
  };

  const getVersionLabel = (version: DocumentVersion | DocumentSubVersion, isSubVersion: boolean): string => {
    if (isSubVersion) {
      const subVersion = version as DocumentSubVersion;
      // Find parent version number
      const parentVersion = versionTree?.versions.find(v => v.version.id === subVersion.parentVersionId);
      const mainVersion = parentVersion?.version.mainVersion || 1;
      return `v${mainVersion}.${subVersion.subVersionLetter}`;
    } else {
      const mainVersion = version as DocumentVersion;
      return `v${mainVersion.mainVersion}`;
    }
  };

  const isCurrentVersion = (version: DocumentVersion | DocumentSubVersion, isSubVersion: boolean): boolean => {
    if (!versionTree) return false;
    if (isSubVersion) {
      return versionTree.document.latestSubVersionId === version.id;
    } else {
      return versionTree.document.latestVersionId === version.id && !versionTree.document.currentSubVersion;
    }
  };

  if (loading) {
    return (
      <div className="version-history-loading">
        <div className="version-history-loading-spinner" />
        <span>Loading version history...</span>
      </div>
    );
  }

  if (!versionTree || versionTree.versions.length === 0) {
    return (
      <div className="version-history-empty">
        <GitBranch size={32} strokeWidth={1.5} />
        <span>No version history available</span>
      </div>
    );
  }

  return (
    <div className="version-history">
      <div className="version-history-header">
        <h3 className="version-history-title">
          <FileText size={18} />
          Version History
          <span className="version-count">{versionTree.versions.length} main versions</span>
        </h3>
      </div>

      <div className="version-timeline">
        {versionTree.versions.map((versionGroup, mainIndex) => {
          const mainVersion = versionGroup.version;
          const isMainExpanded = expandedVersions.has(mainVersion.id);
          const isMainCurrent = isCurrentVersion(mainVersion, false);
          const isLastMain = mainIndex === versionTree.versions.length - 1;

          return (
            <div key={mainVersion.id} className="version-timeline-item">
              {/* Timeline connector */}
              <div className="version-timeline-connector">
                <div className="version-timeline-dot">
                  <FileText size={14} />
                </div>
                {!isLastMain && <div className="version-timeline-line" />}
              </div>

              {/* Main version content */}
              <div className={`version-item ${isMainExpanded ? 'expanded' : ''}`}>
                <div
                  className="version-item-header"
                  onClick={() => toggleVersionExpanded(mainVersion.id)}
                >
                  <div className="version-item-info">
                    <div className="version-number-row">
                      <span className="version-number-badge">{getVersionLabel(mainVersion, false)}</span>
                      {isMainCurrent && <span className="version-latest-badge">Current</span>}
                      {mainVersion.status && (
                        <span className="version-status-badge">{mainVersion.status}</span>
                      )}
                    </div>
                    <div className="version-meta">
                      <span className="version-date" title={formatDate(mainVersion.createdAt)}>
                        <Clock size={12} />
                        {formatRelativeTime(mainVersion.createdAt)}
                      </span>
                      <span className="version-editor">{mainVersion.editorName}</span>
                    </div>
                  </div>
                  <div className="version-expand-icon">
                    {isMainExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>

                {mainVersion.description && (
                  <div className="version-description">{mainVersion.description}</div>
                )}

                {isMainExpanded && (
                  <div className="version-item-expanded">
                    <div className="version-item-actions">
                      <button
                        className="version-action-btn"
                        onClick={e => {
                          e.stopPropagation();
                          setSelectedVersion({ id: mainVersion.id, isSubVersion: false });
                          onView?.(mainVersion.id, false);
                        }}
                      >
                        <Eye size={14} />
                        View
                      </button>
                      {mainIndex < versionTree.versions.length - 1 && (
                        <button
                          className="version-action-btn compare"
                          onClick={e => {
                            e.stopPropagation();
                            const prevVersion = versionTree.versions[mainIndex + 1].version;
                            onCompare?.(prevVersion.id, mainVersion.id, false, false);
                          }}
                        >
                          <ArrowLeftRight size={14} />
                          Compare
                        </button>
                      )}
                      {!isMainCurrent && (
                        <button
                          className="version-action-btn restore"
                          onClick={e => {
                            e.stopPropagation();
                            setVersionToRestore({ id: mainVersion.id, isSubVersion: false });
                            setRestoreDialogOpen(true);
                          }}
                        >
                          <RotateCcw size={14} />
                          Restore
                        </button>
                      )}
                    </div>

                    {/* Sub-versions */}
                    {versionGroup.subVersions.length > 0 && (
                      <div className="version-sub-versions">
                        <div className="version-sub-versions-header">Sub-versions</div>
                        {versionGroup.subVersions.map((subVersion, subIndex) => {
                          const isSubExpanded = expandedVersions.has(subVersion.id);
                          const isSubCurrent = isCurrentVersion(subVersion, true);
                          const isLastSub = subIndex === versionGroup.subVersions.length - 1;

                          return (
                            <div key={subVersion.id} className="version-sub-item">
                              <div className="version-sub-connector">
                                <div className="version-sub-dot" />
                                {!isLastSub && <div className="version-sub-line" />}
                              </div>
                              <div className={`version-item ${isSubExpanded ? 'expanded' : ''}`}>
                                <div
                                  className="version-item-header"
                                  onClick={() => toggleVersionExpanded(subVersion.id)}
                                >
                                  <div className="version-item-info">
                                    <div className="version-number-row">
                                      <span className="version-number-badge">{getVersionLabel(subVersion, true)}</span>
                                      {isSubCurrent && <span className="version-latest-badge">Current</span>}
                                    </div>
                                    <div className="version-meta">
                                      <span className="version-date" title={formatDate(subVersion.createdAt)}>
                                        <Clock size={12} />
                                        {formatRelativeTime(subVersion.createdAt)}
                                      </span>
                                      <span className="version-editor">{subVersion.editorName}</span>
                                    </div>
                                  </div>
                                  <div className="version-expand-icon">
                                    {isSubExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                  </div>
                                </div>

                                {subVersion.description && (
                                  <div className="version-description">{subVersion.description}</div>
                                )}

                                {isSubExpanded && (
                                  <div className="version-item-expanded">
                                    <div className="version-item-actions">
                                      <button
                                        className="version-action-btn"
                                        onClick={e => {
                                          e.stopPropagation();
                                          setSelectedVersion({ id: subVersion.id, isSubVersion: true });
                                          onView?.(subVersion.id, true);
                                        }}
                                      >
                                        <Eye size={14} />
                                        View
                                      </button>
                                      {subIndex > 0 && (
                                        <button
                                          className="version-action-btn compare"
                                          onClick={e => {
                                            e.stopPropagation();
                                            const prevSub = versionGroup.subVersions[subIndex - 1];
                                            onCompare?.(prevSub.id, subVersion.id, true, true);
                                          }}
                                        >
                                          <ArrowLeftRight size={14} />
                                          Compare
                                        </button>
                                      )}
                                      {!isSubCurrent && (
                                        <button
                                          className="version-action-btn restore"
                                          onClick={e => {
                                            e.stopPropagation();
                                            setVersionToRestore({ id: subVersion.id, isSubVersion: true });
                                            setRestoreDialogOpen(true);
                                          }}
                                        >
                                          <RotateCcw size={14} />
                                          Restore
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Restore Confirmation Dialog */}
      {restoreDialogOpen && versionToRestore && (
        <div className="version-restore-overlay" onClick={() => setRestoreDialogOpen(false)}>
          <div className="version-restore-dialog" onClick={e => e.stopPropagation()}>
            <div className="version-restore-dialog-header">
              <RotateCcw size={24} />
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
              >
                Cancel
              </button>
              <button
                className="version-restore-dialog-btn confirm"
                onClick={async () => {
                  if (!versionToRestore || !versionTree) return;
                  try {
                    // Find the version being restored to get its label
                    let versionToRestoreObj: DocumentVersion | DocumentSubVersion | null = null;
                    if (versionToRestore.isSubVersion) {
                      for (const vg of versionTree.versions) {
                        const subVersion = vg.subVersions.find(sv => sv.id === versionToRestore.id);
                        if (subVersion) {
                          versionToRestoreObj = subVersion;
                          break;
                        }
                      }
                    } else {
                      versionToRestoreObj = versionTree.versions.find(v => v.version.id === versionToRestore.id)?.version || null;
                    }

                    const versionLabel = versionToRestoreObj ? getVersionLabel(versionToRestoreObj, versionToRestore.isSubVersion) : 'unknown';

                    await documentVersionApi.restoreVersion(
                      documentId,
                      versionToRestore.id,
                      versionToRestore.isSubVersion,
                      `Restored from ${versionLabel}`,
                      'System'
                    );
                    onRestore?.(versionToRestore.id, versionToRestore.isSubVersion);
                    await loadVersionHistory();
                    setRestoreDialogOpen(false);
                    setVersionToRestore(null);
                  } catch (error) {
                    console.error('Failed to restore version:', error);
                    alert('Failed to restore version');
                  }
                }}
              >
                Restore Version
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

