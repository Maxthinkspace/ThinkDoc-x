import * as React from "react";
import { X, FileText, Book, Folder, ChevronDown, Check, Loader, Sparkles } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import { useToast } from "../../hooks/use-toast";
import { backendApi } from "../../../services/api";
import { buildApiUrl } from "../../../services/apiBaseUrl";
import "./DraftClauseDialog.css";

interface DraftClauseDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onDraftComplete?: (draftedText: string) => void;
}

interface Clause {
  id: string;
  name: string;
  text: string;
  category?: string;
  tags?: string[];
}

interface Playbook {
  id: string;
  playbookName: string;
  description?: string;
  playbookType?: string;
}

interface Project {
  id: string;
  name: string;
  description?: string;
}

const CLAUSE_TYPES = [
  "Confidentiality",
  "Termination",
  "Payment",
  "Liability",
  "Indemnification",
  "Warranty",
  "Intellectual Property",
  "Governing Law",
  "Dispute Resolution",
  "Force Majeure",
  "Non-Compete",
  "Data Protection",
  "Other",
];

export const DraftClauseDialog: React.FC<DraftClauseDialogProps> = ({
  isOpen,
  onClose,
  onDraftComplete,
}) => {
  const { translations } = useLanguage();
  const { toast } = useToast();
  const [instructions, setInstructions] = React.useState("");
  const [selectedClauseType, setSelectedClauseType] = React.useState<string>("");
  const [showClauseTypeDropdown, setShowClauseTypeDropdown] = React.useState(false);
  const [selectedClauses, setSelectedClauses] = React.useState<Set<string>>(new Set());
  const [selectedPlaybooks, setSelectedPlaybooks] = React.useState<Set<string>>(new Set());
  const [selectedProjects, setSelectedProjects] = React.useState<Set<string>>(new Set());
  const [showClauseLibrary, setShowClauseLibrary] = React.useState(false);
  const [showPlaybookLibrary, setShowPlaybookLibrary] = React.useState(false);
  const [showProjectLibrary, setShowProjectLibrary] = React.useState(false);
  const [isDrafting, setIsDrafting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  
  const [clauses, setClauses] = React.useState<Clause[]>([]);
  const [playbooks, setPlaybooks] = React.useState<Playbook[]>([]);
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [loadingClauses, setLoadingClauses] = React.useState(false);
  const [loadingPlaybooks, setLoadingPlaybooks] = React.useState(false);
  const [loadingProjects, setLoadingProjects] = React.useState(false);

  const clauseTypeRef = React.useRef<HTMLDivElement>(null);
  const clauseLibraryRef = React.useRef<HTMLDivElement>(null);
  const playbookLibraryRef = React.useRef<HTMLDivElement>(null);
  const projectLibraryRef = React.useRef<HTMLDivElement>(null);

  // Fetch clauses
  const fetchClauses = React.useCallback(async () => {
    try {
      setLoadingClauses(true);
      const token = localStorage.getItem("authToken");
      const headers: HeadersInit = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const response = await fetch(buildApiUrl("/api/vault/clauses"), { headers });
      if (!response.ok) throw new Error("Failed to fetch clauses");
      const data = await response.json();
      setClauses(data.clauses || []);
    } catch (err) {
      console.error("Failed to fetch clauses:", err);
    } finally {
      setLoadingClauses(false);
    }
  }, []);

  // Fetch playbooks
  const fetchPlaybooks = React.useCallback(async () => {
    try {
      setLoadingPlaybooks(true);
      const response = await backendApi.getPlaybooks(1, 50);
      setPlaybooks(response.data || []);
    } catch (err) {
      console.error("Failed to fetch playbooks:", err);
    } finally {
      setLoadingPlaybooks(false);
    }
  }, []);

  // Fetch projects
  const fetchProjects = React.useCallback(async () => {
    try {
      setLoadingProjects(true);
      const response = await fetch(buildApiUrl("/api/vault/projects"));
      if (!response.ok) throw new Error("Failed to fetch projects");
      const data = await response.json();
      setProjects(data.projects || []);
    } catch (err) {
      console.error("Failed to fetch projects:", err);
    } finally {
      setLoadingProjects(false);
    }
  }, []);

  // Load data when dialog opens
  React.useEffect(() => {
    if (isOpen) {
      fetchClauses();
      fetchPlaybooks();
      fetchProjects();
    } else {
      // Reset state when closed
      setInstructions("");
      setSelectedClauseType("");
      setSelectedClauses(new Set());
      setSelectedPlaybooks(new Set());
      setSelectedProjects(new Set());
      setError(null);
    }
  }, [isOpen, fetchClauses, fetchPlaybooks, fetchProjects]);

  // Close dropdowns when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (clauseTypeRef.current && !clauseTypeRef.current.contains(event.target as Node)) {
        setShowClauseTypeDropdown(false);
      }
      if (clauseLibraryRef.current && !clauseLibraryRef.current.contains(event.target as Node)) {
        setShowClauseLibrary(false);
      }
      if (playbookLibraryRef.current && !playbookLibraryRef.current.contains(event.target as Node)) {
        setShowPlaybookLibrary(false);
      }
      if (projectLibraryRef.current && !projectLibraryRef.current.contains(event.target as Node)) {
        setShowProjectLibrary(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
    return undefined;
  }, [isOpen]);

  const toggleClause = (clauseId: string) => {
    const newSet = new Set(selectedClauses);
    if (newSet.has(clauseId)) {
      newSet.delete(clauseId);
    } else {
      newSet.add(clauseId);
    }
    setSelectedClauses(newSet);
  };

  const togglePlaybook = (playbookId: string) => {
    const newSet = new Set(selectedPlaybooks);
    if (newSet.has(playbookId)) {
      newSet.delete(playbookId);
    } else {
      newSet.add(playbookId);
    }
    setSelectedPlaybooks(newSet);
  };

  const toggleProject = (projectId: string) => {
    const newSet = new Set(selectedProjects);
    if (newSet.has(projectId)) {
      newSet.delete(projectId);
    } else {
      newSet.add(projectId);
    }
    setSelectedProjects(newSet);
  };

  const handleDraft = async () => {
    if (!instructions.trim()) {
      setError("Please provide instructions for drafting the clause");
      return;
    }

    setIsDrafting(true);
    setError(null);

    try {
      const selectedClauseTexts = clauses
        .filter((c) => selectedClauses.has(c.id))
        .map((c) => c.text);

      const selectedPlaybookNames = playbooks
        .filter((p) => selectedPlaybooks.has(p.id))
        .map((p) => p.playbookName);

      const selectedProjectNames = projects
        .filter((p) => selectedProjects.has(p.id))
        .map((p) => p.name);

      // Call backend API to draft clause
      const token = localStorage.getItem("authToken");
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const response = await fetch(buildApiUrl("/api/vault/clauses/draft"), {
        method: "POST",
        headers,
        body: JSON.stringify({
          instructions: instructions.trim(),
          clauseType: selectedClauseType || null,
          referenceClauses: selectedClauseTexts,
          referencePlaybooks: selectedPlaybookNames,
          referenceProjects: selectedProjectNames,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to draft clause" }));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const draftedText = data.clauseText || "";

      toast({
        title: "Clause Drafted",
        description: "Your clause has been drafted successfully.",
      });

      if (onDraftComplete) {
        onDraftComplete(draftedText);
      }

      onClose();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to draft clause";
      setError(errorMsg);
      toast({
        title: "Error",
        description: errorMsg,
        variant: "error",
      });
    } finally {
      setIsDrafting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="draft-clause-overlay" onClick={onClose}>
      <div className="draft-clause-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="draft-clause-header">
          <div className="draft-clause-header-left">
            <Sparkles size={20} className="draft-clause-icon" />
            <h2 className="draft-clause-title">Draft Clause</h2>
          </div>
          <button className="draft-clause-close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="draft-clause-content">
          {/* Instructions */}
          <div className="draft-clause-field">
            <label className="draft-clause-label">
              Instructions *
            </label>
            <textarea
              className="draft-clause-textarea"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Describe the clause you want to draft, including key terms, requirements, and any specific language..."
              rows={6}
              disabled={isDrafting}
            />
          </div>

          {/* Clause Type */}
          <div className="draft-clause-field">
            <label className="draft-clause-label">Clause Type</label>
            <div className="draft-clause-dropdown-wrapper" ref={clauseTypeRef}>
              <button
                className={`draft-clause-dropdown-button ${showClauseTypeDropdown ? "active" : ""}`}
                onClick={() => setShowClauseTypeDropdown(!showClauseTypeDropdown)}
                disabled={isDrafting}
              >
                <span>{selectedClauseType || "Select clause type..."}</span>
                <ChevronDown size={16} className={`draft-clause-chevron ${showClauseTypeDropdown ? "open" : ""}`} />
              </button>
              {showClauseTypeDropdown && (
                <div className="draft-clause-dropdown">
                  {CLAUSE_TYPES.map((type) => (
                    <button
                      key={type}
                      className={`draft-clause-dropdown-item ${selectedClauseType === type ? "selected" : ""}`}
                      onClick={() => {
                        setSelectedClauseType(type);
                        setShowClauseTypeDropdown(false);
                      }}
                    >
                      <span>{type}</span>
                      {selectedClauseType === type && <Check size={16} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Reference Sections */}
          <div className="draft-clause-references">
            {/* Clause Library */}
            <div className="draft-clause-reference-section">
              <div className="draft-clause-reference-header">
                <FileText size={16} />
                <span>Reference Clauses</span>
                <button
                  className="draft-clause-toggle-library"
                  onClick={() => setShowClauseLibrary(!showClauseLibrary)}
                >
                  {showClauseLibrary ? "Hide" : "Browse"}
                </button>
              </div>
              {selectedClauses.size > 0 && (
                <div className="draft-clause-selected-items">
                  {clauses
                    .filter((c) => selectedClauses.has(c.id))
                    .map((c) => (
                      <span key={c.id} className="draft-clause-selected-chip">
                        {c.name}
                        <button
                          type="button"
                          className="draft-clause-chip-remove"
                          onClick={() => toggleClause(c.id)}
                          disabled={isDrafting}
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                </div>
              )}
              {showClauseLibrary && (
                <div className="draft-clause-library-panel" ref={clauseLibraryRef}>
                  {loadingClauses ? (
                    <div className="draft-clause-loading">Loading clauses...</div>
                  ) : clauses.length === 0 ? (
                    <div className="draft-clause-empty">No clauses found</div>
                  ) : (
                    <div className="draft-clause-library-list">
                      {clauses.map((clause) => (
                        <button
                          key={clause.id}
                          className={`draft-clause-library-item ${selectedClauses.has(clause.id) ? "selected" : ""}`}
                          onClick={() => toggleClause(clause.id)}
                        >
                          <div className="draft-clause-library-item-content">
                            <span className="draft-clause-library-item-name">{clause.name}</span>
                            {clause.category && (
                              <span className="draft-clause-library-item-meta">{clause.category}</span>
                            )}
                          </div>
                          {selectedClauses.has(clause.id) && <Check size={16} />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Playbook Library */}
            <div className="draft-clause-reference-section">
              <div className="draft-clause-reference-header">
                <Book size={16} />
                <span>Reference Playbooks</span>
                <button
                  className="draft-clause-toggle-library"
                  onClick={() => setShowPlaybookLibrary(!showPlaybookLibrary)}
                >
                  {showPlaybookLibrary ? "Hide" : "Browse"}
                </button>
              </div>
              {selectedPlaybooks.size > 0 && (
                <div className="draft-clause-selected-items">
                  {playbooks
                    .filter((p) => selectedPlaybooks.has(p.id))
                    .map((p) => (
                      <span key={p.id} className="draft-clause-selected-chip">
                        {p.playbookName}
                        <button
                          type="button"
                          className="draft-clause-chip-remove"
                          onClick={() => togglePlaybook(p.id)}
                          disabled={isDrafting}
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                </div>
              )}
              {showPlaybookLibrary && (
                <div className="draft-clause-library-panel" ref={playbookLibraryRef}>
                  {loadingPlaybooks ? (
                    <div className="draft-clause-loading">Loading playbooks...</div>
                  ) : playbooks.length === 0 ? (
                    <div className="draft-clause-empty">No playbooks found</div>
                  ) : (
                    <div className="draft-clause-library-list">
                      {playbooks.map((playbook) => (
                        <button
                          key={playbook.id}
                          className={`draft-clause-library-item ${selectedPlaybooks.has(playbook.id) ? "selected" : ""}`}
                          onClick={() => togglePlaybook(playbook.id)}
                        >
                          <div className="draft-clause-library-item-content">
                            <span className="draft-clause-library-item-name">{playbook.playbookName}</span>
                            {playbook.playbookType && (
                              <span className="draft-clause-library-item-meta">{playbook.playbookType}</span>
                            )}
                          </div>
                          {selectedPlaybooks.has(playbook.id) && <Check size={16} />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Similar Projects */}
            <div className="draft-clause-reference-section">
              <div className="draft-clause-reference-header">
                <Folder size={16} />
                <span>Similar Projects</span>
                <button
                  className="draft-clause-toggle-library"
                  onClick={() => setShowProjectLibrary(!showProjectLibrary)}
                >
                  {showProjectLibrary ? "Hide" : "Browse"}
                </button>
              </div>
              {selectedProjects.size > 0 && (
                <div className="draft-clause-selected-items">
                  {projects
                    .filter((p) => selectedProjects.has(p.id))
                    .map((p) => (
                      <span key={p.id} className="draft-clause-selected-chip">
                        {p.name}
                        <button
                          type="button"
                          className="draft-clause-chip-remove"
                          onClick={() => toggleProject(p.id)}
                          disabled={isDrafting}
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                </div>
              )}
              {showProjectLibrary && (
                <div className="draft-clause-library-panel" ref={projectLibraryRef}>
                  {loadingProjects ? (
                    <div className="draft-clause-loading">Loading projects...</div>
                  ) : projects.length === 0 ? (
                    <div className="draft-clause-empty">No projects found</div>
                  ) : (
                    <div className="draft-clause-library-list">
                      {projects.map((project) => (
                        <button
                          key={project.id}
                          className={`draft-clause-library-item ${selectedProjects.has(project.id) ? "selected" : ""}`}
                          onClick={() => toggleProject(project.id)}
                        >
                          <div className="draft-clause-library-item-content">
                            <span className="draft-clause-library-item-name">{project.name}</span>
                            {project.description && (
                              <span className="draft-clause-library-item-meta">{project.description}</span>
                            )}
                          </div>
                          {selectedProjects.has(project.id) && <Check size={16} />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="draft-clause-error">
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="draft-clause-footer">
          <button
            className="draft-clause-button cancel"
            onClick={onClose}
            disabled={isDrafting}
          >
            Cancel
          </button>
          <button
            className="draft-clause-button draft"
            onClick={handleDraft}
            disabled={isDrafting || !instructions.trim()}
          >
            {isDrafting ? (
              <>
                <Loader size={16} className="spinner" />
                <span>Drafting...</span>
              </>
            ) : (
              <>
                <Sparkles size={16} />
                <span>Draft Clause</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

