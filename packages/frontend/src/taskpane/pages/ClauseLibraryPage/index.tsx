import * as React from "react";
import { Divider, Button as FButton, makeStyles } from "@fluentui/react-components";
import { ArrowLeft, Loader2, Database, Plus, Eye, Settings, Trash2, Copy } from "lucide-react";
import { useNavigation } from "../../hooks/use-navigation";
import { useLanguage } from "../../contexts/LanguageContext";
import { useToast } from "../../hooks/use-toast";
import ClauseFilter, { ClauseFilterValues } from "./components/ClauseFilter";
import ClauseCard from "./components/ClauseCard";
import { DeleteClauseDialog } from "./components/DeleteClauseDialog";
import { EditClauseDialog } from "./components/EditClauseDialog";
import { CreateClauseDialog } from "./components/CreateClauseDialog";
import { Tooltip } from "@fluentui/react-components";
import { FaArrowLeft } from "react-icons/fa6";
import { buildApiUrl } from "../../../services/apiBaseUrl";

const useStyles = makeStyles({
  root: {},
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "5px 19px 5px 19px",
  },
  headerTitle: {
    margin: "9px",
    fontWeight: 600,
    color: "#333333",
    fontSize: "15px",
  },
  headerIcon: {
    color: "#999999",
    border: "none",
    backgroundColor: "transparent",
    "&:hover": {
      color: "#999999",
      border: "none",
      backgroundColor: "transparent",
    },
  },
});

interface Clause {
  id: string;
  name: string;
  text: string;
  category?: string;
  tags?: string[];
  description?: string;
  sourceDocument?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const ClauseLibraryPage: React.FC = () => {
  const styles = useStyles();
  const { navigateTo } = useNavigation();
  const { translations } = useLanguage();
  const { toast } = useToast();

  const [clauses, setClauses] = React.useState<Clause[]>([]);
  const [allClauses, setAllClauses] = React.useState<Clause[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [filters, setFilters] = React.useState<ClauseFilterValues>({
    searchText: "",
    category: "All Categories",
    selectedTags: [],
  });

  // Dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [clauseToDelete, setClauseToDelete] = React.useState<Clause | null>(null);
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [clauseToEdit, setClauseToEdit] = React.useState<Clause | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);

  const fetchClauses = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("authToken");
      const headers: HeadersInit = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const response = await fetch(buildApiUrl("/api/vault/clauses"), { headers });
      if (!response.ok) {
        throw new Error("Failed to fetch clauses");
      }

      const data = await response.json();
      const clausesList = data.clauses || [];
      setAllClauses(clausesList);
      setClauses(clausesList);
    } catch (err) {
      console.error("Failed to fetch clauses:", err);
      setError(err instanceof Error ? err.message : "Failed to load clauses");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchClauses();
  }, [fetchClauses]);

  const handleRefresh = () => {
    fetchClauses();
  };

  // Filter clauses based on filter values
  const filterClauses = React.useCallback((clausesToFilter: Clause[], filterValues: ClauseFilterValues): Clause[] => {
    return clausesToFilter.filter((clause) => {
      // Search text filter - check in name, description, text, and tags
      if (filterValues.searchText.trim()) {
        const searchLower = filterValues.searchText.toLowerCase().trim();
        const nameMatch = clause.name?.toLowerCase().includes(searchLower) || false;
        const descMatch = clause.description?.toLowerCase().includes(searchLower) || false;
        const textMatch = clause.text?.toLowerCase().includes(searchLower) || false;
        
        // Check tags
        const clauseTags: string[] = clause.tags || [];
        const tagsMatch = clauseTags.some((tag: string) => tag.toLowerCase().includes(searchLower));
        
        if (!nameMatch && !descMatch && !textMatch && !tagsMatch) {
          return false;
        }
      }

      // Category filter
      if (filterValues.category !== "All Categories") {
        if (clause.category !== filterValues.category) {
          return false;
        }
      }

      // Tags filter
      if (filterValues.selectedTags.length > 0) {
        const clauseTags = (clause.tags || []).map((t: string) => t.toLowerCase());
        const hasMatchingTag = filterValues.selectedTags.some((selectedTag) => {
          const selectedLower = selectedTag.toLowerCase();
          return clauseTags.some((clauseTag: string) => 
            clauseTag.includes(selectedLower) || selectedLower.includes(clauseTag)
          );
        });
        
        if (!hasMatchingTag) {
          return false;
        }
      }

      return true;
    });
  }, []);

  // Apply filters whenever filters or allClauses change
  React.useEffect(() => {
    const filtered = filterClauses(allClauses, filters);
    setClauses(filtered);
  }, [filters, allClauses, filterClauses]);

  // Extract unique tags and categories from all clauses for the filter
  const availableTags = React.useMemo(() => {
    const tagSet = new Set<string>();
    allClauses.forEach((clause) => {
      if (clause.tags && Array.isArray(clause.tags)) {
        clause.tags.forEach((tag: string) => tagSet.add(tag));
      }
    });
    return Array.from(tagSet).sort();
  }, [allClauses]);

  const availableCategories = React.useMemo(() => {
    const categorySet = new Set<string>();
    allClauses.forEach((clause) => {
      if (clause.category) {
        categorySet.add(clause.category);
      }
    });
    return Array.from(categorySet).sort();
  }, [allClauses]);

  const handleFilterChange = (newFilters: ClauseFilterValues) => {
    setFilters(newFilters);
  };

  const handleView = (id: string) => {
    const clause = clauses.find((c) => c.id === id);
    if (clause) {
      // TODO: Navigate to clause detail view or show in modal
      toast({
        title: translations.clauseLibrary?.viewClause || "View Clause",
        description: clause.name,
      });
    }
  };

  const handleEdit = (id: string) => {
    const clause = clauses.find((c) => c.id === id);
    if (clause) {
      setClauseToEdit(clause);
      setEditDialogOpen(true);
    }
  };

  const handleDelete = (id: string) => {
    const clause = clauses.find((c) => c.id === id);
    if (clause) {
      setClauseToDelete(clause);
      setDeleteDialogOpen(true);
    }
  };

  const handleDuplicate = async (id: string) => {
    const clause = clauses.find((c) => c.id === id);
    if (!clause) return;

    try {
      const token = localStorage.getItem("authToken");
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const response = await fetch(buildApiUrl("/api/vault/clauses"), {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: `${clause.name} (Copy)`,
          text: clause.text,
          category: clause.category,
          tags: clause.tags,
          description: clause.description,
          sourceDocument: clause.sourceDocument,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to duplicate clause");
      }

      const data = await response.json();
      setAllClauses((prev) => [data.clause, ...prev]);
      setClauses((prev) => [data.clause, ...prev]);
      
      toast({
        title: translations.clauseLibrary?.clauseDuplicated || "Clause Duplicated",
        description: translations.clauseLibrary?.clauseDuplicatedDescription || "Clause has been duplicated successfully",
      });
    } catch (err) {
      console.error("Failed to duplicate clause:", err);
      toast({
        title: translations.clauseLibrary?.error || "Error",
        description: err instanceof Error ? err.message : "Failed to duplicate clause",
      });
    }
  };

  const confirmDelete = async () => {
    if (!clauseToDelete) return;

    try {
      const response = await fetch(buildApiUrl(`/api/vault/clauses/${clauseToDelete.id}`), {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete clause");
      }

      setAllClauses((prev) => prev.filter((c) => c.id !== clauseToDelete.id));
      setClauses((prev) => prev.filter((c) => c.id !== clauseToDelete.id));
      
      toast({
        title: translations.clauseLibrary?.clauseDeleted || "Clause Deleted",
        description: translations.clauseLibrary?.clauseDeletedDescription || "Clause has been deleted successfully",
      });
    } catch (err) {
      console.error("Failed to delete clause:", err);
      setError(err instanceof Error ? err.message : "Failed to delete clause");
      toast({
        title: translations.clauseLibrary?.error || "Error",
        description: err instanceof Error ? err.message : "Failed to delete clause",
      });
    } finally {
      setDeleteDialogOpen(false);
      setClauseToDelete(null);
    }
  };

  const cancelDelete = () => {
    setDeleteDialogOpen(false);
    setClauseToDelete(null);
  };

  const handleClauseCreated = (newClause: Clause) => {
    setAllClauses((prev) => [newClause, ...prev]);
    setClauses((prev) => [newClause, ...prev]);
  };

  const handleClauseUpdated = (updatedClause: Clause) => {
    setAllClauses((prev) =>
      prev.map((c) => (c.id === updatedClause.id ? updatedClause : c))
    );
    setClauses((prev) =>
      prev.map((c) => (c.id === updatedClause.id ? updatedClause : c))
    );
  };

  if (loading && clauses.length === 0) {
    return (
      <div className={styles.root}>
        <div style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "200px",
          gap: "10px",
        }}>
          <Loader2
            style={{ width: "20px", height: "20px", animation: "spin 1s linear infinite" }}
          />
          <span>{translations.clauseLibrary?.loading || "Loading clauses..."}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <Tooltip
          appearance="inverted"
          content={translations.common.back || "Back to menu"}
          positioning="below"
          withArrow
          relationship="label"
        >
          <FButton
            icon={<FaArrowLeft style={{ fontSize: "12px" }} />}
            onClick={() => navigateTo("menu")}
            className={styles.headerIcon}
            style={{
              minWidth: "28px",
              maxWidth: "28px",
              height: "28px",
              padding: "0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          />
        </Tooltip>
        <p className={styles.headerTitle}>
          {translations.clauseLibrary?.title || "Clause Library"}
        </p>
        <div style={{ display: "flex", gap: "4px" }}>
          <Tooltip
            appearance="inverted"
            content={translations.clauseLibrary?.createClause || "Create new clause"}
            positioning="below"
            withArrow
            relationship="label"
          >
            <FButton
              icon={<Plus style={{ fontSize: "16px" }} />}
              onClick={() => setCreateDialogOpen(true)}
              className={styles.headerIcon}
            />
          </Tooltip>
        </div>
      </div>
      <Divider />

      <ClauseFilter 
        onFilterChange={handleFilterChange} 
        availableTags={availableTags}
        availableCategories={availableCategories}
      />

      {error && (
        <div style={{
          padding: "20px",
          backgroundColor: "#fef2f2",
          border: "1px solid #fecaca",
          borderRadius: "8px",
          color: "#dc2626",
          margin: "20px 0",
        }}>
          <p>{translations.clauseLibrary?.error || "Error"}: {error}</p>
          <button
            onClick={handleRefresh}
            style={{
              marginTop: "10px",
              padding: "8px 16px",
              backgroundColor: "#dc2626",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            {translations.common.retry || "Retry"}
          </button>
        </div>
      )}

      {clauses.length === 0 && !loading && !error && (
        <div style={{
          textAlign: "center",
          padding: "40px 20px",
          color: "#6b7280",
        }}>
          <p>{translations.clauseLibrary?.noClauses || "No clauses found. Create your first clause to get started!"}</p>
        </div>
      )}

      <div
        style={{
          display: "flex",
          gap: "10px",
          flexDirection: "column",
          padding: "8px",
        }}
      >
        {clauses.map((clause) => (
          <ClauseCard
            key={clause.id}
            clause={clause}
            onView={handleView}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onDuplicate={handleDuplicate}
          />
        ))}
      </div>

      <DeleteClauseDialog
        open={deleteDialogOpen}
        clauseName={clauseToDelete?.name || ""}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />

      <EditClauseDialog
        open={editDialogOpen}
        clause={clauseToEdit}
        onClose={() => {
          setEditDialogOpen(false);
          setClauseToEdit(null);
        }}
        onSaved={handleClauseUpdated}
      />

      <CreateClauseDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onCreated={handleClauseCreated}
      />
    </div>
  );
};

