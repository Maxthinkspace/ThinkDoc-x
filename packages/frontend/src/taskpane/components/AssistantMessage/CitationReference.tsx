import * as React from "react";
import { Tooltip } from "@fluentui/react-components";
import { locateAndScrollToText } from "../../../taskpane/taskpane";
import type { SourceCitation } from "./types";
import "./AssistantMessage.css";

interface CitationReferenceProps {
  citationId: number;
  citation: SourceCitation | null;
  onShowPreview?: (citation: SourceCitation) => void;
}

/**
 * Interactive citation reference component
 * - Shows as superscript number
 * - On hover: displays tooltip with snippet preview
 * - On click: highlights text in Word document and opens preview panel
 */
export const CitationReference: React.FC<CitationReferenceProps> = ({
  citationId,
  citation,
  onShowPreview,
}) => {
  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!citation) return;

    // Highlight text in Word document
    if (citation.snippet) {
      try {
        await locateAndScrollToText(citation.snippet, {
          matchCase: false,
          matchWholeWord: false,
          ignorePunct: true,
          ignoreSpace: true,
          selectText: true,
        });
      } catch (error) {
        console.error("Error highlighting citation in Word:", error);
      }
    }

    // Show preview panel
    if (onShowPreview && citation) {
      onShowPreview(citation);
    }
  };

  const tooltipContent = citation ? (
    <div className="assistant-message-citation-tooltip">
      <div className="assistant-message-citation-tooltip-title">
        {citation.title}
      </div>
      <div className="assistant-message-citation-tooltip-snippet">
        {citation.snippet || citation.fullContent || "No preview available"}
      </div>
      {citation.type === 'web' && citation.url && (
        <div className="assistant-message-citation-tooltip-url">
          {citation.url}
        </div>
      )}
    </div>
  ) : (
    <div>Citation {citationId}</div>
  );

  return (
    <Tooltip
      content={tooltipContent}
      positioning="above"
      relationship="label"
      withArrow
    >
      <sup
        className="assistant-message-citation-reference"
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick(e as any);
          }
        }}
        aria-label={`Citation ${citationId}: ${citation?.title || 'Source'}`}
      >
        [{citationId}]
      </sup>
    </Tooltip>
  );
};

