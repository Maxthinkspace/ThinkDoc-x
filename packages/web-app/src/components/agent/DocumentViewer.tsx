import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface Citation {
  text: string;
  paragraphIndex?: number;
  filePath?: string;
}

interface DocumentViewerProps {
  filePath?: string;
  content?: string;
  citation?: Citation | null;
}

export interface DocumentViewerRef {
  scrollToCitation: (citation: Citation) => void;
}

const DocumentViewer = forwardRef<DocumentViewerRef, DocumentViewerProps>(
  ({ filePath, content, citation }, ref) => {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const [paragraphs, setParagraphs] = useState<Array<{ text: string }>>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [matchIndex, setMatchIndex] = useState<number | null>(null);
    const [pulseIndex, setPulseIndex] = useState<number | null>(null);
    const pulseTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Escape HTML to avoid injection
    const escapeHtml = (text: string): string => {
      return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\n/g, "<br>");
    };

    // Normalize text for Word-style search (mirrors taskpane ReferenceDocumentViewer)
    const normalizeTextForSearch = (text: string): string => {
      if (!text) return "";
      return text
        .toLowerCase()
        .replace(/[\r\n\t]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    };

    const escapeRegExp = (text: string): string =>
      text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const getSearchWords = (searchText?: string | null): string[] => {
      const normalized = normalizeTextForSearch(searchText || "");
      if (!normalized) return [];
      const words = normalized.split(/\s+/).filter((w) => w.length > 2);
      return Array.from(new Set(words)).slice(0, 12);
    };

    const buildHighlightedHtml = (text: string, searchText?: string | null): string => {
      const words = getSearchWords(searchText);
      if (!words.length) {
        return escapeHtml(text);
      }

      const wordsSet = new Set(words);
      const pattern = new RegExp(`(${words.map(escapeRegExp).join("|")})`, "gi");
      const parts = text.split(pattern);

      return parts
        .map((part) => {
          if (!part) return "";
          const normalizedPart = part.toLowerCase();
          if (wordsSet.has(normalizedPart)) {
            return `<mark class="doc-word-highlight">${escapeHtml(part)}</mark>`;
          }
          return escapeHtml(part);
        })
        .join("");
    };

    // Build paragraph HTML from text
    const buildParagraphsFromText = (text: string): Array<{ text: string }> => {
      const hasBlankLines = /\n\s*\n+/.test(text);
      const splitter = hasBlankLines ? /\n\s*\n+/ : /\n+/;
      const paras = text
        .split(splitter)
        .map((p) => p.trim())
        .filter(Boolean);
      return paras.map((p) => ({ text: p }));
    };

    const findParagraphMatchIndex = (
      items: Array<{ text: string }>,
      searchText?: string | null
    ): number | null => {
      if (!searchText) return null;
      const normalizedSearch = normalizeTextForSearch(searchText);
      if (!normalizedSearch) return null;

      const normalizedParagraphs = items.map((p) => normalizeTextForSearch(p.text));

      // Strategy 1: Exact match within a paragraph
      for (let i = 0; i < normalizedParagraphs.length; i++) {
        if (normalizedParagraphs[i].includes(normalizedSearch)) return i;
      }

      // Strategy 2: Prefix/suffix match for long text
      if (normalizedSearch.length > 50) {
        const prefix = normalizedSearch.slice(0, 50);
        const suffix = normalizedSearch.slice(-50);
        for (let i = 0; i < normalizedParagraphs.length; i++) {
          const para = normalizedParagraphs[i];
          if (para.includes(prefix) || para.includes(suffix)) return i;
        }
      }

      // Strategy 3: Cross-paragraph search with flexible whitespace
      const SEP = " ";
      const combinedText = normalizedParagraphs.join(SEP);
      const nodeStarts: number[] = [];
      let pos = 0;
      for (let i = 0; i < normalizedParagraphs.length; i++) {
        nodeStarts.push(pos);
        pos += normalizedParagraphs[i].length + SEP.length;
      }
      const findNodeAtPosition = (offset: number): number => {
        for (let i = nodeStarts.length - 1; i >= 0; i--) {
          if (offset >= nodeStarts[i]) return i;
        }
        return 0;
      };
      try {
        const pattern = normalizedSearch.replace(/\s+/g, "\\s*");
        const regex = new RegExp(pattern, "i");
        const match = regex.exec(combinedText);
        if (match) return findNodeAtPosition(match.index);
      } catch {
        // Ignore regex errors
      }

      // Strategy 4: Word pattern match using first N words
      const words = normalizedSearch.split(/\s+/).filter((w) => w.length > 2);
      if (words.length >= 3) {
        const significant = words.slice(0, Math.min(8, words.length)).join("\\s+");
        try {
          const regex = new RegExp(significant, "i");
          for (let i = 0; i < normalizedParagraphs.length; i++) {
            if (regex.test(normalizedParagraphs[i])) return i;
          }
          const match = regex.exec(combinedText);
          if (match) return findNodeAtPosition(match.index);
        } catch {
          // Ignore regex errors
        }
      }

      // Strategy 5: Keyword fallback
      const uniqueWords = Array.from(new Set(words))
        .filter((w) => w.length > 4)
        .sort((a, b) => b.length - a.length);
      for (const word of uniqueWords.slice(0, 5)) {
        for (let i = 0; i < normalizedParagraphs.length; i++) {
          if (normalizedParagraphs[i].includes(word)) return i;
        }
      }

      return null;
    };

    // Load content
    useEffect(() => {
      const loadContent = async () => {
        setLoading(true);
        setError(null);
        setParagraphs([]);

        try {
          if (content) {
            setParagraphs(buildParagraphsFromText(content));
          } else if (filePath) {
            // If filePath is provided, we'd fetch it here
            // For now, we'll use content prop
            setError("File loading not yet implemented");
          } else {
            setError("No content or file path provided");
          }
        } catch (err) {
          console.error("DocumentViewer loadContent error", err);
          setError(err instanceof Error ? err.message : String(err));
        } finally {
          setLoading(false);
        }
      };

      loadContent();
    }, [filePath, content]);

    // Scroll to citation
    const scrollToCitation = (citation: Citation, preferredIndex?: number | null) => {
      if (!citation || !citation.text) return;

      const wrapperEl = wrapperRef.current;
      if (!wrapperEl) return;

      const paras = Array.from(wrapperEl.querySelectorAll<HTMLElement>(".doc-paragraph"));
      let targetIndex = preferredIndex ?? null;

      if (targetIndex === null && citation.paragraphIndex) {
        targetIndex = Math.max(0, citation.paragraphIndex - 1);
      }

      const foundEl = targetIndex !== null ? paras[targetIndex] || null : null;

      if (!foundEl) return;

      // Scroll foundEl into center of wrapper
      const wrapperRect = wrapperEl.getBoundingClientRect();
      const elRect = foundEl.getBoundingClientRect();
      const offsetTop = foundEl.offsetTop;
      const centerScroll = Math.max(
        0,
        offsetTop - wrapperEl.clientHeight / 2 + foundEl.clientHeight / 2
      );
      wrapperEl.scrollTo({ top: centerScroll, behavior: "smooth" });

    };

    // Expose scrollToCitation method
    useImperativeHandle(ref, () => ({
      scrollToCitation,
    }));

    // Auto-scroll to citation when it changes
    useEffect(() => {
      if (citation && !loading && paragraphs.length > 0) {
        const matched = findParagraphMatchIndex(paragraphs, citation.text);
        setMatchIndex(matched);
        if (pulseTimeoutRef.current) clearTimeout(pulseTimeoutRef.current);
        setPulseIndex(matched);
        pulseTimeoutRef.current = setTimeout(() => {
          setPulseIndex(null);
        }, 1200);
        setTimeout(() => scrollToCitation(citation, matched), 120);
      }
    }, [citation, loading, paragraphs.length]);

    // Cleanup
    useEffect(() => {
      return () => {
        if (pulseTimeoutRef.current) clearTimeout(pulseTimeoutRef.current);
      };
    }, []);

    if (loading) {
      return (
        <div className="p-3 text-center text-muted-foreground">Loading document…</div>
      );
    }

    if (error) {
      return <div className="p-2 text-destructive">{error}</div>;
    }

    return (
      <div className="h-full flex flex-col bg-[#fafafa]">
        <div
          ref={wrapperRef}
          className="overflow-y-auto h-full p-4 box-border"
        >
          {paragraphs.map((para, idx) => (
            <div
              key={idx}
              className={cn(
                "doc-paragraph",
                "py-2.5 px-3.5 my-2 rounded-md",
                "bg-transparent transition-all duration-250",
                "leading-relaxed text-[#111]",
                matchIndex === idx ? "doc-highlight" : "",
                pulseIndex === idx ? "doc-highlight-fadein" : ""
              )}
              data-index={idx}
              dangerouslySetInnerHTML={{
                __html: matchIndex === idx
                  ? buildHighlightedHtml(para.text, citation?.text)
                  : escapeHtml(para.text),
              }}
            />
          ))}
        </div>
        <style>{`
          .doc-highlight {
            background: rgba(200, 200, 200, 0.38);
            border-left: 4px solid rgba(120, 120, 120, 0.55);
            box-shadow: 0 1px 0 rgba(0, 0, 0, 0.04);
            padding-left: 10px;
          }
          .doc-highlight-fadein {
            animation: highlight-pulse 0.9s ease-out;
          }
          .doc-word-highlight {
            background: #fff9c4;
            border-bottom: 1px solid #fbc02d;
            padding: 0 1px;
          }
          @keyframes highlight-pulse {
            0% {
              box-shadow: 0 0 0 rgba(120, 120, 120, 0);
              transform: translateY(0px);
            }
            50% {
              box-shadow: 0 8px 28px rgba(120, 120, 120, 0.06);
              transform: translateY(-2px);
            }
            100% {
              box-shadow: none;
              transform: translateY(0px);
            }
          }
        `}</style>
      </div>
    );
  }
);

DocumentViewer.displayName = "DocumentViewer";

export default DocumentViewer;

