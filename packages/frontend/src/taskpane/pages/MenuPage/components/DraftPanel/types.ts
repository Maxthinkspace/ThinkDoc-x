import React from "react";

export type ActionId =
  | "draft_from_scratch"
  | "redomicile"
  | "redaction"
  | "generate_issue_list"
  | "summarize_negotiation_positions"
  | "form_filler";

export type ActionGroup = "create_language" | "create_analysis" | "automate";

export interface ActionItem {
  id: ActionId;
  title: string;
  description: string;
  group: ActionGroup;
  icon: React.ReactNode;
  enabled?: boolean;
  disabledReason?: string;
}

