import * as React from "react";
import { Loader } from "lucide-react";
import { backendApi } from "../../../services/api";
import { libraryApi } from "../../../services/libraryApi";
import { authService } from "../../../services/auth";
import { SelectedClauseCard } from "../SelectedClauseCard";
import { CommandBarInput, type ChatMode, type ModelOption } from "../CommandBarInput";
import { ContextSelector } from "../ContextSelector";
import { WorkflowSteps, type WorkflowStep } from "../WorkflowSteps";
import { EnvironmentSelector, type EnvironmentType } from "../EnvironmentSelector";
import { PromptSuggestions } from "../PromptSuggestions";
import { ChatTips } from "../ChatTips";
import { AssistantMessage } from "../AssistantMessage";
import type { ClauseContext, GeneralSourceConfig } from "../../../types/panelTypes";
import type { SourceCitation } from "../AssistantMessage/types";
import { useAutoNaming } from "./useAutoNaming";
import type { ChatMessage } from "./types";
import "./ChatHistory.css";

interface ChatViewProps {
  sessionId: string | null;
  clauseContext: ClauseContext | null;
  initialMessage?: string | null;
  onSessionCreated?: (sessionId: string) => void;
  onTitleUpdated?: () => void;
}

export const ChatView: React.FC<ChatViewProps> = ({
  sessionId,
  clauseContext,
  initialMessage,
  onSessionCreated,
  onTitleUpdated,
}) => {
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [isLoadingSession, setIsLoadingSession] = React.useState(false);
  const [isClauseExpanded, setIsClauseExpanded] = React.useState(true);
  const [currentSessionId, setCurrentSessionId] = React.useState<string | null>(sessionId);
  const [mode, setMode] = React.useState<ChatMode>("ask");
  const [selectedModel, setSelectedModel] = React.useState<ModelOption | null>(null);
  const [sourceConfig, setSourceConfig] = React.useState<GeneralSourceConfig>(() => ({
    includeDocument: clauseContext ? true : false,
    enableWebSearch: false,
    vaultClauses: [],
    vaultPlaybooks: [],
    vaultStandards: [],
    uploadedFiles: [],
    importedSources: [],
  }));
  const [showContextSelector, setShowContextSelector] = React.useState(false);
  const [workflowSteps, setWorkflowSteps] = React.useState<WorkflowStep[]>([]);
  const [isWorkflowCollapsed, setIsWorkflowCollapsed] = React.useState(false);
  const [agentCycle, setAgentCycle] = React.useState<number | undefined>(undefined);
  const [totalAgentCycles, setTotalAgentCycles] = React.useState<number | undefined>(undefined);
  const [environment, setEnvironment] = React.useState<EnvironmentType>("local");
  const [showTips, setShowTips] = React.useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const hasInitialized = React.useRef(false);
  const hasAutoNamed = React.useRef(false);
  const { generateTitle } = useAutoNaming();

  const loadSession = React.useCallback(async (id: string) => {
    setIsLoadingSession(true);
    try {
      await authService.setupDevAuth();
      const session = await libraryApi.getChatSession(id);
      if (session.messages) {
        setMessages(session.messages);
        hasAutoNamed.current = !!session.title;
      }
    } catch (error) {
      console.error("Failed to load session:", error);
    } finally {
      setIsLoadingSession(false);
    }
  }, []);

  // Load session messages when sessionId changes
  React.useEffect(() => {
    if (currentSessionId) {
      loadSession(currentSessionId);
    } else {
      setMessages([]);
    }
  }, [currentSessionId, loadSession]);

  // Sync with prop changes
  React.useEffect(() => {
    setCurrentSessionId(sessionId);
  }, [sessionId]);

  // Send initial message if provided
  React.useEffect(() => {
    if (initialMessage && !hasInitialized.current && messages.length === 0 && !isLoading) {
      hasInitialized.current = true;
      setTimeout(() => {
        handleSendMessage(initialMessage);
      }, 100);
    }
  }, [initialMessage, messages.length, isLoading]);

  // Scroll to bottom when messages change
  React.useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);


  const handleSendMessage = async (messageText?: string) => {
    const textToSend = messageText || inputValue.trim();
    if (!textToSend || isLoading) return;

    let activeSessionId = currentSessionId;

    // Create session if none exists
    if (!activeSessionId) {
      try {
        await authService.setupDevAuth();
        const newSession = await libraryApi.createChatSession();
        if (!newSession?.id) {
          throw new Error("Chat session creation failed: missing session id.");
        }
        activeSessionId = newSession.id;
        setCurrentSessionId(activeSessionId);
        onSessionCreated?.(activeSessionId);
      } catch (error) {
        console.error("Failed to create session:", error);
        return;
      }
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      sessionId: activeSessionId,
      role: "user",
      content: textToSend,
      citations: null,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!messageText) {
      setInputValue("");
    }
    setIsLoading(true);

    try {
      await authService.setupDevAuth();
      // Save user message to backend
      await libraryApi.addChatMessage(activeSessionId, "user", textToSend);

      // Build context from clause if available
      let question = textToSend;
      
      // Prepare sourceConfig for API
      const apiSourceConfig = {
        includeDocument: sourceConfig.includeDocument || (clauseContext ? true : false),
        enableWebSearch: sourceConfig.enableWebSearch || false,
        vaultClauseIds: sourceConfig.vaultClauses.length > 0 ? sourceConfig.vaultClauses : undefined,
        vaultPlaybookIds: sourceConfig.vaultPlaybooks.length > 0 ? sourceConfig.vaultPlaybooks : undefined,
        vaultFileIds: sourceConfig.uploadedFiles
          .filter((f) => f.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i))
          .map((f) => f.id),
      };

      // If there's clause context, include it in the question
      if (clauseContext?.text) {
        question = `${textToSend}\n\nContext: ${clauseContext.text}`;
      }

      // Reset workflow steps and agent cycle
      setWorkflowSteps([]);
      setAgentCycle(undefined);
      setTotalAgentCycles(undefined);
      setIsWorkflowCollapsed(false);

      let accumulatedAnswer = "";
      const stepsMap = new Map<string, WorkflowStep>();

      const result = await backendApi.askStream(
        {
          question,
          sourceConfig: apiSourceConfig,
          conversationHistory: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        },
        (event) => {
          // Handle workflow_step events
          if (event.type === "workflow_step") {
            if (event.step !== undefined && event.name) {
              const stepId = `step-${event.step}`;
              const existingStep = stepsMap.get(stepId);

              if (event.status === "started") {
                // Add new step
                const newStep: WorkflowStep = {
                  id: stepId,
                  name: event.name,
                  status: "in_progress",
                  stepNumber: event.step,
                  totalSteps: event.total,
                };
                stepsMap.set(stepId, newStep);
                setWorkflowSteps(Array.from(stepsMap.values()).sort((a, b) => (a.stepNumber || 0) - (b.stepNumber || 0)));
              } else if (event.status === "completed" && existingStep) {
                // Mark step as completed
                existingStep.status = "completed";
                setWorkflowSteps(Array.from(stepsMap.values()).sort((a, b) => (a.stepNumber || 0) - (b.stepNumber || 0)));
              }

              // Update total steps if provided
              if (event.total) {
                setTotalAgentCycles(event.total);
              }
            }
          }

          // Handle thinking events (agent cycles)
          if (event.type === "thinking") {
            if (event.step !== undefined) {
              setAgentCycle(event.step);
              if (event.total !== undefined) {
                setTotalAgentCycles(event.total);
              }
            }
          }

          // Handle content events (streaming)
          if (event.type === "content" && event.text) {
            accumulatedAnswer += event.text;
          }
        }
      );

      // Use accumulated answer if available, otherwise use result.answer
      const finalAnswer = accumulatedAnswer || result.answer;

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sessionId: activeSessionId,
        role: "assistant",
        content: finalAnswer,
        citations: result.citations || null,
        followUpQuestions: result.followUpQuestions || undefined,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Save assistant message to backend
      await libraryApi.addChatMessage(
        activeSessionId,
        "assistant",
        finalAnswer,
        result.citations
      );

      // Auto-generate title after first assistant response
      if (!hasAutoNamed.current && messages.length === 0) {
        hasAutoNamed.current = true;
        generateTitle(activeSessionId, textToSend, result.answer).then(() => {
          onTitleUpdated?.();
        });
      }
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sessionId: activeSessionId,
        role: "assistant",
        content: `Error: ${error instanceof Error ? error.message : "Failed to get response"}`,
        citations: null,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      // Mark all in-progress steps as completed
      setWorkflowSteps((prev) =>
        prev.map((step) =>
          step.status === "in_progress" ? { ...step, status: "completed" } : step
        )
      );
    }
  };

  // Calculate context usage percentage
  const calculateContextUsage = (): number => {
    // Rough estimation: ~4 characters per token
    let totalTokens = 0;

    // Selected clause text
    if (clauseContext?.text) {
      totalTokens += clauseContext.text.length / 4;
    }

    // Conversation history (last 10 messages)
    const recentMessages = messages.slice(-10);
    recentMessages.forEach((msg) => {
      totalTokens += msg.content.length / 4;
    });

    // Vault sources (estimated)
    totalTokens += (sourceConfig.vaultClauses.length + sourceConfig.vaultPlaybooks.length) * 500;

    // Uploaded files
    sourceConfig.uploadedFiles.forEach((file) => {
      totalTokens += file.content.length / 4;
    });

    // Assume 128k context window (common for modern models)
    const maxTokens = 128000;
    const usage = Math.min(100, (totalTokens / maxTokens) * 100);

    return usage;
  };

  const handleSend = () => {
    handleSendMessage();
  };

  const handleInsertMention = (text: string) => {
    setInputValue((prev) => prev + (prev ? " " : "") + text + " ");
  };

  const handleFileUpload = (files: File[]) => {
    const newFiles = files.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      name: file.name,
      content: "", // Will be populated when file is read
    }));

    // Read file contents
    Promise.all(
      files.map((file) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve((e.target?.result as string) || "");
          reader.onerror = reject;
          reader.readAsText(file);
        })
      )
    ).then((contents) => {
      const filesWithContent = newFiles.map((file, idx) => ({
        ...file,
        content: contents[idx],
      }));

      setSourceConfig((prev) => ({
        ...prev,
        uploadedFiles: [...prev.uploadedFiles, ...filesWithContent],
      }));
    });
  };

  if (isLoadingSession) {
    return (
      <div className="chat-view-loading">
        <Loader size={24} className="spinner" />
        <p>Loading conversation...</p>
      </div>
    );
  }

  return (
    <div className="chat-view">
      {/* Command Bar Input - Moved to Top */}
      <div className="chat-view-input-wrapper">
        <CommandBarInput
        value={inputValue}
        onChange={setInputValue}
        onSend={handleSend}
        isLoading={isLoading}
        disabled={false}
        mode={mode}
        onModeChange={setMode}
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
        sourceConfig={sourceConfig}
        onSourceConfigChange={setSourceConfig}
        onOpenContextSelector={() => setShowContextSelector(true)}
        onFileUpload={handleFileUpload}
        contextUsage={calculateContextUsage()}
        agentCycle={agentCycle}
        totalAgentCycles={totalAgentCycles}
        selectedEnvironment={environment}
        onEnvironmentChange={setEnvironment}
        />
      </div>

      {/* Prompt Suggestions - Only visible when chat is empty */}
      {messages.length === 0 && (
        <PromptSuggestions
          onPromptSelect={(prompt) => setInputValue(prompt)}
          clauseContext={clauseContext}
        />
      )}

      {/* Context Preview */}
      {clauseContext && (
        <div className="chat-view-context">
          <SelectedClauseCard
            clauseContext={clauseContext}
            isExpanded={isClauseExpanded}
            onToggleExpand={() => setIsClauseExpanded(!isClauseExpanded)}
          />
        </div>
      )}

      {/* Messages */}
      <div className="chat-view-messages">
        {messages.length === 0 && (
          <div className="chat-view-empty">
            {clauseContext ? (
              <p>Ask questions about the selected text, or ask anything else.</p>
            ) : (
              <p>Ask me anything about your document or legal questions.</p>
            )}
          </div>
        )}
        {messages.map((message) => (
          <div key={message.id} className={`chat-view-message ${message.role}`}>
            {message.role === "assistant" ? (
              <AssistantMessage
                content={message.content}
                citations={message.citations}
                followUpQuestions={message.followUpQuestions}
                onCitationClick={(citationId) => {
                  // Handle citation click - already handled in CitationReference
                  console.log("Citation clicked:", citationId);
                }}
                onShowCitationPreview={(citation) => {
                  // Show citation preview panel
                  console.log("Show citation preview:", citation);
                  // TODO: Implement citation preview panel/modal
                }}
                onFollowUpClick={(question) => {
                  // Auto-send follow-up question
                  handleSendMessage(question);
                }}
              />
            ) : (
              <div className="chat-view-message-content">{message.content}</div>
            )}
          </div>
        ))}
        {isLoading && workflowSteps.length > 0 && (
          <WorkflowSteps
            steps={workflowSteps}
            isCollapsed={isWorkflowCollapsed}
            onToggleCollapse={() => setIsWorkflowCollapsed(!isWorkflowCollapsed)}
          />
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Context Selector */}
      <ContextSelector
        isOpen={showContextSelector}
        onClose={() => setShowContextSelector(false)}
        sourceConfig={sourceConfig}
        onSourceConfigChange={setSourceConfig}
        onInsertMention={handleInsertMention}
      />

      {/* Tips Modal */}
      <ChatTips isOpen={showTips} onClose={() => setShowTips(false)} />
    </div>
  );
};

