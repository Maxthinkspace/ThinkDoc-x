import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeftRight, X, Download } from 'lucide-react';
import { documentVersionApi, type VersionTree, type DocumentVersion, type DocumentSubVersion } from '../../../services/documentVersionApi';
import './DocumentVersionControl.css';

interface DiffSegment {
  type: 'unchanged' | 'added' | 'removed';
  text: string;
}

// Word-level diff algorithm (reused from library VersionHistory)
function computeWordDiff(oldText: string, newText: string): DiffSegment[] {
  const oldWords = oldText.split(/(\s+)/);
  const newWords = newText.split(/(\s+)/);

  // LCS (Longest Common Subsequence) approach
  const lcsMatrix: number[][] = [];
  for (let i = 0; i <= oldWords.length; i++) {
    lcsMatrix[i] = [];
    for (let j = 0; j <= newWords.length; j++) {
      if (i === 0 || j === 0) {
        lcsMatrix[i][j] = 0;
      } else if (oldWords[i - 1] === newWords[j - 1]) {
        lcsMatrix[i][j] = lcsMatrix[i - 1][j - 1] + 1;
      } else {
        lcsMatrix[i][j] = Math.max(lcsMatrix[i - 1][j], lcsMatrix[i][j - 1]);
      }
    }
  }

  // Backtrack to find the diff
  const result: DiffSegment[] = [];
  let i = oldWords.length;
  let j = newWords.length;
  const tempResult: DiffSegment[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldWords[i - 1] === newWords[j - 1]) {
      tempResult.unshift({ type: 'unchanged', text: oldWords[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || lcsMatrix[i][j - 1] >= lcsMatrix[i - 1][j])) {
      tempResult.unshift({ type: 'added', text: newWords[j - 1] });
      j--;
    } else if (i > 0) {
      tempResult.unshift({ type: 'removed', text: oldWords[i - 1] });
      i--;
    }
  }

  // Merge consecutive segments of the same type
  for (const segment of tempResult) {
    if (result.length > 0 && result[result.length - 1].type === segment.type) {
      result[result.length - 1].text += segment.text;
    } else {
      result.push({ ...segment });
    }
  }

  return result;
}

interface VersionComparisonViewProps {
  documentId: string;
  versionAId: string;
  versionBId: string;
  isSubVersionA: boolean;
  isSubVersionB: boolean;
  onClose?: () => void;
}

export const VersionComparisonView: React.FC<VersionComparisonViewProps> = ({
  documentId,
  versionAId,
  versionBId,
  isSubVersionA,
  isSubVersionB,
  onClose,
}) => {
  const [versionA, setVersionA] = useState<DocumentVersion | DocumentSubVersion | null>(null);
  const [versionB, setVersionB] = useState<DocumentVersion | DocumentSubVersion | null>(null);
  const [loading, setLoading] = useState(true);
  const [versionTree, setVersionTree] = useState<VersionTree | null>(null);
  const [viewMode, setViewMode] = useState<'unified' | 'sidebyside'>('unified');
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    loadVersions();
  }, [documentId, versionAId, versionBId, isSubVersionA, isSubVersionB]);

  const loadVersions = async () => {
    try {
      setLoading(true);
      const [versionAData, versionBData, tree] = await Promise.all([
        documentVersionApi.getVersion(documentId, versionAId, isSubVersionA),
        documentVersionApi.getVersion(documentId, versionBId, isSubVersionB),
        documentVersionApi.getVersionHistory(documentId),
      ]);
      setVersionA(versionAData);
      setVersionB(versionBData);
      setVersionTree(tree);
    } catch (error) {
      console.error('Failed to load versions:', error);
    } finally {
      setLoading(false);
    }
  };

  const diffResult = useMemo(() => {
    if (!versionA || !versionB) return null;
    const contentA = versionA.content || '';
    const contentB = versionB.content || '';
    return computeWordDiff(contentA, contentB);
  }, [versionA, versionB]);

  const getVersionLabel = (version: DocumentVersion | DocumentSubVersion, isSubVersion: boolean): string => {
    if (isSubVersion) {
      const subVersion = version as DocumentSubVersion;
      const parentVersion = versionTree?.versions.find(v => v.version.id === subVersion.parentVersionId);
      const mainVersion = parentVersion?.version.mainVersion || 1;
      return `v${mainVersion}.${subVersion.subVersionLetter}`;
    } else {
      const mainVersion = version as DocumentVersion;
      return `v${mainVersion.mainVersion}`;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleSwap = () => {
    // Swap versions by calling parent with swapped IDs
    window.location.hash = `compare/${documentId}/${versionBId}/${versionAId}/${isSubVersionB}/${isSubVersionA}`;
    // Reload to trigger useEffect
    loadVersions();
  };

  const handleExportPdf = async () => {
    if (!versionA || !versionB) return;

    try {
      setIsExporting(true);
      const blob = await documentVersionApi.exportRedlinePdf(
        documentId,
        versionAId,
        versionBId,
        isSubVersionA,
        isSubVersionB
      );

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${versionTree?.document.name || 'document'}_${getVersionLabel(versionA, isSubVersionA)}_vs_${getVersionLabel(versionB, isSubVersionB)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export PDF:', error);
      alert('Failed to export PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="version-comparison-loading">
        <div className="version-history-loading-spinner" />
        <span>Loading comparison...</span>
      </div>
    );
  }

  if (!versionA || !versionB) {
    return (
      <div className="version-comparison-error">
        Versions not found
      </div>
    );
  }

  const stats = useMemo(() => {
    if (!diffResult) return { added: 0, removed: 0 };
    let added = 0;
    let removed = 0;
    diffResult.forEach(segment => {
      if (segment.type === 'added') added += segment.text.length;
      if (segment.type === 'removed') removed += segment.text.length;
    });
    return { added, removed };
  }, [diffResult]);

  return (
    <div className="version-comparison">
      <div className="version-comparison-header-bar">
        <div className="version-comparison-header">
          <div className="version-comparison-side older">
            <span className="version-comparison-badge">{getVersionLabel(versionA, isSubVersionA)}</span>
            <span className="version-comparison-label">Previous</span>
            <span className="version-comparison-date">{formatDate(versionA.createdAt)}</span>
          </div>
          <button className="version-comparison-swap" onClick={handleSwap} title="Swap versions">
            <ArrowLeftRight size={16} />
          </button>
          <div className="version-comparison-side newer">
            <span className="version-comparison-badge">{getVersionLabel(versionB, isSubVersionB)}</span>
            <span className="version-comparison-label">Selected</span>
            <span className="version-comparison-date">{formatDate(versionB.createdAt)}</span>
          </div>
        </div>
        {onClose && (
          <button className="version-comparison-close-btn" onClick={onClose}>
            <X size={16} />
          </button>
        )}
      </div>

      <div className="version-comparison-controls">
        <div className="version-comparison-stats">
          <span className="stat-item removed">-{stats.removed} chars removed</span>
          <span className="stat-item added">+{stats.added} chars added</span>
        </div>
        <div className="version-comparison-controls-right">
          <button
            className="version-comparison-export-btn"
            onClick={handleExportPdf}
            disabled={isExporting}
            title="Export PDF with track changes"
          >
            <Download size={16} />
            {isExporting ? 'Exporting...' : 'Export PDF'}
          </button>
          <div className="version-comparison-view-toggle">
            <button
              className={viewMode === 'unified' ? 'active' : ''}
              onClick={() => setViewMode('unified')}
            >
              Unified
            </button>
            <button
              className={viewMode === 'sidebyside' ? 'active' : ''}
              onClick={() => setViewMode('sidebyside')}
            >
              Side-by-Side
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'unified' ? (
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
      ) : (
        <div className="version-comparison-sidebyside">
          <div className="version-comparison-content">
            <div className="version-comparison-pane left">
              <div className="version-comparison-pane-header">
                Previous ({getVersionLabel(versionA, isSubVersionA)})
              </div>
              <div className="version-comparison-pane-content">
                {versionA.content || '(No content)'}
              </div>
            </div>
            <div className="version-comparison-pane right">
              <div className="version-comparison-pane-header">
                Selected ({getVersionLabel(versionB, isSubVersionB)})
              </div>
              <div className="version-comparison-pane-content">
                {versionB.content || '(No content)'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

