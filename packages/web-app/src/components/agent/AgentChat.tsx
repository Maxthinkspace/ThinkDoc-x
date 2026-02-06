import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Loader2, Send, StopCircle, Bookmark, Copy, Download, RefreshCw, FileEdit, Globe, FileText, Paperclip, Link2, Sparkles, ChevronDown, ArrowRight } from "lucide-react";
import thinkAIIcon from "@/assets/thinkspace-icon.png";
import { useToast } from "@/hooks/use-toast";
import { promptsApi, type Prompt } from "@/services/promptsApi";
import ResearchStep from "./ResearchStep";
import EditableOutput from "./EditableOutput";
import ReviewOutput from "./ReviewOutput";
import ThinkingIndicator from "./ThinkingIndicator";
import ProgressStep from "./ProgressStep";
import SearchStep from "./SearchStep";
import ReviewingStep from "./ReviewingStep";
import FinishedIndicator from "./FinishedIndicator";
import FileUpload from "./FileUpload";
import SearchFilters from "./SearchFilters";
import VaultSelector from "./VaultSelector";
import CitationPill from "./CitationPill";
import CitationPreview from "./CitationPreview";
import SourceDrawer, { type SourceCitation } from "./SourceDrawer";
import SourcesSidebar from "./SourcesSidebar";
import FollowUps from "./FollowUps";
import DocumentEditorPanel from "./DocumentEditorPanel";
import DraftingStepsIndicator, { type DraftingStep } from "./DraftingStepsIndicator";
import DraftVersionCard from "./DraftVersionCard";
import DraftActionsBar from "./DraftActionsBar";
import { apiClient } from "@/services/api";

interface Message {
  role: 'user' | 'assistant';
  content: string;
  steps?: ResearchStep[];
  draftingSteps?: DraftingStep[];
  editableOutput?: string;
  finalAnswer?: string;
  progressSteps?: ProgressStepData[];
  searchQueries?: string[][];
  reviewingSources?: ReviewingSourcesData[];
  finished?: boolean;
  sourceCount?: number;
  citations?: Map<number, SourceCitation>;
  createdAt?: string;
  reviewData?: {
    suggestions: Array<{
      type: "critical" | "important" | "minor";
      title: string;
      description: string;
      location: string;
    }>;
    redlines: Array<{
      type: "addition" | "deletion" | "modification";
      original: string;
      suggested: string;
      reason: string;
    }>;
    documentContent: string;
  };
}

interface ResearchStep {
  step: number;
  title: string;
  content: string;
  sources?: { url: string; title: string; snippet: string }[];
  status: 'thinking' | 'complete';
}

interface ProgressStepData {
  status: string;
  timeRemaining?: string;
  description?: string;
}

interface ReviewingSourcesData {
  sources: { title: string; domain: string }[];
  count: number;
}

interface Resource {
  id: string;
  name: string;
  type: string;
}

interface AgentChatProps {
  resources?: Resource[];
  initialMessage?: string;
  initialFiles?: File[];
  initialVaultFiles?: string[];
  autoSend?: boolean;
}

export default function AgentChat({ 
  resources = [],
  initialMessage,
  initialFiles = [],
  initialVaultFiles = [],
  autoSend = false,
  initialWebSearch = false,
}: AgentChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentSteps, setCurrentSteps] = useState<ResearchStep[]>([]);
  const [currentProgress, setCurrentProgress] = useState<ProgressStepData | null>(null);
  const [currentSearches, setCurrentSearches] = useState<string[][]>([]);
  const [currentReviewing, setCurrentReviewing] = useState<ReviewingSourcesData[]>([]);
  const [thinkingMessage, setThinkingMessage] = useState<string>("Working...");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [workflowStepsMap, setWorkflowStepsMap] = useState<Map<number, DraftingStep>>(new Map());
  const [whitelist, setWhitelist] = useState<string[]>([]);
  const [blacklist, setBlacklist] = useState<string[]>([]);
  const [vaultFiles, setVaultFiles] = useState<string[]>([]);
  const [currentCitations, setCurrentCitations] = useState<Map<number, SourceCitation>>(new Map());
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState<SourceCitation | null>(null);
  const [sourcesSidebarOpen, setSourcesSidebarOpen] = useState(false);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [workingSteps, setWorkingSteps] = useState<string[]>([]);
  const [followUps, setFollowUps] = useState<string[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorContent, setEditorContent] = useState<string>("");
  const [editorOriginalContent, setEditorOriginalContent] = useState<string>("");
  const [editorDocumentId, setEditorDocumentId] = useState<string | null>(null);
  const [showEdits, setShowEdits] = useState(false);
  const [currentVersionId, setCurrentVersionId] = useState<string | undefined>(undefined);
  const [draftingSteps, setDraftingSteps] = useState<DraftingStep[]>([]);
  // Input mode state (Auto, Edit, Answer)
  const [inputMode, setInputMode] = useState<"auto" | "edit" | "answer">("auto");
  // Save prompt dialog state
  const [savePromptDialogOpen, setSavePromptDialogOpen] = useState(false);
  const [promptToSave, setPromptToSave] = useState("");
  const [promptName, setPromptName] = useState("");
  const [promptDescription, setPromptDescription] = useState("");
  const [promptCategory, setPromptCategory] = useState<Prompt['category']>("custom");
  const [savingPrompt, setSavingPrompt] = useState(false);
  // Store uploaded file buffers for PDF viewing
  const [uploadedFileBuffers, setUploadedFileBuffers] = useState<Map<string, { buffer: ArrayBuffer; name: string; type: string }>>(new Map());
  // Store file metadata for citation matching
  const uploadedFilesMetadataRef = useRef<Map<string, { name: string; type: string; fileId: string }>>(new Map());
  // Use a ref to track citations during streaming (since setState is async)
  const citationsRef = useRef<Map<number, SourceCitation>>(new Map());
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const abortControllerRef = useRef<AbortController | null>(null);
  const hasInitializedRef = useRef(false);

  // Initialize with initial message and files if provided
  useEffect(() => {
    if (initialMessage && messages.length === 0 && !isLoading && !hasInitializedRef.current) {
      hasInitializedRef.current = true;
      setInput(initialMessage);
      if (initialFiles.length > 0) {
        setUploadedFiles(initialFiles);
      }
      if (initialVaultFiles.length > 0) {
        setVaultFiles(initialVaultFiles);
      }
      // Auto-send if requested - immediately add user message and show loading
      if (autoSend) {
        // Immediately add user message to show it right away
        const userMessage: Message = { role: 'user', content: initialMessage };
        setMessages([userMessage]);
        setIsLoading(true);
        setThinkingMessage("Working...");
        
        // Use a small delay to ensure state is set, then call sendMessage with override
        const timer = setTimeout(() => {
          // Pass the initial message and vault files directly to avoid state timing issues
          if (initialMessage.trim()) {
            sendMessage(initialMessage, initialVaultFiles);
          }
        }, 100);
        return () => clearTimeout(timer);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMessage, initialFiles, initialVaultFiles, autoSend]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, currentSteps]);

  const parseStreamContent = (content: string, isStreaming: boolean = false) => {
    const steps: ResearchStep[] = [];
    const progressSteps: ProgressStepData[] = [];
    const searchQueries: string[][] = [];
    const reviewingSources: ReviewingSourcesData[] = [];
    let editableOutput = '';
    let finalAnswer = '';
    let finished = false;
    let sourceCount = 0;
    
    // Parse progress indicators
    const progressRegex = /\[PROGRESS: ([^\]]+)\]\n(?:TIME: ([^\n]+)\n)?(?:DESC: ([^\n]+)\n)?\[\/PROGRESS\]/g;
    let progressMatch;
    while ((progressMatch = progressRegex.exec(content)) !== null) {
      progressSteps.push({
        status: progressMatch[1].trim(),
        timeRemaining: progressMatch[2]?.trim(),
        description: progressMatch[3]?.trim()
      });
    }

    // Parse search queries
    const searchRegex = /\[SEARCH\]([\s\S]*?)\[\/SEARCH\]/g;
    let searchMatch;
    while ((searchMatch = searchRegex.exec(content)) !== null) {
      const queries = searchMatch[1].trim().split('\n').filter(q => q.trim());
      if (queries.length > 0) {
        searchQueries.push(queries);
      }
    }

    // Parse reviewing sources
    const reviewRegex = /\[REVIEWING: (\d+)\]([\s\S]*?)\[\/REVIEWING\]/g;
    let reviewMatch;
    while ((reviewMatch = reviewRegex.exec(content)) !== null) {
      const count = parseInt(reviewMatch[1]);
      const sourcesText = reviewMatch[2].trim();
      const sources = sourcesText.split('\n').filter(s => s.trim()).map(line => {
        const [title, domain] = line.split('|').map(s => s.trim());
        return { title: title || line, domain: domain || 'unknown' };
      });
      reviewingSources.push({ sources, count });
    }
    
    // Parse completed research steps
    const stepRegex = /\[STEP (\d+): ([^\]]+)\]\n([\s\S]*?)(?:\[SOURCES: ([^\]]*)\])?\n\[\/STEP\]/g;
    let match;
    
    while ((match = stepRegex.exec(content)) !== null) {
      const [, stepNum, title, stepContent, sources] = match;
      
      const parsedSources = sources?.split('|').map(s => {
        const trimmed = s.trim();
        return {
          url: trimmed,
          title: trimmed,
          snippet: ''
        };
      }).filter(s => s.url);

      steps.push({
        step: parseInt(stepNum),
        title: title.trim(),
        content: stepContent.trim(),
        sources: parsedSources,
        status: 'complete'
      });
    }

    // Parse incomplete step (currently being typed) during streaming
    if (isStreaming) {
      const incompleteStepRegex = /\[STEP (\d+): ([^\]]+)\]\n([\s\S]*?)$/;
      const incompleteMatch = incompleteStepRegex.exec(content);
      
      if (incompleteMatch) {
        const [, stepNum, title, partialContent] = incompleteMatch;
        const stepNumber = parseInt(stepNum);
        
        // Check if this step is already in completed steps
        const isAlreadyComplete = steps.some(s => s.step === stepNumber);
        
        if (!isAlreadyComplete && partialContent.trim()) {
          // Remove [SOURCES: ...] tag if it appears at the end without closing
          const cleanContent = partialContent.replace(/\[SOURCES:[^\]]*$/, '').trim();
          
          steps.push({
            step: stepNumber,
            title: title.trim(),
            content: cleanContent,
            sources: [],
            status: 'thinking'
          });
        }
      }
    }

    // Parse trailing step(s) without closing tag (post-stream)
    if (!isStreaming) {
      const trailingStepRegex = /\[STEP (\d+): ([^\]]+)\]\n([\s\S]*?)(?=\n\[STEP |\n\[FINAL_ANSWER\]|\n\[EDITABLE_OUTPUT\]|\n\[FINISHED\]|$)/g;
      let tMatch;
      while ((tMatch = trailingStepRegex.exec(content)) !== null) {
        const [, tNum, tTitle, tBody] = tMatch;
        const stepNumber = parseInt(tNum);
        if (!steps.some(s => s.step === stepNumber)) {
          let body = tBody.trim();
          let parsedSources: { url: string; title: string; snippet: string }[] | undefined;
          const inlineSrc = body.match(/\[SOURCES: ([^\]]+)\]/);
          if (inlineSrc) {
            parsedSources = inlineSrc[1].split('|').map(s => {
              const u = s.trim();
              return { url: u, title: u, snippet: '' };
            }).filter(s => s.url);
            body = body.replace(/\[SOURCES: [^\]]+\]/, '').trim();
          }
          steps.push({
            step: stepNumber,
            title: tTitle.trim(),
            content: body,
            sources: parsedSources,
            status: 'complete'
          });
        }
      }
    }

    // Parse final answer
    const finalAnswerMatch = content.match(/\[FINAL_ANSWER\]([\s\S]*?)\[\/FINAL_ANSWER\]/);
    if (finalAnswerMatch) {
      finalAnswer = finalAnswerMatch[1]
        .replace(/===\s*CITATIONS\s*===[\s\S]*/gi, '')
        .trim();
    } else {
      // If no structured tags found, use the raw content as the answer
      // Remove any progress/search/reviewing tags and step markers
      let rawContent = content
        .replace(/\[PROGRESS:[\s\S]*?\[\/PROGRESS\]/g, '')
        .replace(/\[SEARCH\][\s\S]*?\[\/SEARCH\]/g, '')
        .replace(/\[REVIEWING:[\s\S]*?\[\/REVIEWING\]/g, '')
        .replace(/\[STEP \d+:[\s\S]*?\[\/STEP\]/g, '')
        .replace(/\[STEP \d+:[\s\S]*$/g, '')
        .replace(/===\s*CITATIONS\s*===[\s\S]*/gi, '')
        .trim();
      
      // Only use raw content if it's substantial and no steps were found
      if (rawContent.length > 50 && steps.length === 0) {
        finalAnswer = rawContent;
      } else if (rawContent.length > 50) {
        // If we have steps but also raw content, append it
        finalAnswer = rawContent;
      }
    }

    // Parse editable output
    const outputMatch = content.match(/\[EDITABLE_OUTPUT\]([\s\S]*?)\[\/EDITABLE_OUTPUT\]/);
    if (outputMatch) {
      editableOutput = outputMatch[1].trim();
    }

    // Check if finished
    if (content.includes('[FINISHED]')) {
      finished = true;
      const sourceCountMatch = content.match(/\[SOURCES: (\d+)\]/);
      if (sourceCountMatch) {
        sourceCount = parseInt(sourceCountMatch[1]);
      }
    } else if (content.length > 0 && !isStreaming) {
      // If we have content and stream is done, mark as finished
      finished = true;
    }

    return { steps, editableOutput, finalAnswer, progressSteps, searchQueries, reviewingSources, finished, sourceCount };
  };

  // Detect if the request is a drafting request
  const isDraftingRequest = (question: string): boolean => {
    const lowerQuestion = question.toLowerCase();
    const draftingKeywords = ['draft', 'write', 'create', 'compose', 'generate', 'prepare'];
    return draftingKeywords.some(keyword => lowerQuestion.includes(keyword));
  };

  // Enhance drafting requests with instructions for proper formatting
  const enhanceDraftingPrompt = (question: string): string => {
    if (!isDraftingRequest(question)) {
      return question;
    }
    
    return `${question}

IMPORTANT: This is a drafting request. Please format your response as follows:
1. Use [STEP X: Step Title] format to show each step taken (e.g., [STEP 1: Analyzing requirements], [STEP 2: Gathering context], [STEP 3: Drafting content])
2. Wrap the final draft in [EDITABLE_OUTPUT] tags
3. After the draft, include [FINISHED] and [SOURCES: X] where X is the number of sources used

Example format:
[STEP 1: Analyzing requirements]
Analyzing the drafting requirements...

[STEP 2: Gathering context]
Reviewing relevant sources...

[STEP 3: Drafting content]
Creating the draft...

[EDITABLE_OUTPUT]
[Your draft content here]
[/EDITABLE_OUTPUT]

[FINISHED]
[SOURCES: 3]`;
  };

  const sendMessage = useCallback(async (overrideInput?: string, overrideVaultFiles?: string[]) => {
    const messageToSend = overrideInput || input;
    if (!messageToSend.trim() || isLoading) return;
    
    // Enhance drafting requests
    const enhancedQuestion = enhanceDraftingPrompt(messageToSend);

    // Use original message for display, enhanced for backend
    const userMessage: Message = { 
      role: 'user', 
      content: messageToSend, // Show original to user
      createdAt: new Date().toISOString()
    };
    // Only add user message if it's not already the last message (to avoid duplicates when auto-sending)
    setMessages(prev => {
      const lastMessage = prev[prev.length - 1];
      if (lastMessage && lastMessage.role === 'user' && lastMessage.content === messageToSend) {
        return prev; // Already added, don't duplicate
      }
      return [...prev, userMessage];
    });
    const currentInput = enhancedQuestion;
    const currentFiles = [...uploadedFiles];
    const currentWhitelist = [...whitelist];
    const currentBlacklist = [...blacklist];
    const currentVaultFiles = overrideVaultFiles || [...vaultFiles];
    
    setInput("");
    setIsLoading(true);
    setCurrentSteps([]);
    setCurrentProgress(null);
    setCurrentSearches([]);
    setCurrentReviewing([]);
    setThinkingMessage("Working...");
    setWorkflowStepsMap(new Map()); // Reset workflow steps

    abortControllerRef.current = new AbortController();
    
    // Extract text content from files and store buffers for PDF viewing
    const filesData = await Promise.all(
      currentFiles.map(async (file) => {
        let textContent = '';
        const fileId = `uploaded-${Date.now()}-${file.name}`;
        let arrayBuffer: ArrayBuffer | null = null;
        
        try {
          if (file.type === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
            // For text files, read as text directly
            textContent = await file.text();
          } else if (file.type.includes('pdf') || file.name.toLowerCase().endsWith('.pdf')) {
            // For PDFs, use pdf.js to extract text and store buffer
            try {
              const pdfjsLib = await import('pdfjs-dist');
              
              // Configure PDF.js worker (required for pdf.js to work)
              if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
                pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
              }
              
              arrayBuffer = await file.arrayBuffer();
              const storedBuffer = arrayBuffer.slice(0);
              
              // Store file buffer for later PDF viewing
              setUploadedFileBuffers(prev => {
                const newMap = new Map(prev);
                newMap.set(fileId, { buffer: storedBuffer, name: file.name, type: file.type });
                return newMap;
              });
              
              const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
              const textParts: string[] = [];
              
              for (let i = 1; i <= Math.min(pdf.numPages, 10); i++) { // Limit to first 10 pages
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items
                  .map((item: any) => item.str)
                  .join(' ');
                textParts.push(pageText);
              }
              
              textContent = textParts.join('\n\n');
              console.log(`Extracted ${textParts.length} pages from PDF: ${file.name}`);
            } catch (pdfError) {
              console.warn('Failed to extract text from PDF:', file.name, pdfError);
              textContent = `[PDF file: ${file.name} - text extraction failed. Please upload to Vault for better processing.]`;
            }
          } else if (file.type.includes('word') || file.name.toLowerCase().endsWith('.docx') || file.name.toLowerCase().endsWith('.doc')) {
            // For Word docs, we can't easily parse on frontend
            textContent = `[Word document: ${file.name} - Please upload to Vault for processing or convert to PDF/TXT]`;
          } else {
            // Try to read as text for other file types
            try {
              textContent = await file.text();
            } catch {
              textContent = `[Binary file: ${file.name} - Unable to extract text content]`;
            }
          }
        } catch (error) {
          console.warn('Failed to extract text from file:', file.name, error);
          textContent = `[File: ${file.name} - content extraction failed]`;
        }
        
        // Store file metadata in ref for citation matching
        uploadedFilesMetadataRef.current.set(fileId, {
          name: file.name,
          type: file.type,
          fileId: fileId
        });
        
        return {
          name: file.name,
          type: file.type,
          size: file.size,
          textContent: textContent.substring(0, 100000), // Limit to 100KB of text
          fileId: file.type.includes('pdf') ? fileId : undefined // Store fileId for PDFs
        };
      })
    );
    
    console.log('Files processed:', {
      fileCount: filesData.length,
      fileNames: filesData.map(f => f.name),
      textLengths: filesData.map(f => f.textContent.length),
      hasTextContent: filesData.map(f => f.textContent.length > 0 && !f.textContent.startsWith('['))
    });
    
    // Simulate thinking progress messages
    const thinkingMessages = [
      "Working...",
      "Searching through legal databases...",
      "Reviewing relevant case law...",
      "Analyzing jurisdictional requirements...",
      "Synthesizing findings..."
    ];
    let messageIndex = 0;
    const thinkingInterval = setInterval(() => {
      messageIndex = (messageIndex + 1) % thinkingMessages.length;
      setThinkingMessage(thinkingMessages[messageIndex]);
    }, 3000);

    try {
      const CHAT_URL = `${apiClient.baseUrl}/api/ask/stream`;
      
      // Get auth token from localStorage
      const token = localStorage.getItem('auth_token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      // Build sourceConfig according to backend schema
      const sourceConfig: any = {
        includeDocument: filesData.length > 0,
        enableWebSearch: false,
      };

      // Add documentContext if files are uploaded
      if (filesData.length > 0) {
        try {
          const documentTexts = filesData
            .filter(f => f.textContent && f.textContent.length > 0 && !f.textContent.startsWith('['))
            .map(f => `=== File: ${f.name} ===\n${f.textContent}`);
          
          if (documentTexts.length > 0) {
            sourceConfig.documentContext = documentTexts.join('\n\n');
            sourceConfig.includeDocument = true;
            console.log('Document context prepared:', {
              fileCount: documentTexts.length,
              totalLength: sourceConfig.documentContext.length,
              preview: sourceConfig.documentContext.substring(0, 300)
            });
          } else {
            console.warn('No extractable text content from uploaded files');
            sourceConfig.includeDocument = false;
          }
        } catch (error) {
          console.warn('Failed to prepare document context:', error);
          sourceConfig.includeDocument = false;
        }
      }

      // Add vaultFileIds if provided (must be valid UUIDs)
      if (currentVaultFiles.length > 0) {
        // Filter to only valid UUIDs
        const validUuids = currentVaultFiles.filter(id => {
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          return uuidRegex.test(id);
        });
        if (validUuids.length > 0) {
          sourceConfig.vaultFileIds = validUuids;
        }
      }

      // Build request body
      const requestBody: any = {
        question: enhancedQuestion,
        sourceConfig,
      };

      // Add conversationHistory if there are previous messages
      if (messages.length > 0) {
        requestBody.conversationHistory = messages.map(m => ({
          role: m.role,
          content: m.content,
        }));
      }

      console.log('Sending request:', {
        question: currentInput,
        hasDocumentContext: !!sourceConfig.documentContext,
        documentContextLength: sourceConfig.documentContext?.length || 0,
        hasVaultFiles: !!sourceConfig.vaultFileIds && sourceConfig.vaultFileIds.length > 0,
        vaultFileCount: sourceConfig.vaultFileIds?.length || 0,
        conversationHistoryLength: requestBody.conversationHistory?.length || 0
      });

      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok || !response.body) {
        if (response.status === 429) {
          toast({
            title: "Rate limit exceeded",
            description: "Please try again in a moment.",
            variant: "destructive"
          });
        } else if (response.status === 402) {
          toast({
            title: "Credits required",
            description: "Please add credits to continue using the agent.",
            variant: "destructive"
          });
        }
        throw new Error('Failed to start stream');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = '';
      let streamDone = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') { streamDone = true; break; }

          try {
            const parsed = JSON.parse(jsonStr);
            
            // Handle different event types from backend
            if (parsed.type === 'citation' && parsed.source) {
              const citation: SourceCitation = parsed.source;
              citation.id = parsed.id;
              
              // If citation is for a document and we have uploaded files, try to match by name
              if (citation.type === 'document' && !citation.filePath) {
                // Try to match from uploadedFilesMetadataRef (current upload session)
                const citationTitle = (citation.title || '').toLowerCase();
                let matchedFileId: string | null = null;
                let matchedIsPDF = false;
                
                for (const [fileId, fileData] of uploadedFilesMetadataRef.current.entries()) {
                  const fileName = fileData.name.toLowerCase();
                  if (citationTitle.includes(fileName) || fileName.includes(citationTitle) ||
                      citationTitle === fileName || fileName === citationTitle) {
                    matchedFileId = fileId;
                    matchedIsPDF = fileData.type.includes('pdf');
                    break;
                  }
                }
                
                // Fallback: try to match from uploadedFileBuffers by name
                if (!matchedFileId) {
                  setUploadedFileBuffers(prev => {
                    for (const [fileId, fileData] of prev.entries()) {
                      const fileName = fileData.name.toLowerCase();
                      if (citationTitle.includes(fileName) || fileName.includes(citationTitle) ||
                          citationTitle === fileName || fileName === citationTitle) {
                        matchedFileId = fileId;
                        matchedIsPDF = fileData.type.includes('pdf');
                        break;
                      }
                    }
                    return prev; // Return unchanged map
                  });
                }
                
                if (matchedFileId) {
                  citation.fileId = matchedFileId;
                  citation.isPDF = matchedIsPDF;
                }
              }
              
              // Ensure fullContent is set for document citations without filePath
              if (citation.type === 'document' && !citation.fullContent && citation.snippet) {
                citation.fullContent = citation.snippet;
              }
              
              console.log('Citation event received:', {
                id: citation.id,
                type: citation.type,
                title: citation.title,
                hasFilePath: !!citation.filePath,
                hasFileId: !!citation.fileId,
                hasPageNumber: !!citation.pageNumber,
                hasParagraphIndex: !!citation.paragraphIndex,
                hasHighlightBox: !!citation.highlightBox,
                isPDF: citation.isPDF
              });
              // Store in both ref (for immediate access) and state (for UI updates)
              citationsRef.current.set(citation.id, citation);
              setCurrentCitations(prev => {
                const newMap = new Map(prev);
                newMap.set(citation.id, citation);
                console.log('Citation stored in currentCitations:', {
                  citationId: citation.id,
                  mapSize: newMap.size,
                  mapKeys: Array.from(newMap.keys()),
                  refSize: citationsRef.current.size,
                  refKeys: Array.from(citationsRef.current.keys()),
                  allCitations: Array.from(newMap.entries()).map(([id, cit]) => ({ key: id, citationId: cit.id, title: cit.title }))
                });
                return newMap;
              });
              continue;
            }
            
            // Handle content events (backend format: { type: 'content', text: string, done: boolean })
            if (parsed.type === 'content') {
              if (parsed.text) {
                fullContent += parsed.text;
                console.log('Content chunk received:', {
                  chunkLength: parsed.text.length,
                  totalLength: fullContent.length,
                  preview: parsed.text.substring(0, 100)
                });
              }
              
              // Parse and update progress in real-time
              const { 
                steps, 
                editableOutput,
                finalAnswer,
                progressSteps, 
                searchQueries, 
                reviewingSources 
              } = parseStreamContent(fullContent, true);
              
              setCurrentSteps(steps);
              if (progressSteps.length > 0) {
                setCurrentProgress(progressSteps[progressSteps.length - 1]);
              }
              setCurrentSearches(searchQueries);
              setCurrentReviewing(reviewingSources);
              
              // If done, break
              if (parsed.done) {
                streamDone = true;
                break;
              }
              continue;
            }
            
            // Handle workflow_step events
            if (parsed.type === 'workflow_step') {
              console.log('Workflow step:', parsed);
              const stepNum = parsed.step;
              const stepName = parsed.name || `Step ${stepNum}`;
              const stepStatus = parsed.status === 'started' ? 'working' : parsed.status === 'completed' ? 'complete' : 'pending';
              
              setWorkflowStepsMap(prev => {
                const newMap = new Map(prev);
                newMap.set(stepNum, {
                  id: `workflow-step-${stepNum}`,
                  title: stepName,
                  status: stepStatus,
                });
                return newMap;
              });
              continue;
            }
            
            // Handle thinking events
            if (parsed.type === 'thinking') {
              console.log('Thinking:', parsed.content);
              continue;
            }
            
            // Handle done event
            if (parsed.type === 'done') {
              streamDone = true;
              break;
            }
            
            // Handle error events
            if (parsed.type === 'error') {
              console.error('Stream error:', parsed.message);
              toast({
                title: "Error",
                description: parsed.message || "An error occurred",
                variant: "destructive"
              });
              break;
            }
            
            // Fallback: try OpenAI format (for compatibility)
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              fullContent += content;
              const { 
                steps, 
                editableOutput,
                finalAnswer,
                progressSteps, 
                searchQueries, 
                reviewingSources 
              } = parseStreamContent(fullContent, true);
              
              setCurrentSteps(steps);
              if (progressSteps.length > 0) {
                setCurrentProgress(progressSteps[progressSteps.length - 1]);
              }
              setCurrentSearches(searchQueries);
              setCurrentReviewing(reviewingSources);
            }
          } catch (error) {
            console.warn('Failed to parse SSE event:', jsonStr, error);
            buffer = line + '\n' + buffer;
            break;
          }
        }
      if (streamDone) break;
      }

      // Final flush in case remaining buffered lines arrived without trailing newline
      if (buffer.trim()) {
        for (let raw of buffer.split('\n')) {
          if (!raw) continue;
          if (raw.endsWith('\r')) raw = raw.slice(0, -1);
          if (raw.startsWith(':') || raw.trim() === '') continue;
          if (!raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            // Handle backend format
            if (parsed.type === 'content' && parsed.text) {
              fullContent += parsed.text;
            }
            // Fallback to OpenAI format
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) fullContent += content;
          } catch { /* ignore partial leftovers */ }
        }
      }
      
      console.log('Stream completed. Full content length:', fullContent.length);
      console.log('Full content preview:', fullContent.substring(0, 1000));

      // Finalize message
      const { 
        steps, 
        editableOutput,
        finalAnswer,
        progressSteps, 
        searchQueries, 
        reviewingSources, 
        finished, 
        sourceCount 
      } = parseStreamContent(fullContent);
      
      console.log('Final parsed data:', {
        stepsCount: steps.length,
        hasFinalAnswer: !!finalAnswer,
        finalAnswerLength: finalAnswer?.length,
        hasEditableOutput: !!editableOutput,
        finished,
        sourceCount,
        fullContentLength: fullContent.length,
        fullContentPreview: fullContent.substring(0, 500),
        citationsCount: currentCitations.size
      });
      
      // Create a proper copy of citations for this message
      // Use ref instead of state since state updates are async and might not be current
      const messageCitations = new Map<number, SourceCitation>();
      for (const [id, citation] of citationsRef.current.entries()) {
        messageCitations.set(id, { ...citation }); // Shallow copy of citation object
      }
      
      console.log('Saving message with citations:', {
        currentCitationsSize: currentCitations.size,
        citationsRefSize: citationsRef.current.size,
        messageCitationsSize: messageCitations.size,
        currentCitationsKeys: Array.from(currentCitations.keys()),
        citationsRefKeys: Array.from(citationsRef.current.keys()),
        messageCitationsKeys: Array.from(messageCitations.keys())
      });
      
      // Clear the ref for next message
      citationsRef.current.clear();
      
      // Convert workflow steps map to array
      const draftingStepsArray = Array.from(workflowStepsMap.values()).sort((a, b) => {
        const aNum = parseInt(a.id.replace('workflow-step-', ''));
        const bNum = parseInt(b.id.replace('workflow-step-', ''));
        return aNum - bNum;
      });
      
      const assistantMessage: Message = {
        role: 'assistant',
        content: fullContent,
        steps,
        draftingSteps: draftingStepsArray.length > 0 ? draftingStepsArray : undefined,
        editableOutput: editableOutput || undefined,
        finalAnswer: finalAnswer || undefined,
        progressSteps,
        searchQueries,
        reviewingSources,
        finished,
        sourceCount,
        citations: messageCitations,
        createdAt: new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMessage]);
      setCurrentSteps([]);
      setCurrentProgress(null);
      setCurrentSearches([]);
      setCurrentReviewing([]);
      setCurrentCitations(new Map());
      citationsRef.current.clear(); // Also clear ref (redundant but safe)
      setUploadedFiles([]);
      setUploadedFileBuffers(new Map()); // Clear file buffers
      clearInterval(thinkingInterval);
      
      // Open sources sidebar if we have citations
      if (messageCitations.size > 0) {
        setSourcesSidebarOpen(true);
      }
      
      // Generate follow-ups based on the response
      if (finalAnswer || fullContent) {
        const responseText = finalAnswer || fullContent;
        // Generate follow-up suggestions based on the response content
        const generatedFollowUps: string[] = [];
        
        // Simple heuristic-based follow-ups
        if (responseText.toLowerCase().includes('legal') || responseText.toLowerCase().includes('case')) {
          generatedFollowUps.push("Can you provide more details about the legal implications?");
          generatedFollowUps.push("What are the key precedents mentioned?");
        }
        if (responseText.toLowerCase().includes('analysis') || responseText.toLowerCase().includes('analyze')) {
          generatedFollowUps.push("Can you expand on the analysis methodology?");
          generatedFollowUps.push("What are the main conclusions?");
        }
        if (responseText.toLowerCase().includes('summary') || responseText.toLowerCase().includes('summarize')) {
          generatedFollowUps.push("Can you provide more specific examples?");
          generatedFollowUps.push("What are the key takeaways?");
        }
        
        // Always add some generic follow-ups
        if (generatedFollowUps.length === 0) {
          generatedFollowUps.push("Can you provide more details on this topic?");
          generatedFollowUps.push("What are the key implications?");
          generatedFollowUps.push("Can you expand on this further?");
        }
        
        setFollowUps(generatedFollowUps.slice(0, 4)); // Limit to 4 follow-ups
      }

    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Error:', error);
        toast({
          title: "Error",
          description: "Failed to get response. Please try again.",
          variant: "destructive"
        });
      }
      clearInterval(thinkingInterval);
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [input, isLoading, uploadedFiles, vaultFiles, whitelist, blacklist, messages, setUploadedFileBuffers]);

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
      setCurrentSteps([]);
      setCurrentProgress(null);
      setCurrentSearches([]);
      setCurrentReviewing([]);
      setThinkingMessage("Working...");
    }
  };

  // Open save prompt dialog
  const openSavePromptDialog = (content: string) => {
    setPromptToSave(content);
    // Auto-generate a name based on content
    const autoName = content.length > 50 
      ? content.substring(0, 50).trim() + "..." 
      : content.trim();
    setPromptName(autoName);
    setPromptDescription("");
    setPromptCategory("custom");
    setSavePromptDialogOpen(true);
  };

  // Save prompt to library
  const handleSavePrompt = async () => {
    if (!promptName.trim() || !promptToSave.trim()) {
      toast({
        title: "Error",
        description: "Prompt name and content are required",
        variant: "destructive",
      });
      return;
    }

    setSavingPrompt(true);
    try {
      await promptsApi.createPrompt({
        name: promptName.trim(),
        description: promptDescription.trim() || undefined,
        content: promptToSave.trim(),
        category: promptCategory,
      });
      toast({
        title: "Prompt saved!",
        description: "You can find it in your Prompt Library",
      });
      setSavePromptDialogOpen(false);
      setPromptToSave("");
      setPromptName("");
      setPromptDescription("");
    } catch (error) {
      console.error("Failed to save prompt:", error);
      toast({
        title: "Error",
        description: "Failed to save prompt",
        variant: "destructive",
      });
    } finally {
      setSavingPrompt(false);
    }
  };

  // Render content with citation pills
  // Helper to render markdown text with bold support
  const renderMarkdownText = (text: string): React.ReactNode => {
    const parts: (string | JSX.Element)[] = [];
    const boldRegex = /\*\*(.+?)\*\*/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let keyCounter = 0;

    while ((match = boldRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }
      parts.push(<strong key={`bold-${keyCounter++}`}>{match[1]}</strong>);
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return parts.length > 0 ? <>{parts}</> : <>{text}</>;
  };

  // Helper to render markdown table
  const renderMarkdownTable = (tableContent: string): React.ReactNode => {
    const lines = tableContent.trim().split('\n').map(line => line.trim()).filter(line => line.length > 0);
    if (lines.length < 2) {
      // Fallback: if it doesn't look like a table, render as preformatted text
      return <pre className="text-sm whitespace-pre-wrap bg-muted/30 p-2 rounded my-2">{tableContent}</pre>;
    }

    // Find separator line (contains dashes and colons)
    let separatorIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (/^[\|\s\-:]+$/.test(lines[i])) {
        separatorIndex = i;
        break;
      }
    }

    if (separatorIndex === -1 || separatorIndex === 0) {
      // No valid separator found
      return <pre className="text-sm whitespace-pre-wrap bg-muted/30 p-2 rounded my-2">{tableContent}</pre>;
    }

    const headerLine = lines[0];
    const dataLines = lines.slice(separatorIndex + 1);

    const parseRow = (line: string): string[] => {
      // Remove leading/trailing pipes, then split
      const cleaned = line.replace(/^\||\|$/g, '').trim();
      if (!cleaned) return [];
      
      return cleaned
        .split('|')
        .map(cell => cell.trim());
    };

    const headers = parseRow(headerLine);
    if (headers.length === 0) {
      return <pre className="text-sm whitespace-pre-wrap bg-muted/30 p-2 rounded my-2">{tableContent}</pre>;
    }

    const rows = dataLines.map(parseRow).filter(row => row.length > 0);

    return (
      <div className="overflow-x-auto my-4">
        <table className="min-w-full border-collapse border border-border text-sm">
          <thead>
            <tr className="bg-muted/50">
              {headers.map((header, idx) => (
                <th key={idx} className="border border-border px-3 py-2 text-left font-semibold">
                  {renderMarkdownText(header)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIdx) => (
              <tr key={rowIdx} className="hover:bg-muted/30">
                {headers.map((_, colIdx) => (
                  <td key={colIdx} className="border border-border px-3 py-2">
                    {renderMarkdownText(row[colIdx] || '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderContentWithCitations = (content: string, citations?: Map<number, SourceCitation>) => {
    // First, extract markdown tables - improved regex to handle various formats
    // Match: header row | separator row | data rows
    // Pattern: | col1 | col2 |\n|------|------|\n| val1 | val2 |
    // More flexible: handles citations in cells, optional spaces
    const tableRegex = /(\|[^\n\|]*\|(?:\s*\n\|[\s\-:]+\|(?:\s*\n\|[^\n\|]*\|)+))/g;
    const parts: Array<{ type: 'text' | 'table'; content: string }> = [];
    let lastIndex = 0;
    let match;

    // Find all tables - try multiple patterns
    const tableMatches: Array<{ start: number; end: number; content: string }> = [];
    
    // Use line-by-line parsing for more reliable table detection
    const lines = content.split('\n');
    let tableStart = -1;
    let tableLines: string[] = [];
    let currentPos = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      
      // Check if line looks like a table row (starts and ends with |)
      const isTableRow = trimmedLine.startsWith('|') && trimmedLine.endsWith('|') && trimmedLine.length > 2;
      
      // Check if line is a separator (contains dashes/colons between pipes)
      const isSeparator = /^\|\s*[-:]+\s*\|/.test(trimmedLine);
      
      if (isTableRow && !isSeparator) {
        // Start or continue a table
        if (tableStart === -1) {
          tableStart = currentPos;
          tableLines = [line];
        } else {
          tableLines.push(line);
        }
      } else if (isSeparator && tableStart !== -1) {
        // This is the separator row - continue collecting
        tableLines.push(line);
      } else {
        // Not a table row - finalize any table we were collecting
        if (tableStart !== -1 && tableLines.length >= 2) {
          // We have a complete table (at least header + separator)
          const tableContent = tableLines.join('\n');
          tableMatches.push({
            start: tableStart,
            end: tableStart + tableContent.length,
            content: tableContent,
          });
        }
        tableStart = -1;
        tableLines = [];
      }
      
      // Track position in original content
      currentPos += line.length + 1; // +1 for newline
    }
    
    // Handle table at end of content
    if (tableStart !== -1 && tableLines.length >= 2) {
      const tableContent = tableLines.join('\n');
      tableMatches.push({
        start: tableStart,
        end: tableStart + tableContent.length,
        content: tableContent,
      });
    }
    
    // Sort by start position
    tableMatches.sort((a, b) => a.start - b.start);

    // Split content by tables
    if (tableMatches.length === 0) {
      parts.push({ type: 'text', content });
    } else {
      tableMatches.forEach((tableMatch) => {
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

    // Render each part (text or table) with citation support
    return (
      <>
        {parts.map((part, partIdx) => {
          if (part.type === 'table') {
            return <div key={`table-${partIdx}`}>{renderMarkdownTable(part.content)}</div>;
          } else {
            // Render text with citations
            return (
              <span key={`text-${partIdx}`}>
                {renderTextWithCitations(part.content, citations)}
              </span>
            );
          }
        })}
      </>
    );
  };

  const renderTextWithCitations = (content: string, citations?: Map<number, SourceCitation>) => {
    if (!citations || citations.size === 0) {
      // If no citations exist, render content with markdown
      return renderMarkdownText(content);
    }

    const parts: (string | JSX.Element)[] = [];
    const citationPattern = /\[(\d+)\]/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let keyCounter = 0;

    while ((match = citationPattern.exec(content)) !== null) {
      // Add text before citation (with markdown support)
      if (match.index > lastIndex) {
        const textBefore = content.slice(lastIndex, match.index);
        parts.push(<span key={`text-${keyCounter++}`}>{renderMarkdownText(textBefore)}</span>);
      }

      // Only render citation pill if citation data exists
      const citationId = parseInt(match[1], 10);
      const citation = citations?.get(citationId);
      
      if (citation) {
        // Citation exists, render pill with hover preview - make it clickable like vault references
        parts.push(
          <CitationPreview
            key={`citation-preview-${citationId}-${keyCounter++}`}
            citation={citation}
            onOpenFullView={(cit) => {
              setSelectedCitation(cit);
              setDrawerOpen(true);
            }}
          >
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Citation button clicked:', citationId);
                handleCitationClick(citationId, citations);
              }}
              className="not-prose inline-flex items-center justify-center px-1.5 py-0 h-5 min-w-[1.5rem] ml-1.5 rounded-md bg-slate-900 text-white text-xs font-semibold cursor-pointer select-none shadow-sm hover:shadow-md transition-all duration-150 hover:-translate-y-0.5 hover:bg-slate-800 active:bg-slate-700 relative z-10 border-0 outline-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
              aria-label={`Citation ${citationId} - Click to view source`}
              title="Click to view source"
            >
              [{citationId}]
            </button>
          </CitationPreview>
        );
      } else {
        // Citation doesn't exist, render as plain text
        parts.push(`[${citationId}]`);
      }

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text (with markdown support)
    if (lastIndex < content.length) {
      const remainingText = content.slice(lastIndex);
      parts.push(<span key={`text-${keyCounter++}`}>{renderMarkdownText(remainingText)}</span>);
    }

    return parts.length > 0 ? <>{parts}</> : <>{content}</>;
  };

  const handleCitationClick = (citationId: number, citations?: Map<number, SourceCitation>) => {
    // Try message citations first, then currentCitations as fallback
    const citation = citations?.get(citationId) || currentCitations.get(citationId);
    if (citation) {
      console.log('Opening citation drawer:', {
        id: citation.id,
        type: citation.type,
        title: citation.title,
        hasFilePath: !!citation.filePath,
        hasFileId: !!citation.fileId,
        hasFullContent: !!citation.fullContent,
        hasPageNumber: !!citation.pageNumber,
        hasParagraphIndex: !!citation.paragraphIndex,
        hasHighlightBox: !!citation.highlightBox,
        isPDF: citation.isPDF
      });
      setSelectedCitation(citation);
      setDrawerOpen(true);
    } else {
      console.warn('Citation not found:', citationId, {
        messageCitationsSize: citations?.size || 0,
        currentCitationsSize: currentCitations.size,
        availableIds: Array.from(citations?.keys() || []).concat(Array.from(currentCitations.keys()))
      });
    }
  };

  // Extract sources from completed messages' citations (only after output is generated)
  const sources = useMemo(() => {
    const sourceMap = new Map<string, { name: string; type: "document" | "vault" | "web" | "playbook"; pageCount?: number; citedPages?: number[]; citationIds?: number[] }>();
    
    // Only extract sources from assistant messages that have citations
    messages.forEach((message) => {
      if (message.role === 'assistant' && message.citations && message.citations.size > 0) {
        message.citations.forEach((citation) => {
          let sourceId: string;
          let sourceName: string;
          
          if (citation.type === "document" || citation.type === "vault") {
            // Use fileId or filePath as source ID
            sourceId = citation.fileId || citation.filePath || citation.title || `source-${citation.id}`;
            sourceName = citation.title || citation.filePath?.split(/[/\\]/).pop() || `Source ${citation.id}`;
          } else if (citation.type === "web") {
            sourceId = citation.url || citation.title || `web-${citation.id}`;
            sourceName = citation.title || citation.url || `Web Source ${citation.id}`;
          } else {
            return; // Skip unknown types
          }
          
          if (!sourceMap.has(sourceId)) {
            sourceMap.set(sourceId, {
              name: sourceName,
              type: citation.type === "vault" ? "vault" : citation.type === "web" ? "web" : "document",
              pageCount: citation.isPDF ? 50 : undefined,
              citedPages: citation.pageNumber ? [citation.pageNumber] : [],
              citationIds: [citation.id]
            });
          } else {
            // Update existing source
            const existing = sourceMap.get(sourceId)!;
            if (citation.pageNumber && !existing.citedPages?.includes(citation.pageNumber)) {
              existing.citedPages = [...(existing.citedPages || []), citation.pageNumber];
            }
            if (!existing.citationIds?.includes(citation.id)) {
              existing.citationIds = [...(existing.citationIds || []), citation.id];
            }
          }
        });
      }
    });
    
    return Array.from(sourceMap.entries()).map(([id, data]) => ({
      id,
      ...data
    }));
  }, [messages]);
  
  // Check if we have any assistant messages with citations
  const hasSources = useMemo(() => {
    return messages.some(msg => msg.role === 'assistant' && msg.citations && msg.citations.size > 0);
  }, [messages]);

  return (
    <div className="flex flex-col h-full relative">
      <div className="flex flex-1 overflow-hidden">
        <ScrollArea className="flex-1 px-6 py-4" ref={scrollRef}>
          <div className="max-w-4xl mx-auto space-y-6">
          {messages.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg">Ask Associate anything. I'll provide deep research with sources and editable outputs.</p>
            </div>
          )}

          {messages.map((message, idx) => (
            <div key={idx} className="space-y-4">
              {message.role === 'user' ? (
                <Card className="p-4 bg-secondary group relative">
                  <p className="text-foreground pr-8">{message.content}</p>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => openSavePromptDialog(message.content)}
                        >
                          <Bookmark className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Save as Prompt</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Card>
              ) : (
                <div className="space-y-4">
                  {message.progressSteps && message.progressSteps.map((progress, idx) => (
                    <ProgressStep 
                      key={idx}
                      status={progress.status}
                      timeRemaining={progress.timeRemaining}
                      description={progress.description}
                    />
                  ))}

                  {message.searchQueries && message.searchQueries.map((queries, idx) => (
                    <SearchStep key={`search-${idx}`} queries={queries} />
                  ))}

                  {message.reviewingSources && message.reviewingSources.map((reviewing, idx) => (
                    <ReviewingStep 
                      key={`review-${idx}`}
                      sources={reviewing.sources}
                      count={reviewing.count}
                    />
                  ))}

                  {/* Drafting Steps Indicator - Use draftingSteps if available, otherwise convert steps */}
                  {(message.draftingSteps && message.draftingSteps.length > 0) || (message.steps && message.steps.length > 0) ? (
                    <DraftingStepsIndicator
                      steps={message.draftingSteps || message.steps!.map((step, stepIdx) => ({
                        id: `step-${step.step || stepIdx}`,
                        title: step.title || `Step ${step.step || stepIdx + 1}`,
                        description: step.content,
                        status: step.status === 'thinking' ? 'working' : 'complete',
                      }))}
                    />
                  ) : null}
                  
                  {/* Always show content - prioritize structured output, fallback to raw */}
                  {message.steps && message.steps.length > 0 && message.steps.map((step) => (
                    <ResearchStep key={step.step} step={step} />
                  ))}
                  
                  {(message.finalAnswer || (message.content && message.content.trim().length > 0)) && (
                    <>
                      <Card className="p-6 bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/30 shadow-lg">
                        <div className="space-y-4">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                            <h3 className="text-lg font-bold text-primary">Summary & Findings</h3>
                          </div>
                          <div className="prose prose-sm max-w-none" style={{ pointerEvents: 'auto' }}>
                            <div className="text-foreground leading-relaxed text-base" style={{ pointerEvents: 'auto' }}>
                              {renderContentWithCitations(
                                message.finalAnswer || message.content, 
                                message.citations || currentCitations
                              )}
                            </div>
                          </div>
                        </div>
                      </Card>
                      
                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 px-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const text = message.finalAnswer || message.content;
                            navigator.clipboard.writeText(text);
                            toast({ title: "Copied to clipboard" });
                          }}
                          className="h-8 text-sm"
                        >
                          <Copy className="h-3.5 w-3.5 mr-1.5" />
                          Copy
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const text = message.finalAnswer || message.content;
                            const blob = new Blob([text], { type: 'text/plain' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = 'think-ai-response.txt';
                            a.click();
                            URL.revokeObjectURL(url);
                            toast({ title: "Exported successfully" });
                          }}
                          className="h-8 text-sm"
                        >
                          <Download className="h-3.5 w-3.5 mr-1.5" />
                          Export
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setInput((message.finalAnswer || message.content).substring(0, 200) + "...");
                            toast({ title: "Query updated, click send to rewrite" });
                          }}
                          className="h-8 text-sm"
                        >
                          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                          Rewrite
                        </Button>
                        {message.editableOutput && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditorContent(message.editableOutput || "");
                              setEditorDocumentId(`doc-${idx}-${Date.now()}`);
                              setCurrentVersionId(undefined);
                              setEditorOpen(true);
                            }}
                            className="h-8 text-sm"
                          >
                            <FileEdit className="h-3.5 w-3.5 mr-1.5" />
                            Open in editor
                          </Button>
                        )}
                      </div>
                      
                      {/* Follow-ups */}
                      {followUps.length > 0 && (
                        <FollowUps
                          suggestions={followUps}
                          onSelect={(suggestion) => {
                            setInput(suggestion);
                            // Auto-send after a short delay
                            setTimeout(() => {
                              sendMessage();
                            }, 100);
                          }}
                        />
                      )}
                    </>
                  )}

                  {message.editableOutput && (
                    <div className="space-y-3">
                      {/* Show Drafting Steps if available, otherwise show a simple indicator */}
                      {message.draftingSteps && message.draftingSteps.length > 0 ? (
                        <DraftingStepsIndicator steps={message.draftingSteps} />
                      ) : message.steps && message.steps.length > 0 ? (
                        <DraftingStepsIndicator
                          steps={message.steps.map((step, stepIdx) => ({
                            id: `step-${step.step || stepIdx}`,
                            title: step.title || `Step ${step.step || stepIdx + 1}`,
                            description: step.content,
                            status: step.status === 'thinking' ? 'working' : 'complete',
                          }))}
                        />
                      ) : null}
                      
                      {/* Draft Version Card */}
                      <DraftVersionCard
                        versionNumber={1}
                        timestamp={message.createdAt || new Date().toISOString()}
                        preview={message.editableOutput}
                        onClick={() => {
                          setEditorContent(message.editableOutput || "");
                          setEditorOriginalContent(message.editableOutput || "");
                          setEditorDocumentId(`doc-${idx}-${Date.now()}`);
                          setCurrentVersionId(undefined);
                          setEditorOpen(true);
                        }}
                      />
                      <EditableOutput initialContent={message.editableOutput} />
                    </div>
                  )}

                  {message.reviewData && (
                    <ReviewOutput 
                      suggestions={message.reviewData.suggestions}
                      redlines={message.reviewData.redlines}
                      documentContent={message.reviewData.documentContent}
                    />
                  )}

                  {message.finished && message.sourceCount !== undefined && (
                    <FinishedIndicator sourceCount={message.sourceCount} />
                  )}

                  {/* Fallback: Always show raw content if structured output is missing */}
                  {(!message.steps || message.steps.length === 0) && 
                   !message.finalAnswer && 
                   !message.editableOutput && 
                   message.content && (
                    <Card className="p-6 bg-card">
                      <div className="space-y-2">
                        <div className="text-sm font-medium text-muted-foreground">Response</div>
                        <div className="prose prose-sm max-w-none" style={{ pointerEvents: 'auto' }}>
                          <p className="text-foreground whitespace-pre-wrap leading-relaxed" style={{ pointerEvents: 'auto' }}>
                            {renderContentWithCitations(message.content, message.citations)}
                          </p>
                        </div>
                      </div>
                    </Card>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Show thinking indicator and current progress */}
          {isLoading && (
            <>
              {/* Show DraftingStepsIndicator if workflow steps are available */}
              {workflowStepsMap.size > 0 && (
                <DraftingStepsIndicator
                  steps={Array.from(workflowStepsMap.values()).sort((a, b) => {
                    const aNum = parseInt(a.id.replace('workflow-step-', ''));
                    const bNum = parseInt(b.id.replace('workflow-step-', ''));
                    return aNum - bNum;
                  })}
                />
              )}
              
              {!currentProgress && currentSteps.length === 0 && currentSearches.length === 0 && workflowStepsMap.size === 0 && (
                <ThinkingIndicator message={thinkingMessage} steps={workingSteps} />
              )}
              
              {currentProgress && (
                <ProgressStep 
                  status={currentProgress.status}
                  timeRemaining={currentProgress.timeRemaining}
                  description={currentProgress.description}
                />
              )}

              {currentSearches.map((queries, idx) => (
                <SearchStep key={`current-search-${idx}`} queries={queries} />
              ))}

              {currentReviewing.map((reviewing, idx) => (
                <ReviewingStep 
                  key={`current-review-${idx}`}
                  sources={reviewing.sources}
                  count={reviewing.count}
                />
              ))}

              {currentSteps.map((step) => (
                <ResearchStep key={step.step} step={step} />
              ))}
            </>
          )}
          </div>
        </ScrollArea>
        
        {/* Sources Sidebar - Only show after output is generated */}
        {hasSources && sources.length > 0 && (
          <div className="w-64 border-l border-border flex-shrink-0">
            <SourcesSidebar
              sources={sources}
              citations={(() => {
                // Collect all citations from assistant messages
                const allCitations = new Map<number, SourceCitation>();
                messages.forEach(msg => {
                  if (msg.role === 'assistant' && msg.citations) {
                    msg.citations.forEach((cit, id) => {
                      allCitations.set(id, cit);
                    });
                  }
                });
                return allCitations;
              })()}
              onPageClick={(sourceId, pageNumber) => {
                // Find citation from messages that matches this source and page
                let foundCitation: SourceCitation | null = null;
                for (const message of messages) {
                  if (message.role === 'assistant' && message.citations) {
                    for (const citation of message.citations.values()) {
                      const citationSourceId = citation.fileId || citation.filePath || citation.url || citation.title;
                      const matchesSource = citationSourceId === sourceId || citation.fileId === sourceId || citation.filePath === sourceId;
                      const matchesPage = !pageNumber || citation.pageNumber === pageNumber || !citation.pageNumber;
                      
                      if (matchesSource && matchesPage) {
                        foundCitation = citation;
                        // If we have a specific page number, prefer citations with that page
                        if (pageNumber && citation.pageNumber === pageNumber) {
                          break;
                        }
                      }
                    }
                    if (foundCitation && (!pageNumber || foundCitation.pageNumber === pageNumber)) break;
                  }
                }
                if (foundCitation) {
                  // Update page number if provided and different
                  const citationToShow = pageNumber && foundCitation.pageNumber !== pageNumber
                    ? { ...foundCitation, pageNumber }
                    : foundCitation;
                  setSelectedCitation(citationToShow);
                  setDrawerOpen(true);
                }
              }}
              onClose={() => setSourcesSidebarOpen(false)}
            />
          </div>
        )}
      </div>

      {/* Input Area - Matching Harvey Design */}
      <div className="border-t border-border bg-background">
        <div className="max-w-4xl mx-auto p-4">
          <div className="bg-muted/30 rounded-2xl border border-border/50 shadow-sm">
            {/* Textarea */}
            <div className="p-6 pb-0">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (!isLoading && input.trim()) {
                      sendMessage();
                    }
                  }
                }}
                placeholder="Ask Think AI a question..."
                className="min-h-[120px] resize-none border-0 bg-transparent text-base focus-visible:ring-0 focus-visible:ring-offset-0 p-0"
                disabled={isLoading}
              />
            </div>

            {/* Toolbar */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-border/50">
              {/* Left Side - Icons and Dropdown */}
              <div className="flex items-center gap-4">
                {/* Files and sources - Paperclip icon */}
                <label className="cursor-pointer">
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const files = e.target.files;
                      if (files) {
                        setUploadedFiles(prev => [...prev, ...Array.from(files)]);
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
                    title="Upload files"
                  >
                    <Paperclip className="h-4 w-4" />
                  </button>
                </label>
                
                {/* Settings/Integrate - Link icon */}
                <button 
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
                  title="Settings/Integrate"
                >
                  <Link2 className="h-4 w-4" />
                </button>
                
                {/* Improve - Sparkles icon */}
                <button
                  onClick={() => {
                    // TODO: Implement improve functionality
                  }}
                  disabled={!input.trim() || isLoading}
                  className={cn(
                    "text-sm transition-colors flex items-center gap-1.5",
                    !input.trim() || isLoading
                      ? "text-muted-foreground/40 cursor-not-allowed"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  title="Improve query"
                >
                  <Sparkles className="h-4 w-4" />
                </button>
                
                {/* Chat dropdown */}
                <button 
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
                  title="Chat options"
                >
                  <span>Chat</span>
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Right Side - Mode Buttons and Submit */}
              <div className="flex items-center gap-2">
                {/* Mode Selection Buttons */}
                <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
                  <button
                    onClick={() => setInputMode("auto")}
                    className={cn(
                      "px-3 py-1.5 text-sm rounded-md transition-colors",
                      inputMode === "auto"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Auto
                  </button>
                  <button
                    onClick={() => setInputMode("edit")}
                    className={cn(
                      "px-3 py-1.5 text-sm rounded-md transition-colors",
                      inputMode === "edit"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setInputMode("answer")}
                    className={cn(
                      "px-3 py-1.5 text-sm rounded-md transition-colors",
                      inputMode === "answer"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Answer
                  </button>
                </div>
                
                {/* Submit Button */}
                {isLoading ? (
                  <Button 
                    onClick={stopGeneration} 
                    variant="destructive" 
                    size="icon"
                    className="h-9 w-9"
                  >
                    <StopCircle className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button 
                    onClick={sendMessage} 
                    disabled={!input.trim()} 
                    size="icon"
                    className="h-9 w-9 bg-foreground text-background hover:bg-foreground/90"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Document Editor Panel */}
      {editorOpen && editorDocumentId && (
        <div className="absolute inset-0 z-50 bg-background flex flex-col">
          <DocumentEditorPanel
            documentId={editorDocumentId}
            content={editorContent}
            originalContent={editorOriginalContent}
            onContentChange={(newContent) => {
              setEditorContent(newContent);
            }}
            onClose={() => {
              setEditorOpen(false);
              setEditorDocumentId(null);
              setEditorOriginalContent("");
            }}
            sources={sources}
            onPageClick={(sourceId, pageNumber) => {
              const citation = Array.from(currentCitations.values()).find(c => 
                c.fileId === sourceId || c.url === sourceId
              );
              if (citation) {
                setSelectedCitation(citation);
                setDrawerOpen(true);
              }
            }}
            showEdits={showEdits}
            onShowEditsToggle={setShowEdits}
            currentVersionId={currentVersionId}
            onVersionSelect={(versionId, isSubVersion) => {
              setCurrentVersionId(versionId);
              // TODO: Load version content from API
            }}
          />
          {/* Draft Actions Bar */}
          <div className="border-t border-border bg-muted/30 p-4">
            <DraftActionsBar
              documentContent={editorContent.replace(/<[^>]*>/g, "")}
              documentId={editorDocumentId}
            />
          </div>
        </div>
      )}

      {/* Source Drawer */}
      <SourceDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        citation={selectedCitation}
        uploadedFileBuffers={uploadedFileBuffers}
      />

      {/* Save Prompt Dialog */}
      <Dialog open={savePromptDialogOpen} onOpenChange={setSavePromptDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Save to Prompt Library</DialogTitle>
            <DialogDescription>
              Save this prompt for quick access later
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="promptName">Name</Label>
              <Input
                id="promptName"
                value={promptName}
                onChange={(e) => setPromptName(e.target.value)}
                placeholder="e.g., Contract Summary Request"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="promptDescription">Description (optional)</Label>
              <Input
                id="promptDescription"
                value={promptDescription}
                onChange={(e) => setPromptDescription(e.target.value)}
                placeholder="Brief description of what this prompt does"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="promptCategory">Category</Label>
              <Select value={promptCategory} onValueChange={(value) => setPromptCategory(value as Prompt['category'])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="assist">Assist</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                  <SelectItem value="research">Research</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Prompt Content</Label>
              <div className="p-3 bg-muted rounded-md text-sm font-mono max-h-[150px] overflow-auto">
                {promptToSave}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSavePromptDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePrompt} disabled={savingPrompt}>
              {savingPrompt && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Prompt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
