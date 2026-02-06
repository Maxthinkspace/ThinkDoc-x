import { generateTextWithJsonParsing } from '../controllers/generate';
import { logger } from '../config/logger';
import { v4 as uuidv4 } from 'uuid';

// ========================================
// INTERFACES
// ========================================

export interface RuleForComparison {
  id: string;
  rule_number: string;
  brief_name: string;
  instruction: string;
  example_language?: string;
  sourcePlaybookId: string;
  sourcePlaybookName: string;
  categoryType: string;
}

export interface RulePair {
  ruleA: RuleForComparison;
  ruleB: RuleForComparison;
  similarityScore?: number;
  explanation?: string;
}

export interface CompareRulesRequest {
  baseRules: RuleForComparison[];
  comparisonRules: RuleForComparison[];
}

export interface CompareRulesResponse {
  overlappingPairs: RulePair[];
  conflictingPairs: RulePair[];
}

export interface MergeRulesRequest {
  rules: Array<{
    id: string;
    instruction: string;
    example_language?: string;
    brief_name?: string;
  }>;
}

export interface MergedRule {
  id: string;
  rule_number: string;
  brief_name: string;
  instruction: string;
  example_language?: string;
}

// ========================================
// PROMPTS
// ========================================

const COMPARE_RULES_PROMPT = `You are a legal expert analyzing contract review rules to identify overlaps and conflicts.

BASE RULES (from Playbook A):
{baseRules}

COMPARISON RULES (from Playbook B):
{comparisonRules}

TASK: Compare each rule in COMPARISON RULES against ALL rules in BASE RULES. Identify:

1. OVERLAPPING PAIRS: Rules that are semantically the same or very similar in meaning/intent, even if worded differently. These can potentially be merged into one rule.

2. CONFLICTING PAIRS: Rules that contradict each other or give opposite instructions. For example:
   - One rule says "include X" while another says "exclude X"
   - One rule requires 30 days notice, another requires 60 days
   - One rule favors the buyer, another favors the seller on the same issue

Return JSON only, no explanation:

{
  "overlappingPairs": [
    {
      "baseRuleId": "<id from base rules>",
      "comparisonRuleId": "<id from comparison rules>",
      "type": "overlapping",
      "similarityScore": <0.0-1.0>,
      "explanation": "<brief explanation of why these overlap>"
    }
  ],
  "conflictingPairs": [
    {
      "baseRuleId": "<id from base rules>",
      "comparisonRuleId": "<id from comparison rules>",
      "type": "conflicting",
      "explanation": "<brief explanation of the conflict>"
    }
  ]
}

RULES:
- Only include pairs where there is a genuine overlap or conflict
- Do not force matches - if rules are about different topics, do not include them
- A rule can appear in multiple pairs if it overlaps/conflicts with multiple rules
- Be conservative: only flag true overlaps (>70% semantic similarity) and clear conflicts
- If no overlaps or conflicts found, return empty arrays`;

const MERGE_RULES_PROMPT = `You are a legal expert merging similar contract review rules into one comprehensive rule.

RULES TO MERGE:
{rules}

TASK: Create a single merged rule that:
1. Combines the intent and coverage of all input rules
2. Uses clear, professional legal language
3. Is comprehensive but not redundant
4. Preserves important nuances from each original rule
5. Creates a merged example language if examples were provided

Return JSON only, no explanation:

{
  "brief_name": "<3-8 word summary of the merged rule>",
  "instruction": "<the merged instruction text>",
  "example_language": "<merged example language, or null if no examples provided>"
}

GUIDELINES:
- The merged instruction should be concise but complete
- If original rules have different conditions, include all conditions
- If original rules have overlapping example language, create a comprehensive example
- Do not lose any important requirements from the original rules`;

// ========================================
// SERVICE FUNCTIONS
// ========================================

export async function compareRulesForCombination(
  request: CompareRulesRequest
): Promise<CompareRulesResponse> {
  const { baseRules, comparisonRules } = request;

  // Early return if either set is empty
  if (!baseRules || baseRules.length === 0 || !comparisonRules || comparisonRules.length === 0) {
    logger.info('Empty rule set provided for comparison');
    return {
      overlappingPairs: [],
      conflictingPairs: [],
    };
  }

  // Format rules for the prompt
  const formatRule = (rule: RuleForComparison): string => {
    let formatted = `[ID: ${rule.id}] [From: ${rule.sourcePlaybookName}]\n`;
    formatted += `Brief Name: ${rule.brief_name || '(none)'}\n`;
    formatted += `Instruction: ${rule.instruction}\n`;
    if (rule.example_language) {
      formatted += `Example: ${rule.example_language}\n`;
    }
    return formatted;
  };

  const formattedBaseRules = baseRules.map(formatRule).join('\n---\n');
  const formattedComparisonRules = comparisonRules.map(formatRule).join('\n---\n');

  const prompt = COMPARE_RULES_PROMPT
    .replace('{baseRules}', formattedBaseRules)
    .replace('{comparisonRules}', formattedComparisonRules);

  logger.info(
    {
      baseRulesCount: baseRules.length,
      comparisonRulesCount: comparisonRules.length,
    },
    'Starting rule comparison for playbook combination'
  );

  try {
    const response = await generateTextWithJsonParsing('', prompt, { model: 'gpt-4o'});

    // Build lookup maps for quick access
    const baseRulesMap = new Map(baseRules.map((r) => [r.id, r]));
    const comparisonRulesMap = new Map(comparisonRules.map((r) => [r.id, r]));

    // Process overlapping pairs
    const overlappingPairs: RulePair[] = [];
    if (Array.isArray(response.overlappingPairs)) {
      for (const pair of response.overlappingPairs) {
        const ruleA = baseRulesMap.get(pair.baseRuleId);
        const ruleB = comparisonRulesMap.get(pair.comparisonRuleId);

        if (ruleA && ruleB) {
          overlappingPairs.push({
            ruleA,
            ruleB,
            similarityScore: pair.similarityScore,
            explanation: pair.explanation,
          });
        }
      }
    }

    // Process conflicting pairs
    const conflictingPairs: RulePair[] = [];
    if (Array.isArray(response.conflictingPairs)) {
      for (const pair of response.conflictingPairs) {
        const ruleA = baseRulesMap.get(pair.baseRuleId);
        const ruleB = comparisonRulesMap.get(pair.comparisonRuleId);

        if (ruleA && ruleB) {
          conflictingPairs.push({
            ruleA,
            ruleB,
            explanation: pair.explanation,
          });
        }
      }
    }

    logger.info(
      {
        overlappingCount: overlappingPairs.length,
        conflictingCount: conflictingPairs.length,
      },
      'Rule comparison completed'
    );

    return {
      overlappingPairs,
      conflictingPairs,
    };
  } catch (error) {
    logger.error({ error }, 'Error in rule comparison');
    return {
      overlappingPairs: [],
      conflictingPairs: [],
    };
  }
}

export async function mergeOverlappingRules(
  request: MergeRulesRequest
): Promise<MergedRule> {
  const { rules } = request;

  if (!rules || rules.length === 0) {
    throw new Error('No rules provided for merging');
  }

  // Only one rule - return it as-is
  if (rules.length === 1) {
    const singleRule = rules[0];
    if (!singleRule) {
      throw new Error('No rules provided for merging');
    }
    const result: MergedRule = {
      id: uuidv4(),
      rule_number: '1',
      brief_name: String(singleRule.brief_name || ''),
      instruction: singleRule.instruction,
    };
    if (singleRule.example_language) {
      result.example_language = singleRule.example_language;
    }
    return result;
  }

  // Format rules for the prompt
  const formattedRules = rules
    .map((rule, idx) => {
      let formatted = `Rule ${idx + 1}:\n`;
      formatted += `Brief Name: ${rule.brief_name || '(none)'}\n`;
      formatted += `Instruction: ${rule.instruction}\n`;
      if (rule.example_language) {
        formatted += `Example Language: ${rule.example_language}\n`;
      }
      return formatted;
    })
    .join('\n---\n');

  const prompt = MERGE_RULES_PROMPT.replace('{rules}', formattedRules);

  logger.info(
    { ruleCount: rules.length },
    'Starting rule merge for playbook combination'
  );

  try {
    const response = await generateTextWithJsonParsing('', prompt, { model: 'gpt-4o'});

    const result: MergedRule = {
      id: uuidv4(),
      rule_number: '1',
      brief_name: String(response.brief_name || ''),
      instruction: String(response.instruction || rules.map((r) => r.instruction).join(' ')),
    };
    if (response.example_language) {
      result.example_language = String(response.example_language);
    }

    logger.info(
      { mergedBriefName: result.brief_name },
      'Rule merge completed'
    );

    return result;
  } catch (error) {
    logger.error({ error }, 'Error in rule merge');

    // Fallback: concatenate instructions
    const examplesWithContent: string[] = [];
    for (const r of rules) {
      if (r && r.example_language) {
        examplesWithContent.push(r.example_language);
      }
    }

    const firstRule = rules[0];
    const fallbackBriefName = firstRule && firstRule.brief_name ? firstRule.brief_name : 'Merged Rule';

    const result: MergedRule = {
      id: uuidv4(),
      rule_number: '1',
      brief_name: fallbackBriefName,
      instruction: rules.map((r) => r.instruction).join('\n\nAdditionally: '),
    };
    if (examplesWithContent.length > 0) {
      result.example_language = examplesWithContent.join('\n\nAlternatively: ');
    }

    return result;
  }
}