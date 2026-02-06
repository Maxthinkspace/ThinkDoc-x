import * as React from "react";
import { ChevronDown, ChevronUp, MessageSquare, Highlighter, FileText } from "lucide-react";
import type { ClauseContext } from "../../../types/panelTypes";
import type { AnnotationPreview } from "../../../types/annotationScope";
import { AnnotationDisplay } from "../AnnotationDisplay";
import thinkSpaceIcon from "@/src/assets/Think Space_icon灰色渐变-背景.png";
import "./SelectedClauseCard.css";

// ============================================================================
// TYPES
// ============================================================================

interface SelectedClauseCardProps {
  /** Clause context with text and rich annotations */
  clauseContext: ClauseContext;
  /** Whether the card is expanded */
  isExpanded: boolean;
  /** Toggle expand callback */
  onToggleExpand: () => void;
  /** Whether to allow removing individual annotations */
  allowRemoval?: boolean;
  /** Callbacks for removal (only used if allowRemoval is true) */
  onRemoveComment?: (commentId: string) => void;
  onRemoveHighlight?: (highlightId: string) => void;
  onRemoveTrackChange?: (tcIndex: number, itemIndex: number, type: 'deleted' | 'added') => void;
  onRemoveFullSentenceDeletion?: (fsdIndex: number) => void;
  onRemoveFullSentenceInsertion?: (fsiIndex: number) => void;
  onRemoveStructuralChange?: (scIndex: number) => void;
}

// Empty annotation preview for when no annotations exist
const EMPTY_ANNOTATIONS: AnnotationPreview = {
  comments: [],
  highlights: [],
  wordLevelTrackChanges: [],
  fullSentenceDeletions: [],
  fullSentenceInsertions: [],
  structuralChanges: [],
};

// ============================================================================
// COMPONENT
// ============================================================================

export const SelectedClauseCard: React.FC<SelectedClauseCardProps> = ({
  clauseContext,
  isExpanded,
  onToggleExpand,
  allowRemoval = false,
  onRemoveComment,
  onRemoveHighlight,
  onRemoveTrackChange,
  onRemoveFullSentenceDeletion,
  onRemoveFullSentenceInsertion,
  onRemoveStructuralChange,
}) => {
  const annotations = clauseContext.annotations || EMPTY_ANNOTATIONS;

  return (
    <div className="selected-clause-card">
      {/* Header */}
      <div className="selected-clause-card-header" onClick={onToggleExpand}>
        <img
          src={thinkSpaceIcon}
          alt="Think Space"
          className="selected-clause-icon"
        />
        <div className="selected-clause-header-content">
          <span className="selected-clause-label">Selected Section</span>
          {clauseContext.sourceDoc && (
            <span className="selected-clause-source">{clauseContext.sourceDoc}</span>
          )}
        </div>
        <button className="selected-clause-toggle">
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="selected-clause-content">
          <AnnotationDisplay
            text={clauseContext.text}
            annotations={annotations}
            showInlinePreview={true}
            showExpandableSections={true}
            defaultExpanded={true}
            showTextWhenEmpty={true}
            allowRemoval={allowRemoval}
            onRemoveComment={onRemoveComment}
            onRemoveHighlight={onRemoveHighlight}
            onRemoveTrackChange={onRemoveTrackChange}
            onRemoveFullSentenceDeletion={onRemoveFullSentenceDeletion}
            onRemoveFullSentenceInsertion={onRemoveFullSentenceInsertion}
            onRemoveStructuralChange={onRemoveStructuralChange}
          />

          {clauseContext.location && (
            <div className="selected-clause-location">
              <FileText size={14} />
              <span>Location: {clauseContext.location}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SelectedClauseCard;