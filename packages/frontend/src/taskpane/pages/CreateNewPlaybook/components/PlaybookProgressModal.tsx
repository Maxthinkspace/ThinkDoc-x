import * as React from "react";
import {
  Dialog,
  DialogTrigger,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogActions,
  DialogContent,
  Button,
  Spinner,
  Tooltip,
} from "@fluentui/react-components";
import { ArrowSync16Regular, Info16Regular } from "@fluentui/react-icons";
import "../styles/PlaybookProgress.css";
import { CircleCheckBig } from "lucide-react";
import { generatePlaybook } from "../../../../services/playbookGeneration";
import { useNavigation } from "../../../hooks/use-navigation";
import { useDocumentAnnotations } from "../../../contexts/AnnotationContext";
import { AnnotationScopeSelector } from "../../RulesPage/components/AnnotationScope";
import type { AnnotationScope } from "../../../../types/annotationScope";
import { DEFAULT_ANNOTATION_SCOPE } from "../../../../types/annotationScope";
import { useToast } from "../../../hooks/use-toast";

interface PlaybookProgressModalProps {
  handleGenerate?: () => void;
  generateDisabled: boolean;
}

export const PlaybookProgressModal = ({
  handleGenerate,
  generateDisabled,
}: PlaybookProgressModalProps) => {
  const { navigateTo } = useNavigation();
  const { toast } = useToast();

  // Use shared annotation context
  const {
    annotations,
    combinedStructure,
    recitals,
    isLoading: isExtractingAnnotations,
    error: extractionError,
    extract,
    refresh: refreshAnnotationsFromContext,
    refreshWithReconciliation,
  } = useDocumentAnnotations();
  
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [isComplete, setIsComplete] = React.useState(false);
  const [scope, setScope] = React.useState<AnnotationScope>(DEFAULT_ANNOTATION_SCOPE);
  const [step, setStep] = React.useState<'loading' | 'configure' | 'generating'>('loading');

  // Ref to track if refresh is in progress (prevents race conditions)
  const isRefreshingRef = React.useRef(false);
  // Validation
  const isValidScope = scope.types.comments || scope.types.trackChanges || scope.types.highlights;
  const hasRequiredRanges = scope.mode === 'all' || scope.ranges.length > 0;
  const hasCommentsFiltered = annotations && scope.types.comments && annotations.comments.length > 0;
  const hasHighlightsFiltered = annotations && scope.types.highlights && annotations.highlights.length > 0;
  const hasTrackChangesFiltered = annotations && scope.types.trackChanges && 
    (annotations.trackChanges.wordLevelTrackChanges.length > 0 || 
     annotations.trackChanges.fullSentenceDeletions.length > 0 ||
     annotations.trackChanges.fullSentenceInsertions.length > 0);
     React.useEffect(() => {
      if (error) {
        setError(null);
      }
    }, [scope]);

  // DEBUG: Log when annotations change
  React.useEffect(() => {
    console.log('[PlaybookProgressModal] Annotations UPDATED in component:');
    console.log('[PlaybookProgressModal]   Comments:', annotations?.comments.length ?? 0);
    console.log('[PlaybookProgressModal]   Highlights:', annotations?.highlights.length ?? 0);
    console.log('[PlaybookProgressModal]   Word-level TCs:', annotations?.trackChanges.wordLevelTrackChanges.length ?? 0);
    console.log('[PlaybookProgressModal]   FSDs:', annotations?.trackChanges.fullSentenceDeletions.length ?? 0);
    console.log('[PlaybookProgressModal]   FSIs:', annotations?.trackChanges.fullSentenceInsertions.length ?? 0);

    // Log each track change
    if (annotations?.trackChanges) {
      for (const tc of annotations.trackChanges.wordLevelTrackChanges) {
        console.log(`[PlaybookProgressModal]     WLTC: ${tc.sentenceId} | Section: ${tc.sectionNumber}`);
      }
      for (const fsd of annotations.trackChanges.fullSentenceDeletions) {
        console.log(`[PlaybookProgressModal]     FSD: ${fsd.id} | Section: ${fsd.sectionNumber}`);
      }
    }
  }, [annotations]);

  // DEBUG: Log when scope changes to trace why selections disappear
  React.useEffect(() => {
    console.log('[PlaybookProgressModal] SCOPE CHANGED:');
    console.log('[PlaybookProgressModal]   Mode:', scope.mode);
    console.log('[PlaybookProgressModal]   Ranges:', scope.ranges.length);
    for (const range of scope.ranges) {
      const totalAnnotations =
        range.matchedAnnotations.comments.length +
        range.matchedAnnotations.highlights.length +
        range.matchedAnnotations.wordLevelTrackChanges.length +
        range.matchedAnnotations.fullSentenceDeletions.length +
        range.matchedAnnotations.fullSentenceInsertions.length;
      console.log(`[PlaybookProgressModal]     Range "${range.label}": ${totalAnnotations} annotations`);
    }
    // Log stack trace to see what triggered the change
    console.log('[PlaybookProgressModal]   Stack trace:', new Error().stack);
  }, [scope]);

  const handleOpenDialog = async () => {
    setOpen(true);
    setStep('loading');
    setError(null);
    setIsComplete(false);
    setScope(DEFAULT_ANNOTATION_SCOPE);

    // Extract annotations (uses cache if available)
    await extract();
    setStep('configure');
  };

  /**
   * Handle refresh with reconciliation.
   * This preserves user's selections when possible after document changes.
   */
  const handleRefreshWithReconciliation = async () => {
    // Prevent concurrent refreshes
    if (isRefreshingRef.current) {
      console.log('[PlaybookProgressModal] Refresh already in progress, skipping');
      return;
    }

    isRefreshingRef.current = true;
    console.log('[PlaybookProgressModal] ========== STARTING REFRESH ==========');
    console.log('[PlaybookProgressModal] Current scope before refresh:');
    console.log('[PlaybookProgressModal]   Mode:', scope.mode);
    console.log('[PlaybookProgressModal]   Ranges:', scope.ranges.length);
    console.log('[PlaybookProgressModal] BEFORE refresh - annotations from context:');
    console.log('[PlaybookProgressModal]   Comments:', annotations?.comments.length ?? 0);
    console.log('[PlaybookProgressModal]   Highlights:', annotations?.highlights.length ?? 0);
    console.log('[PlaybookProgressModal]   Word-level TCs:', annotations?.trackChanges.wordLevelTrackChanges.length ?? 0);
    console.log('[PlaybookProgressModal]   FSDs:', annotations?.trackChanges.fullSentenceDeletions.length ?? 0);
    console.log('[PlaybookProgressModal]   FSIs:', annotations?.trackChanges.fullSentenceInsertions.length ?? 0);

    try {
      const reconciliation = await refreshWithReconciliation(scope);

    // Log the updated annotations after refresh
    console.log('[PlaybookProgressModal] AFTER refresh - annotations from context:');
    console.log('[PlaybookProgressModal]   Comments:', annotations?.comments.length ?? 0);
    console.log('[PlaybookProgressModal]   Highlights:', annotations?.highlights.length ?? 0);
    console.log('[PlaybookProgressModal]   Word-level TCs:', annotations?.trackChanges.wordLevelTrackChanges.length ?? 0);
    console.log('[PlaybookProgressModal]   FSDs:', annotations?.trackChanges.fullSentenceDeletions.length ?? 0);
    console.log('[PlaybookProgressModal]   FSIs:', annotations?.trackChanges.fullSentenceInsertions.length ?? 0);

    console.log('[PlaybookProgressModal] Reconciliation result:', reconciliation);

    if (reconciliation) {
      console.log('[PlaybookProgressModal] About to setScope with reconciled scope:');
      console.log('[PlaybookProgressModal]   Ranges:', reconciliation.reconciledScope.ranges.length);
      for (const range of reconciliation.reconciledScope.ranges) {
        console.log(`[PlaybookProgressModal]     Range "${range.label}"`);
      }

      // Update scope with reconciled selections
      setScope(reconciliation.reconciledScope);
      console.log('[PlaybookProgressModal] setScope called with reconciled scope');

      // Show summary to user
      const { summary } = reconciliation;
      const totalPreserved =
        summary.preserved.comments +
        summary.preserved.highlights +
        summary.preserved.wordLevelTrackChanges +
        summary.preserved.fullSentenceDeletions +
        summary.preserved.fullSentenceInsertions +
        summary.preserved.structuralChanges;

      const totalRemoved =
        summary.removed.comments.length +
        summary.removed.highlights.length +
        summary.removed.wordLevelTrackChanges.length +
        summary.removed.fullSentenceDeletions.length +
        summary.removed.fullSentenceInsertions.length +
        summary.removed.structuralChanges.length;

      // Only show toast when selections were removed (user needs to know)
      // Don't show toast when all selections preserved (unnecessary noise)
      if (totalRemoved > 0) {
        toast({
          title: "Selections Updated",
          description: `${totalPreserved} selections preserved, ${totalRemoved} removed (no longer in document).`,
        });
      }
    }

    console.log('[PlaybookProgressModal] ========== REFRESH COMPLETE ==========');
    } catch (err) {
      console.error('[PlaybookProgressModal] Refresh failed:', err);
    } finally {
      isRefreshingRef.current = false;
    }
  };

  const handleGenerateClick = async () => {

    if (!isValidScope) {
      setError('Please select at least one annotation type.');
      return;
    }
    if (!hasRequiredRanges) {
      setError(`Please add at least one range to ${scope.mode === 'include-only' ? 'include' : 'exclude'}.`);
      return;
    }
    // Call the original handleGenerate if provided (for any side effects)
    if (handleGenerate) {
      handleGenerate();
    }

    setIsGenerating(true);
    setIsComplete(false);
    setError(null);

    // Clear stale data from previous generation/saved playbook to enable re-run
    localStorage.removeItem("playbook");
    localStorage.removeItem("generationContexts");
    localStorage.removeItem("rules");

    setStep('generating');

    try {
      const result = await generatePlaybook(scope, undefined, {
        annotations: annotations!,
        combinedStructure: combinedStructure!,
        recitals,
      });
        // console.log('[PlaybookProgressModal] Progress:', progress);

      // Transform the new API response format to the array format expected by RulesPage
      const rulesArray = [
        { 
          type: "Rules for Instruction Requests" as const, 
          rules: result.playbook?.instructionRequestRules || [] 
        },
        { 
          type: "Rules for Contract Amendments" as const, 
          rules: result.playbook?.alwaysAppliedRules || [] 
        },
        { 
          type: "Conditional Rules for Contract Amendments" as const, 
          rules: result.playbook?.conditionalRules || [] 
        },
      ];

      // Store rules for RulesPage
      localStorage.setItem("rules", JSON.stringify(rulesArray));
      
      // Store generation contexts for re-run capability
      // This enables the re-run button until the playbook is saved
      if (result.rerunContexts) {
        localStorage.setItem("generationContexts", JSON.stringify(result.rerunContexts));
      }
      
      setIsComplete(true);

      setTimeout(() => {
        setOpen(false);
        navigateTo("rules");
      }, 1000);
    } catch (err: any) {
      console.error(err);
      setError("Failed to generate rules. Please try again.");
      setIsComplete(false);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClose = () => {
    if (!isGenerating) {
      setOpen(false);
      setStep('loading');
      setScope(DEFAULT_ANNOTATION_SCOPE);
      setError(null);
    }
  };

  return (
    <div style={{ padding: "8px" }}>
      <Dialog open={open} onOpenChange={(_, data) => !isGenerating && setOpen(data.open)}>
        <DialogTrigger disableButtonEnhancement>
          <button
            className="pg-generate-btn"
            onClick={handleOpenDialog}
            disabled={generateDisabled || isGenerating}
            aria-disabled={generateDisabled || isGenerating}
            type="button"
          >
            Generate
          </button>
        </DialogTrigger>
        <DialogSurface style={{ maxWidth: step === 'configure' ? '500px' : '400px' }}>
          <DialogBody>
            {step === 'loading' ? (
              <>
                <DialogTitle style={{ textAlign: "center", marginBottom: "16px" }}>
                  Loading Annotations
                </DialogTitle>
                <DialogContent>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '20px' }}>
                    <Spinner size="medium" />
                    <p style={{ color: '#666', fontSize: '14px', margin: 0 }}>
                      Extracting annotations from document...
                    </p>
                  </div>
                </DialogContent>
              </>
            ) : step === 'configure' ? (
              <>
                <DialogTitle style={{ marginBottom: "16px" }}>
                  Select Annotations
                </DialogTitle>
                <DialogContent>
                {extractionError ? (
                    <div style={{ 
                      color: "#d32f2f", 
                      padding: "12px",
                      backgroundColor: "#ffebee",
                      borderRadius: "6px",
                      marginBottom: "16px"
                    }}>
                      {extractionError}
                    </div>
                  ) : (
                    <p style={{ fontSize: "14px", color: "#666", margin: 0, marginBottom: "16px" }}>
                      Select annotations to include.
                    </p>
                  )}
                  
                  {isExtractingAnnotations && step === 'configure' && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      backgroundColor: '#e3f2fd',
                      borderRadius: '6px',
                      marginBottom: '12px',
                      fontSize: '13px',
                      color: '#1565c0',
                    }}>
                      <Spinner size="tiny" />
                      <span>Refreshing annotations...</span>
                    </div>
                  )}
                  
                  <AnnotationScopeSelector
                    scope={scope}
                    onChange={setScope}
                    annotations={annotations}
                    combinedStructure={combinedStructure}
                    recitals={recitals}
                  />

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0px', marginTop: '12px' }}>
                    <span style={{ fontSize: "14px", color: "#666" }}>Click</span>
                    <Tooltip content="Refresh annotations from document (preserves selections)" relationship="label">
                      <Button
                        appearance="subtle"
                        size="small"
                        icon={isExtractingAnnotations ? <Spinner size="tiny" /> : <ArrowSync16Regular />}
                        onClick={handleRefreshWithReconciliation}
                        disabled={isExtractingAnnotations}
                        aria-label="Refresh annotations"
                        style={{ color: '#0F62FE', minWidth: 'auto', padding: '2px', marginLeft: '2px', marginRight: '2px' }}
                      />
                    </Tooltip>
                    <span style={{ fontSize: "14px", color: "#666" }}>if you modify the document.</span>
                  </div>

                  {error && (
                    <div style={{ 
                      color: "#d32f2f", 
                      marginTop: "16px",
                      padding: "10px",
                      backgroundColor: "#ffebee",
                      borderRadius: "6px",
                      fontSize: "13px"
                    }}>
                      {error}
                    </div>
                  )}
                </DialogContent>
                <DialogActions style={{ marginTop: "16px" }}>
                  <Button appearance="secondary" onClick={handleClose}>
                    Cancel
                  </Button>
                  <Button
                    className="brand-btn"
                    appearance="primary"
                    onClick={handleGenerateClick}
                    disabled={!isValidScope || !annotations}
                    style={{
                      background: "var(--brand-gradient)",
                      color: "var(--text-on-brand)",
                      border: "none",
                      fontFamily: "inherit",
                      fontSize: "14px",
                      fontWeight: 500,
                    }}
                  >
                    Generate Playbook
                  </Button>
                </DialogActions>
              </>
            ) : (
              <>
                <DialogTitle style={{
                  textAlign: "center",
                  marginBottom: "15px"
                }}>Generating Your Playbook</DialogTitle>
                <DialogContent>
                  <p style={{ marginBottom: "15px", fontSize: "14px", color: "#666" }}>
                    Analyzing your annotations to create custom review rules...
                  </p>
                  
                  {error ? (
                    <>
                      <div style={{ color: "#d32f2f", marginBottom: 16 }}>{error}</div>
                      <Button 
                        onClick={handleGenerateClick}
                        style={{
                          background: "var(--brand-gradient)",
                          color: "var(--text-on-brand)",
                          border: "none",
                          fontFamily: "inherit",
                          fontSize: "14px",
                          fontWeight: 500,
                        }}
                      >
                        Retry
                      </Button>
                    </>
                  ) : (
                    <div className="ppe-list">
                      {hasCommentsFiltered && (
                        <div className={`ppe-row ${isComplete ? "ppe-done" : isGenerating ? "ppe-loading" : "ppe-waiting"}`}>
                          <span className="ppe-icon" aria-hidden>
                            {isComplete ? (
                              <CircleCheckBig size={18} color="#0F62FE" />
                            ) : (
                              <Spinner size="tiny" />
                            )}
                          </span>
                          <span 
                            className={`ppe-text ${isComplete ? "ppe-text-done" : isGenerating ? "ppe-text-loading" : "ppe-text-waiting"}`}
                            style={{ color: isGenerating && !isComplete ? "#0F62FE" : undefined }}
                          >
                            Generating playbook rules from comments...
                          </span>
                        </div>
                      )}

                      {hasTrackChangesFiltered && (
                        <div className={`ppe-row ${isComplete ? "ppe-done" : isGenerating ? "ppe-loading" : "ppe-waiting"}`}>
                          <span className="ppe-icon" aria-hidden>
                            {isComplete ? (
                              <CircleCheckBig size={18} color="#0F62FE" />
                            ) : (
                              <Spinner size="tiny" />
                            )}
                          </span>
                          <span 
                            className={`ppe-text ${isComplete ? "ppe-text-done" : isGenerating ? "ppe-text-loading" : "ppe-text-waiting"}`}
                            style={{ color: isGenerating && !isComplete ? "#0F62FE" : undefined }}
                          >
                            Generating playbook rules from track changes...
                          </span>
                        </div>
                      )}

                      {hasHighlightsFiltered && (
                        <div className={`ppe-row ${isComplete ? "ppe-done" : isGenerating ? "ppe-loading" : "ppe-waiting"}`}>
                          <span className="ppe-icon" aria-hidden>
                            {isComplete ? (
                              <CircleCheckBig size={18} color="#0F62FE" />
                            ) : (
                              <Spinner size="tiny" />
                            )}
                          </span>
                          <span 
                            className={`ppe-text ${isComplete ? "ppe-text-done" : isGenerating ? "ppe-text-loading" : "ppe-text-waiting"}`}
                            style={{ color: isGenerating && !isComplete ? "#0F62FE" : undefined }}
                          >
                            Generating playbook rules from highlights...
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </DialogContent>
              </>
            )}
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
};
