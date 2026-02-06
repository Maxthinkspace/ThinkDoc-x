import * as React from "react";
import "./AssistantMessage.css";

interface MarkdownRendererProps {
  content: string;
}

/**
 * Renders markdown content with support for:
 * - Bold text (**text**)
 * - Italic text (*text*)
 * - Bullet lists (- item)
 * - Numbered lists (1. item)
 * - Tables (markdown table syntax)
 * - Line breaks
 */
export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
}) => {
  // Parse and render markdown content
  const renderContent = (text: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    let currentIndex = 0;

    // Split by paragraphs first
    const paragraphs = text.split(/\n\n+/);

    paragraphs.forEach((paragraph, paraIndex) => {
      if (paraIndex > 0) {
        parts.push(<br key={`br-${paraIndex}`} />);
        parts.push(<br key={`br2-${paraIndex}`} />);
      }

      // Check if this is a table
      if (isTable(paragraph)) {
        parts.push(renderTable(paragraph));
        return;
      }

      // Check if this is a list
      if (isList(paragraph)) {
        parts.push(renderList(paragraph));
        return;
      }

      // Regular paragraph with inline formatting
      parts.push(renderInlineFormatting(paragraph));
    });

    return parts;
  };

  const isTable = (text: string): boolean => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return false;
    
    // Check for markdown table separator (| --- |)
    return lines.some(line => /^\s*\|[\s\-:]+\|\s*$/.test(line));
  };

  const renderTable = (text: string): React.ReactNode => {
    const lines = text.trim().split('\n').filter(line => line.trim());
    const rows: string[][] = [];

    lines.forEach((line) => {
      // Skip separator rows
      if (/^\s*\|[\s\-:]+\|\s*$/.test(line)) return;
      
      const cells = line
        .split('|')
        .map(cell => cell.trim())
        .filter(cell => cell.length > 0);
      
      if (cells.length > 0) {
        rows.push(cells);
      }
    });

    if (rows.length === 0) return null;

    return (
      <div key={`table-${text.substring(0, 20)}`} className="assistant-message-table-wrapper">
        <table className="assistant-message-table">
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={`row-${rowIndex}`} className={rowIndex === 0 ? 'assistant-message-table-header' : ''}>
                {row.map((cell, cellIndex) => {
                  const CellTag = rowIndex === 0 ? 'th' : 'td';
                  return (
                    <CellTag key={`cell-${rowIndex}-${cellIndex}`}>
                      {renderInlineFormatting(cell)}
                    </CellTag>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const isList = (text: string): boolean => {
    const lines = text.trim().split('\n');
    return lines.some(line => /^\s*[-*]\s+/.test(line) || /^\s*\d+\.\s+/.test(line));
  };

  const renderList = (text: string): React.ReactNode => {
    const lines = text.trim().split('\n');
    const items: string[] = [];
    let isOrdered = false;

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      // Check for unordered list
      const unorderedMatch = trimmed.match(/^\s*[-*]\s+(.+)$/);
      if (unorderedMatch) {
        items.push(unorderedMatch[1]);
        return;
      }

      // Check for ordered list
      const orderedMatch = trimmed.match(/^\s*\d+\.\s+(.+)$/);
      if (orderedMatch) {
        items.push(orderedMatch[1]);
        isOrdered = true;
      }
    });

    if (items.length === 0) return null;

    const ListTag = isOrdered ? 'ol' : 'ul';
    const className = isOrdered 
      ? 'assistant-message-ordered-list' 
      : 'assistant-message-unordered-list';

    return (
      <ListTag key={`list-${text.substring(0, 20)}`} className={className}>
        {items.map((item, index) => (
          <li key={`item-${index}`}>
            {renderInlineFormatting(item)}
          </li>
        ))}
      </ListTag>
    );
  };

  const renderInlineFormatting = (text: string): React.ReactNode => {
    const parts: React.ReactNode[] = [];
    let currentIndex = 0;
    let keyCounter = 0;

    // Pattern to match: **bold**, *italic*, [citation numbers]
    const patterns = [
      { regex: /\*\*([^*]+)\*\*/g, tag: 'strong' },
      { regex: /\*([^*]+)\*/g, tag: 'em' },
    ];

    // Find all matches with positions
    const matches: Array<{
      start: number;
      end: number;
      type: 'bold' | 'italic' | 'citation';
      content: string;
    }> = [];

    patterns.forEach((pattern) => {
      let match;
      const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
      while ((match = regex.exec(text)) !== null) {
        matches.push({
          start: match.index,
          end: match.index + match[0].length,
          type: pattern.tag === 'strong' ? 'bold' : pattern.tag === 'em' ? 'italic' : 'citation',
          content: match[1],
        });
      }
    });

    // Sort matches by position
    matches.sort((a, b) => a.start - b.start);

    // Remove overlapping matches (prefer bold over italic)
    const filteredMatches: typeof matches = [];
    matches.forEach((match) => {
      const overlaps = filteredMatches.some(
        (existing) =>
          (match.start < existing.end && match.end > existing.start)
      );
      if (!overlaps) {
        filteredMatches.push(match);
      }
    });

    // Build React nodes
    filteredMatches.forEach((match) => {
      // Add text before match
      if (match.start > currentIndex) {
        const beforeText = text.substring(currentIndex, match.start);
        if (beforeText) {
          parts.push(<span key={`text-${keyCounter++}`}>{beforeText}</span>);
        }
      }

      // Add formatted content
      if (match.type === 'bold') {
        parts.push(
          <strong key={`bold-${keyCounter++}`}>{match.content}</strong>
        );
      } else if (match.type === 'italic') {
        parts.push(
          <em key={`italic-${keyCounter++}`}>{match.content}</em>
        );
      } else {
        parts.push(
          <span key={`plain-${keyCounter++}`}>{match.content}</span>
        );
      }

      currentIndex = match.end;
    });

    // Add remaining text
    if (currentIndex < text.length) {
      const remainingText = text.substring(currentIndex);
      if (remainingText) {
        parts.push(<span key={`text-${keyCounter++}`}>{remainingText}</span>);
      }
    }

    return parts.length > 0 ? <>{parts}</> : <>{text}</>;
  };

  return <div className="assistant-message-content-text">{renderContent(content)}</div>;
};

