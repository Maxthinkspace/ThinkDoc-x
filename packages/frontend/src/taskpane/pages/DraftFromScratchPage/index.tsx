import * as React from "react";
import { useNavigation } from "../../hooks/use-navigation";
import { DraftConfigView } from "./DraftConfigView";
import type { DraftConfig, DraftingResults, DraftingRun, ConversationHistoryEntry } from "./types";
import { PROMPT_SUGGESTIONS } from "./PromptSuggestions";
import { backendApi } from "../../../services/api";
import type { JobProgress } from "../../../services/api";
import { documentCache } from "../../../services/documentCache";

const DEFAULT_CONFIG: DraftConfig = {
  draftType: 'document',
  sourceConfig: {
    includeDocument: false,
    vaultClauses: [],
    vaultPlaybooks: [],
    vaultStandards: [],
    uploadedFiles: [],
    importedSources: [],
  },
  context: '',
  selectedPrompts: [] as string[],
};

export const DraftFromScratchPage: React.FC = () => {
  const { navigateTo } = useNavigation();
  const [config, setConfig] = React.useState<DraftConfig>(DEFAULT_CONFIG);
  const [draftingRuns, setDraftingRuns] = React.useState<DraftingRun[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [thinkingSteps, setThinkingSteps] = React.useState<string[]>([]);

  const buildConversationHistory = (runs: DraftingRun[]): ConversationHistoryEntry[] => {
    return runs.map(run => ({
      instructions: run.instructions,
      amendedSections: Object.values(run.results)
        .flat()
        .map(change => ({
          sectionNumber: change.section_number,
          status: change.status,
        })),
    }));
  };

  const submitInstructions = async (
    instructions: string,
    selectedPromptIds: string[],
    previousRuns: DraftingRun[]
  ): Promise<DraftingResults> => {
    const parsedDoc = await documentCache.getParsedDocumentSimple();

    const allPrompts = Object.values(PROMPT_SUGGESTIONS).flat();
    const selectedPrompts = allPrompts
      .filter(p => selectedPromptIds.includes(p.id))
      .map(p => ({ id: p.id, prompt: p.prompt }));

    const conversationHistory = buildConversationHistory(previousRuns);

    const response = await backendApi.draftWithInstructions(
      {
        structure: parsedDoc.structure,
        instructions,
        selectedPrompts,
        conversationHistory: conversationHistory.length > 0 ? conversationHistory : undefined,
        definitionSection: parsedDoc.definitionSection,
      },
      (progress: JobProgress) => {
        if (progress.thinkingSteps && progress.thinkingSteps.length > 0) {
          setThinkingSteps(progress.thinkingSteps);
        }
      },
    );

    if (response.success && response.formattedResults) {
      return response.formattedResults;
    }
    throw new Error('Failed to generate drafting results');
  };

  const handleStartDrafting = async () => {
    setIsLoading(true);
    setError(null);
    setThinkingSteps([]);
    const currentInstructions = config.context;
    const currentPrompts = config.selectedPrompts;
    const previousRuns = draftingRuns;
    // Clear textarea immediately so user sees it's ready for next input
    setConfig(prev => ({ ...prev, context: '', selectedPrompts: [] }));

    try {
      const results = await submitInstructions(currentInstructions, currentPrompts, previousRuns);
      setDraftingRuns(prev => [...prev, { instructions: currentInstructions, results }]);
    } catch (err) {
      console.error('Drafting error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate draft');
      // Restore instructions on error so user doesn't lose their text
      setConfig(prev => ({ ...prev, context: currentInstructions, selectedPrompts: currentPrompts }));
    } finally {
      setIsLoading(false);
      setThinkingSteps([]);
    }
  };

  const handleBack = () => {
    navigateTo('menu');
  };

  const handleStartOver = () => {
    setDraftingRuns([]);
    setConfig(prev => ({ ...prev, context: '' }));
    setError(null);
  };

  return (
    <DraftConfigView
      config={config}
      onConfigChange={setConfig}
      onGenerateSkeleton={handleStartDrafting}
      onBack={handleBack}
      isLoading={isLoading}
      error={error}
      draftingRuns={draftingRuns}
      onStartOver={handleStartOver}
      thinkingSteps={thinkingSteps}
    />
  );
};
