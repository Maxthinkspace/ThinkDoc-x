import type { SectionNode } from '@/types/documents';

export interface Rule {
  id: string
  rule_number?: string;
  content: string
  example?: string | undefined
}

export interface RuleStatus {
  ruleId: string
  status: 'mapped' | 'not_applicable' | 'needs_new_section'
  location?: string
  locations?: string[]
  reason?: string
  suggestedLocation?: string
  suggestedHeading?: string
}

export interface InstructionRequestResult {
  sectionNumber: string;
  ruleId: string;
  status: 'applicable' | 'not_applicable';
  issue?: string;
  relevantLanguage?: string;
}

export interface NewSectionLocation {
  ruleId: string
  suggestedLocation: string
  suggestedHeading: string
}

export interface ReviewWithPlaybooksBody {
  structure: SectionNode[];
  rules: Array<{
    id: string;
    content: string;
    example?: string;
  }>;
}
