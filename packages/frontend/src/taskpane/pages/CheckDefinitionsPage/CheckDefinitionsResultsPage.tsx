import React, { useState } from "react";
import {
  makeStyles,
  Tooltip,
  Divider,
  Accordion,
  AccordionItem,
  AccordionHeader,
  AccordionPanel,
  Dialog,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button as FluentButton,
  Spinner,
} from "@fluentui/react-components";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Trash2,
  Check,
  ArrowDownAZ,
  ALargeSmall,
  Eraser,
} from "lucide-react";
import { AiOutlineExclamationCircle } from "react-icons/ai";
import { CiLocationArrow1 } from "react-icons/ci";
import { MdDelete } from "react-icons/md";
import { Button } from "../../components/ui/button";
import {
  getTextRange,
  getTextRangeAcrossParagraphs,
  getTextRangeInShapes,
  replaceTermInRange,
  locateText,
  generateDiffHtml,
  getDiffStyles,
  createParagraphDiffProposal,
  applyWordLevelTrackChanges,
  isFullDeletion,
  applyFullDeletionReplacement,
  insertNewSectionAfterAnchor,
} from "@/src/taskpane/taskpane";
import { backendApi } from "@/src/services/api";
import type { DefinitionCheckResult, UnusedDefinition, UndefinedTerm, InconsistentTerm, TermVariation, GenerateDefinitionResult, DuplicateDefinition, ResolveDuplicatesResult, ResolveDuplicateAmendment } from "@/src/services/api";
import type { ParsedDocument } from "@/src/types/documents";

interface CheckDefinitionsResultsPageProps {
  onBack: () => void;
  results: DefinitionCheckResult;
  originalParsed?: ParsedDocument;
}

// Delete confirmation dialog state
interface DeleteDialogState {
  open: boolean;
  type: 'unused' | 'undefined' | 'occurrence' | 'inconsistent' | 'inconsistent-occurrence' | 'duplicate' | 'duplicate-occurrence' | null;
  term: string;
  definitionText?: string;
  idx: number;
  occIdx?: number;
}

const useStyles = makeStyles({
  pageRoot: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    backgroundColor: "#f8f9fa",
  },
  pageHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 20px 12px 20px",
    borderBottom: "1px solid #e1e1e1",
    backgroundColor: "#fff",
    flexShrink: 0,
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
  },
  content: {
    flex: 1,
    overflowY: "auto",
    padding: "16px",
    minHeight: 0,
  },

  // Category section styles (matching Module 2)
  categoryAccordionItem: {
    marginBottom: "8px",
    border: "none",
    borderRadius: "8px",
    backgroundColor: "#fff",
    overflow: "hidden",
  },
  categoryAccordionItemExpanded: {
    border: "none",
    backgroundColor: "#fff",
    overflow: "hidden",
  },
  categoryAccordionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 4px",
    backgroundColor: "#f8f9fa",
    borderBottom: "none",
    cursor: "pointer",
    "&:hover": {
      backgroundColor: "#f1f3f4",
    },
  },
  categoryTitle: {
    display: "flex",
    alignItems: "center",
    fontSize: "14px",
    fontWeight: "600",
    margin: "0",
    gap: "5px",
  },
  categoryAccordionPanel: {
    padding: "0",
  },
  categoryCustomChevron: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  // Term cards (Level 1) - similar to Module 2
  termCard: {
    border: "1px solid #4f8bd4",
    borderRadius: "8px",
    backgroundColor: "#ffffff",
    marginBottom: "8px",
    overflow: "hidden",
  },
  termCardHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 16px",
    backgroundColor: "#ffffff",
    cursor: "pointer",
  },
  termTitle: {
    fontSize: "15px",
    fontWeight: 600,
    color: "#333",
    margin: 0,
  },
  termSubtitle: {
    fontSize: "13px",
    color: "#666",
    fontWeight: 400,
    marginLeft: "8px",
  },
  termCardContent: {
    padding: "0 16px 16px 16px",
  },

  // Section number badge - similar to Module 2
  sectionBadge: {
    display: "inline-block",
    fontSize: "14px",
    fontWeight: 500,
    color: "#333",
    marginBottom: "8px",
  },

  // Text display box - similar to Module 2
  textBox: {
    padding: "12px",
    backgroundColor: "#f8f9fa",
    border: "1px solid #e1e1e1",
    borderRadius: "4px",
    fontSize: "14px",
    lineHeight: "1.5",
    wordWrap: "break-word",
    overflowWrap: "break-word",
    marginBottom: "12px",
  },

  // Occurrence cards (Level 2) - nested under undefined terms
  occurrenceCard: {
    border: "1px solid #e1e1e1",
    borderRadius: "6px",
    backgroundColor: "#f8f9fa",
    marginBottom: "6px",
    padding: "10px 12px",
  },
  occurrenceSectionRef: {
    fontSize: "12px",
    fontWeight: 600,
    color: "#333",
    marginBottom: "4px",
  },
  occurrenceText: {
    fontSize: "13px",
    color: "#666",
    lineHeight: "1.4",
  },

  // Action buttons
  actionFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: "12px",
    borderTop: "1px solid #e1e1e1",
  },
  actionLeft: {
    display: "flex",
    gap: "8px",
  },
  actionRight: {
    display: "flex",
    gap: "8px",
  },
  iconBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "28px",
    height: "28px",
    borderRadius: "4px",
    border: "1px solid #4080FF",
    backgroundColor: "transparent",
    cursor: "pointer",
    transition: "background-color 0.2s ease",
    "&:hover": {
      backgroundColor: "#F6F9FF",
    },
  },
  primaryBtn: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    padding: "6px 12px",
    borderRadius: "4px",
    border: "none",
    background: "var(--brand-gradient)",
    color: "var(--text-on-brand)",
    fontSize: "13px",
    fontWeight: 500,
    cursor: "pointer",
    fontFamily: "inherit",
  },

  // Button row with multiple buttons
  buttonRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "12px",
  },

  // Chevron icon
  chevronIcon: {
    width: "16px",
    height: "16px",
    color: "#666",
  },

  // Highlighted term within sentence text
  highlightedTerm: {
    backgroundColor: "#FFF3CD",
    fontWeight: 600,
    borderRadius: "2px",
    padding: "0 2px",
  },

  // Empty state
  emptyState: {
    padding: "24px",
    textAlign: "center",
    color: "#666",
    fontSize: "14px",
  },

  // Diff display area
  diffSection: {
    marginTop: "12px",
    marginBottom: "12px",
  },
  diffLabel: {
    fontSize: "12px",
    fontWeight: 600,
    color: "#555",
    marginBottom: "6px",
  },
  diffContainer: {
    padding: "12px",
    backgroundColor: "#fafafa",
    border: "1px solid #e1e1e1",
    borderRadius: "6px",
    fontSize: "13px",
    lineHeight: "1.6",
    wordWrap: "break-word",
    overflowWrap: "break-word",
    maxHeight: "300px",
    overflowY: "auto",
  },

  // Applied check
  appliedBadge: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    color: "#2e7d32",
    fontSize: "13px",
    fontWeight: 500,
  },
});

export const CheckDefinitionsResultsPage: React.FC<CheckDefinitionsResultsPageProps> = ({
  onBack,
  results,
  originalParsed,
}) => {
  const styles = useStyles();

  // Track expanded state for sections and terms
  // Collapse "Unused Definitions" by default when there are no results
  const [isUnusedExpanded, setIsUnusedExpanded] = useState(results.unusedDefinitions.length > 0);
  const [isUndefinedExpanded, setIsUndefinedExpanded] = useState(true);
  const [expandedTerms, setExpandedTerms] = useState<Set<string>>(new Set());

  // Track removed items
  const [removedUnused, setRemovedUnused] = useState<Set<number>>(new Set());
  const [removedUndefined, setRemovedUndefined] = useState<Set<number>>(new Set());
  const [removedOccurrences, setRemovedOccurrences] = useState<Set<string>>(new Set());

  // Delete dialog state
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState>({
    open: false,
    type: null,
    term: '',
    idx: -1,
  });

  // Add Definition states
  const [generatingDefinition, setGeneratingDefinition] = useState<string | null>(null);
  const [definitionResults, setDefinitionResults] = useState<Map<string, GenerateDefinitionResult>>(new Map());
  const [applyingTrackChanges, setApplyingTrackChanges] = useState<string | null>(null);
  const [appliedDefinitions, setAppliedDefinitions] = useState<Set<string>>(new Set());

  // Lowercase states (keyed by "termIdx-occIdx")
  const [lowercasingOccurrence, setLowercasingOccurrence] = useState<string | null>(null);
  const [lowercasedOccurrences, setLowercasedOccurrences] = useState<Set<string>>(new Set());

  // Delete definition from document states
  const [deletingDefinition, setDeletingDefinition] = useState<string | null>(null);
  const [deletedDefinitions, setDeletedDefinitions] = useState<Set<string>>(new Set());

  // Inconsistent section states
  const [isInconsistentExpanded, setIsInconsistentExpanded] = useState(true);
  const [removedInconsistent, setRemovedInconsistent] = useState<Set<number>>(new Set());
  const [removedInconsistentOccs, setRemovedInconsistentOccs] = useState<Set<string>>(new Set());
  const [showMoreConsistent, setShowMoreConsistent] = useState<Set<number>>(new Set());

  // Capitalize tracking (keyed like "termIdx-flatOccIdx")
  const [capitalizingOccurrence, setCapitalizingOccurrence] = useState<string | null>(null);
  const [capitalizedOccurrences, setCapitalizedOccurrences] = useState<Set<string>>(new Set());

  // Lowercase tracking for inconsistent (separate from undefined terms)
  const [lowercasingInconsistentOcc, setLowercasingInconsistentOcc] = useState<string | null>(null);
  const [lowercasedInconsistentOccs, setLowercasedInconsistentOccs] = useState<Set<string>>(new Set());

  // Duplicate definitions section states
  const [isDuplicateExpanded, setIsDuplicateExpanded] = useState(true);
  const [removedDuplicate, setRemovedDuplicate] = useState<Set<number>>(new Set());
  const [removedDuplicateOccs, setRemovedDuplicateOccs] = useState<Set<string>>(new Set());
  const [deletingDuplicateOcc, setDeletingDuplicateOcc] = useState<string | null>(null);
  const [deletedDuplicateOccs, setDeletedDuplicateOccs] = useState<Set<string>>(new Set());

  // Resolve duplicates (LLM) states
  const [resolvingDuplicates, setResolvingDuplicates] = useState<string | null>(null);
  const [duplicateResolutions, setDuplicateResolutions] = useState<Map<string, ResolveDuplicatesResult>>(new Map());
  const [applyingDuplicateAmendment, setApplyingDuplicateAmendment] = useState<string | null>(null);
  const [appliedDuplicateAmendments, setAppliedDuplicateAmendments] = useState<Set<string>>(new Set());

  // Filter out removed items
  const unusedDefinitions = results.unusedDefinitions.filter((_, idx) => !removedUnused.has(idx));
  const duplicateDefinitions = (results.duplicateDefinitions || []).filter((_, idx) => !removedDuplicate.has(idx));
  const undefinedTerms = results.undefinedTerms.filter((_, idx) => !removedUndefined.has(idx));
  const inconsistentTerms = results.inconsistentTerms.filter((_, idx) => !removedInconsistent.has(idx));

  const toggleTerm = (termKey: string) => {
    setExpandedTerms(prev => {
      const next = new Set(prev);
      if (next.has(termKey)) {
        next.delete(termKey);
      } else {
        next.add(termKey);
      }
      return next;
    });
  };

  const handleLocateInDraft = async (text: string) => {
    try {
      await locateText(text);
    } catch (error) {
      console.error("Error locating text in draft:", error);
    }
  };

  // Show delete confirmation dialog
  const showDeleteDialog = (
    type: 'unused' | 'undefined' | 'occurrence' | 'inconsistent' | 'inconsistent-occurrence' | 'duplicate' | 'duplicate-occurrence',
    term: string,
    idx: number,
    occIdx?: number,
    definitionText?: string
  ) => {
    setDeleteDialog({
      open: true,
      type,
      term,
      idx,
      occIdx,
      definitionText,
    });
  };

  // Handle delete confirmation
  const handleDeleteConfirm = () => {
    const { type, idx, occIdx } = deleteDialog;

    if (type === 'unused') {
      setRemovedUnused(prev => new Set(prev).add(idx));
    } else if (type === 'undefined') {
      setRemovedUndefined(prev => new Set(prev).add(idx));
    } else if (type === 'occurrence' && occIdx !== undefined) {
      setRemovedOccurrences(prev => new Set(prev).add(`${idx}-${occIdx}`));
    } else if (type === 'inconsistent') {
      setRemovedInconsistent(prev => new Set(prev).add(idx));
    } else if (type === 'inconsistent-occurrence' && occIdx !== undefined) {
      setRemovedInconsistentOccs(prev => new Set(prev).add(`${idx}-${occIdx}`));
    } else if (type === 'duplicate') {
      setRemovedDuplicate(prev => new Set(prev).add(idx));
    } else if (type === 'duplicate-occurrence' && occIdx !== undefined) {
      setRemovedDuplicateOccs(prev => new Set(prev).add(`${idx}-${occIdx}`));
    }

    setDeleteDialog({ open: false, type: null, term: '', idx: -1 });
  };

  // Handle delete cancel
  const handleDeleteCancel = () => {
    setDeleteDialog({ open: false, type: null, term: '', idx: -1 });
  };

  // Get dialog message based on type
  const getDeleteDialogMessage = () => {
    switch (deleteDialog.type) {
      case 'unused':
        return 'Are you sure you want to remove this unused definition from the list?';
      case 'undefined':
        return 'Are you sure you want to remove this undefined term from the list?';
      case 'occurrence':
        return 'Are you sure you want to remove this occurrence from the list?';
      case 'inconsistent':
        return 'Are you sure you want to remove this inconsistent term from the list?';
      case 'inconsistent-occurrence':
        return 'Are you sure you want to remove this occurrence from the list?';
      case 'duplicate':
        return 'Are you sure you want to remove this duplicate definition from the list?';
      case 'duplicate-occurrence':
        return 'Are you sure you want to remove this occurrence from the list?';
      default:
        return 'Are you sure you want to delete this item?';
    }
  };

  const handleDeleteDefinitionFromDocument = async (definition: UnusedDefinition) => {
    setDeletingDefinition(definition.term);

    try {
      await applyFullDeletionReplacement(definition.definitionText);
      setDeletedDefinitions(prev => new Set(prev).add(definition.term));
    } catch (error) {
      console.error("Error deleting definition:", error);
      alert(`Error deleting definition: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setDeletingDefinition(null);
    }
  };

  const handleDeleteDuplicateOccurrence = async (sentence: string, occKey: string) => {
    setDeletingDuplicateOcc(occKey);

    try {
      await applyFullDeletionReplacement(sentence);
      setDeletedDuplicateOccs(prev => new Set(prev).add(occKey));
    } catch (error) {
      console.error("Error deleting duplicate definition:", error);
      alert(`Error deleting definition: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setDeletingDuplicateOcc(null);
    }
  };

  // Resolve duplicate definitions using LLM
  const handleResolveDuplicates = async (dupDef: DuplicateDefinition) => {
    if (!originalParsed) {
      console.error("No parsed document available");
      return;
    }

    setResolvingDuplicates(dupDef.term);

    try {
      // Check if this is a re-run (we have previous amendments)
      const existingResolution = duplicateResolutions.get(dupDef.term);
      const previousAmendments = existingResolution?.amendments;
      const isRerun = previousAmendments && previousAmendments.length > 0;

      console.log(`🔍 ${isRerun ? 'Re-running' : 'Resolving'} duplicates for "${dupDef.term}"...`);
      if (isRerun) {
        console.log(`   Previous amendments: ${previousAmendments.length}`);
      }

      const result = await backendApi.resolveDuplicateDefinitions(
        dupDef.term,
        dupDef.occurrences,
        originalParsed,
        previousAmendments
      );

      console.log("Resolve duplicates result:", result);

      if (result.status === 'error') {
        alert(`Could not resolve duplicates: ${result.errorMessage || 'Unknown error'}`);
      } else {
        setDuplicateResolutions(prev => {
          const next = new Map(prev);
          next.set(dupDef.term, result);
          return next;
        });
        // Clear applied amendments on re-run so user can re-apply
        if (isRerun) {
          setAppliedDuplicateAmendments(prev => {
            const next = new Set(prev);
            // Remove any applied amendments for this term
            Array.from(prev).forEach(key => {
              if (key.startsWith(`${dupDef.term}-`)) {
                next.delete(key);
              }
            });
            return next;
          });
        }
      }
    } catch (error) {
      console.error("Error resolving duplicates:", error);
      alert(`Error resolving duplicates: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setResolvingDuplicates(null);
    }
  };

  // Apply a duplicate amendment as track changes
  const handleApplyDuplicateAmendment = async (
    amendment: ResolveDuplicateAmendment,
    amendmentKey: string
  ) => {
    setApplyingDuplicateAmendment(amendmentKey);

    try {
      console.log("=== handleApplyDuplicateAmendment START ===");
      console.log("Amendment:", amendment);

      // Full deletion shortcut — replace with "[INTENTIONALLY DELETED]"
      if (isFullDeletion(amendment.amendedText)) {
        await applyFullDeletionReplacement(amendment.originalText);
        setAppliedDuplicateAmendments(prev => new Set(prev).add(amendmentKey));
        console.log("Full deletion amendment applied successfully");
        return;
      }

      // Create diff proposal
      const proposal = createParagraphDiffProposal(
        amendment.originalText,
        amendment.amendedText
      );

      console.log("Proposal isValid:", proposal.isValid);
      console.log("Proposal hasChanges:", proposal.hasChanges);

      if (!proposal.isValid || !proposal.hasChanges) {
        alert("No differences found between original and amended text.");
        return;
      }

      // Locate the original text first
      console.log("Locating original text in document...");
      await handleLocateInDraft(amendment.originalText);

      // Apply word-level track changes
      console.log("Applying word-level track changes...");
      const success = await applyWordLevelTrackChanges(proposal, amendment.originalText);
      console.log("applyWordLevelTrackChanges result:", success);

      if (success) {
        // Scroll to the amended section
        await handleLocateInDraft(amendment.amendedText);
        setAppliedDuplicateAmendments(prev => new Set(prev).add(amendmentKey));
        console.log("Amendment applied successfully");
      } else {
        alert("Failed to apply track changes to the document.");
      }
    } catch (error) {
      console.error("=== handleApplyDuplicateAmendment ERROR ===", error);
      alert(`Error applying amendment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setApplyingDuplicateAmendment(null);
      console.log("=== handleApplyDuplicateAmendment END ===");
    }
  };

  const handleAddDefinition = async (term: UndefinedTerm) => {
    if (!originalParsed) {
      console.error("No parsed document available");
      return;
    }

    setGeneratingDefinition(term.term);

    try {
      const result = await backendApi.generateDefinition(
        term.term,
        term.occurrences.slice(0, 5),
        originalParsed
      );

      if (result.status === 'error') {
        alert(`Could not generate definition: ${result.errorMessage || 'Unknown error'}`);
      } else {
        setDefinitionResults(prev => {
          const next = new Map(prev);
          next.set(term.term, result);
          return next;
        });
      }
    } catch (error) {
      console.error("Error generating definition:", error);
      alert(`Error generating definition: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setGeneratingDefinition(null);
    }
  };

  const handleApplyDefinition = async (term: string) => {
    const result = definitionResults.get(term);
    if (!result) return;

    console.log("=== handleApplyDefinition START ===");
    console.log("Term:", term);
    console.log("Result status:", result.status);
    console.log("Result sectionNumber:", result.sectionNumber);
    console.log("Result definitionText:", result.definitionText);
    console.log("Result originalText:", JSON.stringify(result.originalText));
    console.log("Result amendedText:", JSON.stringify(result.amendedText));

    setApplyingTrackChanges(term);

    try {
      if (result.status === 'new_section') {
        // New section insertion — use shared helper
        // originalText = previous section text (used to locate insertion point)
        // amendedText = only the new content to insert
        console.log("[new_section] Inserting new section after anchor...");
        await insertNewSectionAfterAnchor(result.originalText, result.amendedText);

        console.log("[new_section] Apply complete — marking as applied");
        setAppliedDefinitions(prev => new Set(prev).add(term));
      } else {
        // Existing section amendment — use diff proposal + applyWordLevelTrackChanges,
        // same pattern as Module 2 (PlaybookRulesTab.tsx:1646-1683).
        // originalText = full section text (used both for locating AND as diff baseline)
        // amendedText = same section text with the new definition spliced in
        console.log("[amended] Creating paragraph diff proposal...");
        console.log("[amended] originalText:", JSON.stringify(result.originalText));
        console.log("[amended] amendedText:", JSON.stringify(result.amendedText));

        const proposal = createParagraphDiffProposal(
          result.originalText,
          result.amendedText
        );

        console.log("[amended] Proposal isValid:", proposal.isValid);
        console.log("[amended] Proposal hasChanges:", proposal.hasChanges);
        console.log("[amended] Proposal changes count:", proposal.changes?.length);
        console.log("[amended] Proposal changes:", JSON.stringify(proposal.changes));

        if (!proposal.isValid || !proposal.hasChanges) {
          alert("No differences found between original and amended text.");
          return;
        }

        // Locate the original text first, same as Module 2
        console.log("[amended] Locating original text in document...");
        await handleLocateInDraft(result.originalText);
        console.log("[amended] Locate complete, now applying word-level track changes...");

        const success = await applyWordLevelTrackChanges(proposal, result.originalText);
        console.log("[amended] applyWordLevelTrackChanges result:", success);

        if (success) {
          // Scroll to the changed section
          await handleLocateInDraft(result.amendedText);
          console.log("[amended] Apply complete — marking as applied");
          setAppliedDefinitions(prev => new Set(prev).add(term));
        } else {
          alert("Failed to apply track changes to the document.");
        }
      }
    } catch (error) {
      console.error("=== handleApplyDefinition ERROR ===", error);
      alert(`Error applying definition: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setApplyingTrackChanges(null);
      console.log("=== handleApplyDefinition END ===");
    }
  };

  const handleLowercaseOccurrence = async (termText: string, sentence: string, occKey: string) => {
    setLowercasingOccurrence(occKey);

    try {
      await Word.run(async (context) => {
        // Enable track changes
        try {
          context.document.settings.add("TrackChanges", true);
          await context.sync();
        } catch (trackChangesError) {
          console.log("Track changes setting already exists or failed to set");
        }

        // Step 1: Locate the exact sentence in the document
        let fromShape = false;
        let sentenceRange = await getTextRange(context, sentence);
        if (!sentenceRange) {
          sentenceRange = await getTextRangeAcrossParagraphs(context, sentence);
        }
        if (!sentenceRange) {
          sentenceRange = await getTextRangeInShapes(context, sentence);
          fromShape = !!sentenceRange;
        }
        if (!sentenceRange) {
          alert(`Could not locate the sentence in the document.`);
          return;
        }

        // Step 2: Replace the term within the sentence range
        const lowercased = termText.toLowerCase();
        const result = await replaceTermInRange(context, sentenceRange, termText, lowercased, {
          matchCase: true,
          matchWholeWord: true,
          fromShape,
        });

        if (result === 'in_shape') {
          alert(`This text is inside a text box. The sentence has been selected — please change "${termText}" to "${lowercased}" manually.`);
          return;
        }
        if (result === 'not_found') {
          alert(`"${termText}" not found in the located sentence.`);
          return;
        }

        // Scroll to the changed sentence
        sentenceRange.select();
        await context.sync();

        setLowercasedOccurrences(prev => new Set(prev).add(occKey));
      });
    } catch (error) {
      console.error("Error lowercasing term in sentence:", error);
      alert(`Error lowercasing term: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLowercasingOccurrence(null);
    }
  };

  // Title case utility for capitalizing terms
  const TITLE_CASE_EXCEPTIONS = new Set([
    "a", "an", "the", "and", "but", "or", "nor", "for", "yet", "so",
    "at", "by", "in", "of", "on", "to", "as", "up", "with", "from", "per", "via",
  ]);

  const toTitleCase = (text: string): string => {
    return text.split(/\s+/).map((word, index) => {
      if (index === 0) return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      if (TITLE_CASE_EXCEPTIONS.has(word.toLowerCase())) return word.toLowerCase();
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }).join(" ");
  };

  // Capitalize an occurrence within the inconsistent terms section
  const handleCapitalizeOccurrence = async (variantText: string, sentence: string, occKey: string, definedForm?: string) => {
    setCapitalizingOccurrence(occKey);

    try {
      await Word.run(async (context) => {
        // Enable track changes
        try {
          context.document.settings.add("TrackChanges", true);
          await context.sync();
        } catch (trackChangesError) {
          console.log("Track changes setting already exists or failed to set");
        }

        // Locate the sentence in the document
        let fromShape = false;
        let sentenceRange = await getTextRange(context, sentence);
        if (!sentenceRange) {
          sentenceRange = await getTextRangeAcrossParagraphs(context, sentence);
        }
        if (!sentenceRange) {
          sentenceRange = await getTextRangeInShapes(context, sentence);
          fromShape = !!sentenceRange;
        }
        if (!sentenceRange) {
          alert("Could not locate the sentence in the document.");
          return;
        }

        // Replace the variant within the sentence
        const replacement = definedForm || toTitleCase(variantText);
        const result = await replaceTermInRange(context, sentenceRange, variantText, replacement, {
          matchCase: true,
          matchWholeWord: true,
          fromShape,
        });

        if (result === 'in_shape') {
          alert(`This text is inside a text box. The sentence has been selected — please change "${variantText}" to "${replacement}" manually.`);
          return;
        }
        if (result === 'not_found') {
          alert(`"${variantText}" not found in the located sentence.`);
          return;
        }

        // Scroll to the changed sentence
        sentenceRange.select();
        await context.sync();

        setCapitalizedOccurrences(prev => new Set(prev).add(occKey));
      });
    } catch (error) {
      console.error("Error capitalizing term in sentence:", error);
      alert(`Error capitalizing term: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setCapitalizingOccurrence(null);
    }
  };

  // Lowercase an occurrence within the inconsistent terms section
  const handleLowercaseInconsistentOcc = async (variantText: string, sentence: string, occKey: string) => {
    setLowercasingInconsistentOcc(occKey);

    try {
      await Word.run(async (context) => {
        // Enable track changes
        try {
          context.document.settings.add("TrackChanges", true);
          await context.sync();
        } catch (trackChangesError) {
          console.log("Track changes setting already exists or failed to set");
        }

        // Locate the sentence in the document
        let fromShape = false;
        let sentenceRange = await getTextRange(context, sentence);
        if (!sentenceRange) {
          sentenceRange = await getTextRangeAcrossParagraphs(context, sentence);
        }
        if (!sentenceRange) {
          sentenceRange = await getTextRangeInShapes(context, sentence);
          fromShape = !!sentenceRange;
        }
        if (!sentenceRange) {
          alert("Could not locate the sentence in the document.");
          return;
        }

        // Replace the variant within the sentence
        const lowercased = variantText.toLowerCase();
        const result = await replaceTermInRange(context, sentenceRange, variantText, lowercased, {
          matchCase: true,
          matchWholeWord: true,
          fromShape,
        });

        if (result === 'in_shape') {
          alert(`This text is inside a text box. The sentence has been selected — please change "${variantText}" to "${lowercased}" manually.`);
          return;
        }
        if (result === 'not_found') {
          alert(`"${variantText}" not found in the located sentence.`);
          return;
        }

        sentenceRange.select();
        await context.sync();

        setLowercasedInconsistentOccs(prev => new Set(prev).add(occKey));
      });
    } catch (error) {
      console.error("Error lowercasing inconsistent term:", error);
      alert(`Error lowercasing term: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLowercasingInconsistentOcc(null);
    }
  };

  // Add definition for an inconsistent term (delegates to existing handleAddDefinition)
  const handleAddDefinitionForInconsistent = async (term: InconsistentTerm) => {
    // Flatten all variation occurrences into a single array
    const allOccurrences = term.variations.flatMap(v => v.occurrences);
    const undefinedTermObj: UndefinedTerm = {
      term: term.term,
      totalOccurrences: allOccurrences.length,
      occurrences: allOccurrences,
    };
    await handleAddDefinition(undefinedTermObj);
  };

  // Flat documents don't display section numbers (but still sort by them internally)
  const isFlatDocument = originalParsed?.documentType === 'flat';

  // Helper to format section reference (remove duplicate "Section" and hide recitals)
  const formatSectionRef = (sectionRef: string): string | null => {
    if (!sectionRef) return null;

    // Flat documents: never show section numbers in the UI
    if (isFlatDocument) return null;

    // Don't show section reference for recitals
    const lowerRef = sectionRef.toLowerCase();
    if (lowerRef === 'recitals' || lowerRef.includes('recital')) {
      return null;
    }

    // Remove duplicate "Section" prefix
    let formatted = sectionRef.trim();
    if (formatted.toLowerCase().startsWith('section section')) {
      formatted = formatted.substring(8); // Remove first "Section "
    } else if (!formatted.toLowerCase().startsWith('section')) {
      formatted = `Section ${formatted}`;
    }

    return formatted;
  };

  // Parse a section reference into a numeric array for sorting by document position.
  // "Recitals" → [-1] (before all numbered sections)
  // "Section 1" → [1]
  // "Section 1.2.3" → [1, 2, 3]
  // "Section 2.10" → [2, 10]
  // Anything unparseable → [Infinity] (sorts to end)
  const parseSectionPosition = (sectionRef: string): number[] => {
    if (!sectionRef) return [Infinity];

    const lower = sectionRef.toLowerCase().trim();
    if (lower === 'recitals' || lower.includes('recital')) {
      return [-1];
    }

    // Strip "Section " prefix if present, then parse dotted numbers
    const stripped = lower.replace(/^section\s+/i, '').trim();
    // Handle hierarchical refs like "1.2 > 1.2.1" — use the last segment
    const lastSegment = stripped.includes('>') ? stripped.split('>').pop()!.trim() : stripped;
    const parts = lastSegment.split('.').map(Number);

    if (parts.some(isNaN)) return [Infinity];
    return parts;
  };

  // Compare two section positions for sorting (ascending document order)
  const compareSectionPosition = (a: string, b: string): number => {
    const posA = parseSectionPosition(a);
    const posB = parseSectionPosition(b);
    const len = Math.max(posA.length, posB.length);
    for (let i = 0; i < len; i++) {
      const va = posA[i] ?? 0;
      const vb = posB[i] ?? 0;
      if (va !== vb) return va - vb;
    }
    return 0;
  };

  // Highlight all occurrences of a term within a text string.
  // Returns a React node with highlighted spans for matches (case-insensitive).
  const highlightTerm = (text: string, term: string): React.ReactNode => {
    if (!term) return text;

    // Escape special regex characters in the term
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Split on the term (case-insensitive). Capturing group keeps delimiters in result.
    const parts = text.split(new RegExp(`(${escaped})`, "gi"));

    if (parts.length === 1) return text; // no match found

    const termLower = term.toLowerCase();
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === termLower ? (
            <span key={i} className={styles.highlightedTerm}>{part}</span>
          ) : (
            <React.Fragment key={i}>{part}</React.Fragment>
          )
        )}
      </>
    );
  };

  // Render unused definition card
  const renderUnusedCard = (definition: UnusedDefinition, originalIdx: number) => {
    const termKey = `unused-${originalIdx}`;
    const isExpanded = expandedTerms.has(termKey);
    const isDeleting = deletingDefinition === definition.term;
    const isDeleted = deletedDefinitions.has(definition.term);
    const formattedSection = formatSectionRef(definition.sectionReference);

    return (
      <div key={termKey} className={styles.termCard}>
        <div
          className={styles.termCardHeader}
          onClick={() => toggleTerm(termKey)}
        >
          <div style={{ display: "flex", alignItems: "center", flex: 1 }}>
            <p className={styles.termTitle}>
              {definition.term}
            </p>
            <span className={styles.termSubtitle}>
              ({definition.usageCount})
            </span>
          </div>
          {isExpanded ? (
            <ChevronUp className={styles.chevronIcon} />
          ) : (
            <ChevronDown className={styles.chevronIcon} />
          )}
        </div>

        {isExpanded && (
          <div className={styles.termCardContent}>
            {formattedSection && (
              <div className={styles.sectionBadge}>
                {formattedSection}
              </div>
            )}
            <div className={styles.textBox}>
              {highlightTerm(definition.definitionText, definition.term)}
            </div>

            <div className={styles.actionFooter}>
              <div className={styles.actionLeft}>
                <Tooltip content="Remove from list" relationship="label" positioning="above" withArrow>
                  <button
                    className={styles.iconBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      showDeleteDialog('unused', definition.term, originalIdx, undefined, definition.definitionText);
                    }}
                  >
                    <Trash2 size={16} color="#4080FF" />
                  </button>
                </Tooltip>
                <Tooltip content={isDeleting ? "Deleting..." : isDeleted ? "Re-delete definition" : "Delete definition (track changes)"} relationship="label" positioning="above" withArrow>
                  <button
                    className={styles.iconBtn}
                    disabled={isDeleting}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteDefinitionFromDocument(definition);
                    }}
                  >
                    {isDeleting ? <Spinner size="tiny" /> : <Eraser size={16} color="#d32f2f" />}
                  </button>
                </Tooltip>
              </div>
              <div className={styles.actionRight}>
                <Tooltip content="Locate in document" relationship="label" positioning="above" withArrow>
                  <button
                    className={styles.iconBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLocateInDraft(definition.definitionText);
                    }}
                  >
                    <CiLocationArrow1 size={16} color="#4080FF" />
                  </button>
                </Tooltip>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render undefined term card with nested occurrences
  const renderUndefinedCard = (term: UndefinedTerm, originalIdx: number) => {
    const termKey = `undefined-${originalIdx}`;
    const isExpanded = expandedTerms.has(termKey);

    // Filter out removed occurrences
    const visibleOccurrences = term.occurrences.filter(
      (_, occIdx) => !removedOccurrences.has(`${originalIdx}-${occIdx}`)
    );

    const isGenerating = generatingDefinition === term.term;
    const defResult = definitionResults.get(term.term);
    const isApplying = applyingTrackChanges === term.term;
    const isApplied = appliedDefinitions.has(term.term);
    const canLowercase = term.term !== term.term.toLowerCase();

    return (
      <div key={termKey} className={styles.termCard}>
        <div
          className={styles.termCardHeader}
          onClick={() => toggleTerm(termKey)}
        >
          <div style={{ display: "flex", alignItems: "center", flex: 1 }}>
            <p className={styles.termTitle}>
              {term.term}
            </p>
            <span className={styles.termSubtitle}>
              ({visibleOccurrences.length})
            </span>
          </div>
          {isExpanded ? (
            <ChevronUp className={styles.chevronIcon} />
          ) : (
            <ChevronDown className={styles.chevronIcon} />
          )}
        </div>

        {isExpanded && (
          <div className={styles.termCardContent}>
            {/* Button row: Remove from list (left) + Add Definition (right) */}
            <div className={styles.buttonRow} style={{ justifyContent: "space-between" }}>
              <Tooltip content="Remove from list" relationship="label" positioning="above" withArrow>
                <button
                  className={styles.iconBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    showDeleteDialog('undefined', term.term, originalIdx);
                  }}
                >
                  <Trash2 size={16} color="#4080FF" />
                </button>
              </Tooltip>
              {defResult && defResult.status !== 'error' ? (
                <span className={styles.appliedBadge}>
                  <Check size={14} />
                  Definition Generated
                </span>
              ) : (
                <button
                  className={`${styles.primaryBtn} brand-btn`}
                  disabled={isGenerating || !originalParsed}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddDefinition(term);
                  }}
                >
                  {isGenerating ? <Spinner size="tiny" /> : "Add Definition"}
                </button>
              )}
            </div>

            {/* Diff viewer (appears after definition is generated) */}
            {defResult && defResult.status !== 'error' && (
              <div className={styles.diffSection}>
                <div className={styles.diffLabel}>
                  {defResult.status === 'new_section'
                    ? `New section: ${defResult.suggestedHeading || 'Definitions'} (${defResult.sectionNumber})`
                    : `Section ${defResult.sectionNumber}`
                  }
                </div>
                {defResult.status === 'new_section' ? (
                  /* New section: show the new content in a green box (same as Module 2 ChangesTab) */
                  <div style={{
                    padding: "12px",
                    backgroundColor: "#d4edda",
                    color: "#155724",
                    fontWeight: "bold",
                    border: "1px solid #c3e6cb",
                    borderRadius: "6px",
                    fontSize: "13px",
                    lineHeight: "1.6",
                    whiteSpace: "pre-wrap",
                    wordWrap: "break-word",
                  }}>
                    {defResult.amendedText}
                  </div>
                ) : (
                  /* Existing section amendment: show before/after diff */
                  <div className={styles.diffContainer}>
                    <style dangerouslySetInnerHTML={{ __html: getDiffStyles() }} />
                    <div
                      dangerouslySetInnerHTML={{
                        __html: generateDiffHtml(defResult.originalText, defResult.amendedText),
                      }}
                    />
                  </div>
                )}

                {/* Apply as Track Changes button */}
                <div style={{ marginTop: "10px" }}>
                  <button
                    className={`${styles.primaryBtn} brand-btn`}
                    disabled={isApplying}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleApplyDefinition(term.term);
                    }}
                  >
                    {isApplying ? (
                      <>
                        <Spinner size="tiny" />
                        Applying...
                      </>
                    ) : isApplied ? (
                      "Re-apply Track Changes"
                    ) : (
                      "Apply as Track Changes"
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Nested occurrence cards — sorted by document position */}
            {term.occurrences
              .map((occ, occIdx) => ({ occ, occIdx }))
              .sort((a, b) => compareSectionPosition(a.occ.sectionReference, b.occ.sectionReference))
              .map(({ occ, occIdx }) => {
              if (removedOccurrences.has(`${originalIdx}-${occIdx}`)) {
                return null;
              }

              const formattedSection = formatSectionRef(occ.sectionReference);
              const occKey = `${originalIdx}-${occIdx}`;
              const isOccLowercasing = lowercasingOccurrence === occKey;
              const isOccLowercased = lowercasedOccurrences.has(occKey);

              return (
                <div key={occIdx} className={styles.occurrenceCard}>
                  {formattedSection && (
                    <div className={styles.occurrenceSectionRef}>
                      {formattedSection}
                    </div>
                  )}
                  <div className={styles.occurrenceText}>
                    {highlightTerm(occ.sentence, term.term)}
                  </div>
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: "8px",
                    paddingTop: "8px",
                    borderTop: "1px solid #e1e1e1"
                  }}>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <Tooltip content="Remove from list" relationship="label" positioning="above" withArrow>
                        <button
                          className={styles.iconBtn}
                          onClick={(e) => {
                            e.stopPropagation();
                            showDeleteDialog('occurrence', term.term, originalIdx, occIdx);
                          }}
                        >
                          <Trash2 size={16} color="#4080FF" />
                        </button>
                      </Tooltip>
                      {canLowercase && (
                        <Tooltip content={isOccLowercasing ? "Lowercasing..." : isOccLowercased ? "Re-lowercase" : "Lowercase"} relationship="label" positioning="above" withArrow>
                          <button
                            className={`${styles.iconBtn} brand-btn`}
                            style={isOccLowercasing ? undefined : { border: "1px solid transparent", background: "var(--brand-gradient)", color: "var(--text-on-brand)" }}
                            disabled={isOccLowercasing}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLowercaseOccurrence(term.term, occ.sentence, occKey);
                            }}
                          >
                            {isOccLowercasing ? <Spinner size="tiny" /> : <ArrowDownAZ size={16} />}
                          </button>
                        </Tooltip>
                      )}
                    </div>
                    <Tooltip content="Locate in document" relationship="label" positioning="above" withArrow>
                      <button
                        className={styles.iconBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLocateInDraft(occ.sentence);
                        }}
                      >
                        <CiLocationArrow1 size={16} color="#4080FF" />
                      </button>
                    </Tooltip>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // Render a single occurrence card within the inconsistent section
  const renderInconsistentOccurrenceCard = (
    variantText: string,
    occ: { sentence: string; sectionReference: string },
    occKey: string,
    termName: string,
    originalIdx: number,
    flatOccIdx: number,
    definedForm?: string
  ) => {
    if (removedInconsistentOccs.has(occKey)) return null;

    const formattedSection = formatSectionRef(occ.sectionReference);
    const isCapitalizing = capitalizingOccurrence === occKey;
    const isCapitalized = capitalizedOccurrences.has(occKey);
    const isLowercasing = lowercasingInconsistentOcc === occKey;
    const isLowercased = lowercasedInconsistentOccs.has(occKey);

    // Determine if capitalize/lowercase buttons should show
    const targetCapitalized = definedForm || toTitleCase(variantText);
    const canCapitalize = variantText !== targetCapitalized;
    const canLowercase = variantText !== variantText.toLowerCase();

    return (
      <div key={occKey} className={styles.occurrenceCard}>
        {formattedSection && (
          <div className={styles.occurrenceSectionRef}>
            {formattedSection}
            <span style={{ marginLeft: "8px", fontWeight: 400, color: "#888", fontSize: "11px" }}>
              ({variantText})
            </span>
          </div>
        )}
        {!formattedSection && (
          <div style={{ fontSize: "11px", color: "#888", marginBottom: "4px" }}>
            ({variantText})
          </div>
        )}
        <div className={styles.occurrenceText}>
          {highlightTerm(occ.sentence, termName)}
        </div>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: "8px",
          paddingTop: "8px",
          borderTop: "1px solid #e1e1e1"
        }}>
          <div style={{ display: "flex", gap: "8px" }}>
            <Tooltip content="Remove from list" relationship="label" positioning="above" withArrow>
              <button
                className={styles.iconBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  showDeleteDialog('inconsistent-occurrence', termName, originalIdx, flatOccIdx);
                }}
              >
                <Trash2 size={16} color="#4080FF" />
              </button>
            </Tooltip>
            {canLowercase && (
              <Tooltip content={isLowercasing ? "Lowercasing..." : isLowercased ? "Re-lowercase" : "Lowercase"} relationship="label" positioning="above" withArrow>
                <button
                  className={`${styles.iconBtn} brand-btn`}
                  style={isLowercasing ? undefined : { border: "1px solid transparent", background: "var(--brand-gradient)", color: "var(--text-on-brand)" }}
                  disabled={isLowercasing}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLowercaseInconsistentOcc(variantText, occ.sentence, occKey);
                  }}
                >
                  {isLowercasing ? <Spinner size="tiny" /> : <ArrowDownAZ size={16} />}
                </button>
              </Tooltip>
            )}
            {canCapitalize && (
              <Tooltip content={isCapitalizing ? "Capitalizing..." : isCapitalized ? "Re-capitalize" : `Capitalize${definedForm ? ` to "${definedForm}"` : ""}`} relationship="label" positioning="above" withArrow>
                <button
                  className={`${styles.iconBtn} brand-btn`}
                  style={isCapitalizing ? undefined : { border: "1px solid transparent", background: "var(--brand-gradient)", color: "var(--text-on-brand)" }}
                  disabled={isCapitalizing}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCapitalizeOccurrence(variantText, occ.sentence, occKey, definedForm);
                  }}
                >
                  {isCapitalizing ? <Spinner size="tiny" /> : <ALargeSmall size={16} />}
                </button>
              </Tooltip>
            )}
          </div>
          <Tooltip content="Locate in document" relationship="label" positioning="above" withArrow>
            <button
              className={styles.iconBtn}
              onClick={(e) => {
                e.stopPropagation();
                handleLocateInDraft(occ.sentence);
              }}
            >
              <CiLocationArrow1 size={16} color="#4080FF" />
            </button>
          </Tooltip>
        </div>
      </div>
    );
  };

  // Render an inconsistent term card
  const renderInconsistentCard = (term: InconsistentTerm, originalIdx: number) => {
    const termKey = `inconsistent-${originalIdx}`;
    const isExpanded = expandedTerms.has(termKey);

    const isGenerating = generatingDefinition === term.term;
    const defResult = definitionResults.get(term.term);
    const isApplying = applyingTrackChanges === term.term;
    const isApplied = appliedDefinitions.has(term.term);

    // Pre-compute flat occurrence list with stable indices for state keys
    const flatOccurrences: { variant: string; occ: { sentence: string; sectionReference: string }; flatIdx: number }[] = [];
    for (const variation of term.variations) {
      for (const occ of variation.occurrences) {
        flatOccurrences.push({ variant: variation.variant, occ, flatIdx: flatOccurrences.length });
      }
    }

    // Split into inconsistent vs consistent, then sort each group by document position
    const inconsistentOccs = (term.definedForm
      ? flatOccurrences.filter(fo => fo.variant !== term.definedForm)
      : flatOccurrences
    ).sort((a, b) => compareSectionPosition(a.occ.sectionReference, b.occ.sectionReference));

    const consistentOccs = (term.definedForm
      ? flatOccurrences.filter(fo => fo.variant === term.definedForm)
      : []
    ).sort((a, b) => compareSectionPosition(a.occ.sectionReference, b.occ.sectionReference));

    // Count visible occurrences (not removed)
    const visibleCount = flatOccurrences.filter((_, fIdx) =>
      !removedInconsistentOccs.has(`${originalIdx}-${fIdx}`)
    ).length;

    const isShowingMore = showMoreConsistent.has(originalIdx);
    const CONSISTENT_PREVIEW_COUNT = 3;

    return (
      <div key={termKey} className={styles.termCard}>
        <div
          className={styles.termCardHeader}
          onClick={() => toggleTerm(termKey)}
        >
          <div style={{ display: "flex", alignItems: "center", flex: 1 }}>
            <p className={styles.termTitle}>
              {term.term}
            </p>
            <span className={styles.termSubtitle}>
              ({visibleCount})
            </span>
          </div>
          {isExpanded ? (
            <ChevronUp className={styles.chevronIcon} />
          ) : (
            <ChevronDown className={styles.chevronIcon} />
          )}
        </div>

        {isExpanded && (
          <div className={styles.termCardContent}>
            {/* Button row: Remove from list (left) + Add Definition (right) */}
            <div className={styles.buttonRow} style={{ justifyContent: "space-between" }}>
              <Tooltip content="Remove from list" relationship="label" positioning="above" withArrow>
                <button
                  className={styles.iconBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    showDeleteDialog('inconsistent', term.term, originalIdx);
                  }}
                >
                  <Trash2 size={16} color="#4080FF" />
                </button>
              </Tooltip>
              {defResult && defResult.status !== 'error' ? (
                <span className={styles.appliedBadge}>
                  <Check size={14} />
                  Definition Generated
                </span>
              ) : (
                <button
                  className={`${styles.primaryBtn} brand-btn`}
                  disabled={isGenerating || !originalParsed}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddDefinitionForInconsistent(term);
                  }}
                >
                  {isGenerating ? <Spinner size="tiny" /> : "Add Definition"}
                </button>
              )}
            </div>

            {/* Diff viewer (appears after definition is generated) */}
            {defResult && defResult.status !== 'error' && (
              <div className={styles.diffSection}>
                <div className={styles.diffLabel}>
                  {defResult.status === 'new_section'
                    ? `New section: ${defResult.suggestedHeading || 'Definitions'} (${defResult.sectionNumber})`
                    : `Section ${defResult.sectionNumber}`
                  }
                </div>
                {defResult.status === 'new_section' ? (
                  <div style={{
                    padding: "12px",
                    backgroundColor: "#d4edda",
                    color: "#155724",
                    fontWeight: "bold",
                    border: "1px solid #c3e6cb",
                    borderRadius: "6px",
                    fontSize: "13px",
                    lineHeight: "1.6",
                    whiteSpace: "pre-wrap",
                    wordWrap: "break-word",
                  }}>
                    {defResult.amendedText}
                  </div>
                ) : (
                  <div className={styles.diffContainer}>
                    <style dangerouslySetInnerHTML={{ __html: getDiffStyles() }} />
                    <div
                      dangerouslySetInnerHTML={{
                        __html: generateDiffHtml(defResult.originalText, defResult.amendedText),
                      }}
                    />
                  </div>
                )}

                <div style={{ marginTop: "10px" }}>
                  <button
                    className={`${styles.primaryBtn} brand-btn`}
                    disabled={isApplying}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleApplyDefinition(term.term);
                    }}
                  >
                    {isApplying ? (
                      <>
                        <Spinner size="tiny" />
                        Applying...
                      </>
                    ) : isApplied ? (
                      "Re-apply Track Changes"
                    ) : (
                      "Apply as Track Changes"
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Inconsistent occurrences (variant !== definedForm) — sorted by document position */}
            {inconsistentOccs.map((fo) => {
              const occKey = `${originalIdx}-${fo.flatIdx}`;
              return renderInconsistentOccurrenceCard(
                fo.variant, fo.occ, occKey, term.term, originalIdx, fo.flatIdx, term.definedForm
              );
            })}

            {/* Consistent occurrences (variant === definedForm) — sorted, with "Show more" */}
            {consistentOccs.length > 0 && (
              <>
                {(isShowingMore ? consistentOccs : consistentOccs.slice(0, CONSISTENT_PREVIEW_COUNT)).map((fo) => {
                  const occKey = `${originalIdx}-${fo.flatIdx}`;
                  return renderInconsistentOccurrenceCard(
                    fo.variant, fo.occ, occKey, term.term, originalIdx, fo.flatIdx, term.definedForm
                  );
                })}
                {consistentOccs.length > CONSISTENT_PREVIEW_COUNT && !isShowingMore && (
                  <button
                    style={{
                      display: "block",
                      width: "100%",
                      padding: "6px 8px",
                      background: "none",
                      border: "1px dashed #ccc",
                      borderRadius: "6px",
                      color: "#4080FF",
                      fontSize: "11px",
                      cursor: "pointer",
                      marginBottom: "6px",
                    }}
                    onClick={() => setShowMoreConsistent(prev => new Set(prev).add(originalIdx))}
                  >
                    Show {consistentOccs.length - CONSISTENT_PREVIEW_COUNT} more consistent occurrence{consistentOccs.length - CONSISTENT_PREVIEW_COUNT !== 1 ? 's' : ''}
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  // Render a single occurrence card within the duplicate definitions section
  const renderDuplicateOccurrenceCard = (
    occ: { sentence: string; sectionReference: string },
    occKey: string,
    termName: string,
    originalIdx: number,
    occIdx: number
  ) => {
    if (removedDuplicateOccs.has(occKey)) return null;

    const formattedSection = formatSectionRef(occ.sectionReference);
    const isDeleting = deletingDuplicateOcc === occKey;
    const isDeleted = deletedDuplicateOccs.has(occKey);

    return (
      <div key={occKey} className={styles.occurrenceCard}>
        {formattedSection && (
          <div className={styles.occurrenceSectionRef}>
            {formattedSection}
          </div>
        )}
        <div className={styles.occurrenceText}>
          {highlightTerm(occ.sentence, termName)}
        </div>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: "8px",
          paddingTop: "8px",
          borderTop: "1px solid #e1e1e1"
        }}>
          <div style={{ display: "flex", gap: "8px" }}>
            <Tooltip content="Remove from list" relationship="label" positioning="above" withArrow>
              <button
                className={styles.iconBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  showDeleteDialog('duplicate-occurrence', termName, originalIdx, occIdx);
                }}
              >
                <Trash2 size={16} color="#4080FF" />
              </button>
            </Tooltip>
            <Tooltip content={isDeleting ? "Deleting..." : isDeleted ? "Re-delete definition" : "Delete definition (track changes)"} relationship="label" positioning="above" withArrow>
              <button
                className={styles.iconBtn}
                disabled={isDeleting}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteDuplicateOccurrence(occ.sentence, occKey);
                }}
              >
                {isDeleting ? <Spinner size="tiny" /> : <Eraser size={16} color="#d32f2f" />}
              </button>
            </Tooltip>
          </div>
          <Tooltip content="Locate in document" relationship="label" positioning="above" withArrow>
            <button
              className={styles.iconBtn}
              onClick={(e) => {
                e.stopPropagation();
                handleLocateInDraft(occ.sentence);
              }}
            >
              <CiLocationArrow1 size={16} color="#4080FF" />
            </button>
          </Tooltip>
        </div>
      </div>
    );
  };

  // Render a duplicate definition card with nested occurrences
  const renderDuplicateCard = (dupDef: DuplicateDefinition, originalIdx: number) => {
    const termKey = `duplicate-${originalIdx}`;
    const isExpanded = expandedTerms.has(termKey);
    const resolution = duplicateResolutions.get(dupDef.term);
    const isResolving = resolvingDuplicates === dupDef.term;

    // Filter out removed occurrences
    const visibleOccurrences = dupDef.occurrences.filter(
      (_, occIdx) => !removedDuplicateOccs.has(`${originalIdx}-${occIdx}`)
    );

    return (
      <div key={termKey} className={styles.termCard}>
        <div
          className={styles.termCardHeader}
          onClick={() => toggleTerm(termKey)}
        >
          <div style={{ display: "flex", alignItems: "center", flex: 1 }}>
            <p className={styles.termTitle}>
              {dupDef.term}
            </p>
            <span className={styles.termSubtitle}>
              ({visibleOccurrences.length})
            </span>
          </div>
          {isExpanded ? (
            <ChevronUp className={styles.chevronIcon} />
          ) : (
            <ChevronDown className={styles.chevronIcon} />
          )}
        </div>

        {isExpanded && (
          <div className={styles.termCardContent}>
            {/* Button row: Remove from list + Remove duplicates */}
            <div className={styles.buttonRow} style={{ justifyContent: "space-between" }}>
              <Tooltip content="Remove from list" relationship="label" positioning="above" withArrow>
                <button
                  className={styles.iconBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    showDeleteDialog('duplicate', dupDef.term, originalIdx);
                  }}
                >
                  <Trash2 size={16} color="#4080FF" />
                </button>
              </Tooltip>

              {/* Remove duplicates button - gradient style */}
              <button
                className="brand-btn"
                disabled={isResolving || !originalParsed}
                onClick={(e) => {
                  e.stopPropagation();
                  handleResolveDuplicates(dupDef);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "4px",
                  height: "28px",
                  padding: "0 10px",
                  borderRadius: "4px",
                  border: "none",
                  background: (isResolving || !originalParsed) ? "#ccc" : "var(--brand-gradient)",
                  color: "var(--text-on-brand)",
                  fontSize: "12px",
                  fontWeight: 500,
                  cursor: (isResolving || !originalParsed) ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                }}
              >
                {isResolving ? (
                  <>
                    <Spinner size="tiny" />
                    Resolving...
                  </>
                ) : resolution ? (
                  "Re-run"
                ) : (
                  "Remove duplicates"
                )}
              </button>
            </div>

            {/* Resolution results - show amendments with diff */}
            {resolution && resolution.amendments.length > 0 && (
              <div style={{ marginTop: "12px", marginBottom: "12px" }}>
                <p style={{ fontSize: "12px", fontWeight: 600, marginBottom: "8px", color: "#333" }}>
                  Suggested Changes:
                </p>
                <style>{getDiffStyles()}</style>
                {resolution.amendments.map((amendment, aIdx) => {
                  const amendmentKey = `${dupDef.term}-${aIdx}`;
                  const isApplying = applyingDuplicateAmendment === amendmentKey;
                  const isApplied = appliedDuplicateAmendments.has(amendmentKey);
                  const diffHtml = generateDiffHtml(amendment.originalText, amendment.amendedText);

                  // Normalize section reference: strip brackets and normalize "Section" prefix
                  let normalizedRef = amendment.sectionReference
                    .replace(/^\[|\]$/g, '')  // Strip leading [ and trailing ]
                    .trim();
                  // Remove "Section " prefix if present (case-insensitive)
                  if (normalizedRef.toLowerCase().startsWith('section ')) {
                    normalizedRef = normalizedRef.substring(8).trim();
                  }
                  // Add back "Section " prefix consistently
                  const sectionDisplay = `Section ${normalizedRef}`;

                  return (
                    <div
                      key={amendmentKey}
                      style={{
                        backgroundColor: "#ffffff",
                        border: "1px solid #4080FF",
                        borderRadius: "4px",
                        padding: "12px",
                        marginBottom: "8px",
                      }}
                    >
                      <div style={{ fontSize: "12px", fontWeight: 500, color: "#333", marginBottom: "8px" }}>
                        {sectionDisplay}
                      </div>
                      <div
                        style={{ fontSize: "13px", lineHeight: "1.5" }}
                        dangerouslySetInnerHTML={{ __html: diffHtml }}
                      />
                      <div style={{ marginTop: "10px", display: "flex", gap: "8px", alignItems: "center" }}>
                        {/* Apply Track Changes - gradient style */}
                        <button
                          className="brand-btn"
                          disabled={isApplying}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApplyDuplicateAmendment(amendment, amendmentKey);
                          }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "4px",
                            height: "28px",
                            padding: "0 10px",
                            borderRadius: "4px",
                            border: "none",
                            background: isApplying ? "#ccc" : "var(--brand-gradient)",
                            color: "var(--text-on-brand)",
                            fontSize: "11px",
                            fontWeight: 500,
                            cursor: isApplying ? "not-allowed" : "pointer",
                            fontFamily: "inherit",
                          }}
                        >
                          {isApplying ? (
                            <>
                              <Spinner size="tiny" />
                              Applying...
                            </>
                          ) : isApplied ? (
                            <>
                              <Check size={12} />
                              Re-apply
                            </>
                          ) : (
                            "Apply Track Changes"
                          )}
                        </button>
                        <Tooltip content="Locate in document" relationship="label" positioning="above" withArrow>
                          <button
                            className={styles.iconBtn}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLocateInDraft(amendment.originalText);
                            }}
                          >
                            <CiLocationArrow1 size={14} color="#4080FF" />
                          </button>
                        </Tooltip>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Show message if no amendments needed */}
            {resolution && resolution.amendments.length === 0 && (
              <div style={{
                marginTop: "12px",
                padding: "10px",
                backgroundColor: "#e8f5e9",
                borderRadius: "6px",
                fontSize: "12px",
                color: "#2e7d32"
              }}>
                No changes needed - the duplicates appear to be intentional cross-references.
              </div>
            )}

            {/* Nested occurrence cards — sorted by document position */}
            {dupDef.occurrences
              .map((occ, occIdx) => ({ occ, occIdx }))
              .sort((a, b) => compareSectionPosition(a.occ.sectionReference, b.occ.sectionReference))
              .map(({ occ, occIdx }) => {
                const occKey = `${originalIdx}-${occIdx}`;
                return renderDuplicateOccurrenceCard(occ, occKey, dupDef.term, originalIdx, occIdx);
              })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={styles.pageRoot}>
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <MdDelete
                style={{
                  color: "blue",
                  backgroundColor: "#F2F2F2",
                  borderRadius: "50%",
                  padding: "8px",
                  fontSize: "32px",
                }}
              />
            </DialogTitle>
            <DialogContent>
              <p
                style={{
                  fontSize: "17px",
                  fontWeight: "600",
                  textAlign: "center",
                  marginTop: "6px"
                }}
              >
                {getDeleteDialogMessage()}
              </p>
              <p
                style={{
                  margin: 0,
                  marginBottom: "8px",
                  backgroundColor: "#E6E6E6",
                  borderRadius: "8px",
                  padding: "10px",
                  maxHeight: "6em",
                  overflowY: "auto",
                  lineHeight: "1.5em",
                }}
              >
                <span
                  style={{
                    color: "#0F62FE",
                    fontWeight: "600",
                  }}
                >
                  {deleteDialog.term}
                </span>
                {deleteDialog.definitionText && (
                  <>: {deleteDialog.definitionText.substring(0, 100)}...</>
                )}
              </p>
            </DialogContent>
            <DialogActions
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexDirection: "row",
              }}
            >
              <FluentButton
                style={{
                  flex: 1,
                  padding: "6px",
                  borderRadius: "6px"
                }}
                appearance="secondary"
                onClick={handleDeleteCancel}
              >
                Cancel
              </FluentButton>
              <FluentButton
                className="brand-btn"
                style={{
                  flex: 1,
                  background: "var(--brand-gradient)",
                  color: "var(--text-on-brand)",
                  border: "none",
                  padding: "6px",
                  borderRadius: "6px",
                  fontFamily: "inherit",
                  fontSize: "14px",
                  fontWeight: 500,
                }}
                appearance="primary"
                onClick={handleDeleteConfirm}
              >
                Yes Please
              </FluentButton>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      {/* Header */}
      <div className={styles.pageHeader}>
        <div className={styles.headerLeft}>
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
            style={{ padding: "4px 8px", fontSize: "12px" }}
          >
            <ArrowLeft style={{ width: "14px", height: "14px", marginRight: "4px" }} />
            Back
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className={styles.content}>
        {/* Unused Definitions Section */}
        <Accordion
          collapsible
          openItems={isUnusedExpanded ? ["unused"] : []}
          onToggle={(_, data) => {
            setIsUnusedExpanded(data.openItems.includes("unused"));
          }}
        >
          <AccordionItem
            value="unused"
            className={isUnusedExpanded ? styles.categoryAccordionItemExpanded : styles.categoryAccordionItem}
          >
            <AccordionHeader
              style={{
                backgroundColor: "#ffffff",
                border: "none",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
              className={styles.categoryAccordionHeader}
              onClick={() => setIsUnusedExpanded(!isUnusedExpanded)}
              expandIcon={null}
            >
              <div className={styles.categoryTitle} style={{ cursor: "pointer", flex: 1 }}>
                <AiOutlineExclamationCircle />
                <span>
                  Unused Definitions{" "}
                  <span style={{ fontSize: "12px" }}>({unusedDefinitions.length})</span>
                </span>
              </div>
              <div className={styles.categoryCustomChevron}>
                {isUnusedExpanded ? (
                  <ChevronUp className={styles.chevronIcon} />
                ) : (
                  <ChevronDown className={styles.chevronIcon} />
                )}
              </div>
            </AccordionHeader>

            <AccordionPanel className={styles.categoryAccordionPanel}>
              <div>
                {unusedDefinitions.length === 0 ? (
                  <div className={styles.emptyState}>
                    No unused definitions found
                  </div>
                ) : (
                  results.unusedDefinitions
                    .map((def, idx) => ({ def, idx }))
                    .sort((a, b) => compareSectionPosition(a.def.sectionReference, b.def.sectionReference))
                    .map(({ def, idx }) => {
                      if (removedUnused.has(idx)) return null;
                      return renderUnusedCard(def, idx);
                    })
                )}
              </div>
            </AccordionPanel>
          </AccordionItem>
        </Accordion>

        <Divider style={{ margin: "16px 0" }} />

        {/* Duplicate Definitions Section */}
        <Accordion
          collapsible
          openItems={isDuplicateExpanded ? ["duplicate"] : []}
          onToggle={(_, data) => {
            setIsDuplicateExpanded(data.openItems.includes("duplicate"));
          }}
        >
          <AccordionItem
            value="duplicate"
            className={isDuplicateExpanded ? styles.categoryAccordionItemExpanded : styles.categoryAccordionItem}
          >
            <AccordionHeader
              style={{
                backgroundColor: "#ffffff",
                border: "none",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
              className={styles.categoryAccordionHeader}
              onClick={() => setIsDuplicateExpanded(!isDuplicateExpanded)}
              expandIcon={null}
            >
              <div className={styles.categoryTitle} style={{ cursor: "pointer", flex: 1 }}>
                <AiOutlineExclamationCircle />
                <span>
                  Duplicate Definitions{" "}
                  <span style={{ fontSize: "12px" }}>({duplicateDefinitions.length})</span>
                </span>
              </div>
              <div className={styles.categoryCustomChevron}>
                {isDuplicateExpanded ? (
                  <ChevronUp className={styles.chevronIcon} />
                ) : (
                  <ChevronDown className={styles.chevronIcon} />
                )}
              </div>
            </AccordionHeader>

            <AccordionPanel className={styles.categoryAccordionPanel}>
              <div>
                {duplicateDefinitions.length === 0 ? (
                  <div className={styles.emptyState}>
                    No duplicate definitions found
                  </div>
                ) : (
                  (results.duplicateDefinitions || [])
                    .map((dupDef, idx) => ({ dupDef, idx }))
                    .sort((a, b) => {
                      const aRef = a.dupDef.occurrences[0]?.sectionReference || '';
                      const bRef = b.dupDef.occurrences[0]?.sectionReference || '';
                      return compareSectionPosition(aRef, bRef);
                    })
                    .map(({ dupDef, idx }) => {
                      if (removedDuplicate.has(idx)) return null;
                      return renderDuplicateCard(dupDef, idx);
                    })
                )}
              </div>
            </AccordionPanel>
          </AccordionItem>
        </Accordion>

        <Divider style={{ margin: "16px 0" }} />

        {/* Undefined Terms Section */}
        <Accordion
          collapsible
          openItems={isUndefinedExpanded ? ["undefined"] : []}
          onToggle={(_, data) => {
            setIsUndefinedExpanded(data.openItems.includes("undefined"));
          }}
        >
          <AccordionItem
            value="undefined"
            className={isUndefinedExpanded ? styles.categoryAccordionItemExpanded : styles.categoryAccordionItem}
          >
            <AccordionHeader
              style={{
                backgroundColor: "#ffffff",
                border: "none",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
              className={styles.categoryAccordionHeader}
              onClick={() => setIsUndefinedExpanded(!isUndefinedExpanded)}
              expandIcon={null}
            >
              <div className={styles.categoryTitle} style={{ cursor: "pointer", flex: 1 }}>
                <AiOutlineExclamationCircle />
                <span>
                  Undefined Terms{" "}
                  <span style={{ fontSize: "12px" }}>({undefinedTerms.length})</span>
                </span>
              </div>
              <div className={styles.categoryCustomChevron}>
                {isUndefinedExpanded ? (
                  <ChevronUp className={styles.chevronIcon} />
                ) : (
                  <ChevronDown className={styles.chevronIcon} />
                )}
              </div>
            </AccordionHeader>

            <AccordionPanel className={styles.categoryAccordionPanel}>
              <div>
                {undefinedTerms.length === 0 ? (
                  <div className={styles.emptyState}>
                    No undefined terms found
                  </div>
                ) : (
                  results.undefinedTerms
                    .map((term, idx) => ({ term, idx }))
                    .sort((a, b) => {
                      const aRef = a.term.occurrences[0]?.sectionReference || '';
                      const bRef = b.term.occurrences[0]?.sectionReference || '';
                      return compareSectionPosition(aRef, bRef);
                    })
                    .map(({ term, idx }) => {
                      if (removedUndefined.has(idx)) return null;
                      return renderUndefinedCard(term, idx);
                    })
                )}
              </div>
            </AccordionPanel>
          </AccordionItem>
        </Accordion>

        <Divider style={{ margin: "16px 0" }} />

        {/* Inconsistent Capitalization Section */}
        <Accordion
          collapsible
          openItems={isInconsistentExpanded ? ["inconsistent"] : []}
          onToggle={(_, data) => {
            setIsInconsistentExpanded(data.openItems.includes("inconsistent"));
          }}
        >
          <AccordionItem
            value="inconsistent"
            className={isInconsistentExpanded ? styles.categoryAccordionItemExpanded : styles.categoryAccordionItem}
          >
            <AccordionHeader
              style={{
                backgroundColor: "#ffffff",
                border: "none",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
              className={styles.categoryAccordionHeader}
              onClick={() => setIsInconsistentExpanded(!isInconsistentExpanded)}
              expandIcon={null}
            >
              <div className={styles.categoryTitle} style={{ cursor: "pointer", flex: 1 }}>
                <AiOutlineExclamationCircle />
                <span>
                  Inconsistent Capitalization{" "}
                  <span style={{ fontSize: "12px" }}>({inconsistentTerms.length})</span>
                </span>
              </div>
              <div className={styles.categoryCustomChevron}>
                {isInconsistentExpanded ? (
                  <ChevronUp className={styles.chevronIcon} />
                ) : (
                  <ChevronDown className={styles.chevronIcon} />
                )}
              </div>
            </AccordionHeader>

            <AccordionPanel className={styles.categoryAccordionPanel}>
              <div>
                {inconsistentTerms.length === 0 ? (
                  <div className={styles.emptyState}>
                    No inconsistent capitalization found
                  </div>
                ) : (
                  results.inconsistentTerms
                    .map((term, idx) => ({ term, idx }))
                    .sort((a, b) => {
                      const aRef = a.term.variations[0]?.occurrences[0]?.sectionReference || '';
                      const bRef = b.term.variations[0]?.occurrences[0]?.sectionReference || '';
                      return compareSectionPosition(aRef, bRef);
                    })
                    .map(({ term, idx }) => {
                      if (removedInconsistent.has(idx)) return null;
                      return renderInconsistentCard(term, idx);
                    })
                )}
              </div>
            </AccordionPanel>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
};
