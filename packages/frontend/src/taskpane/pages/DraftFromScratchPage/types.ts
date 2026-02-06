import type { GeneralSourceConfig } from "../../../types/panelTypes";

export type { GeneralSourceConfig };

export type DraftType = 'clause' | 'document';

export type ViewState = 'config' | 'loading' | 'results';

export interface DraftConfig {
  draftType: DraftType;
  sourceConfig: GeneralSourceConfig;
  context: string;
  selectedPrompts: string[]; // Array of prompt IDs that were selected
}

export interface SkeletonSection {
  id: string;
  sectionNumber: string;
  title: string;
  description: string; // Brief description of what this section will contain
  estimatedLength: 'short' | 'medium' | 'long';
  included: boolean; // User can toggle sections on/off
  children?: SkeletonSection[];
}

export interface DraftedContent {
  sectionId: string;
  sectionNumber: string;
  title: string;
  content: string;
  children?: DraftedContent[];
}

export interface DraftingSectionChange {
  status: 'amended' | 'not-amended' | 'new-section' | 'not-found';
  original_language: string;
  amended_language?: string;
  section_number: string;
  isFullDeletion?: boolean;
}

export interface DraftingResults {
  [instructionId: string]: DraftingSectionChange[];
}

export interface DraftingRun {
  instructions: string;
  results: DraftingResults;
}

export interface ConversationHistoryEntry {
  instructions: string;
  amendedSections: Array<{
    sectionNumber: string;
    status: 'amended' | 'not-amended' | 'new-section' | 'not-found';
  }>;
}

export interface DraftFromScratchState {
  view: ViewState;
  config: DraftConfig;
  draftingResults: DraftingResults | null;
  isLoading: boolean;
  progress: { current: number; total: number; message: string };
}

export interface PromptSuggestion {
  id: string;
  label: string;
  prompt: string;
  category: 'documentType' | 'style' | 'perspective' | 'jurisdiction';
}
