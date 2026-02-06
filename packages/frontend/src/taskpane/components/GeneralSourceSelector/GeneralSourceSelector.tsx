/**
 * GeneralSourceSelector Component
 * 
 * Allows users to select sources for AI analysis:
 * - Current document
 * - Vault clauses and playbooks
 * - Uploaded files
 * - Imported sources from external systems
 * - Web search
 */

import * as React from "react";
import {
  FileText,
  Book,
  Upload,
  Download,
  X,
  ChevronDown,
  Check,
  Folder,
  HardDrive,
  Cloud,
  Search,
} from "lucide-react";
import type { GeneralSourceConfig, ImportedSource } from "../../../types/panelTypes";
import { backendApi, getAuthHeaders } from "../../../services/api";
import { buildApiUrl } from "../../../services/apiBaseUrl";
import { libraryApi } from "../../../services/libraryApi";
import "./GeneralSourceSelector.css";

// ============================================================================
// TYPES
// ============================================================================

interface ClauseListItem {
  id: string;
  name: string;
  text?: string;
}

interface PlaybookListItem {
  id: string;
  playbookName: string;
}

interface GeneralSourceSelectorProps {
  sourceConfig: GeneralSourceConfig;
  onSourceConfigChange: (config: GeneralSourceConfig) => void;
  disabled?: boolean;
  variant?: 'default' | 'glass_compact';
}

type ImportSourceType = ImportedSource['type'];

// ============================================================================
// HELPERS
// ============================================================================

function getImportSourceDisplayName(type: ImportSourceType): string {
  switch (type) {
    case 'imanage':
      return 'iManage';
    case 'googledrive':
      return 'Google Drive';
    case 'sharepoint':
      return 'SharePoint';
    default:
      return type;
  }
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve((e.target?.result as string) || '');
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const GeneralSourceSelector: React.FC<GeneralSourceSelectorProps> = ({
  sourceConfig,
  onSourceConfigChange,
  disabled = false,
  variant = 'default',
}) => {
  // State
  const [clauses, setClauses] = React.useState<ClauseListItem[]>([]);
  const [playbooks, setPlaybooks] = React.useState<PlaybookListItem[]>([]);
  const [loadingClauses, setLoadingClauses] = React.useState(false);
  const [loadingPlaybooks, setLoadingPlaybooks] = React.useState(false);
  const [showClauseDropdown, setShowClauseDropdown] = React.useState(false);
  const [showPlaybookDropdown, setShowPlaybookDropdown] = React.useState(false);
  const [showImportDropdown, setShowImportDropdown] = React.useState(false);
  const [clauseSearchQuery, setClauseSearchQuery] = React.useState("");
  const [playbookSearchQuery, setPlaybookSearchQuery] = React.useState("");

  // Refs
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const clauseDropdownRef = React.useRef<HTMLDivElement>(null);
  const playbookDropdownRef = React.useRef<HTMLDivElement>(null);
  const importDropdownRef = React.useRef<HTMLDivElement>(null);

  // Fetch clauses - only when dropdown is opened
  const fetchClauses = React.useCallback(async () => {
    if (clauses.length > 0 || loadingClauses) return; // Already loaded or loading
    
    setLoadingClauses(true);
    try {
      const clausesList = await libraryApi.getClauses();
      setClauses(
        (clausesList || []).map((c) => ({
          id: c.id,
          name: c.name,
          text: '',
        }))
      );
    } catch (err) {
      console.warn("Failed to fetch clauses:", err);
      try {
        const response = await fetch(buildApiUrl("/api/vault/clauses"), {
          headers: getAuthHeaders(),
        });
        if (response.ok) {
          const text = await response.text();
          if (text) {
            const data = JSON.parse(text);
            setClauses(data.clauses || []);
          } else {
            setClauses([]);
          }
        } else {
          setClauses([]);
        }
      } catch (fallbackErr) {
        console.warn("Fallback clause fetch also failed:", fallbackErr);
        setClauses([]);
      }
    } finally {
      setLoadingClauses(false);
    }
  }, [clauses.length, loadingClauses]);

  // Fetch playbooks - only when dropdown is opened
  const fetchPlaybooks = React.useCallback(async () => {
    if (playbooks.length > 0 || loadingPlaybooks) return; // Already loaded or loading
    
    setLoadingPlaybooks(true);
    try {
      const playbooksList = await libraryApi.getPlaybooks({ limit: 50 });
      setPlaybooks(
        (playbooksList || []).map((p) => ({
          id: p.id,
          playbookName: p.name,
        }))
      );
    } catch (err) {
      console.warn("Failed to fetch playbooks:", err);
      try {
        const response = await backendApi.getPlaybooks(1, 50);
        setPlaybooks(response?.data || []);
      } catch (fallbackErr) {
        console.warn("Fallback playbook fetch also failed:", fallbackErr);
        setPlaybooks([]);
      }
    } finally {
      setLoadingPlaybooks(false);
    }
  }, [playbooks.length, loadingPlaybooks]);

  // Fetch playbooks
  React.useEffect(() => {
    const fetchPlaybooks = async () => {
      try {
        setLoadingPlaybooks(true);
        const playbooksList = await libraryApi.getPlaybooks({ limit: 50 });
        setPlaybooks(
          playbooksList.map((p) => ({
            id: p.id,
            playbookName: p.name,
          }))
        );
      } catch (err) {
        console.error("Failed to fetch playbooks:", err);
        // Fallback to old API
        try {
          const response = await backendApi.getPlaybooks(1, 50);
          setPlaybooks(response.data || []);
        } catch (fallbackErr) {
          console.error("Fallback fetch also failed:", fallbackErr);
        }
      } finally {
        setLoadingPlaybooks(false);
      }
    };
    fetchPlaybooks();
  }, []);

  // Close dropdowns on outside click
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (clauseDropdownRef.current && !clauseDropdownRef.current.contains(target)) {
        setShowClauseDropdown(false);
      }
      if (playbookDropdownRef.current && !playbookDropdownRef.current.contains(target)) {
        setShowPlaybookDropdown(false);
      }
      if (importDropdownRef.current && !importDropdownRef.current.contains(target)) {
        setShowImportDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handlers
  const handleIncludeDocumentToggle = () => {
    onSourceConfigChange({
      ...sourceConfig,
      includeDocument: !sourceConfig.includeDocument,
    });
  };

  const handleWebSearchToggle = () => {
    onSourceConfigChange({
      ...sourceConfig,
      enableWebSearch: !sourceConfig.enableWebSearch,
    });
  };

  const toggleClause = (clauseId: string) => {
    const newClauses = sourceConfig.vaultClauses.includes(clauseId)
      ? sourceConfig.vaultClauses.filter((id) => id !== clauseId)
      : [...sourceConfig.vaultClauses, clauseId];
    onSourceConfigChange({
      ...sourceConfig,
      vaultClauses: newClauses,
    });
  };

  const togglePlaybook = (playbookId: string) => {
    const newPlaybooks = sourceConfig.vaultPlaybooks.includes(playbookId)
      ? sourceConfig.vaultPlaybooks.filter((id) => id !== playbookId)
      : [...sourceConfig.vaultPlaybooks, playbookId];
    onSourceConfigChange({
      ...sourceConfig,
      vaultPlaybooks: newPlaybooks,
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const newFiles: GeneralSourceConfig['uploadedFiles'] = [];
    for (const file of Array.from(files)) {
      // TODO: Extract text content from PDF/DOCX using proper parsers
      const content = await readFileAsText(file);
      newFiles.push({
        id: generateId(),
        name: file.name,
        content,
      });
    }

    onSourceConfigChange({
      ...sourceConfig,
      uploadedFiles: [...sourceConfig.uploadedFiles, ...newFiles],
    });

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeUploadedFile = (fileId: string) => {
    onSourceConfigChange({
      ...sourceConfig,
      uploadedFiles: sourceConfig.uploadedFiles.filter((f) => f.id !== fileId),
    });
  };

  const handleImport = async (type: ImportSourceType) => {
    setShowImportDropdown(false);
    
    // TODO: Implement actual import dialogs for each provider
    const importedSource: ImportedSource = {
      id: generateId(),
      type,
      name: `Imported from ${getImportSourceDisplayName(type)}`,
      content: `Placeholder content from ${type}`,
    };

    onSourceConfigChange({
      ...sourceConfig,
      importedSources: [...sourceConfig.importedSources, importedSource],
    });
  };

  const removeImportedSource = (sourceId: string) => {
    onSourceConfigChange({
      ...sourceConfig,
      importedSources: sourceConfig.importedSources.filter((s) => s.id !== sourceId),
    });
  };

  // Derived state
  const selectedClauses = clauses.filter((c) => sourceConfig.vaultClauses.includes(c.id));
  const selectedPlaybooks = playbooks.filter((p) => sourceConfig.vaultPlaybooks.includes(p.id));

  const filteredClauses = clauses.filter(
    (c) =>
      clauseSearchQuery.trim() === '' ||
      c.name.toLowerCase().includes(clauseSearchQuery.toLowerCase())
  );

  const filteredPlaybooks = playbooks.filter(
    (p) =>
      playbookSearchQuery.trim() === '' ||
      p.playbookName.toLowerCase().includes(playbookSearchQuery.toLowerCase())
  );

  const hasSelectedSources =
    selectedClauses.length > 0 ||
    selectedPlaybooks.length > 0 ||
    sourceConfig.uploadedFiles.length > 0 ||
    sourceConfig.importedSources.length > 0;

  // Render
  return (
    <div className={`general-source-selector ${variant === 'glass_compact' ? 'general-source-selector--compact' : ''}`}>
      {/* Include Document Toggle */}
      <label className="general-source-toggle">
        <input
          type="checkbox"
          checked={sourceConfig.includeDocument}
          onChange={handleIncludeDocumentToggle}
          disabled={disabled}
        />
        <span>Include current document</span>
      </label>

      {/* Web Search Toggle */}
      <label className="general-source-toggle">
        <input
          type="checkbox"
          checked={sourceConfig.enableWebSearch ?? false}
          onChange={handleWebSearchToggle}
          disabled={disabled}
        />
        <span>
          <Search size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
          Enable web search
        </span>
      </label>

      {/* Vault Sources */}
      <div className="general-source-section">
        <div className="general-source-section-label">Vault Sources</div>
        <div className="general-source-vault-buttons">
          {/* Clause Library */}
          <div className="general-source-dropdown-wrapper" ref={clauseDropdownRef}>
            <button
              className={`general-source-vault-button ${showClauseDropdown ? 'active' : ''}`}
              onClick={() => {
                const opening = !showClauseDropdown;
                setShowClauseDropdown(opening);
                if (opening) fetchClauses(); // Fetch only when opening
              }}
              disabled={disabled}
            >
              <FileText size={16} />
              <span>Clause Library</span>
              {sourceConfig.vaultClauses.length > 0 && (
                <span className="general-source-badge">{sourceConfig.vaultClauses.length}</span>
              )}
              <ChevronDown size={14} className={showClauseDropdown ? 'open' : ''} />
            </button>
            {showClauseDropdown && (
              <div className="general-source-dropdown">
                <div className="general-source-dropdown-search">
                  <input
                    type="text"
                    placeholder="Search clauses..."
                    value={clauseSearchQuery}
                    onChange={(e) => setClauseSearchQuery(e.target.value)}
                  />
                </div>
                {loadingClauses ? (
                  <div className="general-source-loading">Loading...</div>
                ) : filteredClauses.length === 0 ? (
                  <div className="general-source-empty">No clauses available</div>
                ) : (
                  <div className="general-source-dropdown-list">
                    {filteredClauses.map((clause) => (
                      <button
                        key={clause.id}
                        className={`general-source-dropdown-item ${
                          sourceConfig.vaultClauses.includes(clause.id) ? 'selected' : ''
                        }`}
                        onClick={() => toggleClause(clause.id)}
                      >
                        <span>{clause.name}</span>
                        {sourceConfig.vaultClauses.includes(clause.id) && <Check size={14} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Playbook Library */}
          <div className="general-source-dropdown-wrapper" ref={playbookDropdownRef}>
            <button
              className={`general-source-vault-button ${showPlaybookDropdown ? 'active' : ''}`}
              onClick={() => {
                const opening = !showPlaybookDropdown;
                setShowPlaybookDropdown(opening);
                if (opening) fetchPlaybooks(); // Fetch only when opening
              }}
              disabled={disabled}
            >
              <Book size={16} />
              <span>Playbook Library</span>
              {sourceConfig.vaultPlaybooks.length > 0 && (
                <span className="general-source-badge">{sourceConfig.vaultPlaybooks.length}</span>
              )}
              <ChevronDown size={14} className={showPlaybookDropdown ? 'open' : ''} />
            </button>
            {showPlaybookDropdown && (
              <div className="general-source-dropdown">
                <div className="general-source-dropdown-search">
                  <input
                    type="text"
                    placeholder="Search playbooks..."
                    value={playbookSearchQuery}
                    onChange={(e) => setPlaybookSearchQuery(e.target.value)}
                  />
                </div>
                {loadingPlaybooks ? (
                  <div className="general-source-loading">Loading...</div>
                ) : filteredPlaybooks.length === 0 ? (
                  <div className="general-source-empty">No playbooks available</div>
                ) : (
                  <div className="general-source-dropdown-list">
                    {filteredPlaybooks.map((playbook) => (
                      <button
                        key={playbook.id}
                        className={`general-source-dropdown-item ${
                          sourceConfig.vaultPlaybooks.includes(playbook.id) ? 'selected' : ''
                        }`}
                        onClick={() => togglePlaybook(playbook.id)}
                      >
                        <span>{playbook.playbookName}</span>
                        {sourceConfig.vaultPlaybooks.includes(playbook.id) && <Check size={14} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upload and Import */}
      <div className="general-source-actions">
        <label className="general-source-upload-button">
          <Upload size={16} />
          <span>Upload Source</span>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.docx,.doc,.txt"
            onChange={handleFileUpload}
            disabled={disabled}
            style={{ display: 'none' }}
          />
        </label>

        <div className="general-source-dropdown-wrapper" ref={importDropdownRef}>
          <button
            className={`general-source-import-button ${showImportDropdown ? 'active' : ''}`}
            onClick={() => setShowImportDropdown(!showImportDropdown)}
            disabled={disabled}
          >
            <Download size={16} />
            <span>Import</span>
            <ChevronDown size={14} className={showImportDropdown ? 'open' : ''} />
          </button>
          {showImportDropdown && (
            <div className="general-source-import-dropdown">
              <button
                className="general-source-import-option"
                onClick={() => handleImport('imanage')}
              >
                <Folder size={16} />
                <span>iManage</span>
              </button>
              <button
                className="general-source-import-option"
                onClick={() => handleImport('googledrive')}
              >
                <HardDrive size={16} />
                <span>Google Drive</span>
              </button>
              <button
                className="general-source-import-option"
                onClick={() => handleImport('sharepoint')}
              >
                <Cloud size={16} />
                <span>SharePoint</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Selected Sources Display */}
      {hasSelectedSources && (
        <div className="general-source-selected">
          {selectedClauses.map((clause) => (
            <span key={clause.id} className="general-source-chip">
              <FileText size={12} />
              <span>Clause: {clause.name}</span>
              <button
                className="general-source-chip-remove"
                onClick={() => toggleClause(clause.id)}
                disabled={disabled}
              >
                <X size={12} />
              </button>
            </span>
          ))}
          {selectedPlaybooks.map((playbook) => (
            <span key={playbook.id} className="general-source-chip">
              <Book size={12} />
              <span>Playbook: {playbook.playbookName}</span>
              <button
                className="general-source-chip-remove"
                onClick={() => togglePlaybook(playbook.id)}
                disabled={disabled}
              >
                <X size={12} />
              </button>
            </span>
          ))}
          {sourceConfig.uploadedFiles.map((file) => (
            <span key={file.id} className="general-source-chip">
              <Upload size={12} />
              <span>{file.name}</span>
              <button
                className="general-source-chip-remove"
                onClick={() => removeUploadedFile(file.id)}
                disabled={disabled}
              >
                <X size={12} />
              </button>
            </span>
          ))}
          {sourceConfig.importedSources.map((source) => (
            <span key={source.id} className="general-source-chip">
              {source.type === 'imanage' && <Folder size={12} />}
              {source.type === 'googledrive' && <HardDrive size={12} />}
              {source.type === 'sharepoint' && <Cloud size={12} />}
              <span className="general-source-chip-type">
                {getImportSourceDisplayName(source.type)}: {source.name}
              </span>
              <button
                className="general-source-chip-remove"
                onClick={() => removeImportedSource(source.id)}
                disabled={disabled}
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default GeneralSourceSelector;