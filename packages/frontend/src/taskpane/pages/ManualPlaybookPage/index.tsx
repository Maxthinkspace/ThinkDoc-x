import * as React from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Divider,
  Field,
  Input,
  Select,
  Tooltip,
  makeStyles,
  Accordion,
  AccordionItem,
  AccordionHeader,
  AccordionPanel,
  Textarea,
} from "@fluentui/react-components";
import { FaArrowLeft, FaPlus } from "react-icons/fa6";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { LuSave } from "react-icons/lu";
import { IoIosInformationCircle } from "react-icons/io";
import { useNavigation } from "../../hooks/use-navigation";
import { backendApi } from "../../../services/api";
import { useToast } from "../../hooks/use-toast";
import { RuleCard } from "../RulesPage/components/RuleCard";
import { ManualAddRuleDialog } from "./components/ManualAddRuleDialog";

const useStyles = makeStyles({
  root: {
    minHeight: "100vh",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
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
  alert: {
    display: "flex",
    alignItems: "start",
    borderRadius: "8px",
    gap: "8px",
    border: "1px solid",
  },
  alertDescription: {
    fontSize: "14px",
  },
  cardContent: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    padding: "5px",
  },
  icon: {
    width: "16px",
    height: "16px",
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
    "&:hover": {
      backgroundColor: "transparent",
    },
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px 20px",
    color: "#6b7280",
    textAlign: "center",
    border: "2px dashed #e5e7eb",
    borderRadius: "8px",
    margin: "8px 0",
  },
  saveButtonContainer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: "12px",
  },
});

export type Rule = {
  id: string;
  rule_number: string;
  brief_name: string;
  instruction: string;
  example_language?: string;
  location_text?: string;
};

export type RuleCategory = {
  type:
    | "Rules for Instruction Requests"
    | "Rules for Contract Amendments"
    | "Conditional Rules for Contract Amendments";
  rules: Rule[];
};

export type RuleCategories = RuleCategory[];

type InfoProps = {
  bgColor: string;
  borderColor: string;
  content: string;
  iconColor: string;
};

const jurisdictions = [
  "Singapore",
  "Malaysia",
  "Hong Kong",
  "Thailand",
  "No specific jurisdiction",
];

export const ManualPlaybookPage = () => {
  const styles = useStyles();
  const { navigateTo } = useNavigation();
  const { toast } = useToast();

  // Rules state
  const [rules, setRules] = React.useState<RuleCategories>([
    { type: "Rules for Instruction Requests", rules: [] },
    { type: "Rules for Contract Amendments", rules: [] },
    { type: "Conditional Rules for Contract Amendments", rules: [] },
  ]);

  // Save dialog state
  const [saveDialogOpen, setSaveDialogOpen] = React.useState(false);
  const [playbookName, setPlaybookName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [playbookType, setPlaybookType] = React.useState("Review");
  const [userPosition, setUserPosition] = React.useState("Neutral");
  const [customPosition, setCustomPosition] = React.useState("");
  const [jurisdiction, setJurisdiction] = React.useState("Singapore");
  const [tags, setTags] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState("");

  // UI state
  const [isAlwaysAppliedExpanded, setIsAlwaysAppliedExpanded] = React.useState(true);
  const [isConditionallyAppliedExpanded, setIsConditionallyAppliedExpanded] = React.useState(true);
  const [isInstructionsExpanded, setIsInstructionsExpanded] = React.useState(true);

  // Get rules by category
  const instructions = rules.find((obj) => obj.type === "Rules for Instruction Requests")?.rules || [];
  const amendmentRules = rules.find((obj) => obj.type === "Rules for Contract Amendments")?.rules || [];
  const conditionalRules = rules.find((obj) => obj.type === "Conditional Rules for Contract Amendments")?.rules || [];

  // Get all existing rules for rule number generation
  const allExistingRules = React.useMemo(() => {
    return [...instructions, ...amendmentRules, ...conditionalRules];
  }, [instructions, amendmentRules, conditionalRules]);

  // Total rule count
  const totalRuleCount = instructions.length + amendmentRules.length + conditionalRules.length;

  // Add rules handler
  const addRules = (type: string, newRules: Rule[]) => {
    setRules((prev) =>
      prev.map((obj) =>
        obj.type === type ? { ...obj, rules: [...obj.rules, ...newRules] } : obj
      )
    );
  };

  // Remove rule handler
  const removeRule = (type: string, removedRuleNumber: string) => {
    setRules((prev) =>
      prev.map((obj) =>
        obj.type === type
          ? { ...obj, rules: obj.rules.filter((rule) => rule.rule_number !== removedRuleNumber) }
          : obj
      )
    );
  };

  // Update rule handler
  const updateRule = (
    type: string,
    ruleNumber: string,
    updated: { instruction: string; example_language?: string }
  ) => {
    setRules((prev) =>
      prev.map((obj) =>
        obj.type === type
          ? {
              ...obj,
              rules: obj.rules.map((rule) =>
                rule.rule_number === ruleNumber ? { ...rule, ...updated } : rule
              ),
            }
          : obj
      )
    );
  };

  // Move rule between categories
  const moveRule = (
    sourceType: string,
    targetType: string,
    ruleNumber: string
  ) => {
    setRules((prev) => {
      const newRules = prev.map((cat) => ({ ...cat, rules: [...cat.rules] }));
      const sourceCategory = newRules.find((c) => c.type === sourceType);
      const targetCategory = newRules.find((c) => c.type === targetType);

      if (!sourceCategory || !targetCategory) return prev;

      const ruleIndex = sourceCategory.rules.findIndex((r) => r.rule_number === ruleNumber);
      if (ruleIndex === -1) return prev;

      const [rule] = sourceCategory.rules.splice(ruleIndex, 1);
      targetCategory.rules.push(rule);

      return newRules;
    });
  };

  // Open save dialog
  const handleOpenSaveDialog = () => {
    if (totalRuleCount === 0) {
      toast({
        title: "No Rules Added",
        description: "Please add at least one rule before saving.",
      });
      return;
    }
    setErrorMessage("");
    setSaveDialogOpen(true);
  };

  // Save playbook handler
  const handleSave = async () => {
    setErrorMessage("");

    // Validate required fields
    const missingFields = [];
    if (!playbookName.trim()) {
      missingFields.push("Playbook Name");
    }
    if (!playbookType) {
      missingFields.push("Playbook Type");
    }
    if (!jurisdiction) {
      missingFields.push("Jurisdiction");
    }

    if (missingFields.length > 0) {
      setErrorMessage(`Please complete all required fields. Missing: ${missingFields.join(", ")}`);
      return;
    }

    setIsSaving(true);

    // Clean rules for API
    const cleanedRules = rules.map(({ type, rules: ruleList }) => ({
      type,
      rules: ruleList.map(({ id, rule_number, brief_name, instruction, example_language, location_text }) => ({
        id,
        rule_number,
        brief_name,
        instruction,
        example_language,
        location_text,
      })),
    }));

    const pb = {
      rules: cleanedRules,
      playbookName,
      description,
      playbookType,
      userPosition: customPosition || userPosition,
      jurisdiction,
      tags,
    };

    try {
      await backendApi.createPlaybook(pb);
      toast({
        title: "Playbook Saved",
        description: `"${playbookName}" has been saved to your library.`,
      });
      setSaveDialogOpen(false);
      navigateTo("library");
    } catch (error) {
      console.error("Error saving playbook:", error);
      setErrorMessage("Failed to save playbook. Please try again.");
      toast({
        title: "Failed to save playbook",
        description: "Oops, something went wrong. Please try again.",
      });
    } finally {
      setIsSaving(false);
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
        }}
      >
        <IoIosInformationCircle
          className={styles.infoIcon}
          style={{ color: iconColor }}
        />
        <span className={styles.alertDescription}>{content}</span>
      </div>
    );
  };

  // Empty state with add button for each category
  const EmptyStateWithAdd: React.FC<{ ruleType: string }> = ({ ruleType }) => (
    <div className={styles.emptyState}>
      <ManualAddRuleDialog
        addRules={addRules}
        existingRules={allExistingRules}
        defaultRuleType={ruleType}
        triggerButton={
          <Button
            icon={<FaPlus style={{ fontSize: "16px" }} />}
            appearance="subtle"
            style={{
              marginBottom: "8px",
              color: "#0F62FE",
              backgroundColor: "#EBF5FF",
              borderRadius: "50%",
              width: "40px",
              height: "40px",
              minWidth: "40px",
              padding: 0,
            }}
          />
        }
      />
      <p style={{ margin: 0, fontSize: "13px" }}>
        Click the <strong>+</strong> button to add rules
      </p>
    </div>
  );

  return (
    <div className={styles.root}>
      {/* Header */}
      <div className={styles.header}>
        <Tooltip
          appearance="inverted"
          content="Back to library"
          positioning="below"
          withArrow
          relationship="label"
        >
          <Button
            icon={<FaArrowLeft style={{ fontSize: "12px" }} />}
            onClick={() => navigateTo("library")}
            className={styles.headerIcon}
            style={{
              minWidth: "28px",
              maxWidth: "28px",
              height: "28px",
              padding: "0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          />
        </Tooltip>
        <p className={styles.headerTitle}>Create Playbook Manually</p>
        {/* Empty div for spacing */}
        <div style={{ width: "28px" }} />
      </div>

      <Divider />

      <div style={{ padding: "12px", backgroundColor: "white" }}>
        {/* Save button and rule count */}
        <div className={styles.saveButtonContainer}>
          <span style={{ fontSize: "14px", color: "#6b7280" }}>
            {totalRuleCount} rule{totalRuleCount !== 1 ? "s" : ""} added
          </span>
          <Button
            appearance="primary"
            icon={<LuSave />}
            onClick={handleOpenSaveDialog}
            disabled={totalRuleCount === 0}
            style={{ backgroundColor: totalRuleCount === 0 ? "#94a3b8" : "#0F62FE" }}
          >
            Save Playbook
          </Button>
        </div>

        {/* Rules Section */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {/* Rules for Contract Amendments */}
          <div style={{ border: "1px solid #80808033", borderRadius: "8px", padding: "12px" }}>
            <p style={{ fontSize: "1rem", fontWeight: 600, marginTop: 0 }}>
              Rules for Contract Amendments
            </p>
            <Info
              bgColor="#64dde63c"
              borderColor="#25D2DF"
              content="These rules are to be used for contract amendments."
              iconColor="#25D2DF"
            />
            <Divider style={{ marginTop: "16px", marginBottom: "16px" }} />

            {/* Always Applied Sub-section */}
            <Accordion
              collapsible
              openItems={isAlwaysAppliedExpanded ? ["always-applied"] : []}
              onToggle={(_, data) => setIsAlwaysAppliedExpanded(data.openItems.includes("always-applied"))}
              style={{ width: "100%", margin: 0, padding: 0 }}
            >
              <AccordionItem value="always-applied" className={styles.categoryAccordionItemNoBorder}>
                <AccordionHeader
                  className={styles.categoryAccordionHeader}
                  onClick={() => setIsAlwaysAppliedExpanded(!isAlwaysAppliedExpanded)}
                  expandIcon={null}
                >
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "start", width: "100%" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", width: "100%", paddingBottom: "9px" }}>
                      <span style={{ fontSize: "1rem", fontWeight: 600 }}>Always Applied</span>
                      {isAlwaysAppliedExpanded ? <ChevronUp className={styles.icon} /> : <ChevronDown className={styles.icon} />}
                    </div>
                    <Info
                      bgColor="rgba(255, 193, 7, 0.05)"
                      borderColor="#FD8C08"
                      content="These rules will always apply."
                      iconColor="#FD8C08"
                    />
                  </div>
                </AccordionHeader>
                <AccordionPanel>
                  <div className={styles.cardContent}>
                    {amendmentRules.length === 0 ? (
                      <EmptyStateWithAdd ruleType="Rules for Contract Amendments" />
                    ) : (
                      <>
                        {amendmentRules.map((rule, index) => (
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
                            linkedRuleCount={0}
                            linkedRules={[]}
                            moveRule={() => moveRule("Rules for Contract Amendments", "Conditional Rules for Contract Amendments", rule.rule_number)}
                            addRules={addRules}
                            removeRule={removeRule}
                            setRules={setRules}
                            updateRule={updateRule}
                            onDragStart={() => {}}
                            onDragOver={() => {}}
                            onDragLeave={() => {}}
                            onDrop={() => {}}
                            onDragEnd={() => {}}
                            isDragged={false}
                          />
                        ))}
                        <EmptyStateWithAdd ruleType="Rules for Contract Amendments" />
                      </>
                    )}
                  </div>
                </AccordionPanel>
              </AccordionItem>
            </Accordion>

            <Divider style={{ marginTop: "16px", marginBottom: "16px" }} />

            {/* Conditionally Applied Sub-section */}
            <Accordion
              collapsible
              openItems={isConditionallyAppliedExpanded ? ["conditionally-applied"] : []}
              onToggle={(_, data) => setIsConditionallyAppliedExpanded(data.openItems.includes("conditionally-applied"))}
              style={{ width: "100%", margin: 0, padding: 0 }}
            >
              <AccordionItem value="conditionally-applied" className={styles.categoryAccordionItemNoBorder}>
                <AccordionHeader
                  className={styles.categoryAccordionHeader}
                  onClick={() => setIsConditionallyAppliedExpanded(!isConditionallyAppliedExpanded)}
                  expandIcon={null}
                >
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "start", width: "100%" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", width: "100%", paddingBottom: "9px" }}>
                      <span style={{ fontSize: "1rem", fontWeight: 600 }}>Conditionally Applied</span>
                      {isConditionallyAppliedExpanded ? <ChevronUp className={styles.icon} /> : <ChevronDown className={styles.icon} />}
                    </div>
                    <Info
                      bgColor="rgba(255, 193, 7, 0.05)"
                      borderColor="#FD8C08"
                      content="These rules will apply only when certain conditions are satisfied."
                      iconColor="#FD8C08"
                    />
                  </div>
                </AccordionHeader>
                <AccordionPanel>
                  <div className={styles.cardContent}>
                    {conditionalRules.length === 0 ? (
                      <EmptyStateWithAdd ruleType="Conditional Rules for Contract Amendments" />
                    ) : (
                      <>
                        {conditionalRules.map((rule, index) => (
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
                            linkedRuleCount={0}
                            linkedRules={[]}
                            moveRule={() => moveRule("Conditional Rules for Contract Amendments", "Rules for Contract Amendments", rule.rule_number)}
                            addRules={addRules}
                            removeRule={removeRule}
                            setRules={setRules}
                            updateRule={updateRule}
                            onDragStart={() => {}}
                            onDragOver={() => {}}
                            onDragLeave={() => {}}
                            onDrop={() => {}}
                            onDragEnd={() => {}}
                            isDragged={false}
                          />
                        ))}
                        <EmptyStateWithAdd ruleType="Conditional Rules for Contract Amendments" />
                      </>
                    )}
                  </div>
                </AccordionPanel>
              </AccordionItem>
            </Accordion>
          </div>

          {/* Rules for Instruction Requests */}
          <div style={{ border: "1px solid #80808033", borderRadius: "8px", padding: "12px" }}>
            <Accordion
              collapsible
              openItems={isInstructionsExpanded ? ["instructions"] : []}
              onToggle={(_, data) => setIsInstructionsExpanded(data.openItems.includes("instructions"))}
              style={{ width: "100%", margin: 0, padding: 0 }}
            >
              <AccordionItem value="instructions" className={styles.categoryAccordionItemNoBorder}>
                <AccordionHeader
                  className={styles.categoryAccordionHeader}
                  onClick={() => setIsInstructionsExpanded(!isInstructionsExpanded)}
                  expandIcon={null}
                >
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "start", width: "100%" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", width: "100%", paddingBottom: "9px" }}>
                      <span style={{ fontSize: "1rem", fontWeight: 600 }}>Rules for Instruction Requests</span>
                      {isInstructionsExpanded ? <ChevronUp className={styles.icon} /> : <ChevronDown className={styles.icon} />}
                    </div>
                    <Info
                      bgColor="#64dde63c"
                      borderColor="#25D2DF"
                      content="Pursuant to these rules, you need to confirm the contract clauses with relevant parties."
                      iconColor="#25D2DF"
                    />
                  </div>
                </AccordionHeader>
                <AccordionPanel>
                  <div className={styles.cardContent}>
                    {instructions.length === 0 ? (
                      <EmptyStateWithAdd ruleType="Rules for Instruction Requests" />
                    ) : (
                      <>
                        {instructions.map((rule, index) => (
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
                            linkedRuleCount={0}
                            linkedRules={[]}
                            moveRule={() => {}}
                            addRules={addRules}
                            removeRule={removeRule}
                            setRules={setRules}
                            updateRule={updateRule}
                            onDragStart={() => {}}
                            onDragOver={() => {}}
                            onDragLeave={() => {}}
                            onDrop={() => {}}
                            onDragEnd={() => {}}
                            isDragged={false}
                          />
                        ))}
                        <EmptyStateWithAdd ruleType="Rules for Instruction Requests" />
                      </>
                    )}
                  </div>
                </AccordionPanel>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </div>

      {/* Save Playbook Dialog */}
      <Dialog
        open={saveDialogOpen}
        onOpenChange={(_, data) => {
          setSaveDialogOpen(data.open);
          if (!data.open) {
            setErrorMessage("");
          }
        }}
      >
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Save Playbook</DialogTitle>
            <DialogContent>
              {errorMessage && (
                <div
                  style={{
                    padding: "12px",
                    backgroundColor: "#fef2f2",
                    border: "1px solid #fecaca",
                    borderRadius: "8px",
                    color: "#dc2626",
                    marginBottom: "16px",
                    fontSize: "14px",
                  }}
                >
                  {errorMessage}
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {/* Playbook Name */}
                <Field>
                  <label style={{ fontSize: 14, fontWeight: 500, color: "#242424", marginBottom: 6, display: "block" }}>
                    Playbook Name<span style={{ color: "red" }}>*</span>
                  </label>
                  <Input
                    value={playbookName}
                    onChange={(e) => setPlaybookName(e.target.value)}
                    placeholder="Enter playbook name"
                    style={{ fontSize: 14, width: "100%" }}
                  />
                </Field>

                {/* Description */}
                <Field>
                  <label style={{ fontSize: 14, fontWeight: 500, color: "#242424", marginBottom: 6, display: "block" }}>
                    Description
                  </label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optional description of this playbook"
                    style={{ fontSize: 14 }}
                  />
                </Field>

                {/* Playbook Type */}
                <Field>
                  <label style={{ fontSize: 14, fontWeight: 500, color: "#242424", marginBottom: 6, display: "block" }}>
                    Playbook Type<span style={{ color: "red" }}>*</span>
                  </label>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <label style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                      <input
                        style={{ marginTop: 6 }}
                        type="radio"
                        value="Review"
                        checked={playbookType === "Review"}
                        onChange={() => setPlaybookType("Review")}
                      />
                      <span>Review Playbook – Used to review existing agreements</span>
                    </label>
                    <label style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                      <input
                        style={{ marginTop: 6 }}
                        type="radio"
                        value="Drafting"
                        checked={playbookType === "Drafting"}
                        onChange={() => setPlaybookType("Drafting")}
                      />
                      <span>Drafting Playbook – Used to draft new agreements</span>
                    </label>
                  </div>
                </Field>

                {/* User's Position */}
                <Field>
                  <label style={{ fontSize: 14, fontWeight: 500, color: "#242424", marginBottom: 6, display: "block" }}>
                    User's Position
                  </label>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Button
                      appearance={userPosition === "Neutral" && !customPosition ? "primary" : "outline"}
                      style={{
                        padding: "6px 12px",
                        backgroundColor: userPosition === "Neutral" && !customPosition ? "#0F62FE" : "transparent",
                      }}
                      onClick={() => {
                        setUserPosition("Neutral");
                        setCustomPosition("");
                      }}
                    >
                      Neutral
                    </Button>
                    <Input
                      placeholder="e.g., Buyer, Seller"
                      value={customPosition}
                      onChange={(e) => {
                        setCustomPosition(e.target.value);
                        if (e.target.value) {
                          setUserPosition("");
                        }
                      }}
                      style={{ flex: 1, fontSize: 14 }}
                    />
                  </div>
                </Field>

                {/* Jurisdiction */}
                <Field>
                  <label style={{ fontSize: 14, fontWeight: 500, color: "#242424", marginBottom: 6, display: "block" }}>
                    Jurisdiction<span style={{ color: "red" }}>*</span>
                  </label>
                  <Select onChange={(_, data) => setJurisdiction(data.value)} value={jurisdiction}>
                    {jurisdictions.map((j) => (
                      <option key={j} value={j}>{j}</option>
                    ))}
                  </Select>
                </Field>

                {/* Tags */}
                <Field>
                  <label style={{ fontSize: 14, fontWeight: 500, color: "#242424", marginBottom: 6, display: "block" }}>
                    Tags (comma-separated)
                  </label>
                  <Textarea
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="e.g., SPA, M&A, confidentiality"
                    style={{ fontSize: 14 }}
                  />
                </Field>
              </div>
            </DialogContent>
            <DialogActions style={{ display: "flex", alignItems: "center", width: "100%", flexDirection: "row" }}>
              <Button
                style={{ flex: 1 }}
                appearance="outline"
                onClick={() => setSaveDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                style={{ flex: 1 }}
                appearance="primary"
                onClick={handleSave}
                disabled={isSaving}
                icon={isSaving ? <Loader2 style={{ width: "16px", height: "16px", animation: "spin 1s linear infinite" }} /> : undefined}
              >
                {isSaving ? "Saving..." : "Save Playbook"}
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
};
