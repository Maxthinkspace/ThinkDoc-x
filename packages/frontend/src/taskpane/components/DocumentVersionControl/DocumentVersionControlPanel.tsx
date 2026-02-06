import React, { useState, useEffect } from 'react';
import { FileText, History, ArrowLeftRight, Plus, ArrowLeft } from 'lucide-react';
import { documentVersionApi, type VersionedDocument } from '../../../services/documentVersionApi';
import { SaveVersionDialog } from './SaveVersionDialog';
import { VersionHistoryPanel } from './VersionHistoryPanel';
import { VersionComparisonView } from './VersionComparisonView';
import { useNavigation } from '../../hooks/use-navigation';
import './DocumentVersionControl.css';

type ViewMode = 'history' | 'compare' | 'save';

interface DocumentVersionControlPanelProps {
  initialDocumentId?: string;
  onClose?: () => void;
}

export const DocumentVersionControlPanel: React.FC<DocumentVersionControlPanelProps> = ({
  initialDocumentId,
  onClose,
}) => {
  const { goBack } = useNavigation();
  const [documents, setDocuments] = useState<VersionedDocument[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | undefined>(initialDocumentId);
  const [viewMode, setViewMode] = useState<ViewMode>('history');
  const [loading, setLoading] = useState(true);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [compareState, setCompareState] = useState<{
    versionAId: string;
    versionBId: string;
    isSubVersionA: boolean;
    isSubVersionB: boolean;
  } | null>(null);

  useEffect(() => {
    loadDocuments();
  }, []);

  useEffect(() => {
    if (initialDocumentId) {
      setSelectedDocumentId(initialDocumentId);
    }
  }, [initialDocumentId]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const docs = await documentVersionApi.listDocuments();
      // Ensure docs is always an array
      setDocuments(Array.isArray(docs) ? docs : []);
      const documentsArray = Array.isArray(docs) ? docs : [];
      if (!selectedDocumentId && documentsArray.length > 0) {
        setSelectedDocumentId(documentsArray[0].id);
      }
    } catch (error) {
      console.error('Failed to load documents:', error);
      // Ensure documents is always an array even on error
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCompare = (
    versionAId: string,
    versionBId: string,
    isSubVersionA: boolean,
    isSubVersionB: boolean
  ) => {
    setCompareState({ versionAId, versionBId, isSubVersionA, isSubVersionB });
    setViewMode('compare');
  };

  const handleRestore = async () => {
    await loadDocuments();
    if (selectedDocumentId) {
      // Reload version history
    }
  };

  if (loading) {
    return (
      <div className="document-version-control-loading">
        <div className="version-history-loading-spinner" />
        <span>Loading documents...</span>
      </div>
    );
  }

  const selectedDocument = documents?.find(d => d.id === selectedDocumentId);

  return (
    <div className="document-version-control-panel">
      <div className="document-version-control-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="document-version-control-back" onClick={goBack}>
            <ArrowLeft size={14} />
            Back
          </button>
          <h2 className="document-version-control-title">
            <FileText size={20} />
            Document Version Control
          </h2>
        </div>
        {onClose && (
          <button className="document-version-control-close" onClick={onClose}>
            ×
          </button>
        )}
      </div>

      {/* Document Selector */}
      {documents && documents.length > 0 && (
        <div className="document-version-control-doc-selector">
          <label>Document:</label>
          <select
            value={selectedDocumentId || ''}
            onChange={(e) => setSelectedDocumentId(e.target.value)}
            className="document-version-control-select"
          >
            {documents.map(doc => (
              <option key={doc.id} value={doc.id}>
                {doc.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="document-version-control-tabs">
        <button
          className={`document-version-control-tab ${viewMode === 'history' ? 'active' : ''}`}
          onClick={() => {
            setViewMode('history');
            setCompareState(null);
          }}
        >
          <History size={16} />
          History
        </button>
        <button
          className={`document-version-control-tab ${viewMode === 'compare' ? 'active' : ''}`}
          onClick={() => {
            if (compareState) {
              setViewMode('compare');
            }
          }}
          disabled={!compareState}
        >
          <ArrowLeftRight size={16} />
          Compare
        </button>
        <button
          className={`document-version-control-tab ${viewMode === 'save' ? 'active' : ''}`}
          onClick={() => setShowSaveDialog(true)}
        >
          <Plus size={16} />
          Save New
        </button>
      </div>

      {/* Content Area */}
      <div className="document-version-control-content">
        {!selectedDocumentId ? (
          <div className="document-version-control-empty">
            <FileText size={48} />
            <p>No document selected</p>
            <p className="document-version-control-empty-hint">
              {!documents || documents.length === 0
                ? 'Create a new document version to get started'
                : 'Select a document from the dropdown above'}
            </p>
          </div>
        ) : viewMode === 'compare' && compareState ? (
          <VersionComparisonView
            documentId={selectedDocumentId}
            versionAId={compareState.versionAId}
            versionBId={compareState.versionBId}
            isSubVersionA={compareState.isSubVersionA}
            isSubVersionB={compareState.isSubVersionB}
            onClose={() => {
              setCompareState(null);
              setViewMode('history');
            }}
          />
        ) : (
          <VersionHistoryPanel
            documentId={selectedDocumentId}
            onRestore={handleRestore}
            onCompare={handleCompare}
            onView={(versionId, isSubVersion) => {
              // Handle view action - could open a modal or navigate
              console.log('View version:', versionId, isSubVersion);
            }}
          />
        )}
      </div>

      {/* Save Dialog */}
      {showSaveDialog && (
        <SaveVersionDialog
          documentId={selectedDocumentId}
          documentName={selectedDocument?.name}
          onClose={() => setShowSaveDialog(false)}
          onSave={async (newDocumentId) => {
            setShowSaveDialog(false);
            // Reload documents list to show the newly saved document
            try {
              const docs = await documentVersionApi.listDocuments();
              const documentsArray = Array.isArray(docs) ? docs : [];
              setDocuments(documentsArray);
              
              // Select the newly created document, or keep current selection
              if (newDocumentId) {
                // Check if the document exists in the list
                const foundDoc = documentsArray.find(d => d.id === newDocumentId);
                if (foundDoc) {
                  setSelectedDocumentId(newDocumentId);
                } else if (documentsArray.length > 0) {
                  // Fallback to first document if new one not found
                  setSelectedDocumentId(documentsArray[0].id);
                }
              } else if (!selectedDocumentId && documentsArray.length > 0) {
                // If no documentId provided but we have documents, select first
                setSelectedDocumentId(documentsArray[0].id);
              }
            } catch (error) {
              console.error('Failed to reload documents after save:', error);
              // Still reload using the existing function as fallback
              await loadDocuments();
            }
          }}
        />
      )}
    </div>
  );
};

