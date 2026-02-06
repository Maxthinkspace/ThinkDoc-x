import {
  Button,
  makeStyles,
  Accordion,
  AccordionItem,
  AccordionHeader,
  AccordionPanel,
  Tooltip,
  Divider,
} from "@fluentui/react-components";
import React from "react";

import { RuleCard } from "./components/RuleCard";
import { SavePBDialog } from "./components/SavePBDialog";
import { InfoIcon, ChevronDown, ChevronUp } from "lucide-react";
import { AddDialog } from "./components/AddDialog";
import { RerunConfirmDialog, LinkedRuleWithDisplay } from "./components/RerunConfirmDialog";
import { useNavigation } from "../../hooks/use-navigation";
import { ArrowLeftIcon } from "lucide-react";
import { FaArrowLeft, FaPlus } from "react-icons/fa6";
import { TbChevronDownLeft } from "react-icons/tb";
import { TbChevronUpRight } from "react-icons/tb";
import { LuChevronsRightLeft, LuSave } from "react-icons/lu";
import { IoIosInformationCircle } from "react-icons/io";
import PlaybookTooltip from "./components/PlaybookTooltip";
import { backendApi } from "../../../services/api";
import { useToast } from "../../hooks/use-toast";
import { EditPlaybookDialog } from "../UnifiedLibraryPage/components/playbooks/EditPlaybookDialog";
import { RuleVersionCarousel, RuleVersion } from "./components/RuleVersionCarousel";

const useStyles = makeStyles({
  root: {
    minHeight: "100vh",
    maxWidth: "100%",           
    overflowX: "hidden",
  },
  header: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "5px 19px",
  },
  headerTitle: {
    margin: "9px",
    fontWeight: 600,
    color: "#333333",
    fontSize: "15px",
  },
  headerIcon: {
    color: "#999999",
    border: "none",
    backgroundColor: "transparent",
    "&:hover": {
      color: "#999999",
      border: "none",
      backgroundColor: "transparent",
    },
  },
  infoIcon: {
    paddingTop: "4px",
    width: "16px",
    height: "16px",
    flexShrink: 0,
  },
  container: {
    maxWidth: "72rem",
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
  },
  headerRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "16px",
  },
  headerText: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  title: {
    fontSize: "24px",
    lineHeight: 1.2,
    padding: "0px",
    margin: "0px",
    fontWeight: 700,
    color: "var(--foreground, #222)",
  },
  subtitle: {
    fontSize: "14px",
    margin: "0px",
    padding: "0px",
    color: "var(--muted-foreground, #6b7280)",
  },

  alert: {
    display: "flex",
    alignItems: "start",
    borderRadius: "8px",
    gap: "8px",
    border: "1px solid",
    width: "100%",
    maxWidth: "100%",
    boxSizing: "border-box",
    overflow: "hidden",
  },
  alertDescription: {
    fontSize: "14px",
    wordWrap: "break-word",
    overflowWrap: "break-word",
    wordBreak: "break-word",      
    whiteSpace: "normal", 
    flex: 1,
    minWidth: 0,
  },
  card: {
    background: "#fff",
    borderRadius: "12px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
    padding: "24px",
    marginBottom: "1px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  cardHeader: {
    marginBottom: "8px",
  },
  cardTitle: {
    fontSize: "1.25rem",
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    gap: "8px",
    paddingBottom: "10px",
    margin: 0,
  },
  cardContent: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    padding: "5px",
  },
  addRuleRow: {
    display: "flex",
    justifyContent: "center",
  },
  dropIndicator: {
    height: "2px",
    backgroundColor: "#0078d4",
    margin: "4px 0",
    borderRadius: "1px",
    opacity: 0.8,
    transition: "opacity 0.2s ease",
  },
  dragOverItem: {
    opacity: 0.5,
    transform: "scale(0.98)",
    transition: "opacity 0.2s ease, transform 0.2s ease",
  },
  // Add CSS for drop target visual feedback
  ruleCard: {
    position: "relative",
  },
  icon: {
    width: "16px",
    height: "16px",
  },
  categoryAccordionItem: {
    border: "1px solid #e9ecef",
    borderRadius: "12px",
    backgroundColor: "transparent",
    transition: "border-color 0.2s ease",
  },
  categoryAccordionItemExpanded: {
    border: "1px solid #e9ecef",
    borderRadius: "12px",
    backgroundColor: "transparent",
    transition: "border-color 0.2s ease",
  },
  categoryAccordionItemNoBorder: {
    border: "1px solid #e9ecef",
    borderRadius: "12px",
    backgroundColor: "transparent",
    marginBottom: "16px",
  },
  categoryAccordionHeader: {
    border: "none",
    borderRadius: "12px",
    padding: "12px",
    position: "relative",
    display: "flex",
    flexDirection: "column",
    maxWidth: "100%",           
    overflow: "hidden",
    "&:hover": {
      backgroundColor: "transparent",
    },
    "& [data-accordion-trigger]": {
      "&::after": {
        display: "none !important",
      },
      "&::before": {
        display: "none !important",
      },
    },
    "& [data-accordion-trigger]::after": {
      display: "none !important",
    },
    "& [data-accordion-trigger]::before": {
      display: "none !important",
    },
    "& [data-accordion-trigger] > *": {
      "&::after": {
        display: "none !important",
      },
      "&::before": {
        display: "none !important",
      },
    },
  },
  categoryCustomChevron: {
    position: "absolute",
    right: "12px",
    top: "50%",
    transform: "translateY(-50%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#666",
    fontSize: "14px",
  },
  categoryAccordionPanel: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    backgroundColor: "transparent",
    border: "1px solid #e9ecef",
    borderTop: "none",
    borderRadius: "0 0 12px 12px",
    padding: "0 12px 12px",
  },
  categoryAccordionHeaderContent: {
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    width: "100%",
    maxWidth: "100%",
    overflow: "hidden",
  },
});

type InfoProps = {
  bgColor: string;
  borderColor: string;
  content: string;
  iconColor: string;
};

export type Rule = {
  id: string;
  rule_number: string;
  brief_name: string;
  instruction: string;
  example_language?: string;
  location_text?: string;     // Full sentence for locating (unique context)
  selected_text?: string;     // Specific text to highlight within location_text
  sectionNumber?: string;
  sourceAnnotationType?: string;
  sourceAnnotationKey?: string;
  originalPosition?: number; // Track original position in the array
  originalCategory?: string; // Track original category type
};

export type RuleCategory = {
  type:
    | "Rules for Instruction Requests"
    | "Rules for Contract Amendments"
    | "Conditional Rules for Contract Amendments";
  rules: Rule[];
};

export type RuleCategories = RuleCategory[];

export const RulesPage = () => {
  const { navigateTo } = useNavigation();
  const prevPage = () => navigateTo("loading");
  const styles = useStyles();
  const { toast } = useToast();

  // Initialize rules with original positions
  const initializeRulesWithPositions = (rulesData: RuleCategories): RuleCategories => {
    return rulesData.map((category) => ({
      ...category,
      rules: category.rules.map((rule, index) => ({
        ...rule,
        originalPosition: index,
        originalCategory: category.type,
      })),
    }));
  };

  // Load rules from localStorage (from generation) or from playbook, fallback to tempRules
  const [rules, setRules] = React.useState<RuleCategories>(() => {
    // First try to load from localStorage "rules" (from generation)
    const storedRules = localStorage.getItem("rules");
    if (storedRules) {
      try {
        const parsed = JSON.parse(storedRules);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Clear stale carousel state when loading fresh generated rules
          // (not from a saved playbook)
          const storedPlaybook = localStorage.getItem("playbook");
          if (!storedPlaybook || !JSON.parse(storedPlaybook).id) {
            // Fresh generation - clear any stale carousel state
            localStorage.removeItem("carouselVersions");
            localStorage.removeItem("carouselActiveFor");
            localStorage.removeItem("carouselCurrentIndex");
          }
          return initializeRulesWithPositions(parsed);
        }
      } catch (e) {
        console.error("Failed to parse stored rules:", e);
      }
    }
    
    // If no stored rules, try to load from playbook in localStorage
    const storedPlaybook = localStorage.getItem("playbook");
    if (storedPlaybook) {
      try {
        const playbook = JSON.parse(storedPlaybook);
        if (playbook.rules && Array.isArray(playbook.rules) && playbook.rules.length > 0) {
          return initializeRulesWithPositions(playbook.rules);
        }
      } catch (e) {
        console.error("Failed to parse stored playbook:", e);
      }
    }
    
    // No fallback - return empty rules if no data available
    return initializeRulesWithPositions([]);
  });
  
  // Get current playbook ID if available (for API sync)
  const getCurrentPlaybookId = (): string | null => {
    try {
      const storedPlaybook = localStorage.getItem("playbook");
      if (storedPlaybook) {
        const playbook = JSON.parse(storedPlaybook);
        return playbook.id || null;
      }
    } catch (e) {
      console.error("Failed to parse playbook for ID:", e);
    }
    return null;
  };

  // Check if viewing a saved playbook (for hiding Locate/Re-run buttons)
  const isSavedPlaybook = (): boolean => {
    return !!getCurrentPlaybookId();
  };

  // Generation contexts for re-run capability (only available before saving)
  const [generationContexts, setGenerationContexts] = React.useState<Record<string, any>>(() => {
    const stored = localStorage.getItem("generationContexts");
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error("Failed to parse generation contexts:", e);
      }
    }
    return {};
  });
  
  // Re-run dialog states
  const [rerunDialogOpen, setRerunDialogOpen] = React.useState(false);
  const [rerunTargetRule, setRerunTargetRule] = React.useState<Rule | null>(null);
  const [rerunLinkedRules, setRerunLinkedRules] = React.useState<LinkedRuleWithDisplay[]>([]);
  const [isRerunning, setIsRerunning] = React.useState(false);
  const [rerunningRuleIds, setRerunningRuleIds] = React.useState<Set<string>>(new Set());
  const [settingsDialogOpen, setSettingsDialogOpen] = React.useState(false);
  const [highlightPendingRules, setHighlightPendingRules] = React.useState(false);
  // Carousel state - tracks versions per sourceAnnotationKey
  // Initialize from localStorage if available
  const [ruleVersions, setRuleVersions] = React.useState<Map<string, RuleVersion[]>>(() => {
    try {
      const stored = localStorage.getItem("carouselVersions");
      if (stored) {
        const parsed = JSON.parse(stored);
        return new Map(Object.entries(parsed));
      }
    } catch (e) {
      console.error("Failed to parse carousel versions:", e);
    }
    return new Map();
  });

  const [carouselActiveFor, setCarouselActiveFor] = React.useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem("carouselActiveFor");
      if (stored) {
        return new Set(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to parse carousel active:", e);
    }
    return new Set();
  });

  const [carouselCurrentIndex, setCarouselCurrentIndex] = React.useState<Map<string, number>>(() => {
    try {
      const stored = localStorage.getItem("carouselCurrentIndex");
      if (stored) {
        const parsed = JSON.parse(stored);
        return new Map(Object.entries(parsed).map(([k, v]) => [k, Number(v)]));
      }
    } catch (e) {
      console.error("Failed to parse carousel index:", e);
    }
    return new Map();
  });
  
  // Helper function to sync rules to API and localStorage
  const syncRulesToAPI = async (updatedRules: RuleCategories) => {
    // Save to localStorage
    localStorage.setItem("rules", JSON.stringify(updatedRules));
    
    // Sync to API if playbook exists
    const playbookId = getCurrentPlaybookId();
    if (playbookId) {
      try {
        // Clean rules for API (remove contract_clause and internal tracking fields)
        const cleanedRules = updatedRules.map(({ type, rules }) => {
          const cleanedRules = rules.map(({ originalPosition, originalCategory, ...rest }) => ({ ...rest }));
          return {
            type,
            rules: cleanedRules,
          };
        });
        
        await backendApi.updatePlaybook(playbookId, {
          rules: cleanedRules,
        });
        
        // Update playbook in localStorage with new rules
        try {
          const storedPlaybook = localStorage.getItem("playbook");
          if (storedPlaybook) {
            const playbook = JSON.parse(storedPlaybook);
            playbook.rules = cleanedRules;
            localStorage.setItem("playbook", JSON.stringify(playbook));
          }
        } catch (e) {
          console.error("Failed to update playbook in localStorage:", e);
        }
      } catch (error) {
        console.error("Failed to sync rules to API:", error);
        // Don't show toast for every update to avoid spam - only show on explicit user actions
        return false;
      }
    }
    return true;
  };
  
  // Save rules to localStorage whenever they change (for backward compatibility)
  React.useEffect(() => {
    localStorage.setItem("rules", JSON.stringify(rules));
  }, [rules]);

  // Save generation contexts to localStorage (for re-run capability)
  React.useEffect(() => {
    localStorage.setItem("generationContexts", JSON.stringify(generationContexts));
  }, [generationContexts]);

  // Persist carousel state to localStorage
  React.useEffect(() => {
    const versionsObj: Record<string, RuleVersion[]> = {};
    ruleVersions.forEach((v, k) => { versionsObj[k] = v; });
    localStorage.setItem("carouselVersions", JSON.stringify(versionsObj));
  }, [ruleVersions]);

  React.useEffect(() => {
    localStorage.setItem("carouselActiveFor", JSON.stringify(Array.from(carouselActiveFor)));
  }, [carouselActiveFor]);

  React.useEffect(() => {
    const indexObj: Record<string, number> = {};
    carouselCurrentIndex.forEach((v, k) => { indexObj[k] = v; });
    localStorage.setItem("carouselCurrentIndex", JSON.stringify(indexObj));
  }, [carouselCurrentIndex]);

  // Auto-clear highlight when all pending versions are resolved
  React.useEffect(() => {
    if (carouselActiveFor.size === 0 && highlightPendingRules) {
      setHighlightPendingRules(false);
    }
  }, [carouselActiveFor.size, highlightPendingRules]);

  
  // ===========================================================================
  // NOTE 11-27-2025:
  // Added missing isConditionallyAppliedExpanded state 
  // Removed unused 'name' state variable.
  // ===========================================================================

  // Category accordion states
  const [isInstructionsExpanded, setIsInstructionsExpanded] = React.useState(true);
  const [isContractAmendmentsExpanded, setIsContractAmendmentsExpanded] = React.useState(true);
  const [isAlwaysAppliedExpanded, setIsAlwaysAppliedExpanded] = React.useState(true);
  const [isConditionallyAppliedExpanded, setIsConditionallyAppliedExpanded] = React.useState(true);

  // Drag & drop states
  const [draggedRule, setDraggedRule] = React.useState<{
    ruleNumber: string;
    type: string;
    index: number;
  } | null>(null);
  const [dragOverIndex, setDragOverIndex] = React.useState<number | null>(null);
  const [dragOverCategory, setDragOverCategory] = React.useState<string | null>(null);
  const [dropPosition, setDropPosition] = React.useState<"above" | "below" | "between" | null>(
    null
  );
  const [showDropIndicator, setShowDropIndicator] = React.useState(false);
  const [dropIndicatorPosition, setDropIndicatorPosition] = React.useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  // ===========================================================================
  // NOTE 11-27-2025:
  // Added safe access with fallback empty arrays to prevent crashes when
  // rule categories don't exist or rules array is empty.
  // ===========================================================================

  const instructions = rules.find((obj) => obj.type === "Rules for Instruction Requests")?.rules || [];
  const amendmentRules = rules.find((obj) => obj.type === "Rules for Contract Amendments")?.rules || [];
  const conditionalRules = rules.find(
    (obj) => obj.type === "Conditional Rules for Contract Amendments"
  )?.rules || [];

  // ============================================
  // RE-RUN HELPER FUNCTIONS
  // ============================================
  // Get carousel data for a rule
  const getCarouselData = (rule: Rule) => {
    if (!rule.sourceAnnotationKey) return null;
    const versions = ruleVersions.get(rule.sourceAnnotationKey);
    const currentIndex = carouselCurrentIndex.get(rule.sourceAnnotationKey) ?? 0;
    if (!versions) return null;
    return { versions, currentIndex, sourceAnnotationKey: rule.sourceAnnotationKey };
  };

  // Find all rules linked to the same annotation 
  const findLinkedRules = (rule: Rule): LinkedRuleWithDisplay[] => {
    if (!rule.sourceAnnotationKey) {
      // Find the display index for this single rule
      let displayIndex = 1;
      let categoryLabel = "";
      
      const instrIdx = instructions.findIndex(r => r.id === rule.id);
      if (instrIdx !== -1) {
        displayIndex = instrIdx + 1;
        categoryLabel = "Rules for Instruction Requests";
      }
      const amendIdx = amendmentRules.findIndex(r => r.id === rule.id);
      if (amendIdx !== -1) {
        displayIndex = amendIdx + 1;
        categoryLabel = "Always Applied";
      }
      const condIdx = conditionalRules.findIndex(r => r.id === rule.id);
      if (condIdx !== -1) {
        displayIndex = condIdx + 1;
        categoryLabel = "Conditionally Applied";
      }
      
      return [{ ...rule, displayIndex, categoryLabel }];
    }
    
    const linkedRulesWithDisplay: LinkedRuleWithDisplay[] = [];
    
    instructions.forEach((r, idx) => {
      if (r.sourceAnnotationKey === rule.sourceAnnotationKey) {
        linkedRulesWithDisplay.push({
          ...r,
          displayIndex: idx + 1,
          categoryLabel: "Rules for Instruction Requests",
        });
      }
    });
    
    amendmentRules.forEach((r, idx) => {
      if (r.sourceAnnotationKey === rule.sourceAnnotationKey) {
        linkedRulesWithDisplay.push({
          ...r,
          displayIndex: idx + 1,
          categoryLabel: "Always Applied",
        });
      }
    });
    
    conditionalRules.forEach((r, idx) => {
      if (r.sourceAnnotationKey === rule.sourceAnnotationKey) {
        linkedRulesWithDisplay.push({
          ...r,
          displayIndex: idx + 1,
          categoryLabel: "Conditionally Applied",
        });
      }
    });
    
    return linkedRulesWithDisplay;
  };

  // Get linked rules details (excluding the current rule) for display in tooltip
  const getLinkedRulesDetails = (rule: Rule): Array<{ id: string; displayIndex: number; brief_name: string; type: string }> => {
    if (!rule.sourceAnnotationKey) return [];
    
    const linkedDetails: Array<{ id: string; displayIndex: number; brief_name: string; type: string }> = [];
    
    instructions.forEach((r, idx) => {
      if (r.sourceAnnotationKey === rule.sourceAnnotationKey && r.id !== rule.id) {
        linkedDetails.push({ 
          id: r.id, 
          displayIndex: idx + 1, 
          brief_name: r.brief_name,
          type: 'Rules for Instruction Requests'
        });
      }
    });
    
    amendmentRules.forEach((r, idx) => {
      if (r.sourceAnnotationKey === rule.sourceAnnotationKey && r.id !== rule.id) {
        linkedDetails.push({ 
          id: r.id, 
          displayIndex: idx + 1, 
          brief_name: r.brief_name,
          type: 'Rules for Contract Amendments'
        });
      }
    });
    
    conditionalRules.forEach((r, idx) => {
      if (r.sourceAnnotationKey === rule.sourceAnnotationKey && r.id !== rule.id) {
        linkedDetails.push({ 
          id: r.id, 
          displayIndex: idx + 1, 
          brief_name: r.brief_name,
          type: 'Conditional Rules for Contract Amendments'
        });
      }
    });
    
    return linkedDetails;
  };

  // Check if re-run is available (only before playbook is saved to DB)
  const isRerunAvailable = (): boolean => {
    const playbookId = getCurrentPlaybookId();
    // Re-run only available if playbook not yet saved AND we have generation contexts
    return !playbookId && Object.keys(generationContexts).length > 0;
  };

  // ============================================
  // RE-RUN HANDLERS
  // ============================================

  // Handle re-run button click
  const handleRerunClick = (rule: Rule) => {
    // If in carousel mode, use current carousel version as the "previous rules"
    const sourceKey = rule.sourceAnnotationKey;
    if (sourceKey && carouselActiveFor.has(sourceKey)) {
      const versions = ruleVersions.get(sourceKey);
      const currentIdx = carouselCurrentIndex.get(sourceKey) ?? 0;
      const currentVersion = versions?.[currentIdx];
      
      if (currentVersion) {
        // Re-run with current carousel version as previous
        setRerunTargetRule(rule);
        const linkedAsDisplay = currentVersion.rules.map((r, idx) => ({
          ...r,
          displayIndex: idx + 1,
          categoryLabel: rule.sourceAnnotationKey || "",
        }));
        setRerunLinkedRules(linkedAsDisplay);
        // Pass original rule IDs for spinner tracking (carousel rules have different IDs)
        const originalLinkedRules = findLinkedRules(rule);
        const trackingIds = originalLinkedRules.map(r => r.id);
        executeRerun(rule, currentVersion.rules, [], trackingIds);
        return;
      }
    }
    
    // Normal re-run (not in carousel mode)
    const linkedRules = findLinkedRules(rule);
    setRerunTargetRule(rule);
    setRerunLinkedRules(linkedRules);
    
    if (linkedRules.length > 1) {
      // Show confirmation dialog if multiple rules will be affected
      setRerunDialogOpen(true);
    } else {
      // Single rule - proceed directly
      executeRerun(rule, linkedRules);
    }
  };

  // Execute the re-run API call
  const executeRerun = async (
    targetRule: Rule, 
    linkedRules: Rule[], 
    previousAttempts: Rule[][] = [],
    trackingRuleIds?: string[]
  ) => {
    if (!targetRule.sourceAnnotationKey) {
      toast({
        title: "Cannot Re-run",
        description: "This rule doesn't have generation context available.",
      });
      return;
    }

    const context = generationContexts[targetRule.sourceAnnotationKey];
    if (!context) {
      toast({
        title: "Cannot Re-run", 
        description: "Generation context not found. Re-run is only available before saving the playbook.",
      });
      return;
    }

    // Use provided tracking IDs or fall back to linkedRules IDs
    const linkedIds = trackingRuleIds || linkedRules.map(r => r.id);

    setIsRerunning(true);
    setRerunDialogOpen(false);
    
    // Add linked rules to rerunning set (for spinner display)
    setRerunningRuleIds(prev => {
      const newSet = new Set(prev);
      linkedIds.forEach(id => newSet.add(id));
      return newSet;
    });

    try {
      // Build previous rules including all retry attempts
      const allPreviousRules = [
        ...linkedRules.map(r => ({
          ...r,
          attempt: 0, // Original rules
        })),
        ...previousAttempts.flatMap((attemptRules, attemptIndex) => 
          attemptRules.map(r => ({
            ...r,
            attempt: attemptIndex + 1,
          }))
        ),
      ];

      // Get original example_language from first generation (attempt 0)
      const originalRules = linkedRules.filter(r => (r as any).attempt === undefined || (r as any).attempt === 0);
      const originalExampleLanguage = originalRules.find(r => r.example_language)?.example_language;

      const response = await backendApi.rerunRules({
        generationContext: context,
        previousRules: allPreviousRules,
        originalExampleLanguage,
      });

      if (response.success && response.data?.newRules) {
        const sourceKey = targetRule.sourceAnnotationKey;
        if (!sourceKey) {
          toast({
            title: "Error",
            description: "Cannot track rule versions without source annotation key.",
          });
          return;
        }

        // Check if carousel is already active for this annotation
        if (carouselActiveFor.has(sourceKey)) {
          // Add as new version to existing carousel
          addVersionToCarousel(sourceKey, response.data.newRules);
        } else {
          // Initialize new carousel with original + new version
          const originalRules = linkedRules.map(r => ({
            id: r.id,
            rule_number: r.rule_number,
            brief_name: r.brief_name,
            instruction: r.instruction,
            example_language: r.example_language,
            location_text: r.location_text,
            sourceAnnotationKey: r.sourceAnnotationKey,
          })) as Rule[];
          initializeCarousel(sourceKey, originalRules, response.data.newRules);
        }
        
        // Reset rerun state (no preview dialog needed)
        setRerunTargetRule(null);
        setRerunLinkedRules([]);
      } else {
        throw new Error(response.error?.message || "Failed to generate new rules");
      }
    } catch (error) {
      console.error("Re-run failed:", error);
      
      // If already in carousel mode, offer to cancel
      const sourceKey = targetRule.sourceAnnotationKey;
      if (sourceKey && carouselActiveFor.has(sourceKey)) {
        toast({
          title: "Re-run Failed",
          description: "Failed to generate new version. You can try again or accept a previous version.",
        });
      } else {
        toast({
          title: "Re-run Failed",
          description: error instanceof Error ? error.message : "Failed to generate new rules. Please try again.",
        });
      }
    } finally {
      setIsRerunning(false);
      // Remove only these linked rules from rerunning set
      setRerunningRuleIds(prev => {
        const newSet = new Set(prev);
        linkedIds.forEach(id => newSet.delete(id));
        return newSet;
      });
    }
  };

  // Initialize carousel with original + new version after re-run
  const initializeCarousel = (sourceAnnotationKey: string, originalRules: Rule[], newRules: Rule[]) => {
    const versions: RuleVersion[] = [
      { versionIndex: 0, rules: originalRules, isOriginal: true },
      { versionIndex: 1, rules: newRules, isOriginal: false },
    ];
    
    setRuleVersions(prev => new Map(prev).set(sourceAnnotationKey, versions));
    setCarouselCurrentIndex(prev => new Map(prev).set(sourceAnnotationKey, 1)); // Show new version
    setCarouselActiveFor(prev => new Set(prev).add(sourceAnnotationKey));
  };

  // Handle version change in carousel
  const handleCarouselVersionChange = (sourceAnnotationKey: string, newIndex: number) => {
    setCarouselCurrentIndex(prev => new Map(prev).set(sourceAnnotationKey, newIndex));
  };

  // Accept version and exit carousel mode
  const handleCarouselAccept = async (sourceAnnotationKey: string, versionIndex: number) => {
    const versions = ruleVersions.get(sourceAnnotationKey);
    if (!versions) return;
    
    const acceptedVersion = versions[versionIndex];
    if (!acceptedVersion) return;

    // Find position of first rule with this sourceAnnotationKey
    let insertCategory: string | null = null;
    let insertIndex = -1;

    for (const category of rules) {
      const idx = category.rules.findIndex(r => r.sourceAnnotationKey === sourceAnnotationKey);
      if (idx !== -1) {
        insertCategory = category.type;
        insertIndex = idx;
        break;
      }
    }

    // Remove all rules with this sourceAnnotationKey
    const cleanedRules = rules.map(category => ({
      ...category,
      rules: category.rules.filter(r => r.sourceAnnotationKey !== sourceAnnotationKey),
    }));

    // Insert accepted version's rules at the original position
    if (insertCategory && insertIndex !== -1) {
      const categoryIdx = cleanedRules.findIndex(c => c.type === insertCategory);
      if (categoryIdx !== -1) {
        // Assign new IDs to avoid conflicts
        const rulesWithNewIds = acceptedVersion.rules.map(r => ({
          ...r,
          id: r.id || `${sourceAnnotationKey}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        }));
        cleanedRules[categoryIdx].rules.splice(insertIndex, 0, ...rulesWithNewIds);
      }
    }

    setRules(cleanedRules);
    await syncRulesToAPI(cleanedRules);

    // Clear carousel state
    setCarouselActiveFor(prev => {
      const newSet = new Set(prev);
      newSet.delete(sourceAnnotationKey);
      return newSet;
    });
    setRuleVersions(prev => {
      const newMap = new Map(prev);
      newMap.delete(sourceAnnotationKey);
      return newMap;
    });
    setCarouselCurrentIndex(prev => {
      const newMap = new Map(prev);
      newMap.delete(sourceAnnotationKey);
      return newMap;
    });

    toast({
      title: "",
      description: `Selected version ${versionIndex + 1}.`,
    });
  };

  // Cancel carousel mode (discard all versions, keep original)
  const cancelCarouselMode = (sourceAnnotationKey: string) => {
    setCarouselActiveFor(prev => {
      const newSet = new Set(prev);
      newSet.delete(sourceAnnotationKey);
      return newSet;
    });
    setRuleVersions(prev => {
      const newMap = new Map(prev);
      newMap.delete(sourceAnnotationKey);
      return newMap;
    });
    setCarouselCurrentIndex(prev => {
      const newMap = new Map(prev);
      newMap.delete(sourceAnnotationKey);
      return newMap;
    });

    };

  // Remove a single version from carousel (called when user clicks X button)
  const removeVersionFromCarousel = (sourceAnnotationKey: string, versionIndexToRemove: number) => {
    const versions = ruleVersions.get(sourceAnnotationKey);
    if (!versions) return;

    const removedVersionNumber = versionIndexToRemove + 1; // For display (1-indexed)

    // If only 2 versions, removing one means exit carousel mode and apply remaining
    if (versions.length <= 2) {
      const remainingVersion = versions.find((_, idx) => idx !== versionIndexToRemove);
      if (remainingVersion) {
        // Apply the remaining version
        handleCarouselAccept(sourceAnnotationKey, remainingVersion.versionIndex);
      }
      toast({
        title: "",
        description: `Removed version ${removedVersionNumber}.`,
      });
      return;
    }

    // Remove the version and re-index
    const newVersions = versions
      .filter((_, idx) => idx !== versionIndexToRemove)
      .map((v, idx) => ({ ...v, versionIndex: idx }));

    setRuleVersions(prev => new Map(prev).set(sourceAnnotationKey, newVersions));

    // Adjust current index if needed
    const currentIdx = carouselCurrentIndex.get(sourceAnnotationKey) ?? 0;
    let newCurrentIdx = currentIdx;
    if (currentIdx >= versionIndexToRemove) {
      newCurrentIdx = Math.max(0, currentIdx - 1);
    }
    setCarouselCurrentIndex(prev => new Map(prev).set(sourceAnnotationKey, newCurrentIdx));

    toast({
      title: "",
      description: `Removed version ${removedVersionNumber}.`,
    });
  };

  // Add new version to existing carousel (for "Try Again")
  const addVersionToCarousel = (sourceAnnotationKey: string, newRules: Rule[]) => {
    setRuleVersions(prev => {
      const newMap = new Map(prev);
      const versions = newMap.get(sourceAnnotationKey) || [];
      const newVersion: RuleVersion = {
        versionIndex: versions.length,
        rules: newRules,
        isOriginal: false,
      };
      newMap.set(sourceAnnotationKey, [...versions, newVersion]);
      return newMap;
    });
    
    // Navigate to new version
    setCarouselCurrentIndex(prev => {
      const versions = ruleVersions.get(sourceAnnotationKey) || [];
      return new Map(prev).set(sourceAnnotationKey, versions.length); // Point to new version
    });
  };

  // Cancel re-run and keep original rules
  const cancelRerun = () => {
    setRerunDialogOpen(false);
    setRerunTargetRule(null);
    setRerunLinkedRules([]);
    setRerunningRuleIds(new Set());
  };

  const moveRule = (
    sourceArray: Rule[],
    targetArray: Rule[],
    target: string,
    sourceCategoryType: string
  ) => {
    // 查找源数组中的规则
    const ruleIndex = sourceArray.findIndex((rule) => rule.rule_number === target);

    // 移动规则
    const rule = sourceArray.splice(ruleIndex, 1)[0];

    // Determine target category type
    const targetCategoryType =
      sourceCategoryType === "Rules for Contract Amendments"
        ? "Conditional Rules for Contract Amendments"
        : "Rules for Contract Amendments";

    // Check if this rule is being moved back to its original category
    if (
      rule.originalCategory &&
      rule.originalPosition !== undefined &&
      rule.originalCategory === targetCategoryType
    ) {
      // If moving back to original category, restore original position
      targetArray.splice(rule.originalPosition, 0, rule);
    } else {
      // If moving to new category, add to end and track original info
      const updatedRule = {
        ...rule,
        originalPosition: ruleIndex,
        originalCategory: sourceCategoryType,
      };
      targetArray.push(updatedRule);
    }

    return { sourceArray, targetArray };
  };

  const removeRule = async (type: string, removedRuleNumber: string) => {
    // Update local state
    const updatedRules = rules.map((obj) =>
      obj.type === type
        ? {
            ...obj,
            rules: obj.rules.filter((rule) => rule.rule_number !== removedRuleNumber),
          }
        : obj
    );
    
    setRules(updatedRules);
    
    // Sync to API
    const synced = await syncRulesToAPI(updatedRules);
    if (!synced) {
      toast({
        title: "Rule Removed Locally",
        description: "Rule removed locally. Failed to sync to server. Changes will be saved when you save the playbook.",
      });
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, ruleNumber: string, type: string, index: number) => {
    setDraggedRule({ ruleNumber, type, index });
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", ruleNumber);
  };

  const handleDragOver = (e: React.DragEvent, targetIndex: number, categoryType: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";

    // Only show drop indicator if dragging within the same category
    if (draggedRule && draggedRule.type === categoryType) {
      // Calculate drop position based on mouse position within the card
      const rect = e.currentTarget.getBoundingClientRect();
      const dropY = e.clientY;
      const cardHeight = rect.height;

      let dropPosition: "above" | "below" | "between";

      // Determine drop position with more precision
      if (dropY < rect.top + cardHeight * 0.3) {
        // Top 30% of card - drop above
        dropPosition = "above";
      } else if (dropY > rect.top + cardHeight * 0.7) {
        // Bottom 30% of card - drop below
        dropPosition = "below";
      } else {
        // Middle 40% of card - drop between
        dropPosition = "between";
      }

      // Calculate position for drop indicator
      const containerRect = e.currentTarget.closest(".cardContent")?.getBoundingClientRect();
      if (containerRect) {
        let indicatorTop: number;

        if (dropPosition === "above") {
          indicatorTop = rect.top - containerRect.top - 1;
        } else if (dropPosition === "below") {
          indicatorTop = rect.bottom - containerRect.top + 1;
        } else {
          // Between - show in middle of current card
          indicatorTop = rect.top - containerRect.top + cardHeight / 2;
        }

        setDropIndicatorPosition({
          top: indicatorTop,
          left: 0,
          width: containerRect.width,
        });
        setShowDropIndicator(true);
      }

      setDragOverIndex(targetIndex);
      setDragOverCategory(categoryType);
      setDropPosition(dropPosition);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if leaving the entire drop zone, not just moving between children
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;

    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverIndex(null);
      setDragOverCategory(null);
      setDropPosition(null);
      setShowDropIndicator(false);
      setDropIndicatorPosition(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number, categoryType: string) => {
    e.preventDefault();

    console.log("Drop event:", { draggedRule, targetIndex, categoryType, dropPosition });

    if (!draggedRule || draggedRule.type !== categoryType) {
      console.log("Invalid drop: different category or no dragged rule");
      setDraggedRule(null);
      setDragOverIndex(null);
      setDragOverCategory(null);
      setDropPosition(null);
      return;
    }

    // Hide drop indicator
    setShowDropIndicator(false);
    setDropIndicatorPosition(null);

    // Reorder within the same category
    setRules((prevRules) => {
      const category = prevRules.find((cat) => cat.type === categoryType);
      if (!category) {
        console.log("Category not found:", categoryType);
        return prevRules;
      }

      const newRules = [...category.rules];
      const draggedItem = newRules[draggedRule.index];

      console.log(
        "Before reorder:",
        newRules.map((r) => r.rule_number)
      );
      console.log(
        "Drop position:",
        dropPosition,
        "Target index:",
        targetIndex,
        "Dragged index:",
        draggedRule.index
      );

      // Remove the dragged item
      newRules.splice(draggedRule.index, 1);

      // Calculate target index based on drop position
      let insertionIndex: number;

      if (dropPosition === "above") {
        // Drop above the target item (before it)
        insertionIndex = targetIndex;
      } else if (dropPosition === "below") {
        // Drop below the target item (after it)
        insertionIndex = targetIndex + 1;
      } else if (dropPosition === "between") {
        // Drop between items - treat as 'above' for the target item
        // This will insert between the target and the item before it
        insertionIndex = targetIndex;
      } else {
        // Default to below
        insertionIndex = targetIndex + 1;
      }

      // If the dragged item was before the drop target, we need to adjust
      // because removing it shifted the indices
      if (draggedRule.index < targetIndex) {
        if (dropPosition === "above" || dropPosition === "between") {
          insertionIndex = targetIndex - 1;
        } else {
          insertionIndex = targetIndex;
        }
      }

      // Ensure we don't go out of bounds
      insertionIndex = Math.max(0, Math.min(insertionIndex, newRules.length));

      console.log("Final insertion index:", insertionIndex);

      // Insert at new position
      newRules.splice(insertionIndex, 0, draggedItem);

      console.log(
        "After reorder:",
        newRules.map((r) => r.rule_number)
      );

      // Update the rules
      const updatedRules = prevRules.map((cat) =>
        cat.type === categoryType ? { ...cat, rules: newRules } : cat
      );
      
      // Sync to API after state update
      setTimeout(() => {
        syncRulesToAPI(updatedRules).catch((error) => {
          console.error("Failed to sync drag-and-drop to API:", error);
        });
      }, 100);
      
      return updatedRules;
    });

    setDraggedRule(null);
    setDragOverIndex(null);
    setDragOverCategory(null);
    setDropPosition(null);
  };

  const handleDragEnd = () => {
    setDraggedRule(null);
    setDragOverIndex(null);
    setDragOverCategory(null);
    setDropPosition(null);
    setShowDropIndicator(false);
    setDropIndicatorPosition(null);
  };

  const addRules = async (type: string, newRules: Rule[]) => {
    // Update local state
    const updatedRules = rules.map((obj) => 
      obj.type === type ? { ...obj, rules: obj.rules.concat(newRules) } : obj
    );
    
    setRules(updatedRules);
    
    // Sync to API
    const synced = await syncRulesToAPI(updatedRules);
    if (!synced) {
      toast({
        title: "Rule Added Locally",
        description: "Rule added locally. Failed to sync to server. Changes will be saved when you save the playbook.",
      });
    }
  };

  const updateRule = async (
    type: string,
    ruleNumber: string,
    updated: { instruction: string; example_language?: string }
  ) => {
    // Update local state
    const updatedRules = rules.map((obj) =>
      obj.type === type
        ? {
            ...obj,
            rules: obj.rules.map((rule) =>
              rule.rule_number === ruleNumber ? { ...rule, ...updated } : rule
            ),
          }
        : obj
    );
    
    setRules(updatedRules);
    
    // Sync to API
    const synced = await syncRulesToAPI(updatedRules);
    if (!synced) {
      toast({
        title: "Update Saved Locally",
        description: "Rule updated locally. Failed to sync to server. Changes will be saved when you save the playbook.",
      });
    }
  };

  const Info: React.FC<InfoProps> = ({ bgColor, content, borderColor, iconColor }) => {
    return (
      <div
        className={styles.alert}
        style={{
          backgroundColor: bgColor,
          borderColor: borderColor,
          padding: "10px",
          marginBottom: "10px",
          maxWidth: "100%",          
          overflow: "hidden",
        }}
      >
        <IoIosInformationCircle
          className={styles.infoIcon}
          style={{
            color: iconColor,
            flexShrink: 0,
          }}
        />
        <span 
          className={styles.alertDescription}
          style={{ whiteSpace: "normal" }}  
        >
          {content}
        </span>
      </div>
    );
  };
  
  // ===========================================================================
  // NOTE 11-27-2025:
  // Removed unused 'error' variable that had a typo ("filed" instead of "field")
  // ===========================================================================

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <Tooltip
          appearance="inverted"
          content="Back"
          positioning="below"
          withArrow
          relationship="label"
        >
          <Button
            icon={<FaArrowLeft />}
            onClick={() => navigateTo("library")}
            className={styles.headerIcon}
          />
        </Tooltip>

        <p className={styles.headerTitle}>Generated Playbook</p>

        <AddDialog
          addRules={addRules}
          existingRules={[...instructions, ...amendmentRules, ...conditionalRules]}
        />
      </div>

      <Divider />
      <PlaybookTooltip />

      <div
        style={{
          padding: "12px",
          backgroundColor: "white",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingBottom: "12px",
          }}
        >
          <Tooltip
            content="Collapse details"
            relationship="label"
            appearance="inverted"
            positioning="below"
            withArrow
          >
            <Button icon={<LuChevronsRightLeft />} />
          </Tooltip>
          {isSavedPlaybook() ? (
            <>
              <Button 
                appearance="primary" 
                icon={<LuSave />} 
                onClick={() => setSettingsDialogOpen(true)}
                style={{
                  background: "var(--brand-gradient)",
                  color: "var(--text-on-brand)",
                  border: "none",
                  fontFamily: "inherit",
                  fontSize: "14px",
                  fontWeight: 500,
                }}
              >
                Save Playbook
              </Button>
              <EditPlaybookDialog
                open={settingsDialogOpen}
                playbook={(() => {
                  try {
                    const stored = localStorage.getItem("playbook");
                    return stored ? JSON.parse(stored) : null;
                  } catch {
                    return null;
                  }
                })()}
                onClose={() => setSettingsDialogOpen(false)}
                onSaved={(updatedPlaybook) => {
                  localStorage.setItem("playbook", JSON.stringify(updatedPlaybook));
                  setSettingsDialogOpen(false);
                  setCarouselActiveFor(new Set());
                  setRuleVersions(new Map());
                  setCarouselCurrentIndex(new Map());
                  localStorage.removeItem("carouselVersions");
                  localStorage.removeItem("carouselActiveFor");
                  localStorage.removeItem("carouselCurrentIndex");
                }}
              />
            </>
          ) : (
            <SavePBDialog 
              rules={rules}
              pendingVersionCount={carouselActiveFor.size}
              onShowPendingAlert={() => {
                setHighlightPendingRules(true);
                
                // Scroll to first pending rule card
                if (carouselActiveFor.size > 0) {
                  const firstPendingKey = Array.from(carouselActiveFor)[0];
                  // Find any rule with this sourceAnnotationKey
                  const allRules = [...instructions, ...amendmentRules, ...conditionalRules];
                  const firstPendingRule = allRules.find(r => r.sourceAnnotationKey === firstPendingKey);
                  
                  if (firstPendingRule) {
                    setTimeout(() => {
                      const element = document.getElementById(`rule-card-${firstPendingRule.id}`);
                      if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }
                    }, 100);
                  }
                }
              }}
              onSaveSuccess={() => {
                setCarouselActiveFor(new Set());
                setRuleVersions(new Map());
                setCarouselCurrentIndex(new Map());
                localStorage.removeItem("carouselVersions");
                localStorage.removeItem("carouselActiveFor");
                localStorage.removeItem("carouselCurrentIndex");
              }}
            />
          )}
        </div>
        {/* Rules for Contract Amendments Section */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          <div
            style={{
              border: "1px solid #80808033",
              borderRadius: "8px",
              padding: "12px",
            }}
          >
            <p
              style={{
                fontSize: "1rem",
                fontWeight: 600,
                marginTop: 0,
              }}
            >
              Rules for Contract Amendments{" "}
            </p>

            <div>
              <Info
                bgColor="#64dde63c"
                borderColor="#25D2DF"
                content="These rules are to be used for contract amendments."
                iconColor="#25D2DF"
              />
              <Divider style={{ marginTop: "16px", marginBottom: "16px" }} />
              
              {/* ===========================================================================
                  NOTE 11-27-2025:
                  Conditional rendering logic:
                  - If conditionalRules.length === 0: Show all amendmentRules directly without
                    sub-categories (no "Always Applied" / "Conditionally Applied" headers)
                  - If conditionalRules.length > 0: Show sub-categories with accordions
                  =========================================================================== */}
              
              {conditionalRules.length === 0 ? (
                /* No conditional rules - show amendment rules directly without sub-categories */
                <div className={`${styles.cardContent} cardContent`}>
                  {showDropIndicator &&
                    dragOverCategory === "Rules for Contract Amendments" &&
                    dropIndicatorPosition && (
                      <div
                        className="drop-indicator"
                        style={{
                          top: dropIndicatorPosition.top,
                          left: dropIndicatorPosition.left,
                          width: dropIndicatorPosition.width,
                        }}
                      />
                    )}

                  {amendmentRules.map((rule, index) => {
                    const carouselData = getCarouselData(rule);
                    
                    // Skip if another rule with same sourceAnnotationKey already rendered the carousel
                    if (carouselData && index > 0) {
                      const prevRulesWithSameKey = amendmentRules.slice(0, index).filter(
                        r => r.sourceAnnotationKey === rule.sourceAnnotationKey
                      );
                      if (prevRulesWithSameKey.length > 0) return null;
                    }

                    if (carouselData) {
                      return (
                        <RuleVersionCarousel
                          key={`carousel-${rule.sourceAnnotationKey}`}
                          versions={carouselData.versions}
                          currentVersionIndex={carouselData.currentIndex}
                          displayStartIndex={index}
                          type="Rules for Contract Amendments"
                          onVersionChange={(newIdx) => handleCarouselVersionChange(carouselData.sourceAnnotationKey, newIdx)}
                          onAcceptVersion={(vIdx) => handleCarouselAccept(carouselData.sourceAnnotationKey, vIdx)}
                          onCancelCarousel={() => cancelCarouselMode(carouselData.sourceAnnotationKey)}
                          onRemoveVersion={(vIdx) => removeVersionFromCarousel(carouselData.sourceAnnotationKey, vIdx)}
                          onRerun={() => handleRerunClick(rule)}
                          isRerunning={rerunningRuleIds.has(rule.id)}
                          moveRule={() => {}}
                          addRules={addRules}
                          removeRule={removeRule}
                          setRules={setRules}
                          updateRule={updateRule}
                          onDragStart={handleDragStart}
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                          onDragEnd={handleDragEnd}
                          isHighlighted={highlightPendingRules}
                        />
                      );
                    }

                    return (
                      <RuleCard
                        key={rule.id || `Amendments-${rule.rule_number}`}
                        ruleId={rule.id}
                        ruleNumber={rule.rule_number}
                        briefName={rule.brief_name}
                        type="Rules for Contract Amendments"
                        index={index}
                        instruction={rule.instruction}
                        example={rule.example_language}
                        locationText={rule.location_text}
                        selectedText={rule.selected_text}
                        sourceAnnotationKey={rule.sourceAnnotationKey}
                        linkedRuleCount={rule.sourceAnnotationKey ? findLinkedRules(rule).length - 1 : 0}
                        linkedRules={getLinkedRulesDetails(rule)}
                        onRerun={isRerunAvailable() ? () => handleRerunClick(rule) : undefined}
                        isRerunning={rerunningRuleIds.has(rule.id)}
                        moveRule={() => {}}
                        addRules={addRules}
                        removeRule={removeRule}
                        setRules={setRules}
                        updateRule={updateRule}
                        onDragStart={handleDragStart}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onDragEnd={handleDragEnd}
                        isHighlighted={false}
                        isDragged={
                          draggedRule?.ruleNumber === rule.rule_number &&
                          draggedRule?.type === "Rules for Contract Amendments"
                        }
                      />
                    );
                  })}
                </div>
              ) : (
                /* Has conditional rules - show sub-categories */
                <>
              {/* Always Applied Sub-section */}
              <Accordion
                collapsible
                openItems={isAlwaysAppliedExpanded ? ["always-applied"] : []}
                onToggle={(_, data) => {
                  setIsAlwaysAppliedExpanded(data.openItems.includes("always-applied"));
                }}
                style={{ width: "100%", margin: 0, padding: 0 }}
              >
                <AccordionItem
                  value="always-applied"
                  className={styles.categoryAccordionItemNoBorder}
                  style={{ width: "100%" }}
                >
                  <AccordionHeader
                    className={styles.categoryAccordionHeader}
                    onClick={() => setIsAlwaysAppliedExpanded(!isAlwaysAppliedExpanded)}
                    expandIcon={null}
                  >
                    <div className={styles.categoryAccordionHeaderContent}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          width: "100%",
                          paddingBottom: "9px",
                        }}
                      >
                        <div
                          style={{ fontSize: "1rem", cursor: "pointer", flex: 1, fontWeight: 600 }}
                        >
                          Always Applied
                        </div>
                        <div>
                          {isAlwaysAppliedExpanded ? (
                            <ChevronUp className={styles.icon} />
                          ) : (
                            <ChevronDown className={styles.icon} />
                          )}
                        </div>
                      </div>
                      <div>
                        {conditionalRules.length !== 0 && (
                          <Info
                            bgColor="rgba(255, 193, 7, 0.05)"
                            borderColor="#FD8C08"
                            content="These rules will always apply."
                            iconColor="#FD8C08"
                          />
                        )}
                      </div>
                    </div>
                  </AccordionHeader>
                  <AccordionPanel>
                    <div className={`${styles.cardContent} cardContent`}>
                      {/* Drop indicator */}
                      {showDropIndicator &&
                        dragOverCategory === "Rules for Contract Amendments" &&
                        dropIndicatorPosition && (
                          <div
                            className="drop-indicator"
                            style={{
                              top: dropIndicatorPosition.top,
                              left: dropIndicatorPosition.left,
                              width: dropIndicatorPosition.width,
                            }}
                          />
                        )}

                      {amendmentRules.map((rule, index) => {
                        const carouselData = getCarouselData(rule);
                        
                        if (carouselData && index > 0) {
                          const prevRulesWithSameKey = amendmentRules.slice(0, index).filter(
                            r => r.sourceAnnotationKey === rule.sourceAnnotationKey
                          );
                          if (prevRulesWithSameKey.length > 0) return null;
                        }

                        if (carouselData) {
                          return (
                            <RuleVersionCarousel
                              key={`carousel-${rule.sourceAnnotationKey}`}
                              versions={carouselData.versions}
                              currentVersionIndex={carouselData.currentIndex}
                              displayStartIndex={index}
                              type="Rules for Contract Amendments"
                              onVersionChange={(newIdx) => handleCarouselVersionChange(carouselData.sourceAnnotationKey, newIdx)}
                              onAcceptVersion={(vIdx) => handleCarouselAccept(carouselData.sourceAnnotationKey, vIdx)}
                              onCancelCarousel={() => cancelCarouselMode(carouselData.sourceAnnotationKey)}
                              onRemoveVersion={(vIdx) => removeVersionFromCarousel(carouselData.sourceAnnotationKey, vIdx)}
                              onRerun={() => handleRerunClick(rule)}
                              isRerunning={rerunningRuleIds.has(rule.id)}
                              moveRule={(ruleNumber) => {
                                const ruleToMove = amendmentRules.find(r => r.rule_number === ruleNumber);
                                if (!ruleToMove) return;
                                const { sourceArray, targetArray } = moveRule(
                                  amendmentRules,
                                  conditionalRules,
                                  ruleNumber,
                                  "Rules for Contract Amendments"
                                );
                                const updatedRules: RuleCategories = [
                                  { type: "Rules for Instruction Requests", rules: instructions },
                                  { type: "Rules for Contract Amendments", rules: sourceArray },
                                  { type: "Conditional Rules for Contract Amendments", rules: targetArray },
                                ];
                                setRules(updatedRules);
                                syncRulesToAPI(updatedRules).catch(console.error);
                              }}
                              addRules={addRules}
                              removeRule={removeRule}
                              setRules={setRules}
                              updateRule={updateRule}
                              onDragStart={handleDragStart}
                              onDragOver={handleDragOver}
                              onDragLeave={handleDragLeave}
                              onDrop={handleDrop}
                              onDragEnd={handleDragEnd}
                              isHighlighted={highlightPendingRules}
                            />
                          );
                        }

                        return (
                          <RuleCard
                            key={rule.id || `Amendments-${rule.rule_number}`}
                            ruleId={rule.id}
                            ruleNumber={rule.rule_number}
                            briefName={rule.brief_name}
                            type="Rules for Contract Amendments"
                            index={index}
                            instruction={rule.instruction}
                            example={rule.example_language}
                            locationText={rule.location_text}
                            selectedText={rule.selected_text}
                            sourceAnnotationKey={rule.sourceAnnotationKey}
                            linkedRuleCount={rule.sourceAnnotationKey ? findLinkedRules(rule).length - 1 : 0}
                            linkedRules={getLinkedRulesDetails(rule)}
                            onRerun={isRerunAvailable() ? () => handleRerunClick(rule) : undefined}
                            isRerunning={rerunningRuleIds.has(rule.id)}
                            moveRule={() => {
                              const { sourceArray, targetArray } = moveRule(
                                amendmentRules,
                                conditionalRules,
                                rule.rule_number,
                                "Rules for Contract Amendments"
                              );
                              const updatedRules: RuleCategories = [
                                { type: "Rules for Instruction Requests", rules: instructions },
                                { type: "Rules for Contract Amendments", rules: sourceArray },
                                { type: "Conditional Rules for Contract Amendments", rules: targetArray },
                              ];
                              setRules(updatedRules);
                              syncRulesToAPI(updatedRules).catch(console.error);
                            }}
                            addRules={addRules}
                            removeRule={removeRule}
                            setRules={setRules}
                            updateRule={updateRule}
                            onDragStart={handleDragStart}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onDragEnd={handleDragEnd}
                            isHighlighted={false}
                            isDragged={
                              draggedRule?.ruleNumber === rule.rule_number &&
                              draggedRule?.type === "Rules for Contract Amendments"
                            }
                          />
                        );
                      })}
                    </div>
                  </AccordionPanel>
                </AccordionItem>
              </Accordion>
              <Divider style={{ marginTop: "16px", marginBottom: "16px" }} />
              {/* ===========================================================================
                  NOTE 11-27-2025:
                  Fixed Conditionally Applied section:
                  1. Changed openItems to use isConditionallyAppliedExpanded state
                  2. Changed accordion value to "conditionally-applied"
                  3. Changed data source from amendmentRules to conditionalRules
                  4. Fixed drop indicator category check
                  5. Fixed RuleCard type prop to "Conditional Rules for Contract Amendments"
                  6. Fixed moveRule to move FROM conditionalRules TO amendmentRules
                  =========================================================================== */}
              <Accordion
                collapsible
                openItems={isConditionallyAppliedExpanded ? ["conditionally-applied"] : []}
                onToggle={(_, data) => {
                  setIsConditionallyAppliedExpanded(data.openItems.includes("conditionally-applied"));
                }}
                style={{ width: "100%", margin: 0, padding: 0 }}
              >
                <AccordionItem
                  value="conditionally-applied"
                  className={styles.categoryAccordionItemNoBorder}
                  style={{ width: "100%" }}
                >
                  <AccordionHeader
                    className={styles.categoryAccordionHeader}
                    onClick={() => setIsConditionallyAppliedExpanded(!isConditionallyAppliedExpanded)}
                    expandIcon={null}
                  >
                    <div className={styles.categoryAccordionHeaderContent}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          width: "100%",
                          paddingBottom: "9px",
                        }}
                      >
                        <div
                          style={{ fontSize: "1rem", cursor: "pointer", flex: 1, fontWeight: 600 }}
                        >
                          Conditionally Applied
                        </div>
                        <div>
                          {isConditionallyAppliedExpanded ? (
                            <ChevronUp className={styles.icon} />
                          ) : (
                            <ChevronDown className={styles.icon} />
                          )}
                        </div>
                      </div>
                      <div>
                        <Info
                          bgColor="rgba(255, 193, 7, 0.05)"
                          borderColor="#FD8C08"
                          content="These rules will apply only when certain conditions are satisfied. We will confirm with you whether such conditions are satisfied for each contract review."
                          iconColor="#FD8C08"
                        />
                      </div>
                    </div>
                  </AccordionHeader>
                  <AccordionPanel>
                    <div className={`${styles.cardContent} cardContent`}>
                      {showDropIndicator &&
                        dragOverCategory === "Conditional Rules for Contract Amendments" &&
                        dropIndicatorPosition && (
                          <div
                            className="drop-indicator"
                            style={{
                              top: dropIndicatorPosition.top,
                              left: dropIndicatorPosition.left,
                              width: dropIndicatorPosition.width,
                            }}
                          />
                        )}

                      {conditionalRules.map((rule, index) => {
                        const carouselData = getCarouselData(rule);
                        
                        if (carouselData && index > 0) {
                          const prevRulesWithSameKey = conditionalRules.slice(0, index).filter(
                            r => r.sourceAnnotationKey === rule.sourceAnnotationKey
                          );
                          if (prevRulesWithSameKey.length > 0) return null;
                        }

                        if (carouselData) {
                          return (
                            <RuleVersionCarousel
                              key={`carousel-${rule.sourceAnnotationKey}`}
                              versions={carouselData.versions}
                              currentVersionIndex={carouselData.currentIndex}
                              displayStartIndex={index}
                              type="Conditional Rules for Contract Amendments"
                              onVersionChange={(newIdx) => handleCarouselVersionChange(carouselData.sourceAnnotationKey, newIdx)}
                              onAcceptVersion={(vIdx) => handleCarouselAccept(carouselData.sourceAnnotationKey, vIdx)}
                              onCancelCarousel={() => cancelCarouselMode(carouselData.sourceAnnotationKey)}
                              onRemoveVersion={(vIdx) => removeVersionFromCarousel(carouselData.sourceAnnotationKey, vIdx)}
                              onRerun={() => handleRerunClick(rule)}
                              isRerunning={rerunningRuleIds.has(rule.id)}
                              moveRule={(ruleNumber) => {
                                const ruleToMove = conditionalRules.find(r => r.rule_number === ruleNumber);
                                if (!ruleToMove) return;
                                const { sourceArray, targetArray } = moveRule(
                                  conditionalRules,
                                  amendmentRules,
                                  ruleNumber,
                                  "Conditional Rules for Contract Amendments"
                                );
                                const updatedRules: RuleCategories = [
                                  { type: "Rules for Instruction Requests", rules: instructions },
                                  { type: "Rules for Contract Amendments", rules: targetArray },
                                  { type: "Conditional Rules for Contract Amendments", rules: sourceArray },
                                ];
                                setRules(updatedRules);
                                syncRulesToAPI(updatedRules).catch(console.error);
                              }}
                              addRules={addRules}
                              removeRule={removeRule}
                              setRules={setRules}
                              updateRule={updateRule}
                              onDragStart={handleDragStart}
                              onDragOver={handleDragOver}
                              onDragLeave={handleDragLeave}
                              onDrop={handleDrop}
                              onDragEnd={handleDragEnd}
                              isHighlighted={highlightPendingRules}
                            />
                          );
                        }

                        return (
                          <RuleCard
                            key={rule.id || `Conditional-${rule.rule_number}`}
                            ruleId={rule.id}
                            ruleNumber={rule.rule_number}
                            briefName={rule.brief_name}
                            type="Conditional Rules for Contract Amendments"
                            index={index}
                            instruction={rule.instruction}
                            example={rule.example_language}
                            locationText={rule.location_text}
                            selectedText={rule.selected_text}
                            sourceAnnotationKey={rule.sourceAnnotationKey}
                            linkedRuleCount={rule.sourceAnnotationKey ? findLinkedRules(rule).length - 1 : 0}
                            linkedRules={getLinkedRulesDetails(rule)}
                            onRerun={isRerunAvailable() ? () => handleRerunClick(rule) : undefined}
                            isRerunning={rerunningRuleIds.has(rule.id)}
                            moveRule={() => {
                              const { sourceArray, targetArray } = moveRule(
                                conditionalRules,
                                amendmentRules,
                                rule.rule_number,
                                "Conditional Rules for Contract Amendments"
                              );
                              const updatedRules: RuleCategories = [
                                { type: "Rules for Instruction Requests", rules: instructions },
                                { type: "Rules for Contract Amendments", rules: targetArray },
                                { type: "Conditional Rules for Contract Amendments", rules: sourceArray },
                              ];
                              setRules(updatedRules);
                              syncRulesToAPI(updatedRules).catch(console.error);
                            }}
                            addRules={addRules}
                            removeRule={removeRule}
                            setRules={setRules}
                            updateRule={updateRule}
                            onDragStart={handleDragStart}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onDragEnd={handleDragEnd}
                            isHighlighted={false}
                            isDragged={
                              draggedRule?.ruleNumber === rule.rule_number &&
                              draggedRule?.type === "Conditional Rules for Contract Amendments"
                            }
                          />
                        );
                      })}
                    </div>
                  </AccordionPanel>
                </AccordionItem>
              </Accordion>
                </>
              )}
            </div>
          </div>
          {instructions.length > 0 && (
          <div
            style={{
              border: "1px solid #80808033",
              borderRadius: "8px",
              padding: "12px",
            }}
          >
            {/* ===========================================================================
                NOTE 11-27-2025:
                Fixed Rules for Instruction Requests section:
                1. Changed state to use isInstructionsExpanded
                2. Changed accordion value to "instructions"
                3. Changed data source from amendmentRules to instructions
                4. Fixed drop indicator category check
                5. Fixed RuleCard type prop to "Rules for Instruction Requests"
                6. Removed moveRule functionality (instructions don't move between categories)
                =========================================================================== */}
            <Accordion
              collapsible
              openItems={isInstructionsExpanded ? ["instructions"] : []}
              onToggle={(_, data) => {
                setIsInstructionsExpanded(data.openItems.includes("instructions"));
              }}
              style={{ width: "100%", margin: 0, padding: 0 }}
            >
              <AccordionItem
                value="instructions"
                className={styles.categoryAccordionItemNoBorder}
                style={{ width: "100%" }}
              >
                <AccordionHeader
                  className={styles.categoryAccordionHeader}
                  onClick={() => setIsInstructionsExpanded(!isInstructionsExpanded)}
                  expandIcon={null}
                >
                  <div className={styles.categoryAccordionHeaderContent}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        width: "100%",
                        paddingBottom: "9px",
                      }}
                    >
                      <div
                        style={{ fontSize: "1rem", cursor: "pointer", flex: 1, fontWeight: 600 }}
                      >
                        Rules for Instruction Requests
                      </div>
                      <div>
                        {isInstructionsExpanded ? (
                          <ChevronUp className={styles.icon} />
                        ) : (
                          <ChevronDown className={styles.icon} />
                        )}
                      </div>
                    </div>
                    <div>
                      <Info
                        bgColor="#64dde63c"
                        borderColor="#25D2DF"
                        content="Pursuant to these rules, you need to confirm the contract clauses with relevant parties."
                        iconColor="#25D2DF"
                      />
                    </div>
                  </div>
                </AccordionHeader>
                <AccordionPanel>
                  <div className={`${styles.cardContent} cardContent`}>
                    {showDropIndicator &&
                      dragOverCategory === "Rules for Instruction Requests" &&
                      dropIndicatorPosition && (
                        <div
                          className="drop-indicator"
                          style={{
                            top: dropIndicatorPosition.top,
                            left: dropIndicatorPosition.left,
                            width: dropIndicatorPosition.width,
                          }}
                        />
                      )}

                    {instructions.map((rule, index) => {
                      const carouselData = getCarouselData(rule);
                      
                      if (carouselData && index > 0) {
                        const prevRulesWithSameKey = instructions.slice(0, index).filter(
                          r => r.sourceAnnotationKey === rule.sourceAnnotationKey
                        );
                        if (prevRulesWithSameKey.length > 0) return null;
                      }

                      if (carouselData) {
                        return (
                          <RuleVersionCarousel
                            key={`carousel-${rule.sourceAnnotationKey}`}
                            versions={carouselData.versions}
                            currentVersionIndex={carouselData.currentIndex}
                            displayStartIndex={index}
                            type="Rules for Instruction Requests"
                            onVersionChange={(newIdx) => handleCarouselVersionChange(carouselData.sourceAnnotationKey, newIdx)}
                            onAcceptVersion={(vIdx) => handleCarouselAccept(carouselData.sourceAnnotationKey, vIdx)}
                            onCancelCarousel={() => cancelCarouselMode(carouselData.sourceAnnotationKey)}
                            onRemoveVersion={(vIdx) => removeVersionFromCarousel(carouselData.sourceAnnotationKey, vIdx)}
                            onRerun={() => handleRerunClick(rule)}
                            isRerunning={rerunningRuleIds.has(rule.id)}
                            moveRule={() => {}}
                            addRules={addRules}
                            removeRule={removeRule}
                            setRules={setRules}
                            updateRule={updateRule}
                            onDragStart={handleDragStart}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onDragEnd={handleDragEnd}
                            isHighlighted={highlightPendingRules}
                          />
                        );
                      }

                      return (
                        <RuleCard
                          key={rule.id || `Instruction-${rule.rule_number}`}
                          ruleId={rule.id}
                          ruleNumber={rule.rule_number}
                          briefName={rule.brief_name}
                          type="Rules for Instruction Requests"
                          index={index}
                          instruction={rule.instruction}
                          example={rule.example_language}
                          locationText={rule.location_text}
                          selectedText={rule.selected_text}
                          sourceAnnotationKey={rule.sourceAnnotationKey}
                          linkedRuleCount={rule.sourceAnnotationKey ? findLinkedRules(rule).length - 1 : 0}
                          linkedRules={getLinkedRulesDetails(rule)}
                          onRerun={isRerunAvailable() ? () => handleRerunClick(rule) : undefined}
                          isRerunning={rerunningRuleIds.has(rule.id)}
                          moveRule={() => {}}
                          addRules={addRules}
                          removeRule={removeRule}
                          setRules={setRules}
                          updateRule={updateRule}
                          onDragStart={handleDragStart}
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                          onDragEnd={handleDragEnd}
                          isHighlighted={false}
                          isDragged={
                            draggedRule?.ruleNumber === rule.rule_number &&
                            draggedRule?.type === "Rules for Instruction Requests"
                          }
                        />
                      );
                    })}
                  </div>
                </AccordionPanel>
              </AccordionItem>
            </Accordion>
          </div>
          )}
        </div>
      </div>

      {/* Re-run Confirmation Dialog */}
      <RerunConfirmDialog
        open={rerunDialogOpen}
        linkedRules={rerunLinkedRules}
        onConfirm={() => rerunTargetRule && executeRerun(rerunTargetRule, rerunLinkedRules)}
        onCancel={cancelRerun}
      />
    </div>
  );
};
