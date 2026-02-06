import type { SectionNode } from '@/src/types/documents';

export function findTopLevelSection(
  targetSectionNum: string,
  structure: SectionNode[]
): SectionNode | null {
  for (const topLevel of structure) {
    if (topLevel.sectionNumber === targetSectionNum) {
      return topLevel;
    }
    
    if (sectionExistsInTree(targetSectionNum, topLevel.children || [])) {
      return topLevel;
    }
  }
  
  return null;
}

export function sectionExistsInTree(
  targetSectionNum: string,
  nodes: SectionNode[]
): boolean {
  for (const node of nodes) {
    if (node.sectionNumber === targetSectionNum) {
      return true;
    }
    if (node.children && sectionExistsInTree(targetSectionNum, node.children)) {
      return true;
    }
  }
  return false;
}

export function buildFullSectionText(section: SectionNode): string {
  let text = `${section.sectionNumber} ${section.text}`;
  
  if (section.additionalParagraphs && section.additionalParagraphs.length > 0) {
    text += '\n' + section.additionalParagraphs.join('\n');
  }
  
  if (section.children && section.children.length > 0) {
    for (const child of section.children) {
      text += '\n' + buildFullSectionText(child);
    }
  }
  
  return text;
}