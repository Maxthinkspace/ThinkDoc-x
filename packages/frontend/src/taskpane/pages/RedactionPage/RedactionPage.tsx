import * as React from 'react';
import {
  Button,
  Checkbox,
  makeStyles,
  Spinner,
  Tooltip,
  Badge,
} from '@fluentui/react-components';
import { ArrowSync16Regular } from '@fluentui/react-icons';
import { FaArrowLeft } from 'react-icons/fa6';
import { CiLocationArrow1 } from 'react-icons/ci';
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { useNavigation } from '../../hooks/use-navigation';
import { useToast } from '../../hooks/use-toast';
import { useDocumentAnnotations } from '../../contexts/AnnotationContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { getSelectedText } from '../../../utils/annotationFilter';
import { getTextRange, getTextRangeAcrossParagraphs } from '../../taskpane';
import { documentCache } from '../../../services/documentCache';
import { backendApi } from '../../../services/api';
import type { DocumentNodeWithRange } from '../../../types/documents';

// Redaction replacement marker: Black Circle U+25CF in brackets
const REDACTION_MARKER = '[\u25CF]';
const REDACTION_MARKER_FONT_SIZE = 8;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TermOccurrence {
  sentence: string;
  sectionNumber: string;
}

interface RedactionTermItem {
  id: string;
  term: string;
  occurrences: TermOccurrence[];
  /** Which occurrence indices have been removed from the list */
  removedOccurrences: Set<number>;
}

interface SuggestedTerm {
  id: string;
  term: string;
  category: string;
  occurrences: TermOccurrence[];
  removedOccurrences: Set<number>;
}

// ---------------------------------------------------------------------------
// Helpers: search term in document structure
// ---------------------------------------------------------------------------

/**
 * Search for all occurrences of a term in the parsed document structure.
 * Returns sentence fragments containing the term, with their deepest section numbers.
 */
function findTermOccurrencesInStructure(
  term: string,
  structure: DocumentNodeWithRange[],
  recitals?: string,
): TermOccurrence[] {
  const occurrences: TermOccurrence[] = [];
  const termLower = term.toLowerCase();

  // Check recitals
  if (recitals) {
    const sentences = splitIntoSentences(recitals);
    for (const sentence of sentences) {
      if (sentence.toLowerCase().includes(termLower)) {
        occurrences.push({ sentence, sectionNumber: 'Recitals' });
      }
    }
  }

  // Recursively search structure
  function searchNode(node: DocumentNodeWithRange) {
    const allText = getAllNodeText(node);
    const sentences = splitIntoSentences(allText);
    for (const sentence of sentences) {
      if (sentence.toLowerCase().includes(termLower)) {
        occurrences.push({
          sentence,
          sectionNumber: node.sectionNumber || '',
        });
      }
    }

    if (node.children) {
      for (const child of node.children) {
        searchNode(child);
      }
    }
  }

  for (const node of structure) {
    searchNode(node);
  }

  return occurrences;
}

/** Get text content of a node (heading + text + additional paragraphs), NOT including children */
function getAllNodeText(node: DocumentNodeWithRange): string {
  let text = node.text || '';
  if (node.additionalParagraphs && node.additionalParagraphs.length > 0) {
    text += ' ' + node.additionalParagraphs.join(' ');
  }
  return text;
}

/** Split text into sentence-like fragments */
function splitIntoSentences(text: string): string[] {
  if (!text || text.trim().length === 0) return [];
  // Split on sentence-ending punctuation followed by a space or end-of-string
  const raw = text.split(/(?<=[.;])\s+/);
  return raw.map((s) => s.trim()).filter((s) => s.length > 0);
}

/** Highlight a term within text, returning React nodes */
function highlightTerm(text: string, term: string): React.ReactNode {
  if (!term) return text;
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  if (parts.length === 1) return text;
  const termLower = term.toLowerCase();
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === termLower ? (
          <span key={i} style={{ backgroundColor: '#FFF3CD', fontWeight: 600, borderRadius: '2px', padding: '0 2px' }}>
            {part}
          </span>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        )
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    backgroundColor: '#f8f9fa',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    padding: '5px 19px',
    gap: '8px',
    backgroundColor: '#fff',
    borderBottom: '1px solid #e1e1e1',
  },
  headerIcon: {
    color: '#999999',
    border: 'none',
    backgroundColor: 'transparent',
    '&:hover': {
      color: '#999999',
      border: 'none',
      backgroundColor: 'transparent',
    },
  },
  headerTitle: {
    margin: '9px',
    fontWeight: 600,
    color: '#333333',
    fontSize: '15px',
    flex: 1,
  },
  content: {
    padding: '12px 16px 16px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    flex: 1,
    overflowY: 'auto',
  },
  infoBox: {
    display: 'flex',
    alignItems: 'start',
    gap: '8px',
    padding: '10px',
    borderRadius: '8px',
    backgroundColor: '#e8f4fd',
    border: '1px solid #b3d9f2',
    fontSize: '13px',
    color: '#1565c0',
    lineHeight: '1.4',
  },
  redactAllRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  sectionTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#555',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    marginTop: '4px',
    marginBottom: '2px',
  },
  checkboxRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    userSelect: 'none',
  },
  termList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  termCard: {
    border: '1px solid #4f8bd4',
    borderRadius: '8px',
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  suggestedTermCard: {
    border: '1px solid #e8a838',
    borderRadius: '8px',
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  termCardHeader: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 12px',
    gap: '8px',
    cursor: 'pointer',
    '&:hover': {
      backgroundColor: '#fafafa',
    },
  },
  termName: {
    flex: 1,
    fontSize: '14px',
    fontWeight: 600,
    color: '#333',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  termCount: {
    fontSize: '12px',
    color: '#888',
    fontWeight: 400,
    flexShrink: 0,
  },
  expandIcon: {
    color: '#999',
    flexShrink: 0,
    width: '16px',
    height: '16px',
  },
  iconBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    borderRadius: '4px',
    border: '1px solid #e1e1e1',
    backgroundColor: '#fff',
    cursor: 'pointer',
    flexShrink: 0,
    '&:hover': {
      backgroundColor: '#f0f0f0',
    },
  },
  termCardBody: {
    padding: '0 12px 12px 12px',
    borderTop: '1px solid #f0f0f0',
  },
  categoryBadge: {
    fontSize: '11px',
    color: '#e8a838',
    fontWeight: 500,
    marginTop: '4px',
    marginBottom: '4px',
  },
  termCardActions: {
    display: 'flex',
    gap: '8px',
    padding: '8px 0',
    marginBottom: '4px',
    borderBottom: '1px solid #f0f0f0',
  },
  occurrenceCard: {
    border: '1px solid #e1e1e1',
    borderRadius: '6px',
    backgroundColor: '#f8f9fa',
    marginBottom: '6px',
    padding: '10px 12px',
  },
  occurrenceSectionRef: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#333',
    marginBottom: '4px',
  },
  occurrenceText: {
    fontSize: '13px',
    color: '#666',
    lineHeight: '1.4',
  },
  occurrenceActions: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '8px',
    paddingTop: '8px',
    borderTop: '1px solid #e1e1e1',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 16px',
    color: '#999',
    fontSize: '13px',
    textAlign: 'center' as const,
    gap: '4px',
  },
  addRow: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    marginTop: '4px',
  },
  refreshRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0px',
  },
  refreshText: {
    fontSize: '13px',
    color: '#666',
  },
  refreshButton: {
    minWidth: 'auto',
    padding: '2px',
    color: '#0F62FE',
    marginLeft: '2px',
    marginRight: '2px',
  },
  loadingRoot: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#fff',
    padding: '16px',
    boxSizing: 'border-box' as const,
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 24px',
    gap: '16px',
  },
  loadingText: {
    fontSize: '14px',
    color: '#666',
  },
  dialogContainer: {
    width: '100%',
    maxWidth: '500px',
    backgroundColor: '#fff',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
    display: 'flex',
    flexDirection: 'column',
  },
  dialogHeader: {
    padding: '20px 24px 16px 24px',
  },
  dialogTitle: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#333',
    margin: 0,
    marginBottom: '12px',
  },
  errorContainer: {
    color: '#d32f2f',
    padding: '12px',
    backgroundColor: '#ffebee',
    borderRadius: '6px',
    marginBottom: '16px',
  },
  brandBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '6px 14px',
    borderRadius: '6px',
    border: 'none',
    background: 'var(--brand-gradient)',
    color: 'var(--text-on-brand)',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  suggestHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: '4px',
    marginBottom: '2px',
  },
  redactBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    height: '26px',
    padding: '0 10px',
    borderRadius: '4px',
    border: '1px solid #d32f2f',
    backgroundColor: '#fff',
    color: '#d32f2f',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    flexShrink: 0,
    whiteSpace: 'nowrap' as const,
    '&:hover': {
      backgroundColor: '#ffebee',
    },
  },
  replaceBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    height: '26px',
    padding: '0 10px',
    borderRadius: '4px',
    border: '1px solid #0F62FE',
    backgroundColor: '#fff',
    color: '#0F62FE',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    flexShrink: 0,
    whiteSpace: 'nowrap' as const,
    '&:hover': {
      backgroundColor: '#e8f0fe',
    },
  },
  replaceInputRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    padding: '6px 0',
    borderBottom: '1px solid #f0f0f0',
  },
  replaceInput: {
    width: '100%',
    boxSizing: 'border-box' as const,
    height: '28px',
    padding: '0 8px',
    borderRadius: '4px',
    border: '1px solid #ccc',
    fontSize: '12px',
    fontFamily: 'inherit',
    outline: 'none',
  },
  applyBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '28px',
    padding: '0 10px',
    borderRadius: '4px',
    border: 'none',
    backgroundColor: '#0F62FE',
    color: '#fff',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    whiteSpace: 'nowrap' as const,
  },
  cancelBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '28px',
    padding: '0 8px',
    borderRadius: '4px',
    border: '1px solid #ccc',
    backgroundColor: '#fff',
    color: '#666',
    fontSize: '12px',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  checkbox: {
    "& input:checked + .fui-Checkbox__indicator": {
      backgroundColor: "#0F62FE !important",
      border: "1px solid #0F62FE !important",
    },
    "& .fui-Checkbox__indicator": {
      border: "1px solid #0F62FE !important",
    },
  },
  finishBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    width: '100%',
    padding: '10px 14px',
    borderRadius: '6px',
    border: 'none',
    background: 'var(--brand-gradient)',
    color: 'var(--text-on-brand)',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    marginTop: '8px',
  },
  replacementBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 10px',
    borderRadius: '6px',
    backgroundColor: '#e8f4fd',
    border: '1px solid #b3d9f2',
    fontSize: '12px',
    color: '#1565c0',
    marginTop: '4px',
    marginBottom: '6px',
  },
});

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const RedactionPage: React.FC = () => {
  const styles = useStyles();
  const { goBack, navigateTo } = useNavigation();
  const { toast } = useToast();
  const { translations } = useLanguage();

  const {
    annotations,
    combinedStructure,
    recitals,
    isLoading: isLoadingAnnotations,
    isClassifying,
    error: annotationsError,
    extract,
    refresh,
  } = useDocumentAnnotations();

  // User-selected terms
  const [userTerms, setUserTerms] = React.useState<RedactionTermItem[]>([]);
  const [expandedTermId, setExpandedTermId] = React.useState<string | null>(null);
  const [isAdding, setIsAdding] = React.useState(false);

  // LLM-suggested terms
  const [suggestedTerms, setSuggestedTerms] = React.useState<SuggestedTerm[]>([]);
  const [expandedSuggestedId, setExpandedSuggestedId] = React.useState<string | null>(null);
  const [isSuggesting, setIsSuggesting] = React.useState(false);
  const [suggestError, setSuggestError] = React.useState<string | null>(null);
  const [hasSuggested, setHasSuggested] = React.useState(false);
  const [removedSuggestedIds, setRemovedSuggestedIds] = React.useState<Set<string>>(new Set());

  // Redaction state
  const [redactingTermId, setRedactingTermId] = React.useState<string | null>(null);
  const [redactedTermIds, setRedactedTermIds] = React.useState<Set<string>>(new Set());
  const [replacedTermIds, setReplacedTermIds] = React.useState<Set<string>>(new Set());
  const [isRedactingAll, setIsRedactingAll] = React.useState(false);

  // Section checkboxes for Change All
  const [selectionsChecked, setSelectionsChecked] = React.useState(false);
  const [suggestionsChecked, setSuggestionsChecked] = React.useState(false);

  // Replace feature
  const [showReplaceInput, setShowReplaceInput] = React.useState<string | null>(null);
  const [replaceTexts, setReplaceTexts] = React.useState<Record<string, string>>({});
  const [replacingTermId, setReplacingTermId] = React.useState<string | null>(null);
  const [customReplacements, setCustomReplacements] = React.useState<Record<string, string>>({});

  // Trigger extraction on mount
  React.useEffect(() => {
    if (!annotations && !isLoadingAnnotations && !annotationsError) {
      extract();
    }
  }, [annotations, isLoadingAnnotations, annotationsError, extract]);

  // Filter visible suggested terms (used throughout)
  const visibleSuggested = suggestedTerms.filter((t) => !removedSuggestedIds.has(t.id));

  // ----- Locate in document -----

  const handleLocateInDraft = async (text: string) => {
    try {
      await Word.run(async (context) => {
        // Search for the original text as displayed on the card.
        // Word API cannot locate text inside track changes, so we only
        // search for the original (un-amended) version.
        let targetRange = await getTextRange(context, text);
        if (!targetRange) {
          targetRange = await getTextRangeAcrossParagraphs(context, text);
        }

        if (targetRange) {
          targetRange.select();
          await context.sync();
        } else {
          console.warn('[RedactionPage] Unable to locate text:', text.substring(0, 50));
        }
      });
    } catch (error) {
      console.error('[RedactionPage] Error locating text:', error);
    }
  };

  // ----- Add selection -----

  const handleAddSelection = async () => {
    setIsAdding(true);
    try {
      const selectedText = await getSelectedText();
      if (!selectedText || selectedText.trim().length === 0) {
        toast({
          title: translations.common.error,
          description: 'No text selected. Please select text in the Word document.',
        });
        return;
      }

      const term = selectedText.trim();

      // Check for duplicate
      if (userTerms.some((t) => t.term.toLowerCase() === term.toLowerCase())) {
        toast({ title: '', description: 'This term has already been added.' });
        return;
      }

      // Search all occurrences throughout the document
      const occurrences = combinedStructure
        ? findTermOccurrencesInStructure(term, combinedStructure, recitals)
        : [];

      const newItem: RedactionTermItem = {
        id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        term,
        occurrences,
        removedOccurrences: new Set(),
      };

      setUserTerms((prev) => [...prev, newItem]);

      const countMsg = occurrences.length > 0
        ? `Found ${occurrences.length} occurrence${occurrences.length !== 1 ? 's' : ''} in document.`
        : 'Term added (no additional occurrences found).';
      toast({ title: '', description: countMsg });
    } catch (error) {
      console.error('[RedactionPage] Error adding selection:', error);
      toast({
        title: translations.common.error,
        description: 'Failed to read selection from document.',
      });
    } finally {
      setIsAdding(false);
    }
  };

  // ----- Remove handlers -----

  const handleRemoveUserTerm = (id: string) => {
    setUserTerms((prev) => prev.filter((t) => t.id !== id));
    if (expandedTermId === id) setExpandedTermId(null);
    toast({ title: '', description: 'Term removed.' });
  };

  const handleRemoveUserOccurrence = (termId: string, occIdx: number) => {
    setUserTerms((prev) =>
      prev.map((t) => {
        if (t.id !== termId) return t;
        const updated = new Set(t.removedOccurrences);
        updated.add(occIdx);
        return { ...t, removedOccurrences: updated };
      })
    );
    toast({ title: '', description: 'Occurrence removed.' });
  };

  const handleRemoveSuggestedTerm = (id: string) => {
    setRemovedSuggestedIds((prev) => new Set(prev).add(id));
    if (expandedSuggestedId === id) setExpandedSuggestedId(null);
    toast({ title: '', description: 'Suggested term removed.' });
  };

  const handleRemoveSuggestedOccurrence = (termId: string, occIdx: number) => {
    setSuggestedTerms((prev) =>
      prev.map((t) => {
        if (t.id !== termId) return t;
        const updated = new Set(t.removedOccurrences);
        updated.add(occIdx);
        return { ...t, removedOccurrences: updated };
      })
    );
    toast({ title: '', description: 'Occurrence removed.' });
  };

  const handleStoreReplacement = (termId: string, text: string) => {
    if (!text || !text.trim()) return;
    setCustomReplacements((prev) => ({ ...prev, [termId]: text.trim() }));
    setShowReplaceInput(null);
    toast({ title: '', description: `Replacement text stored: "${text.trim()}"` });
  };

  const handleClearReplacement = (termId: string) => {
    setCustomReplacements((prev) => {
      const next = { ...prev };
      delete next[termId];
      return next;
    });
  };

  const handleClearAll = () => {
    setUserTerms([]);
    setExpandedTermId(null);
    toast({ title: '', description: 'All user selections cleared.' });
  };

  // ----- LLM suggestion -----

  const handleSuggestTerms = async () => {
    setIsSuggesting(true);
    setSuggestError(null);
    try {
      const parsedDoc = await documentCache.getParsedDocumentSimple();
      const result = await backendApi.suggestRedactionTerms(
        parsedDoc.structure,
        parsedDoc.recitals || '',
      );

      if (!result.success) {
        setSuggestError(result.error || 'Failed to get suggestions.');
        return;
      }

      // For each suggested term, find occurrences in the document
      const termsWithOccurrences: SuggestedTerm[] = result.terms.map((t, i) => {
        const occurrences = combinedStructure
          ? findTermOccurrencesInStructure(t.term, combinedStructure, recitals)
          : [];
        return {
          id: `suggest-${i}-${Date.now()}`,
          term: t.term,
          category: t.category,
          occurrences,
          removedOccurrences: new Set<number>(),
        };
      });

      setSuggestedTerms(termsWithOccurrences);
      setHasSuggested(true);
      setRemovedSuggestedIds(new Set());
    } catch (error) {
      console.error('[RedactionPage] LLM suggestion failed:', error);
      setSuggestError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsSuggesting(false);
    }
  };

  // ----- Redact single term -----

  const handleRedactTerm = async (term: string, termId: string) => {
    setRedactingTermId(termId);
    try {
      await Word.run(async (context) => {
        // Enable track changes so replacements appear as tracked changes
        try {
          context.document.settings.add("TrackChanges", true);
          await context.sync();
        } catch (_trackChangesError) {
          console.log("Track changes setting already exists or failed to set");
        }

        // Search for all occurrences of the term in the document body
        const body = context.document.body;
        const searchResults = body.search(term, { matchCase: false, matchWholeWord: false });
        searchResults.load('items');
        await context.sync();

        if (searchResults.items.length === 0) {
          toast({ title: '', description: `"${term}" not found in the document.` });
          return;
        }

        const count = searchResults.items.length;

        // Navigate to the first occurrence so the user can see the redaction
        searchResults.items[0].select();
        await context.sync();

        // Load original font sizes before replacing
        for (const range of searchResults.items) {
          range.load('font/size');
        }
        await context.sync();

        // Replace each occurrence with [●] using three-part insertion
        // so only the ● gets 8pt font while brackets keep original size
        for (const range of searchResults.items) {
          const origSize = range.font.size;
          const bracketOpen = range.insertText('[', 'Replace');
          const circle = bracketOpen.insertText('\u25CF', 'After');
          circle.font.size = REDACTION_MARKER_FONT_SIZE;
          const bracketClose = circle.insertText(']', 'After');
          if (origSize && origSize > 0) {
            bracketClose.font.size = origSize;
          }
        }
        await context.sync();

        setRedactedTermIds((prev) => new Set(prev).add(termId));
        toast({
          title: '',
          description: `Redacted ${count} occurrence${count !== 1 ? 's' : ''} of "${term}".`,
        });
      });
    } catch (error) {
      console.error('[RedactionPage] Error redacting term:', error);
      toast({
        title: translations.common.error,
        description: `Failed to redact "${term}".`,
      });
    } finally {
      setRedactingTermId(null);
    }
  };

  // ----- Replace single term with custom text -----

  const handleReplaceTerm = async (term: string, termId: string, customText: string) => {
    if (!customText.trim()) return;
    setReplacingTermId(termId);
    try {
      await Word.run(async (context) => {
        try {
          context.document.settings.add("TrackChanges", true);
          await context.sync();
        } catch (_) {
          console.log("Track changes setting already exists or failed to set");
        }

        const body = context.document.body;
        const searchResults = body.search(term, { matchCase: false, matchWholeWord: false });
        searchResults.load('items');
        await context.sync();

        if (searchResults.items.length === 0) {
          toast({ title: '', description: `"${term}" not found in the document.` });
          return;
        }

        const count = searchResults.items.length;

        searchResults.items[0].select();
        await context.sync();

        for (const range of searchResults.items) {
          range.insertText(customText.trim(), 'Replace');
        }
        await context.sync();

        setReplacedTermIds((prev) => new Set(prev).add(termId));
        setShowReplaceInput(null);
        toast({
          title: '',
          description: `Replaced ${count} occurrence${count !== 1 ? 's' : ''} of "${term}" with "${customText.trim()}".`,
        });
      });
    } catch (error) {
      console.error('[RedactionPage] Error replacing term:', error);
      toast({
        title: translations.common.error,
        description: `Failed to replace "${term}".`,
      });
    } finally {
      setReplacingTermId(null);
    }
  };

  // ----- Change All (checked sections) -----

  const handleChangeAll = async () => {
    const termsToChange: { term: string; id: string; customText?: string }[] = [];

    if (selectionsChecked) {
      for (const item of userTerms) {
        termsToChange.push({ term: item.term, id: item.id, customText: customReplacements[item.id] });
      }
    }
    if (suggestionsChecked) {
      for (const item of visibleSuggested) {
        termsToChange.push({ term: item.term, id: item.id, customText: customReplacements[item.id] });
      }
    }

    if (termsToChange.length === 0) return;

    setIsRedactingAll(true);
    try {
      await Word.run(async (context) => {
        // Enable track changes
        try {
          context.document.settings.add("TrackChanges", true);
          await context.sync();
        } catch (_) {
          console.log("Track changes setting already exists or failed to set");
        }

        const body = context.document.body;
        let totalCount = 0;
        let firstRange: Word.Range | null = null;

        for (const { term, customText } of termsToChange) {
          const searchResults = body.search(term, { matchCase: false, matchWholeWord: false });
          searchResults.load('items');
          await context.sync();

          if (searchResults.items.length > 0 && !firstRange) {
            firstRange = searchResults.items[0];
          }

          totalCount += searchResults.items.length;

          if (customText) {
            // This term has stored custom replacement text — use it
            for (const range of searchResults.items) {
              range.insertText(customText, 'Replace');
            }
          } else {
            // Default: redact with [●] using three-part insertion
            for (const range of searchResults.items) {
              range.load('font/size');
            }
            await context.sync();

            for (const range of searchResults.items) {
              const origSize = range.font.size;
              const bracketOpen = range.insertText('[', 'Replace');
              const circle = bracketOpen.insertText('\u25CF', 'After');
              circle.font.size = REDACTION_MARKER_FONT_SIZE;
              const bracketClose = circle.insertText(']', 'After');
              if (origSize && origSize > 0) {
                bracketClose.font.size = origSize;
              }
            }
          }
        }
        await context.sync();

        // Navigate to the first change
        if (firstRange) {
          firstRange.select();
          await context.sync();
        }

        // Mark all as changed — track redacted vs replaced separately
        const newRedacted = new Set(redactedTermIds);
        const newReplaced = new Set(replacedTermIds);
        for (const { id, customText } of termsToChange) {
          if (customText) {
            newReplaced.add(id);
          } else {
            newRedacted.add(id);
          }
        }
        setRedactedTermIds(newRedacted);
        setReplacedTermIds(newReplaced);

        toast({
          title: '',
          description: `Changed ${totalCount} occurrence${totalCount !== 1 ? 's' : ''} across ${termsToChange.length} term${termsToChange.length !== 1 ? 's' : ''}.`,
        });
      });
    } catch (error) {
      console.error('[RedactionPage] Error in Change All:', error);
      toast({
        title: translations.common.error,
        description: 'Failed to change terms.',
      });
    } finally {
      setIsRedactingAll(false);
    }
  };

  // ----- Rendering helpers -----

  const formatSectionRef = (ref: string): string => {
    if (!ref) return '';
    // Don't show section label for recitals
    if (ref.toLowerCase() === 'recitals') return '';
    // Avoid "Section Section 1.2"
    if (ref.toLowerCase().startsWith('section')) return ref;
    return `Section ${ref}`;
  };

  const renderOccurrenceCard = (
    occ: TermOccurrence,
    occIdx: number,
    term: string,
    onRemove: () => void,
  ) => {
    const formattedSection = formatSectionRef(occ.sectionNumber);
    return (
      <div key={occIdx} className={styles.occurrenceCard}>
        {formattedSection && (
          <div className={styles.occurrenceSectionRef}>{formattedSection}</div>
        )}
        <div className={styles.occurrenceText}>
          {highlightTerm(occ.sentence, term)}
        </div>
        <div className={styles.occurrenceActions}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Tooltip content="Remove from list" relationship="label" positioning="above" withArrow>
              <button
                className={styles.iconBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
              >
                <Trash2 size={16} color="#4080FF" />
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

  const changeAllEnabled = (selectionsChecked && userTerms.length > 0) ||
    (suggestionsChecked && visibleSuggested.length > 0);

  // ----- Loading state -----

  if ((isLoadingAnnotations || isClassifying) && !annotations) {
    return (
      <div className={styles.loadingRoot}>
        <div className={styles.dialogContainer}>
          <div className={styles.dialogHeader}>
            <h2 className={styles.dialogTitle}>{translations.dashboard.redaction}</h2>
          </div>
          <div className={styles.loadingContainer}>
            <Spinner size="medium" />
            <span className={styles.loadingText}>Extracting annotations from document...</span>
          </div>
        </div>
      </div>
    );
  }

  // ----- Error state -----

  if (annotationsError && !annotations) {
    return (
      <div className={styles.loadingRoot}>
        <div className={styles.dialogContainer}>
          <div className={styles.dialogHeader}>
            <h2 className={styles.dialogTitle}>{translations.dashboard.redaction}</h2>
          </div>
          <div className={styles.loadingContainer}>
            <div className={styles.errorContainer}>{annotationsError}</div>
            <Button appearance="primary" onClick={() => refresh()}>
              {translations.common.retry}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ----- Main UI -----

  return (
    <div className={styles.root}>
      {/* Header */}
      <div className={styles.header}>
        <Tooltip
          appearance="inverted"
          content={translations.common.back}
          positioning="below"
          withArrow
          relationship="label"
        >
          <Button
            icon={<FaArrowLeft />}
            onClick={goBack}
            className={styles.headerIcon}
          />
        </Tooltip>
        <p className={styles.headerTitle}>
          {translations.dashboard.redaction}
        </p>
      </div>

      {/* Scrollable content */}
      <div className={styles.content}>
        {/* Info box */}
        <div className={styles.infoBox}>
          Select text in Word, then click &quot;Add Selection&quot; to add terms for redaction. Each term&apos;s occurrences throughout the document will be found automatically.
        </div>

        {/* Change All row */}
        <div className={styles.redactAllRow}>
          <button
            className={`${styles.brandBtn} brand-btn`}
            onClick={handleChangeAll}
            disabled={!changeAllEnabled || isRedactingAll}
            style={{ opacity: (!changeAllEnabled || isRedactingAll) ? 0.5 : 1 }}
          >
            {isRedactingAll ? (
              <>
                <Spinner size="extra-tiny" />
                Changing...
              </>
            ) : (
              'Change All'
            )}
          </button>
          <span style={{ fontSize: '12px', color: '#888' }}>
            Tick sections below to enable
          </span>
        </div>

        {/* Refresh row */}
        <div className={styles.refreshRow}>
          <span className={styles.refreshText}>Click</span>
          <Tooltip content="Refresh annotations from document" relationship="label">
            <Button
              appearance="subtle"
              size="small"
              icon={isLoadingAnnotations ? <Spinner size="tiny" /> : <ArrowSync16Regular />}
              onClick={() => refresh()}
              disabled={isLoadingAnnotations}
              className={styles.refreshButton}
              aria-label="Refresh annotations"
            />
          </Tooltip>
          <span className={styles.refreshText}>if you modify the document.</span>
        </div>

        {/* ===== YOUR SELECTIONS ===== */}
        <label className={styles.checkboxRow}>
          <Checkbox
            className={styles.checkbox}
            checked={selectionsChecked}
            onChange={(_, data) => setSelectionsChecked(Boolean(data?.checked))}
            disabled={userTerms.length === 0}
          />
          <span className={styles.sectionTitle}>
            Your Selections ({userTerms.length})
          </span>
        </label>

        {userTerms.length === 0 ? (
          <div className={styles.emptyState}>
            <span>No terms selected yet.</span>
            <span style={{ fontSize: '12px' }}>
              Highlight text in your Word document and click &quot;Add Selection&quot;.
            </span>
          </div>
        ) : (
          <div className={styles.termList}>
            {userTerms.map((item) => {
              const isExpanded = expandedTermId === item.id;
              const isRedacted = redactedTermIds.has(item.id);
              const visibleOccurrences = item.occurrences.filter(
                (_, idx) => !item.removedOccurrences.has(idx)
              );

              return (
                <div key={item.id} className={styles.termCard}>
                  {/* Term card header — chevron + name + (count) + delete */}
                  <div
                    className={styles.termCardHeader}
                    onClick={() => setExpandedTermId(isExpanded ? null : item.id)}
                  >
                    {isExpanded ? (
                      <ChevronUp className={styles.expandIcon} />
                    ) : (
                      <ChevronDown className={styles.expandIcon} />
                    )}
                    <span className={styles.termName}>{item.term}</span>
                    <span className={styles.termCount}>
                      ({visibleOccurrences.length})
                    </span>
                    <Tooltip content="Remove term from list" relationship="label">
                      <button
                        className={styles.iconBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveUserTerm(item.id);
                        }}
                      >
                        <Trash2 size={14} color="#999" />
                      </button>
                    </Tooltip>
                  </div>

                  {/* Expanded body with actions + occurrences */}
                  {isExpanded && (
                    <div className={styles.termCardBody}>
                      {/* Action buttons inside expanded body */}
                      <div className={styles.termCardActions}>
                        <Tooltip content="Replace with [●]" relationship="label" positioning="above" withArrow>
                          <button
                            className={styles.redactBtn}
                            disabled={redactingTermId === item.id}
                            onClick={() => handleRedactTerm(item.term, item.id)}
                          >
                            {redactingTermId === item.id ? (
                              <Spinner size="extra-tiny" />
                            ) : isRedacted ? (
                              'Re-redact'
                            ) : (
                              'Redact'
                            )}
                          </button>
                        </Tooltip>
                        <Tooltip
                          content={customReplacements[item.id]
                            ? `Replace with "${customReplacements[item.id]}"`
                            : 'Set custom replacement text'}
                          relationship="label" positioning="above" withArrow
                        >
                          <button
                            className={styles.replaceBtn}
                            disabled={replacingTermId === item.id}
                            onClick={() => {
                              const storedText = customReplacements[item.id];
                              if (storedText && showReplaceInput !== item.id) {
                                // Stored text exists — execute replacement
                                handleReplaceTerm(item.term, item.id, storedText);
                              } else {
                                // No stored text or editing — toggle input
                                setShowReplaceInput(showReplaceInput === item.id ? null : item.id);
                              }
                            }}
                          >
                            {replacingTermId === item.id ? (
                              <Spinner size="extra-tiny" />
                            ) : replacedTermIds.has(item.id) ? (
                              'Re-replace'
                            ) : (
                              'Replace'
                            )}
                          </button>
                        </Tooltip>
                      </div>

                      {/* Preview of stored replacement text */}
                      {customReplacements[item.id] && showReplaceInput !== item.id && (
                        <div className={styles.replacementBanner}>
                          <span style={{ flex: 1 }}>
                            &#10132; <strong>&quot;{customReplacements[item.id]}&quot;</strong>
                          </span>
                          <button
                            onClick={() => {
                              setReplaceTexts((prev) => ({ ...prev, [item.id]: customReplacements[item.id] }));
                              setShowReplaceInput(item.id);
                            }}
                            style={{ border: 'none', background: 'none', color: '#0F62FE', cursor: 'pointer', fontSize: '12px', fontWeight: 600, padding: 0 }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleClearReplacement(item.id)}
                            style={{ border: 'none', background: 'none', color: '#999', cursor: 'pointer', fontSize: '12px', padding: 0 }}
                          >
                            Clear
                          </button>
                        </div>
                      )}

                      {/* Inline replace input row */}
                      {showReplaceInput === item.id && (
                        <div className={styles.replaceInputRow}>
                          <input
                            className={styles.replaceInput}
                            type="text"
                            placeholder="Enter replacement text"
                            value={replaceTexts[item.id] || ''}
                            onChange={(e) => setReplaceTexts((prev) => ({ ...prev, [item.id]: e.target.value }))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && (replaceTexts[item.id] || '').trim()) {
                                handleStoreReplacement(item.id, replaceTexts[item.id]);
                              }
                            }}
                          />
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              className={styles.applyBtn}
                              disabled={!(replaceTexts[item.id] || '').trim()}
                              onClick={() => handleStoreReplacement(item.id, replaceTexts[item.id])}
                              style={{ opacity: !(replaceTexts[item.id] || '').trim() ? 0.5 : 1 }}
                            >
                              Apply
                            </button>
                            <button
                              className={styles.cancelBtn}
                              onClick={() => setShowReplaceInput(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      {visibleOccurrences.length === 0 ? (
                        <div className={styles.emptyState}>
                          No occurrences found in document.
                        </div>
                      ) : (
                        <div>
                          {item.occurrences.map((occ, occIdx) => {
                            if (item.removedOccurrences.has(occIdx)) return null;
                            return renderOccurrenceCard(
                              occ,
                              occIdx,
                              item.term,
                              () => handleRemoveUserOccurrence(item.id, occIdx),
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Add Selection + Clear — inline after YOUR SELECTIONS */}
        <div className={styles.addRow}>
          <button
            className={`${styles.brandBtn} brand-btn`}
            onClick={handleAddSelection}
            disabled={isAdding}
            style={{ opacity: isAdding ? 0.5 : 1 }}
          >
            {isAdding ? (
              <>
                <Spinner size="extra-tiny" />
                Adding...
              </>
            ) : (
              'Add Selection'
            )}
          </button>
          {userTerms.length > 0 && (
            <Tooltip content="Clear all selections" relationship="label">
              <Button
                appearance="subtle"
                size="small"
                icon={<Trash2 size={14} />}
                onClick={handleClearAll}
                style={{ minWidth: 'auto' }}
              />
            </Tooltip>
          )}
        </div>

        {/* ===== SUGGEST TO REDACT ===== */}
        <div className={styles.suggestHeader}>
          <label className={styles.checkboxRow}>
            <Checkbox
              className={styles.checkbox}
              checked={suggestionsChecked}
              onChange={(_, data) => setSuggestionsChecked(Boolean(data?.checked))}
              disabled={visibleSuggested.length === 0}
            />
            <span className={styles.sectionTitle}>
              Suggest to Redact ({visibleSuggested.length})
            </span>
          </label>
          <button
            className={`${styles.brandBtn} brand-btn`}
            onClick={handleSuggestTerms}
            disabled={isSuggesting}
            style={{ fontSize: '12px', opacity: isSuggesting ? 0.5 : 1 }}
          >
            {isSuggesting ? (
              <>
                <Spinner size="extra-tiny" />
                Analyzing...
              </>
            ) : hasSuggested ? (
              'Re-analyze'
            ) : (
              'Suggest Terms'
            )}
          </button>
        </div>

        {suggestError && (
          <div className={styles.errorContainer}>{suggestError}</div>
        )}

        {!hasSuggested && !isSuggesting && (
          <div className={styles.emptyState}>
            <span>Click &quot;Suggest Terms&quot; to let AI identify deal-specific information that may need redaction.</span>
          </div>
        )}

        {hasSuggested && visibleSuggested.length === 0 && !isSuggesting && (
          <div className={styles.emptyState}>
            <span>No suggested terms remaining.</span>
          </div>
        )}

        {visibleSuggested.length > 0 && (
          <div className={styles.termList}>
            {visibleSuggested.map((item) => {
              const isExpanded = expandedSuggestedId === item.id;
              const isRedacted = redactedTermIds.has(item.id);
              const visibleOccurrences = item.occurrences.filter(
                (_, idx) => !item.removedOccurrences.has(idx)
              );

              return (
                <div key={item.id} className={styles.suggestedTermCard}>
                  {/* Suggested term card header — chevron + name + category badge + (count) + delete */}
                  <div
                    className={styles.termCardHeader}
                    onClick={() => setExpandedSuggestedId(isExpanded ? null : item.id)}
                  >
                    {isExpanded ? (
                      <ChevronUp className={styles.expandIcon} />
                    ) : (
                      <ChevronDown className={styles.expandIcon} />
                    )}
                    <span className={styles.termName}>{item.term}</span>
                    <Badge size="small" appearance="tint" color="warning">
                      {item.category}
                    </Badge>
                    <span className={styles.termCount}>
                      ({visibleOccurrences.length})
                    </span>
                    <Tooltip content="Remove suggestion from list" relationship="label">
                      <button
                        className={styles.iconBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveSuggestedTerm(item.id);
                        }}
                      >
                        <Trash2 size={14} color="#999" />
                      </button>
                    </Tooltip>
                  </div>

                  {/* Expanded body with actions + occurrences */}
                  {isExpanded && (
                    <div className={styles.termCardBody}>
                      {/* Action buttons inside expanded body */}
                      <div className={styles.termCardActions}>
                        <Tooltip content="Replace with [●]" relationship="label" positioning="above" withArrow>
                          <button
                            className={styles.redactBtn}
                            disabled={redactingTermId === item.id}
                            onClick={() => handleRedactTerm(item.term, item.id)}
                          >
                            {redactingTermId === item.id ? (
                              <Spinner size="extra-tiny" />
                            ) : isRedacted ? (
                              'Re-redact'
                            ) : (
                              'Redact'
                            )}
                          </button>
                        </Tooltip>
                        <Tooltip
                          content={customReplacements[item.id]
                            ? `Replace with "${customReplacements[item.id]}"`
                            : 'Set custom replacement text'}
                          relationship="label" positioning="above" withArrow
                        >
                          <button
                            className={styles.replaceBtn}
                            disabled={replacingTermId === item.id}
                            onClick={() => {
                              const storedText = customReplacements[item.id];
                              if (storedText && showReplaceInput !== item.id) {
                                handleReplaceTerm(item.term, item.id, storedText);
                              } else {
                                setShowReplaceInput(showReplaceInput === item.id ? null : item.id);
                              }
                            }}
                          >
                            {replacingTermId === item.id ? (
                              <Spinner size="extra-tiny" />
                            ) : replacedTermIds.has(item.id) ? (
                              'Re-replace'
                            ) : (
                              'Replace'
                            )}
                          </button>
                        </Tooltip>
                      </div>

                      {/* Preview of stored replacement text */}
                      {customReplacements[item.id] && showReplaceInput !== item.id && (
                        <div className={styles.replacementBanner}>
                          <span style={{ flex: 1 }}>
                            &#10132; <strong>&quot;{customReplacements[item.id]}&quot;</strong>
                          </span>
                          <button
                            onClick={() => {
                              setReplaceTexts((prev) => ({ ...prev, [item.id]: customReplacements[item.id] }));
                              setShowReplaceInput(item.id);
                            }}
                            style={{ border: 'none', background: 'none', color: '#0F62FE', cursor: 'pointer', fontSize: '12px', fontWeight: 600, padding: 0 }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleClearReplacement(item.id)}
                            style={{ border: 'none', background: 'none', color: '#999', cursor: 'pointer', fontSize: '12px', padding: 0 }}
                          >
                            Clear
                          </button>
                        </div>
                      )}

                      {/* Inline replace input row */}
                      {showReplaceInput === item.id && (
                        <div className={styles.replaceInputRow}>
                          <input
                            className={styles.replaceInput}
                            type="text"
                            placeholder="Enter replacement text"
                            value={replaceTexts[item.id] || ''}
                            onChange={(e) => setReplaceTexts((prev) => ({ ...prev, [item.id]: e.target.value }))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && (replaceTexts[item.id] || '').trim()) {
                                handleStoreReplacement(item.id, replaceTexts[item.id]);
                              }
                            }}
                          />
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              className={styles.applyBtn}
                              disabled={!(replaceTexts[item.id] || '').trim()}
                              onClick={() => handleStoreReplacement(item.id, replaceTexts[item.id])}
                              style={{ opacity: !(replaceTexts[item.id] || '').trim() ? 0.5 : 1 }}
                            >
                              Apply
                            </button>
                            <button
                              className={styles.cancelBtn}
                              onClick={() => setShowReplaceInput(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      {visibleOccurrences.length === 0 ? (
                        <div className={styles.emptyState}>
                          No occurrences found in document.
                        </div>
                      ) : (
                        <div>
                          {item.occurrences.map((occ, occIdx) => {
                            if (item.removedOccurrences.has(occIdx)) return null;
                            return renderOccurrenceCard(
                              occ,
                              occIdx,
                              item.term,
                              () => handleRemoveSuggestedOccurrence(item.id, occIdx),
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Finish and navigate to drafting */}
        <button
          className={`${styles.finishBtn} brand-btn`}
          onClick={() => {
            window.scrollTo(0, 0);
            navigateTo('draft-from-scratch');
          }}
        >
          Finish Redaction and Start Drafting
        </button>
      </div>
    </div>
  );
};
