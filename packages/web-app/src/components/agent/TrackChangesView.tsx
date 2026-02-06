import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface TrackChange {
  type: "insertion" | "deletion" | "unchanged";
  text: string;
}

interface TrackChangesViewProps {
  originalContent: string;
  modifiedContent: string;
  className?: string;
}

/**
 * Simple diff algorithm to compare two strings and identify insertions/deletions
 */
function computeDiff(original: string, modified: string): TrackChange[] {
  const originalLines = original.split("\n");
  const modifiedLines = modified.split("\n");
  const changes: TrackChange[] = [];
  
  // Use a simple line-by-line comparison
  // For a more sophisticated diff, consider using a library like diff-match-patch
  const maxLength = Math.max(originalLines.length, modifiedLines.length);
  
  for (let i = 0; i < maxLength; i++) {
    const origLine = originalLines[i] || "";
    const modLine = modifiedLines[i] || "";
    
    if (origLine === modLine) {
      changes.push({ type: "unchanged", text: origLine });
    } else {
      // If original line exists but modified doesn't, it's a deletion
      if (origLine && !modLine) {
        changes.push({ type: "deletion", text: origLine });
      }
      // If modified line exists but original doesn't, it's an insertion
      else if (modLine && !origLine) {
        changes.push({ type: "insertion", text: modLine });
      }
      // Both exist but differ - show deletion then insertion
      else {
        changes.push({ type: "deletion", text: origLine });
        changes.push({ type: "insertion", text: modLine });
      }
    }
  }
  
  return changes;
}

/**
 * Word-level diff for more granular changes
 */
function computeWordDiff(original: string, modified: string): TrackChange[] {
  const originalWords = original.split(/(\s+)/);
  const modifiedWords = modified.split(/(\s+)/);
  const changes: TrackChange[] = [];
  
  // Simple word-by-word comparison
  // For production, use a proper diff algorithm
  let origIdx = 0;
  let modIdx = 0;
  
  while (origIdx < originalWords.length || modIdx < modifiedWords.length) {
    const origWord = originalWords[origIdx] || "";
    const modWord = modifiedWords[modIdx] || "";
    
    if (origWord === modWord) {
      changes.push({ type: "unchanged", text: origWord });
      origIdx++;
      modIdx++;
    } else {
      // Check if word was deleted
      if (origWord && (!modWord || origWord !== modWord)) {
        // Look ahead to see if word appears later
        const foundLater = modifiedWords.slice(modIdx).indexOf(origWord);
        if (foundLater === -1 || foundLater > 3) {
          changes.push({ type: "deletion", text: origWord });
          origIdx++;
        } else {
          // Word appears later, treat as insertion first
          changes.push({ type: "insertion", text: modWord });
          modIdx++;
        }
      } else {
        // Word was inserted
        changes.push({ type: "insertion", text: modWord });
        modIdx++;
      }
    }
  }
  
  return changes;
}

export default function TrackChangesView({
  originalContent,
  modifiedContent,
  className,
}: TrackChangesViewProps) {
  const changes = useMemo(() => {
    if (!originalContent && !modifiedContent) return [];
    if (!originalContent) {
      return [{ type: "insertion" as const, text: modifiedContent }];
    }
    if (!modifiedContent) {
      return [{ type: "deletion" as const, text: originalContent }];
    }
    
    // Use word-level diff for better granularity
    return computeWordDiff(originalContent, modifiedContent);
  }, [originalContent, modifiedContent]);

  if (changes.length === 0) {
    return (
      <div className={cn("prose prose-sm max-w-none", className)}>
        <p className="text-muted-foreground">No changes detected</p>
      </div>
    );
  }

  return (
    <div className={cn("prose prose-sm max-w-none", className)}>
      <div className="space-y-1">
        {changes.map((change, index) => {
          if (change.type === "unchanged") {
            return (
              <span key={index} className="text-foreground">
                {change.text}
              </span>
            );
          } else if (change.type === "insertion") {
            return (
              <span
                key={index}
                className="bg-green-100 text-green-900 dark:bg-green-900/30 dark:text-green-300 px-1 rounded"
              >
                {change.text}
              </span>
            );
          } else {
            // deletion
            return (
              <span
                key={index}
                className="bg-red-100 text-red-900 dark:bg-red-900/30 dark:text-red-300 line-through px-1 rounded"
              >
                {change.text}
              </span>
            );
          }
        })}
      </div>
    </div>
  );
}

