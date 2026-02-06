import * as React from 'react';
import {
  Button,
  makeStyles,
  Text,
  Spinner,
  Tooltip,
} from '@fluentui/react-components';
import { ArrowSync16Regular } from '@fluentui/react-icons';
import { useNavigation } from '../../../hooks/use-navigation';
import { useToast } from '../../../hooks/use-toast';
import { useDocumentAnnotations } from '../../../contexts/AnnotationContext';
import { PositionSelector } from '../../../components/PositionSelector';
import { AnnotationScopeSelector } from '../../RulesPage/components/AnnotationScope';
import { backendApi } from '../../../../services/api';
import { generateSummary } from '../../../../services/summaryGeneration';
import type { AnnotationScope } from '../../../../types/annotationScope';
import { DEFAULT_ANNOTATION_SCOPE } from '../../../../types/annotationScope';
import { documentCache } from '../../../../services/documentCache';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    minHeight: '100%',
    height: '100%',
    backgroundColor: '#fff',
    padding: '16px',
    boxSizing: 'border-box' as const,
    overflowX: 'hidden',
    overflowY: 'auto',
  },
  loadingRoot: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    height: '100%',
    backgroundColor: '#fff',
    padding: '16px',
    boxSizing: 'border-box' as const,
  },
  dialogContainer: {
    width: '100%',
    maxWidth: '500px',
    backgroundColor: '#fff',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
    display: 'flex',
    flexDirection: 'column',
    overflowX: 'hidden',
  },
  dialogHeader: {
    padding: '20px 24px 16px 24px',
  },
  dialogTitle: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#333',
    margin: 0,
    marginBottom: '12px',
  },
  dialogSubtext: {
    fontSize: '14px',
    color: '#666',
    margin: 0,
  },
  refreshRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0px',
    marginTop: '4px',
  },
  refreshText: {
    fontSize: '14px',
    color: '#666',
  },
  refreshButton: {
    minWidth: 'auto',
    padding: '2px',
    color: '#0F62FE',
    marginLeft: '2px',
    marginRight: '2px',
  },
  dialogContent: {
    padding: '0 24px 16px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    overflowX: 'hidden',
  },
  card: {
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid #e0e0e0',
    backgroundColor: '#fff',
    boxSizing: 'border-box' as const,
    width: '100%',
    overflowX: 'hidden',
  },
  cardTitle: {
    fontSize: '14px',
    fontWeight: 600,
    marginBottom: '12px',
    color: '#333',
  },
  configRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
  },
  configLabel: {
    fontSize: '13px',
    color: '#333',
    flex: 1,
  },
  dialogActions: {
    padding: '16px 24px 20px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 24px',
    gap: '16px',
  },
  loadingText: {
    fontSize: '14px',
    color: '#666',
  },
  errorContainer: {
    color: '#d32f2f',
    padding: '12px',
    backgroundColor: '#ffebee',
    borderRadius: '6px',
    marginBottom: '16px',
  },
  refreshingBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    backgroundColor: '#e3f2fd',
    borderRadius: '6px',
    fontSize: '13px',
    color: '#1565c0',
  },
  // Custom toggle switch styles
  toggleContainer: {
    position: 'relative' as const,
    width: '44px',
    height: '24px',
    flexShrink: 0,
  },
  toggleTrack: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: '12px',
    transition: 'background-color 0.2s ease',
    cursor: 'pointer',
  },
  toggleThumb: {
    position: 'absolute' as const,
    top: '2px',
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    backgroundColor: '#fff',
    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
    transition: 'left 0.2s ease',
  },
  configHint: {
    fontSize: '12px',
    color: '#d32f2f',
    marginTop: '8px',
  },
});

// Custom Toggle component with blue color
interface CustomToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  onDisabledClick?: () => void;
}

const CustomToggle: React.FC<CustomToggleProps> = ({ checked, onChange, disabled = false, onDisabledClick }) => {
  const styles = useStyles();
  
  const handleClick = () => {
    if (disabled) {
      onDisabledClick?.();
    } else {
      onChange(!checked);
    }
  };
  
  return (
    <div 
      className={styles.toggleContainer}
      onClick={handleClick}
      role="switch"
      aria-checked={checked}
      aria-disabled={disabled}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      style={{
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      <div 
        className={styles.toggleTrack}
        style={{
          background: disabled ? '#e0e0e0' : (checked ? 'var(--brand-gradient)' : '#c4c4c4'),
        }}
      />
      <div 
        className={styles.toggleThumb}
        style={{
          left: checked ? '22px' : '2px',
        }}
      />
    </div>
  );
};

// Extended position type to include party names
interface ExtractedPosition {
  party: string;
  position: string;
}

interface SummaryAnnotationScopeProps {
  onBack: () => void;
}

export const SummaryAnnotationScope: React.FC<SummaryAnnotationScopeProps> = ({
  onBack,
}) => {
  const styles = useStyles();
  const { navigateTo } = useNavigation();
  const { toast } = useToast();
  
  const {
    annotations,
    combinedStructure,
    recitals,
    classificationResult,
    isLoading: isLoadingAnnotations,
    isClassifying,
    error: annotationsError,
    extract,
    refresh,
    refreshWithReconciliation,
  } = useDocumentAnnotations();

  const [scope, setScope] = React.useState<AnnotationScope>(DEFAULT_ANNOTATION_SCOPE);
  const [positions, setPositions] = React.useState<string[]>([]);
  const [positionPartyMap, setPositionPartyMap] = React.useState<ExtractedPosition[]>([]);
  const [selectedPosition, setSelectedPosition] = React.useState<string | null>(null);
  const [isLoadingPositions, setIsLoadingPositions] = React.useState(false);
  const [includeRecommendations, setIncludeRecommendations] = React.useState(true);
  const [showPositionHint, setShowPositionHint] = React.useState(false);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  // Ref to prevent concurrent refresh operations
  const isRefreshingRef = React.useRef(false);

  // DEBUG: Log when annotations change
  React.useEffect(() => {
    console.log('[SummaryAnnotationScope] Annotations UPDATED in component:');
    console.log('[SummaryAnnotationScope]   Comments:', annotations?.comments.length ?? 0);
    console.log('[SummaryAnnotationScope]   Highlights:', annotations?.highlights.length ?? 0);
    console.log('[SummaryAnnotationScope]   Word-level TCs:', annotations?.trackChanges.wordLevelTrackChanges.length ?? 0);
    console.log('[SummaryAnnotationScope]   FSDs:', annotations?.trackChanges.fullSentenceDeletions.length ?? 0);
    console.log('[SummaryAnnotationScope]   FSIs:', annotations?.trackChanges.fullSentenceInsertions.length ?? 0);
  }, [annotations]);

  React.useEffect(() => {
    if (!annotations && !isLoadingAnnotations && !annotationsError) {
      extract();
    }
  }, [annotations, isLoadingAnnotations, annotationsError, extract]);

  // Clear hint when position is selected
  React.useEffect(() => {
    if (selectedPosition) {
      setShowPositionHint(false);
    }
  }, [selectedPosition]);

  // Reset position when recommendations toggle is turned off
  React.useEffect(() => {
    if (!includeRecommendations) {
      setSelectedPosition(null);
    }
  }, [includeRecommendations]);
  
  React.useEffect(() => {
    const extractPositions = async () => {
      if (!recitals || recitals.trim().length < 20) {
        return;
      }

      // Check cache first
      const cachedPositions = documentCache.getCachedPositions();
      if (cachedPositions) {
        console.log('[SummaryAnnotationScope] Using cached positions');
        setPositions(cachedPositions.normalized || []);
        setPositionPartyMap(cachedPositions.positions || []);
        return;
      }

      setIsLoadingPositions(true);
      try {
        const result = await backendApi.extractPositions({ recitals });
        if (result.success && result.data) {
          setPositions(result.data.normalized || []);
          setPositionPartyMap(result.data.positions || []);
          
          // Cache the result
          documentCache.setPositions({
            positions: result.data.positions || [],
            normalized: result.data.normalized || [],
          });
          console.log('[SummaryAnnotationScope] Cached positions');
        }
      } catch (error) {
        console.error('Failed to extract positions:', error);
      } finally {
        setIsLoadingPositions(false);
      }
    };

    extractPositions();
  }, [recitals]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      // Save config BEFORE generation
      // Only include recommendations if user selected a position AND toggle is on
      const effectiveIncludeRecommendations = selectedPosition ? includeRecommendations : false;
      localStorage.setItem('summaryConfig', JSON.stringify({ includeRecommendations: effectiveIncludeRecommendations }));
      
      const result = await generateSummary({
        scope,
        userPosition: selectedPosition || undefined,
        // Only include recommendations if user selected a position AND toggle is on
        includeRecommendations: selectedPosition ? includeRecommendations : false,
      });

      if (result.success) {
        localStorage.setItem('summaryResult', JSON.stringify(result));
        navigateTo('summary');
      } else {
        toast({
          title: 'Generation Failed',
          description: result.error?.message || 'Failed to generate summary.',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'An unexpected error occurred.',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCancel = () => {
    onBack();
  };

  const handleRetry = () => {
    refresh();
  };

  const handleRefresh = async () => {
    // Prevent concurrent refreshes
    if (isRefreshingRef.current) {
      console.log('[SummaryAnnotationScope] Refresh already in progress, skipping');
      return;
    }

    console.log('[SummaryAnnotationScope] Refreshing with reconciliation...');
    console.log('[SummaryAnnotationScope] Current scope ranges:', scope.ranges.length);

    isRefreshingRef.current = true;
    setIsRefreshing(true);

    try {
      const reconciliation = await refreshWithReconciliation(scope);

      if (reconciliation) {
        // Update scope with reconciled selections
        setScope(reconciliation.reconciledScope);

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
    } finally {
      isRefreshingRef.current = false;
      setIsRefreshing(false);
    }
  };

  // Show loading screen during initial load (both extraction AND classification)
  // This matches Module 1's behavior of bundling them into one "Loading Annotations" screen
  if ((isLoadingAnnotations || isClassifying) && !annotations) {
    return (
      <div className={styles.loadingRoot}>
        <div className={styles.dialogContainer}>
          <div className={styles.dialogHeader}>
            <h2 className={styles.dialogTitle}>Loading Annotations</h2>
          </div>
          <div className={styles.loadingContainer}>
            <Spinner size="medium" />
            <span className={styles.loadingText}>Extracting annotations from document...</span>
          </div>
        </div>
      </div>
    );
  }

  if (annotationsError && !annotations) {
    return (
      <div className={styles.loadingRoot}>
        <div className={styles.dialogContainer}>
          <div className={styles.dialogHeader}>
            <h2 className={styles.dialogTitle}>Select Annotations</h2>
          </div>
          <div className={styles.loadingContainer}>
            <div className={styles.errorContainer}>{annotationsError}</div>
            <Button appearance="primary" onClick={handleRetry}>
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <div className={styles.dialogContainer}>
        <div className={styles.dialogHeader}>
          <h2 className={styles.dialogTitle}>Select Annotations</h2>
          <p className={styles.dialogSubtext}>
            Select annotations to include.
          </p>
        </div>

        <div className={styles.dialogContent}>
          {/* Show refreshing banner only during actual refresh, not initial load */}
          {isRefreshing && (
            <div className={styles.refreshingBanner}>
              <Spinner size="tiny" />
              <span>Refreshing annotations...</span>
            </div>
          )}

          {/* DEBUG: Log annotations passed to selector */}
          {(() => {
            console.log('[SummaryAnnotationScope] Rendering AnnotationScopeSelector with:');
            console.log('[SummaryAnnotationScope]   annotations:', annotations ? 'present' : 'null');
            console.log('[SummaryAnnotationScope]   comments:', annotations?.comments.length ?? 0);
            console.log('[SummaryAnnotationScope]   highlights:', annotations?.highlights.length ?? 0);
            console.log('[SummaryAnnotationScope]   trackChanges:', annotations?.trackChanges.wordLevelTrackChanges.length ?? 0);
            return null;
          })()}
          <AnnotationScopeSelector
            scope={scope}
            onChange={setScope}
            annotations={annotations}
            combinedStructure={combinedStructure}
            recitals={recitals}
          />

          <div className={styles.refreshRow}>
            <span className={styles.refreshText}>Click</span>
            <Tooltip content="Refresh annotations from document" relationship="label">
              <Button
                appearance="subtle"
                size="small"
                icon={isLoadingAnnotations ? <Spinner size="tiny" /> : <ArrowSync16Regular />}
                onClick={handleRefresh}
                disabled={isLoadingAnnotations}
                className={styles.refreshButton}
                aria-label="Refresh annotations"
              />
            </Tooltip>
            <span className={styles.refreshText}>if you modify the document.</span>
          </div>

          <PositionSelector
            positions={positions}
            selectedPosition={selectedPosition}
            onChange={setSelectedPosition}
            isLoading={isLoadingPositions}
          />

          <div className={styles.card}>
            <Text className={styles.cardTitle}>Configuration</Text>
            <div className={styles.configRow}>
              <span className={styles.configLabel}>
                Would you like us to include recommendations for your position?
              </span>
              <CustomToggle
                checked={includeRecommendations}
                onChange={setIncludeRecommendations}
                disabled={!selectedPosition}
                onDisabledClick={() => setShowPositionHint(true)}
              />
            </div>
            {showPositionHint && !selectedPosition && (
              <div className={styles.configHint}>
                Please indicate your position above to enable recommendations.
              </div>
            )}
          </div>
        </div>

        <div className={styles.dialogActions}>
          <Button
            appearance="secondary"
            onClick={handleCancel}
            disabled={isGenerating}
          >
            Cancel
          </Button>
          <Button
            appearance="primary"
            onClick={handleGenerate}
            disabled={isGenerating || !annotations || !classificationResult}
            style={{
              background: 'var(--brand-gradient)',
              color: 'var(--text-on-brand)',
              border: 'none',
              fontFamily: 'inherit',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            {isGenerating ? (
              <>
                <Spinner size="tiny" style={{ marginRight: '8px' }} />
                Generating...
              </>
            ) : (
              'Generate Summary'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SummaryAnnotationScope;
