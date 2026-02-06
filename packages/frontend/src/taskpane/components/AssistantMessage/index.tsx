import * as React from "react";
import { Accordion, AccordionItem, AccordionHeader, AccordionPanel } from "@fluentui/react-components";
import { ChevronDown, ChevronUp } from "lucide-react";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { CitationReference } from "./CitationReference";
import type { SourceCitation, StructuredMessage } from "./types";
import "./AssistantMessage.css";

interface AssistantMessageProps {
  content: string;
  citations?: Array<Record<string, unknown>> | null;
  followUpQuestions?: string[];
  onCitationClick?: (citationId: number) => void;
  onShowCitationPreview?: (citation: SourceCitation) => void;
  onFollowUpClick?: (question: string) => void;
}

/**
 * Parses content to extract structured sections
 */
const parseStructuredContent = (content: string): {
  header?: string;
  rationale?: string;
  mainContent: string;
} => {
  let header: string | undefined;
  let rationale: string | undefined;
  let mainContent = content;

  // Try to extract header (first line if it's bold or all caps, or marked with ##)
  const lines = content.split('\n');
  if (lines.length > 0) {
    const firstLine = lines[0].trim();
    
    // Check for markdown header
    if (firstLine.startsWith('## ')) {
      header = firstLine.substring(3).trim();
      mainContent = lines.slice(1).join('\n');
    } else if (firstLine.startsWith('**') && firstLine.endsWith('**')) {
      // Bold header
      header = firstLine.replace(/\*\*/g, '').trim();
      mainContent = lines.slice(1).join('\n');
    } else if (firstLine.length < 100 && firstLine === firstLine.toUpperCase() && firstLine.length > 5) {
      // All caps header
      header = firstLine;
      mainContent = lines.slice(1).join('\n');
    }
  }

  // Try to extract rationale section (marked with "Rationale:", "Reasoning:", etc.)
  const rationalePatterns = [
    /rationale:\s*(.+?)(?=\n\n|\n[A-Z]|$)/i,
    /reasoning:\s*(.+?)(?=\n\n|\n[A-Z]|$)/i,
    /explanation:\s*(.+?)(?=\n\n|\n[A-Z]|$)/i,
  ];

  for (const pattern of rationalePatterns) {
    const match = mainContent.match(pattern);
    if (match && match[1]) {
      rationale = match[1].trim();
      mainContent = mainContent.replace(pattern, '').trim();
      break;
    }
  }

  return { header, rationale, mainContent };
};

/**
 * Parses citations from the content and maps them to SourceCitation objects
 */
const parseCitations = (
  _content: string,
  citations?: Array<Record<string, unknown>> | null
): Map<number, SourceCitation> => {
  const citationMap = new Map<number, SourceCitation>();

  if (!citations || citations.length === 0) {
    return citationMap;
  }

  // Convert citations array to map
  // Backend format: { id: number, source: SourceCitation }
  citations.forEach((citation) => {
    const citationData = citation as any;
    // Handle both formats: { id, source } and direct citation object
    const source = citationData.source || citationData;
    const id = citationData.id || source?.id || citationData.citationId;
    
    if (id !== undefined && id !== null) {
      const citationId = typeof id === 'number' ? id : parseInt(String(id), 10);
      if (!isNaN(citationId)) {
        citationMap.set(citationId, {
          id: citationId,
          type: source?.type || citationData.type || 'document',
          title: source?.title || citationData.title || 'Source',
          snippet: source?.snippet || citationData.snippet || '',
          fullContent: source?.fullContent || citationData.fullContent,
          url: source?.url || citationData.url,
          fileId: source?.fileId || citationData.fileId,
          location: source?.location || citationData.location,
          paragraphIndex: source?.paragraphIndex || citationData.paragraphIndex,
          pageNumber: source?.pageNumber || citationData.pageNumber,
          filePath: source?.filePath || citationData.filePath,
          isPDF: source?.isPDF || citationData.isPDF,
          highlightRange: source?.highlightRange || citationData.highlightRange,
          highlightBox: source?.highlightBox || citationData.highlightBox,
        });
      }
    }
  });

  return citationMap;
};

/**
 * Replaces citation markers [1], [2] etc. with CitationReference components
 * Returns an array of React nodes with citations replaced
 */
const renderContentWithCitations = (
  content: string,
  citationMap: Map<number, SourceCitation>,
  onShowCitationPreview?: (citation: SourceCitation) => void
): React.ReactNode[] => {
  const parts: React.ReactNode[] = [];
  const citationPattern = /\[(\d+)\]/g;
  let lastIndex = 0;
  let match;
  let keyCounter = 0;
  const matches: Array<{ index: number; length: number; id: number }> = [];

  // Find all citation matches
  while ((match = citationPattern.exec(content)) !== null) {
    matches.push({
      index: match.index,
      length: match[0].length,
      id: parseInt(match[1], 10),
    });
  }

  // If no citations, render entire content as markdown
  if (matches.length === 0) {
    return [
      <MarkdownRenderer
        key="content-full"
        content={content}
      />
    ];
  }

  // Process content with citations
  matches.forEach((citationMatch) => {
    // Add text before citation
    if (citationMatch.index > lastIndex) {
      const beforeText = content.substring(lastIndex, citationMatch.index);
      if (beforeText) {
        parts.push(
          <MarkdownRenderer
            key={`text-${keyCounter++}`}
            content={beforeText}
          />
        );
      }
    }

    // Add citation reference
    const citation = citationMap.get(citationMatch.id);
    parts.push(
      <CitationReference
        key={`citation-${keyCounter++}`}
        citationId={citationMatch.id}
        citation={citation || null}
        onShowPreview={onShowCitationPreview}
      />
    );

    lastIndex = citationMatch.index + citationMatch.length;
  });

  // Add remaining text
  if (lastIndex < content.length) {
    const remainingText = content.substring(lastIndex);
    if (remainingText) {
      parts.push(
        <MarkdownRenderer
          key={`text-${keyCounter++}`}
          content={remainingText}
        />
      );
    }
  }

  return parts;
};

/**
 * Main AssistantMessage component
 * Renders structured AI responses with header, rationale, content, and follow-ups
 */
export const AssistantMessage: React.FC<AssistantMessageProps> = ({
  content,
  citations,
  followUpQuestions,
  onCitationClick: _onCitationClick,
  onShowCitationPreview,
  onFollowUpClick,
}) => {
  const [isRationaleExpanded, setIsRationaleExpanded] = React.useState(false);

  const { header, rationale, mainContent } = parseStructuredContent(content);
  const citationMap = parseCitations(content, citations);

  // Render content with citations
  const renderedContent = renderContentWithCitations(
    mainContent,
    citationMap,
    onShowCitationPreview
  );

  return (
    <div className="assistant-message">
      {/* Header */}
      {header && (
        <div className="assistant-message-header">
          <strong>{header}</strong>
        </div>
      )}

      {/* Rationale Section */}
      {rationale && (
        <Accordion
          collapsible
          openItems={isRationaleExpanded ? ["rationale"] : []}
          onToggle={(_, data) => setIsRationaleExpanded(data.openItems.includes("rationale"))}
        >
          <AccordionItem value="rationale" className="assistant-message-rationale-item">
            <AccordionHeader
              className="assistant-message-rationale-header"
              expandIcon={
                isRationaleExpanded ? (
                  <ChevronUp size={16} />
                ) : (
                  <ChevronDown size={16} />
                )
              }
            >
              <span className="assistant-message-rationale-title">Rationale</span>
            </AccordionHeader>
            <AccordionPanel>
              <div className="assistant-message-rationale-content">
                <MarkdownRenderer content={rationale} />
              </div>
            </AccordionPanel>
          </AccordionItem>
        </Accordion>
      )}

      {/* Main Content */}
      <div className="assistant-message-body">
        {renderedContent}
      </div>

      {/* Citations List (if any) */}
      {citationMap.size > 0 && (
        <div className="assistant-message-citations-section">
          <div className="assistant-message-citations-title">Sources</div>
          <div className="assistant-message-citations-list">
            {Array.from(citationMap.entries()).map(([id, citation]) => (
              <div
                key={`citation-${id}`}
                className="assistant-message-citation-item"
                onClick={() => {
                  if (onShowCitationPreview) {
                    onShowCitationPreview(citation);
                  }
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ' ') && onShowCitationPreview) {
                    e.preventDefault();
                    onShowCitationPreview(citation);
                  }
                }}
              >
                <span className="assistant-message-citation-number">[{id}]</span>
                <span className="assistant-message-citation-title">{citation.title}</span>
                {citation.snippet && (
                  <span className="assistant-message-citation-snippet">
                    {citation.snippet.substring(0, 100)}
                    {citation.snippet.length > 100 ? '...' : ''}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Follow-up Questions */}
      {followUpQuestions && followUpQuestions.length > 0 && (
        <div className="assistant-message-followups">
          <div className="assistant-message-followups-title">Suggested Questions</div>
          <ul className="assistant-message-followups-list">
            {followUpQuestions.map((question, index) => (
              <li
                key={`followup-${index}`}
                className="assistant-message-followup-item"
                onClick={() => {
                  if (onFollowUpClick) {
                    onFollowUpClick(question);
                  }
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ' ') && onFollowUpClick) {
                    e.preventDefault();
                    onFollowUpClick(question);
                  }
                }}
              >
                {question}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

