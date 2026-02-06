// ========================================
// DOCUMENT FORMATTER
// ========================================
// This module provides formatting utilities for Word documents:
// 1. Remove sections marked as [INTENTIONALLY DELETED]
// 2. Renumber sections (remove alphabetical suffixes like 1.2A → 1.3)

import { parseDocument} from './documentParser';
import type { DocumentNode, ParsedDocument } from '@/src/types/documents';

// ========================================
// SECTION FILTERING
// ========================================

const DELETION_MARKERS = [
  '[INTENTIONALLY DELETED]',
  '[DELETED]',
  '[INTENTIONALLY OMITTED]',
  '[OMITTED]',
  '[RESERVED]',
  '[REMOVED]',
  '[TO BE DELETED]',
];

function isMarkedForDeletion(text: string): boolean {
  const upperText = text.toUpperCase();
  return DELETION_MARKERS.some(marker => upperText.includes(marker));
}

function removeDeletedSections(tree: DocumentNode[]): DocumentNode[] {
  return tree
    .filter(node => !isMarkedForDeletion(node.text))
    .map(node => ({
      ...node,
      children: node.children ? removeDeletedSections(node.children) : []
    }));
}

// ========================================
// SECTION RENUMBERING
// ========================================

function renumberSections(tree: DocumentNode[]): DocumentNode[] {
  return renumberLevel(tree, []);
}

function renumberLevel(nodes: DocumentNode[], parentNumber: number[]): DocumentNode[] {
  let counter = 1;
  
  return nodes.map(node => {
    const newNumber = [...parentNumber, counter];
    const newSectionNumber = newNumber.join('.') + '.';
    
    const newChildren = node.children && node.children.length > 0
      ? renumberLevel(node.children, newNumber)
      : [];
    
    counter++;
    
    return {
      ...node,
      sectionNumber: newSectionNumber,
      children: newChildren
    };
  });
}

// ========================================
// DOCUMENT APPLICATION
// ========================================

function buildSectionMap(
  originalTree: DocumentNode[], 
  renumberedTree: DocumentNode[]
): Map<string, string> {
  const map = new Map<string, string>();
  
  function traverse(origNodes: DocumentNode[], newNodes: DocumentNode[]) {
    for (let i = 0; i < origNodes.length && i < newNodes.length; i++) {
      const origNode = origNodes[i];
      const newNode = newNodes[i];
      
      const oldNum = origNode.sectionNumber;
      const oldNumNoPeriod = oldNum.replace(/\.$/, '');
      const newNum = newNode.sectionNumber;
      
      map.set(oldNum, newNum);
      map.set(oldNumNoPeriod, newNum);
      
      if (origNode.sectionNumber.includes('第')) {
        map.set(origNode.sectionNumber, newNode.sectionNumber);
      }
      
      if (origNode.children && newNode.children) {
        traverse(origNode.children, newNode.children);
      }
    }
  }
  
  traverse(originalTree, renumberedTree);
  return map;
}

function getHeadingStyle(level: number): Word.BuiltInStyleName {
  switch (level) {
    case 0:
      return Word.BuiltInStyleName.heading1;
    case 1:
      return Word.BuiltInStyleName.heading2;
    case 2:
      return Word.BuiltInStyleName.heading3;
    case 3:
      return Word.BuiltInStyleName.heading4;
    default:
      return Word.BuiltInStyleName.heading4;
  }
}

async function applyRenumberingToDocument(
  originalTree: DocumentNode[],
  renumberedTree: DocumentNode[]
): Promise<void> {
  return Word.run(async (context) => {
    const body = context.document.body;
    const paragraphs = body.paragraphs;
    paragraphs.load("text");
    
    await context.sync();
    
    const sectionMap = buildSectionMap(originalTree, renumberedTree);
    console.log("Section mapping:", Array.from(sectionMap.entries()));
    
    const updates: Array<{
      index: number;
      para: Word.Paragraph;
      oldNum: string;
      newNum: string;
      restOfText: string;
      hasListFormatting: boolean;
      targetLevel: number;
    }> = [];
    
    for (let i = 0; i < paragraphs.items.length; i++) {
      const para = paragraphs.items[i];
      const text = para.text.trim();
      
      const match = text.match(/^(\d+(?:\.\d+)*[A-Za-z]?\.?)\s+(.+)/);
      
      if (match) {
        const oldSectionNum = match[1].trim();
        const restOfText = match[2].trim();
        
        let newSectionNum = sectionMap.get(oldSectionNum);
        if (!newSectionNum) {
          newSectionNum = sectionMap.get(oldSectionNum.replace(/\.$/, ''));
        }
        
        if (newSectionNum) {
          const listItem = para.listItemOrNullObject;
          listItem.load("level");
          await context.sync();
          
          const hasListFormatting = !listItem.isNullObject;
          const targetLevel = (newSectionNum.replace(/\.$/, '').match(/\./g) || []).length;
          
          updates.push({
            index: i,
            para,
            oldNum: oldSectionNum,
            newNum: newSectionNum,
            restOfText,
            hasListFormatting,
            targetLevel
          });
        }
      }
    }
    
    for (let i = updates.length - 1; i >= 0; i--) {
      const update = updates[i];
      
      if (update.hasListFormatting) {
        const listItem = update.para.listItemOrNullObject;
        listItem.load("level");
        await context.sync();
        
        if (!listItem.isNullObject && listItem.level !== update.targetLevel) {
          listItem.level = update.targetLevel;
          console.log(`Adjusted level: "${update.oldNum}" → level ${update.targetLevel}`);
        }
      } else {
        console.log(`Processing "${update.oldNum}" (not in list), target level: ${update.targetLevel}`);
        
        let foundListAbove = false;
        
        for (let j = update.index - 1; j >= 0; j--) {
          const prevPara = paragraphs.items[j];
          const prevListItem = prevPara.listItemOrNullObject;
          prevListItem.load("level");
          await context.sync();
          
          if (!prevListItem.isNullObject) {
            console.log(`  Found list at para ${j} (level ${prevListItem.level})`);
            
            try {
              const newPara = prevPara.insertParagraph(update.restOfText, Word.InsertLocation.after);
              await context.sync();
              
              const newListItem = newPara.listItemOrNullObject;
              newListItem.load("level, listString");
              await context.sync();
              
              if (!newListItem.isNullObject) {
                console.log(`  Inserted as ${newListItem.listString} (level ${newListItem.level})`);
                
                if (newListItem.level !== update.targetLevel) {
                  newListItem.level = update.targetLevel;
                  await context.sync();
                  
                  let foundReference = false;
                  for (let k = 0; k < paragraphs.items.length; k++) {
                    const refPara = paragraphs.items[k];
                    const refListItem = refPara.listItemOrNullObject;
                    refListItem.load("level");
                    await context.sync();
                    
                    if (!refListItem.isNullObject && refListItem.level === update.targetLevel) {
                      refPara.load("leftIndent, firstLineIndent");
                      await context.sync();
                      
                      newPara.leftIndent = refPara.leftIndent;
                      newPara.firstLineIndent = refPara.firstLineIndent;
                      await context.sync();
                      
                      foundReference = true;
                      console.log(`  Copied indentation from reference para at level ${update.targetLevel}`);
                      break;
                    }
                  }
                  
                  newListItem.load("listString");
                  await context.sync();
                  console.log(`  ✓ Changed level to ${update.targetLevel}, now shows as ${newListItem.listString}`);

                } else {
                  console.log(`  ✓ Already at correct level ${update.targetLevel}`);
                }
                
                update.para.delete();
                await context.sync();
                
                foundListAbove = true;
                break;
              }
            } catch (e) {
              console.log(`  ✗ Insert failed: ${e}`);
            }
          }
        }
        
        if (!foundListAbove) {
          const newText = update.newNum + ' ' + update.restOfText;
          update.para.insertText(newText, Word.InsertLocation.replace);
          console.log(`  No list above - replaced text: "${update.oldNum}" → "${update.newNum}"`);
        }
      }
      
      await context.sync();
    }
    
    console.log("Changes applied successfully");
  });
}

async function diagnoseLists(): Promise<void> {
  return Word.run(async (context) => {
    const body = context.document.body;
    const paragraphs = body.paragraphs;
    paragraphs.load("text, listItemOrNullObject");
    await context.sync();
    
    console.log("=== LIST DIAGNOSTIC START ===");
    
    for (let i = 0; i < Math.min(20, paragraphs.items.length); i++) {
      const para = paragraphs.items[i];
      const text = para.text.trim().substring(0, 50);
      
      const listItem = para.listItemOrNullObject;
      listItem.load("level, listString");
      await context.sync();
      
      if (!listItem.isNullObject) {
        console.log(`Para ${i}: "${text}" → IS LIST (level: ${listItem.level}, number: ${listItem.listString})`);
      } else {
        console.log(`Para ${i}: "${text}" → NOT A LIST`);
      }
    }
    
    console.log("=== LIST DIAGNOSTIC END ===");
  });
}

async function deleteMarkedSections(): Promise<void> {
  return Word.run(async (context) => {
    const body = context.document.body;
    const paragraphs = body.paragraphs;
    paragraphs.load("text");
    
    await context.sync();
    
    const toDelete: Word.Paragraph[] = [];
    for (let i = 0; i < paragraphs.items.length; i++) {
      const text = paragraphs.items[i].text;
      if (isMarkedForDeletion(text)) {
        toDelete.push(paragraphs.items[i]);
        console.log(`Marking for deletion: "${text.substring(0, 100)}..."`);
      }
    }
    
    if (toDelete.length > 0) {
      console.log(`Deleting ${toDelete.length} section(s) marked with: ${DELETION_MARKERS.join(', ')}`);
      for (const para of toDelete) {
        para.delete();
      }
    } else {
      console.log('No sections marked for deletion found.');
    }
    
    await context.sync();
  });
}

// ========================================
// MAIN FORMATTER FUNCTION
// ========================================

export async function formatDocument(options: {
  removeDeleted?: boolean;
  renumber?: boolean;
} = { removeDeleted: false, renumber: true }): Promise<void> {
  try {
    console.log("=== Starting Document Formatting ===");
    console.log("Options:", options);
    
    console.log("\n[1/4] Parsing document...");
    const originalTree = await parseDocument();
    console.log("Parsed sections:", originalTree.structure.length);
    
    let processedTree = originalTree;
    
    if (options.removeDeleted) {
      console.log("\n[2/4] Removing [INTENTIONALLY DELETED] sections...");
      await deleteMarkedSections();
      
      processedTree = await parseDocument();
      console.log("Sections after deletion:", processedTree.structure.length);
    } else {
      console.log("\n[2/4] Skipping deletion (removeDeleted: false)");
    }
    
    if (options.renumber) {
      console.log("\n[3/4] Renumbering sections...");
      const renumberedTree = renumberSections(processedTree.structure);
      console.log("Renumbered structure ready");
      
      console.log("\n[4/5] Applying changes to document...");
      await applyRenumberingToDocument(processedTree.structure, renumberedTree);
      console.log("Changes applied successfully");
      
      console.log("\n[5/5] Diagnosing list formatting...");
      await diagnoseLists();
      console.log("List formatting preserved");
    } else {
      console.log("\n[3/4] Skipping renumbering (renumber: false)");
      console.log("\n[4/4] No changes to apply");
    }
    
    console.log("\n=== Formatting Complete! ===");
    
  } catch (error) {
    console.error("=== Formatting Error ===");
    console.error(error);
    throw error;
  }
}

export async function previewFormatting(options: {
  removeDeleted?: boolean;
  renumber?: boolean;
} = { removeDeleted: false, renumber: true }): Promise<{
  original: DocumentNode[];
  formatted: DocumentNode[];
  changes: string[];
}> {
  console.log("=== Preview Mode ===");
  
  let tree = await parseDocument();
  
  const changes: string[] = [];
  
  if (options.removeDeleted) {
    const beforeCount = countSections(tree.structure);
    tree.structure = removeDeletedSections(tree.structure);
    const afterCount = countSections(tree.structure);
    const deletedCount = beforeCount - afterCount;
    
    if (deletedCount > 0) {
      changes.push(`${deletedCount} section(s) will be deleted`);
    }
  }
  
  const formatted = options.renumber ? renumberSections(tree.structure) : tree.structure;
  
  if (options.renumber) {
    const renumberCount = countRenumberings(tree.structure, formatted);
    if (renumberCount > 0) {
      changes.push(`${renumberCount} section(s) will be renumbered`);
    }
  }
  
  return {
    original: (await parseDocument()).structure,
    formatted: formatted,
    changes: changes
  };
}

// ========================================
// HELPER FUNCTIONS
// ========================================

function countSections(tree: DocumentNode[]): number {
  let count = tree.length;
  for (const node of tree) {
    if (node.children) {
      count += countSections(node.children);
    }
  }
  return count;
}

function countRenumberings(original: DocumentNode[], renumbered: DocumentNode[]): number {
  let count = 0;
  
  function compare(origNodes: DocumentNode[], newNodes: DocumentNode[]) {
    for (let i = 0; i < origNodes.length && i < newNodes.length; i++) {
      if (origNodes[i].sectionNumber !== newNodes[i].sectionNumber) {
        count++;
      }
      
      if (origNodes[i].children && newNodes[i].children) {
        compare(origNodes[i].children, newNodes[i].children);
      }
    }
  }
  
  compare(original, renumbered);
  return count;
}
