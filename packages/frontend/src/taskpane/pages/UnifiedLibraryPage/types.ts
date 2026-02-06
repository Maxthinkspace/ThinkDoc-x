export type Rule = {
  rule_number: string;
  instruction: string;
  example_language?: string;
  brief_name?: string;
  selected?: boolean;
};

export type RuleCategory = {
  type: string;
  rules: Rule[];
};

export type Playbook = {
  id: string;
  title: string;
  updatedAt: string;
  type: string;
  position: string;
  jurisdiction: string;
  description: string;
  tags: string[];
  rules: RuleCategory[];
};

export type PlaybookCardProps = {
  playbook: Playbook;
};

export type PlaybookRulesDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBack: () => void;
  onApplyRules: (selectedRules: Rule[]) => void;
  rules?: RuleCategory[];
};
