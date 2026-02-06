import type { SectionNode } from '@/types/documents'
import type { Rule, RuleStatus } from '@/types/contract-review'

export interface ParsedRuleMappingResponse {
  ruleStatus: RuleStatus[];
}

export function normalizeRuleId(ruleId: string, rules: Rule[]): string {
  ruleId = ruleId.trim().replace(/^Rule\s+/i, '');
  
  const ruleIds = rules
    .map(r => r.id || r.rule_number)
    .filter((id): id is string => id !== undefined);
    
  if (ruleIds.includes(ruleId)) {
    return ruleId;
  }
  
  for (const validId of ruleIds) {
    if (validId.includes(ruleId) || ruleId.includes(validId)) {
      return validId;
    }
  }
  
  return ruleId;
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Remove section numbers from the beginning of text
 * Strategy 1: Match against known section number if provided (section numbers are stored with trailing period: "1.2.3.")
 * Strategy 2: Use generic regex patterns as fallback
 */
export function stripSectionNumber(text: string, knownSection?: string): string {
  let cleaned = text.trim();
  
  // Strategy 1: If we know the section number, try to remove it exactly
  if (knownSection) {
    // Section numbers are already normalized with period: "1.2.3."
    const sectionWithPeriod = knownSection; // Already has period: "1.2.3."
    const sectionWithoutPeriod = knownSection.replace(/\.$/, ''); // "1.2.3"
    
    // Pattern 1: "Section 1.2.3." or "Section 1.2.3 "
    const pattern1 = new RegExp(`^Section\\s+${escapeRegex(sectionWithoutPeriod)}\\.?\\s*`, 'i');
    cleaned = cleaned.replace(pattern1, '');
    
    // Pattern 2: "Article 1.2.3."
    const pattern2 = new RegExp(`^Article\\s+${escapeRegex(sectionWithoutPeriod)}\\.?\\s*`, 'i');
    cleaned = cleaned.replace(pattern2, '');
    
    // Pattern 3: Just "1.2.3. " at the start (with space after)
    const pattern3 = new RegExp(`^${escapeRegex(sectionWithPeriod)}\\s+`);
    cleaned = cleaned.replace(pattern3, '');
    
    // Pattern 4: Just "1.2.3 " at the start (without period, with space)
    const pattern4 = new RegExp(`^${escapeRegex(sectionWithoutPeriod)}\\s+`);
    cleaned = cleaned.replace(pattern4, '');
    
    // Pattern 5: "1.2.3:" (with colon instead of period)
    const pattern5 = new RegExp(`^${escapeRegex(sectionWithoutPeriod)}:?\\s+`);
    cleaned = cleaned.replace(pattern5, '');
  }
  
  // Strategy 2: Generic patterns (fallback for unexpected formats)
  
  // Remove "Section X" or "Article X" at the start
  cleaned = cleaned.replace(/^(?:Section|Article|SECTION|ARTICLE)\s+[\d.]+(?:\([a-z0-9ivxlc]+\))?\s*/i, '');
  
  // Remove standalone section numbers at the start (with space after)
  // Matches: "1.", "1.2.", "1.2.3.", "1.2.3.(i)", "1.2.3(a)", etc.
  cleaned = cleaned.replace(/^\d+(?:\.\d+)*\.?(?:\([a-z0-9ivxlc]+\))?\s+/, '');
  
  // Remove section numbers with colon: "1.2.3: Text"
  cleaned = cleaned.replace(/^\d+(?:\.\d+)*:?\s+/, '');
  
  return cleaned.trim();
}

export function parseRuleMappingResponse(
  response: any,
  structure: SectionNode[],
  rules: Rule[]
): ParsedRuleMappingResponse {
  try {

    let ruleStatus: RuleStatus[] = (response.ruleStatus || []).map((rs: any) => ({
      ...rs,
      ruleId: normalizeRuleId(rs.ruleId, rules)
    }))  

    // Fix new section locations
    ruleStatus = validateAndFixNewSectionLocations(ruleStatus, structure);

    // Add not_applicable rules back to ruleStatus
    const processedRuleIds = ruleStatus.map(s => s.ruleId);
    const notApplicableRules = rules.filter(
      rule => !processedRuleIds.includes(rule.id)
    );
    for (const rule of notApplicableRules) {
      ruleStatus.push({
        ruleId: rule.id,
        status: 'not_applicable'
      });
    }

    return {
      ruleStatus
    };
  } catch (error) {
    console.log(`Failed to parse rule mapping response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw new Error(`Failed to parse rule mapping response: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export function parseIRRuleMappingResponse(
  response: any,
  structure: SectionNode[],
  rules: Rule[]
): ParsedRuleMappingResponse {
  try {
    const resultsArray = response.results || [];
    
    // Map by position — each index corresponds to the rule at that index
    let ruleStatus: RuleStatus[] = rules.map((rule, idx) => {
      const result = resultsArray[idx];
      
      if (!result) {
        console.warn(`⚠️ No result for rule ${rule.id} at index ${idx}`);
        return {
          ruleId: rule.id,
          status: 'not_applicable' as const,
          reason: 'No result returned from LLM'
        };
      }
      
      return {
        ruleId: rule.id,
        status: result.status === 'mapped' ? 'mapped' as const : 'not_applicable' as const,
        locations: result.locations || []
      };
    });

    // Normalize IR rule locations
    ruleStatus = normalizeIRRuleLocations(ruleStatus, structure);

    return { ruleStatus };
  } catch (error) {
    console.log(`Failed to parse IR rule mapping response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw new Error(`Failed to parse IR rule mapping response: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function normalizeIRRuleLocations(
  ruleStatus: RuleStatus[],
  structure: SectionNode[]
): RuleStatus[] {
  const normalized: RuleStatus[] = [];

  for (const status of ruleStatus) {
    // Convert needs_new_section to mapped (shouldn't happen, but handle it)
    if (status.status === 'needs_new_section') {
      const location = (status as any).suggestedLocation || '';
      const sectionNum = extractSectionNumber(location);
      
      if (sectionNum) {
        console.log(`⚠️ IR rule ${status.ruleId}: Converting needs_new_section to mapped at ${sectionNum}`);
        normalized.push({
          ruleId: status.ruleId,
          status: 'mapped',
          locations: [sectionNum]
        });
      } else {
        console.warn(`⚠️ IR rule ${status.ruleId}: Could not extract section from "${location}", marking as not_applicable`);
        normalized.push({
          ruleId: status.ruleId,
          status: 'not_applicable',
          reason: `Invalid location format: ${location}`
        });
      }
      continue;
    }

    // For mapped rules, normalize any positional locations in the locations array
    if (status.status === 'mapped' && status.locations) {
      const normalizedLocations: string[] = [];
      
      for (const loc of status.locations) {
        const normalizedLoc = normalizeIRLocation(loc);
        if (normalizedLoc && !normalizedLocations.includes(normalizedLoc)) {
          normalizedLocations.push(normalizedLoc);
        }
      }

      if (normalizedLocations.length > 0) {
        normalized.push({
          ...status,
          locations: normalizedLocations
        });
      } else {
        console.warn(`⚠️ IR rule ${status.ruleId}: No valid locations after normalization, marking as not_applicable`);
        normalized.push({
          ruleId: status.ruleId,
          status: 'not_applicable',
          reason: 'No valid locations'
        });
      }
      continue;
    }

    // Pass through not_applicable as-is
    normalized.push(status);
  }

  return normalized;
}

function normalizeIRLocation(location: string): string | null {
  let loc = location.trim();
  
  loc = loc.replace(/^Section\s+/i, '');
  
  if (loc && !loc.endsWith('.')) {
    loc = loc + '.';
  }
  
  return loc || null;
}

function extractSectionNumber(location: string): string | null {
  // Pattern: "After Section X", "Before Section X", "Section X"
  const sectionMatch = location.match(/(?:After|Before)?\s*Section\s+([\d.A-Za-z]+)\.?/i);
  if (sectionMatch?.[1]) {
    const captured = sectionMatch[1];
    return captured.endsWith('.') ? captured : captured + '.';
  }

  // Pattern: Just a number like "8.1" or "8.1."
  const numberMatch = location.match(/^([\d.]+)\.?$/);
  if (numberMatch?.[1]) {
    const captured = numberMatch[1];
    return captured.endsWith('.') ? captured : captured + '.';
  }

  return null;
}

function validateAndFixNewSectionLocations(
  ruleStatus: RuleStatus[],
  structure: SectionNode[]
): RuleStatus[] {
  const fixed: RuleStatus[] = [];
  
  for (const status of ruleStatus) {
    if (status.status !== 'needs_new_section') {
      fixed.push(status);
      continue;
    }

    const location = (status as any).suggestedLocation || '';
    const normalized = normalizeInsertionLocation(location, structure);
    if (normalized) {
      fixed.push({
        ...status,
        suggestedLocation: normalized
      });
      console.log(`✅ Normalized "${location}" → "${normalized}" for rule ${status.ruleId}`);
    } else {
      console.warn(`⚠️ Could not normalize location: "${location}" for rule ${status.ruleId}`);
      
      const sectionMatch = location.match(/Section\s+([\d.A-Za-z]+)\.?/i);
      if (sectionMatch) {
        const sectionNumber = sectionMatch[1] + (sectionMatch[1].endsWith('.') ? '' : '.');
        console.log(`   → Converting to mapped: ${sectionNumber}`);
        
        fixed.push({
          ruleId: status.ruleId,
          status: 'mapped',
          locations: [sectionNumber],
          reason: `Converted from unparseable location: ${location}`
        });
      } else {
        console.log(`   → Cannot extract section, marking as not_applicable`);
        fixed.push({
          ruleId: status.ruleId,
          status: 'not_applicable',
          reason: `Invalid location format: ${location}`
        });
      }
    }
  }
  
  return fixed;
}

function normalizeInsertionLocation(
  location: string,
  structure: SectionNode[]
): string | null {
  // Pattern 1: "After Section X" 
  const afterPattern = /^After\s+Section\s+([\d.A-Za-z]+)\.?$/i;
  const afterMatch = location.match(afterPattern);
  if (afterMatch?.[1]) {  
    const captured = afterMatch[1];
    const sectionNum = captured.endsWith('.') ? captured : captured + '.';
    return `After Section ${sectionNum}`;
  }

  // Pattern 2: "Between Section X and Section Y" → "After Section X"
  const betweenPattern = /^Between\s+Section\s+([\d.A-Za-z]+)\.?\s+and\s+Section\s+([\d.A-Za-z]+)\.?$/i;
  const betweenMatch = location.match(betweenPattern);
  if (betweenMatch?.[1]) {
    const captured = betweenMatch[1];
    const firstSection = captured.endsWith('.') ? captured : captured + '.';
    console.log(`   Converting "between" to "After Section ${firstSection}"`);
    return `After Section ${firstSection}`;
  }

  // Pattern 3: "At the end" or "At the end of Section X" → find last section → "After Section X"
  const atEndPattern = /^At\s+the\s+end(\s+of\s+Section\s+([\d.A-Za-z]+)\.?)?$/i;
  const atEndMatch = location.match(atEndPattern);
  if (atEndMatch) {
    if (atEndMatch[2]) {
      const captured = atEndMatch[2];
      const sectionNum = captured.endsWith('.') ? captured : captured + '.';
      console.log(`   Converting "at the end of Section X" to "After Section ${sectionNum}"`);
      return `After Section ${sectionNum}`;
    } else {
      // "At the end" → find last section → "After Section X"
      const lastSection = findLastSection(structure);
      if (lastSection) {
        console.log(`   Converting "at the end" to "After Section ${lastSection}"`);
        return `After Section ${lastSection}`;
      }
    }
  }

  // Pattern 4: "Before Section X" → find previous section → "After Section X"
  const beforePattern = /^Before\s+Section\s+([\d.A-Za-z]+)\.?$/i;
  const beforeMatch = location.match(beforePattern);
  if (beforeMatch?.[1]) {
    const captured = beforeMatch[1];
    const targetSection = captured.endsWith('.') ? captured : captured + '.';
    const previousSection = findPreviousSection(targetSection, structure);
    if (previousSection) {
      console.log(`   Converting "Before Section ${targetSection}" to "After Section ${previousSection}"`);
      return `After Section ${previousSection}`;
    } else {
      console.warn(`   Could not find section before ${targetSection}`);
    }
  }

  return null;
}

function findLastSection(structure: SectionNode[]): string | null {
  let lastSection: string | null = null;
  
  function traverse(nodes: SectionNode[]) {
    for (const node of nodes) {
      lastSection = node.sectionNumber;
      if (node.children && node.children.length > 0) {
        traverse(node.children);
      }
    }
  }
  
  traverse(structure);
  return lastSection;
}

function findPreviousSection(
  targetSection: string,
  structure: SectionNode[]
): string | null | undefined {
  const allSections: string[] = [];
  
  function traverse(nodes: SectionNode[]) {
    for (const node of nodes) {
      allSections.push(node.sectionNumber);
      if (node.children && node.children.length > 0) {
        traverse(node.children);
      }
    }
  }
  
  traverse(structure);
  
  const index = allSections.indexOf(targetSection);
  if (index > 0) {
    return allSections[index - 1];
  }
  
  return null;
}

export function parseAmendmentsResponse(
  response: string, 
  rules: any[]
): any {
  try {
    const parsed = typeof response === 'string' ? JSON.parse(response) : response;
    
    if (parsed.noChanges === true) {
      return { noChanges: true };
    }
    
    if (parsed.amendment) {
      if (parsed.amendment.appliedRules) {
        parsed.amendment.appliedRules = parsed.amendment.appliedRules.map(
          (ruleId: string) => normalizeRuleId(ruleId, rules)
        );
      }
      
      return { amendment: parsed.amendment };
    }
    
    return parsed;
  } catch (error) {
    throw new Error('Invalid amendments response format');
  }
}
