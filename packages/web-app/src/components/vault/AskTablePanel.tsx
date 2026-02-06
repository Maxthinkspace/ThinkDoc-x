import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Send, Loader2, ChevronDown, ChevronUp, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { aiApi, jobsApi } from "@/services/vaultApi";
import type { JobStatus } from "@/services/vaultApi";
import React from "react";

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  reasoningSteps?: string[];
  relevantColumns?: string[];
}

interface AskTablePanelProps {
  queryId: string;
  projectId: string;
  fileIds: string[];
  columnCount: number;
  rowCount: number;
  tableName?: string;
  className?: string;
  isExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  initialMessages?: ChatMessage[]; // For loading past query results
}

export const AskTablePanel = ({
  queryId,
  projectId,
  fileIds,
  columnCount,
  rowCount,
  tableName = "Review table",
  className,
  isExpanded: controlledIsExpanded,
  onExpandedChange,
  initialMessages,
}: AskTablePanelProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages || []);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [workingSteps, setWorkingSteps] = useState<string[]>([]);
  const [internalIsExpanded, setInternalIsExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Use controlled or internal state
  const isExpanded = controlledIsExpanded !== undefined ? controlledIsExpanded : internalIsExpanded;
  const setIsExpanded = (value: boolean) => {
    if (onExpandedChange) {
      onExpandedChange(value);
    } else {
      setInternalIsExpanded(value);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, workingSteps]);

  // Load initial messages when they change
  useEffect(() => {
    if (initialMessages && initialMessages.length > 0 && messages.length === 0) {
      setMessages(initialMessages);
    }
  }, [initialMessages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const question = input.trim();
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: question,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setWorkingSteps(["Sending query..."]);

    try {
      // Call the API to ask the question
      setWorkingSteps(["Sending query", "Processing request..."]);
      const { jobId, queryId: newQueryId } = await aiApi.askQuery(projectId, fileIds, question);
      
      setWorkingSteps([
        "Sending query",
        "Processing request",
        "Analyzing documents...",
      ]);

      // Poll for job completion
      const jobStatus = await jobsApi.pollUntilComplete(
        jobId,
        (status) => {
          if (status.status === 'pending' && status.progress) {
            setWorkingSteps([
              "Sending query",
              "Processing request",
              "Analyzing documents...",
              status.progress.stepName || "Working...",
            ]);
          }
        },
        1000,
        300 // 5 minute timeout
      );

      if (jobStatus.status === 'done' && jobStatus.result) {
        const result = jobStatus.result as { answer: string; sources?: Array<{ fileId: string; fileName: string; snippet: string }> };
        
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: result.answer || "I've analyzed your question, but couldn't generate a response.",
          timestamp: new Date(),
          relevantColumns: result.sources?.map(s => s.fileName),
        };

        setMessages(prev => [...prev, assistantMessage]);
      } else if (jobStatus.status === 'error') {
        throw new Error(jobStatus.error || 'Query failed');
      } else {
        throw new Error('Query did not complete successfully');
      }
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setWorkingSteps([]);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Component to render markdown text with bold support
  const MarkdownText = ({ content }: { content: string }) => {
    const parts: React.ReactNode[] = [];
    const boldRegex = /\*\*(.+?)\*\*/g;
    let lastIndex = 0;
    let match;
    let key = 0;

    while ((match = boldRegex.exec(content)) !== null) {
      // Add text before bold
      if (match.index > lastIndex) {
        parts.push(<span key={key++}>{content.substring(lastIndex, match.index)}</span>);
      }
      // Add bold text
      parts.push(<strong key={key++}>{match[1]}</strong>);
      lastIndex = match.index + match[0].length;
    }
    // Add remaining text
    if (lastIndex < content.length) {
      parts.push(<span key={key++}>{content.substring(lastIndex)}</span>);
    }

    return <>{parts.length > 0 ? parts : content}</>;
  };

  // Component to render markdown tables
  const MarkdownTable = ({ content }: { content: string }) => {
    const lines = content.trim().split('\n').filter(line => line.trim());
    if (lines.length < 2) return <pre className="text-sm">{content}</pre>;

    const headerLine = lines[0];
    const separatorLine = lines[1];
    const dataLines = lines.slice(2);

    const parseRow = (line: string): string[] => {
      return line
        .split('|')
        .map(cell => cell.trim())
        .filter(cell => cell.length > 0);
    };

    const headers = parseRow(headerLine);
    const rows = dataLines.map(parseRow);

    return (
      <div className="overflow-x-auto my-2">
        <table className="min-w-full border-collapse border border-border text-sm">
          <thead>
            <tr className="bg-muted/50">
              {headers.map((header, idx) => (
                <th key={idx} className="border border-border px-3 py-2 text-left font-semibold">
                  <MarkdownText content={header} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIdx) => (
              <tr key={rowIdx} className="hover:bg-muted/30">
                {headers.map((_, colIdx) => (
                  <td key={colIdx} className="border border-border px-3 py-2">
                    <MarkdownText content={row[colIdx] || ''} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // Parse markdown content (bold and tables)
  const parseMarkdown = (content: string): React.ReactNode => {
    // First, extract and replace tables
    const tableRegex = /(\|.+\|\n\|[-:\s|]+\|\n(?:\|.+\|\n?)+)/g;
    const parts: Array<{ type: 'text' | 'table'; content: string }> = [];
    let lastIndex = 0;
    let match;

    // Find all tables
    const tableMatches: Array<{ start: number; end: number; content: string }> = [];
    while ((match = tableRegex.exec(content)) !== null) {
      tableMatches.push({
        start: match.index,
        end: match.index + match[0].length,
        content: match[0],
      });
    }

    // Split content by tables
    if (tableMatches.length === 0) {
      parts.push({ type: 'text', content });
    } else {
      tableMatches.forEach((tableMatch, idx) => {
        // Add text before table
        if (tableMatch.start > lastIndex) {
          parts.push({
            type: 'text',
            content: content.substring(lastIndex, tableMatch.start),
          });
        }
        // Add table
        parts.push({ type: 'table', content: tableMatch.content });
        lastIndex = tableMatch.end;
      });
      // Add remaining text after last table
      if (lastIndex < content.length) {
        parts.push({ type: 'text', content: content.substring(lastIndex) });
      }
    }

    return (
      <>
        {parts.map((part, idx) => {
          if (part.type === 'table') {
            return <MarkdownTable key={idx} content={part.content} />;
          } else {
            return <MarkdownText key={idx} content={part.content} />;
          }
        })}
      </>
    );
  };

  // Collapsed state - don't render anything, parent will show button
  if (!isExpanded) {
    return null;
  }

  // Expanded state - show as side panel
  return (
    <div className={cn("w-96 bg-background border-r flex flex-col h-full", className)}>
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between bg-muted/50 flex-shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          <span className="text-sm font-medium">Ask {tableName}</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setIsExpanded(false)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Context Card */}
      <div className="p-4 border-b flex-shrink-0">
        <Card className="p-3 bg-background">
          <p className="text-sm font-medium mb-1">{tableName}</p>
          <p className="text-xs text-muted-foreground">
            {columnCount} columns • {rowCount} rows
          </p>
        </Card>
      </div>

      {/* Prompt */}
      <div className="p-4 border-b flex-shrink-0">
        <p className="text-sm text-muted-foreground">
          Ask a question about your {tableName} below
        </p>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4 min-h-0">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex flex-col gap-2",
                message.role === 'user' ? 'items-end' : 'items-start'
              )}
            >
              <div
                className={cn(
                  "rounded-lg p-3 max-w-[85%]",
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background border'
                )}
              >
                <div className="text-sm whitespace-pre-wrap">
                  {message.role === 'assistant' ? parseMarkdown(message.content) : message.content}
                </div>
              </div>
              {message.reasoningSteps && message.reasoningSteps.length > 0 && (
                <div className="text-xs text-muted-foreground space-y-1">
                  {message.reasoningSteps.map((step, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Working State */}
          {isLoading && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Working...</span>
              </div>
              {workingSteps.map((step, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs text-muted-foreground ml-6">
                  <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                  <span>{step}</span>
                </div>
              ))}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t flex-shrink-0">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            placeholder="Ask Think AI"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            size="icon"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AskTablePanel;

