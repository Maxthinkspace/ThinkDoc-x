export interface ChatSession {
  id: string;
  userId: string;
  title: string | null;
  sourceConfig: Record<string, unknown> | null;
  shareToken: string | null;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  citations: Array<Record<string, unknown>> | null;
  followUpQuestions?: string[];
  createdAt: string;
}

export interface ChatSessionWithMessages extends ChatSession {
  messages: ChatMessage[];
}

