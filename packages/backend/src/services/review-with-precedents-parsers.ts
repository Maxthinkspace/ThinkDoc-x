import type { Rule } from '@/types/contract-review';

// Generic helper function 
// Every section number ends with a dot
export function normalizeSectionNumber(section: string): string {
  const normalized = section.trim();
  return normalized.endsWith('.') ? normalized : normalized + '.';
}

// Generic helper function
// Change raw section numbers "Original agreement section number: Section 1.2.3" from LLM to "1.2.3."
export function parseSectionResponse(
  content: string,
  targetType: 'original' | 'reference'  
): string[] {
  const sections: string[] = [];
  const lines = content.split('\n');

  const pattern = targetType === 'original'
    ? /Original agreement section number:\s*(?:Section\s+)?(.+)/i
    : /Reference agreement section number:\s*(?:Section\s+)?(.+)/i;

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    const match = trimmedLine.match(pattern);
    if (match?.[1]) {
      const rawSections = match[1].split(',').map(s => s.trim());
      
      for (const rawSection of rawSections) {
        if (!rawSection) continue;
        if (rawSection.toUpperCase().trim() === 'NOT FOUND') {
          return ['NOT FOUND'];
        }
        
        let section = rawSection;
        section = section.replace(/^Section\s+/i, '');
        section = section.replace(/[.,;]$/, '');
        
        const normalized = normalizeSectionNumber(section);
        sections.push(normalized);
      }
    }
  }

  if (sections.length === 0) {
    return ['NOT FOUND'];
  }

  return sections;
}

// ADAPTER - CONVERT "POINTS/LANGUAGE TO BE ADDED" TO FORMAT OF PLAYBOOK RULES
function parseRuleResponse(
  content: string,
  pointKeyword: string,
  languageKeyword: string
): Rule[] {
  const rules: Rule[] = [];
  const lines = content.split('\n');
  let currentRule: { content?: string; example?: string } = {};

  const pointPattern = new RegExp(`^Point to be ${pointKeyword} #\\d+:\\s*(.+)`, 'i');
  const languagePattern = new RegExp(`^Language to be ${languageKeyword} #\\d+:\\s*(.+)`, 'i');

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    const pointMatch = trimmedLine.match(pointPattern);
    if (pointMatch?.[1]) {
      if (currentRule.content && currentRule.example) {
        rules.push({
          id: `temp-${rules.length + 1}`,
          content: currentRule.content,
          example: currentRule.example,
        });
      }
      currentRule = { content: pointMatch[1].trim() };
      continue;
    }

    const languageMatch = trimmedLine.match(languagePattern);
    if (languageMatch?.[1]) {
      currentRule.example = languageMatch[1].trim();
      continue;
    }
  }

  if (currentRule.content && currentRule.example) {
    rules.push({
      id: `temp-${rules.length + 1}`,
      content: currentRule.content,
      example: currentRule.example,
    });
  }

  return rules;
}

export function parsePotentialAdditionsResponse(content: string): {
  result: 'SAME' | 'HAS_ADDITIONS';
  pointsToAdd?: Rule[];
} {
  const trimmed = content.trim().toUpperCase();

  if (trimmed.includes('SAME') || trimmed.includes('NO ADDITIONAL POINT')) {
    return { result: 'SAME' };
  }

  const rules = parseRuleResponse(content, 'added', 'added');

  if (rules.length === 0) {
    return { result: 'SAME' };
  }

  return {
    result: 'HAS_ADDITIONS',
    pointsToAdd: rules,
  };
}

export function parsePotentialDeletionsResponse(content: string): {
  result: 'SAME' | 'HAS_AMENDMENTS';
  pointsToAmend?: Rule[];
} {
  const trimmed = content.trim().toUpperCase();

  if (trimmed.includes('SAME') || trimmed.includes('NO ADDITIONAL POINT')) {
    return { result: 'SAME' };
  }

  const rules = parseRuleResponse(content, '(?:deleted|amended)', 'amended');

  if (rules.length === 0) {
    return { result: 'SAME' };
  }

  return {
    result: 'HAS_AMENDMENTS',
    pointsToAmend: rules,
  };
}

export function parseGlobalAdditionMappingResponse(content: string): string[] {
  return parseSectionResponse(content, 'original');
}

export function parseGlobalDeletionMappingResponse(content: string): string[] {
  return parseSectionResponse(content, 'reference');
}

