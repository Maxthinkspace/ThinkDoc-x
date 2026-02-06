import * as React from "react";
import { X, Search, FileText, Book, Check } from "lucide-react";
import { libraryApi } from "../../../services/libraryApi";
import type { GeneralSourceConfig } from "../../../types/panelTypes";
import "./ContextSelector.css";

interface ContextSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  sourceConfig: GeneralSourceConfig;
  onSourceConfigChange: (config: GeneralSourceConfig) => void;
  onInsertMention: (text: string) => void;
}

interface ClauseItem {
  id: string;
  name: string;
}

interface PlaybookItem {
  id: string;
  name: string;
}

export const ContextSelector: React.FC<ContextSelectorProps> = ({
  isOpen,
  onClose,
  sourceConfig,
  onSourceConfigChange,
  onInsertMention,
}) => {
  const [clauses, setClauses] = React.useState<ClauseItem[]>([]);
  const [playbooks, setPlaybooks] = React.useState<PlaybookItem[]>([]);
  const [clauseSearchQuery, setClauseSearchQuery] = React.useState("");
  const [playbookSearchQuery, setPlaybookSearchQuery] = React.useState("");
  const [activeTab, setActiveTab] = React.useState<"clauses" | "playbooks">("clauses");
  const [isLoadingClauses, setIsLoadingClauses] = React.useState(false);
  const [isLoadingPlaybooks, setIsLoadingPlaybooks] = React.useState(false);
  const popupRef = React.useRef<HTMLDivElement>(null);

  // Fetch clauses and playbooks
  React.useEffect(() => {
    if (isOpen) {
      fetchClauses();
      fetchPlaybooks();
    }
  }, [isOpen]);

  // Close on outside click
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    
    return () => {
      if (isOpen) {
        document.removeEventListener("mousedown", handleClickOutside);
      }
    };
  }, [isOpen, onClose]);

  const fetchClauses = async () => {
    setIsLoadingClauses(true);
    try {
      const clausesList = await libraryApi.getClauses({ limit: 100 });
      setClauses(
        clausesList.map((c) => ({
          id: c.id,
          name: c.name,
        }))
      );
    } catch (error) {
      console.error("Failed to fetch clauses:", error);
    } finally {
      setIsLoadingClauses(false);
    }
  };

  const fetchPlaybooks = async () => {
    setIsLoadingPlaybooks(true);
    try {
      const playbooksList = await libraryApi.getPlaybooks({ limit: 100 });
      setPlaybooks(
        playbooksList.map((p) => ({
          id: p.id,
          name: p.name,
        }))
      );
    } catch (error) {
      console.error("Failed to fetch playbooks:", error);
    } finally {
      setIsLoadingPlaybooks(false);
    }
  };

  const toggleClause = (clauseId: string) => {
    const newClauses = sourceConfig.vaultClauses.includes(clauseId)
      ? sourceConfig.vaultClauses.filter((id) => id !== clauseId)
      : [...sourceConfig.vaultClauses, clauseId];
    
    const clause = clauses.find((c) => c.id === clauseId);
    if (clause) {
      if (newClauses.includes(clauseId)) {
        onInsertMention(`@${clause.name}`);
      }
    }

    onSourceConfigChange({
      ...sourceConfig,
      vaultClauses: newClauses,
    });
  };

  const togglePlaybook = (playbookId: string) => {
    const newPlaybooks = sourceConfig.vaultPlaybooks.includes(playbookId)
      ? sourceConfig.vaultPlaybooks.filter((id) => id !== playbookId)
      : [...sourceConfig.vaultPlaybooks, playbookId];
    
    const playbook = playbooks.find((p) => p.id === playbookId);
    if (playbook) {
      if (newPlaybooks.includes(playbookId)) {
        onInsertMention(`@${playbook.name}`);
      }
    }

    onSourceConfigChange({
      ...sourceConfig,
      vaultPlaybooks: newPlaybooks,
    });
  };

  const filteredClauses = clauses.filter(
    (c) =>
      clauseSearchQuery.trim() === "" ||
      c.name.toLowerCase().includes(clauseSearchQuery.toLowerCase())
  );

  const filteredPlaybooks = playbooks.filter(
    (p) =>
      playbookSearchQuery.trim() === "" ||
      p.name.toLowerCase().includes(playbookSearchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="context-selector-overlay">
      <div className="context-selector-popup" ref={popupRef}>
        <div className="context-selector-header">
          <h3 className="context-selector-title">Add Context</h3>
          <button className="context-selector-close" onClick={onClose} type="button">
            <X size={18} />
          </button>
        </div>

        <div className="context-selector-tabs">
          <button
            className={`context-selector-tab ${activeTab === "clauses" ? "active" : ""}`}
            onClick={() => setActiveTab("clauses")}
            type="button"
          >
            <FileText size={16} />
            <span>Clauses</span>
            {sourceConfig.vaultClauses.length > 0 && (
              <span className="context-selector-badge">{sourceConfig.vaultClauses.length}</span>
            )}
          </button>
          <button
            className={`context-selector-tab ${activeTab === "playbooks" ? "active" : ""}`}
            onClick={() => setActiveTab("playbooks")}
            type="button"
          >
            <Book size={16} />
            <span>Playbooks</span>
            {sourceConfig.vaultPlaybooks.length > 0 && (
              <span className="context-selector-badge">{sourceConfig.vaultPlaybooks.length}</span>
            )}
          </button>
        </div>

        <div className="context-selector-content">
          {activeTab === "clauses" && (
            <>
              <div className="context-selector-search">
                <Search size={16} />
                <input
                  type="text"
                  placeholder="Search clauses..."
                  value={clauseSearchQuery}
                  onChange={(e) => setClauseSearchQuery(e.target.value)}
                />
              </div>
              <div className="context-selector-list">
                {isLoadingClauses ? (
                  <div className="context-selector-loading">Loading clauses...</div>
                ) : filteredClauses.length === 0 ? (
                  <div className="context-selector-empty">
                    {clauseSearchQuery ? "No clauses found" : "No clauses available"}
                  </div>
                ) : (
                  filteredClauses.map((clause) => (
                    <button
                      key={clause.id}
                      className={`context-selector-item ${
                        sourceConfig.vaultClauses.includes(clause.id) ? "selected" : ""
                      }`}
                      onClick={() => toggleClause(clause.id)}
                      type="button"
                    >
                      <FileText size={16} />
                      <span className="context-selector-item-name">{clause.name}</span>
                      {sourceConfig.vaultClauses.includes(clause.id) && (
                        <Check size={16} className="context-selector-check" />
                      )}
                    </button>
                  ))
                )}
              </div>
            </>
          )}

          {activeTab === "playbooks" && (
            <>
              <div className="context-selector-search">
                <Search size={16} />
                <input
                  type="text"
                  placeholder="Search playbooks..."
                  value={playbookSearchQuery}
                  onChange={(e) => setPlaybookSearchQuery(e.target.value)}
                />
              </div>
              <div className="context-selector-list">
                {isLoadingPlaybooks ? (
                  <div className="context-selector-loading">Loading playbooks...</div>
                ) : filteredPlaybooks.length === 0 ? (
                  <div className="context-selector-empty">
                    {playbookSearchQuery ? "No playbooks found" : "No playbooks available"}
                  </div>
                ) : (
                  filteredPlaybooks.map((playbook) => (
                    <button
                      key={playbook.id}
                      className={`context-selector-item ${
                        sourceConfig.vaultPlaybooks.includes(playbook.id) ? "selected" : ""
                      }`}
                      onClick={() => togglePlaybook(playbook.id)}
                      type="button"
                    >
                      <Book size={16} />
                      <span className="context-selector-item-name">{playbook.name}</span>
                      {sourceConfig.vaultPlaybooks.includes(playbook.id) && (
                        <Check size={16} className="context-selector-check" />
                      )}
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </div>

        {/* Selected Sources Summary */}
        {(sourceConfig.vaultClauses.length > 0 || sourceConfig.vaultPlaybooks.length > 0) && (
          <div className="context-selector-footer">
            <div className="context-selector-selected-count">
              {sourceConfig.vaultClauses.length + sourceConfig.vaultPlaybooks.length} source
              {sourceConfig.vaultClauses.length + sourceConfig.vaultPlaybooks.length !== 1 ? "s" : ""}{" "}
              selected
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

