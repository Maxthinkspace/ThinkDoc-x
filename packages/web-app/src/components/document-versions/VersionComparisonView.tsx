import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeftRight, X, Download } from 'lucide-react';
import { documentVersionApi, type VersionTree, type DocumentVersion, type DocumentSubVersion } from '@/services/documentVersionApi';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface DiffSegment {
  type: 'unchanged' | 'added' | 'removed';
  text: string;
}

// Word-level diff algorithm
function computeWordDiff(oldText: string, newText: string): DiffSegment[] {
  const oldWords = oldText.split(/(\s+)/);
  const newWords = newText.split(/(\s+)/);

  const lcsMatrix: number[][] = [];
  for (let i = 0; i <= oldWords.length; i++) {
    lcsMatrix[i] = [];
    for (let j = 0; j <= newWords.length; j++) {
      if (i === 0 || j === 0) {
        lcsMatrix[i][j] = 0;
      } else if (oldWords[i - 1] === newWords[j - 1]) {
        lcsMatrix[i][j] = lcsMatrix[i - 1][j - 1] + 1;
      } else {
        lcsMatrix[i][j] = Math.max(lcsMatrix[i - 1][j], lcsMatrix[i][j - 1]);
      }
    }
  }

  const result: DiffSegment[] = [];
  let i = oldWords.length;
  let j = newWords.length;
  const tempResult: DiffSegment[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldWords[i - 1] === newWords[j - 1]) {
      tempResult.unshift({ type: 'unchanged', text: oldWords[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || lcsMatrix[i][j - 1] >= lcsMatrix[i - 1][j])) {
      tempResult.unshift({ type: 'added', text: newWords[j - 1] });
      j--;
    } else if (i > 0) {
      tempResult.unshift({ type: 'removed', text: oldWords[i - 1] });
      i--;
    }
  }

  for (const segment of tempResult) {
    if (result.length > 0 && result[result.length - 1].type === segment.type) {
      result[result.length - 1].text += segment.text;
    } else {
      result.push({ ...segment });
    }
  }

  return result;
}

interface VersionComparisonViewProps {
  documentId: string;
  versionAId: string;
  versionBId: string;
  isSubVersionA: boolean;
  isSubVersionB: boolean;
  onClose?: () => void;
  className?: string;
}

export const VersionComparisonView: React.FC<VersionComparisonViewProps> = ({
  documentId,
  versionAId,
  versionBId,
  isSubVersionA,
  isSubVersionB,
  onClose,
  className,
}) => {
  const [versionA, setVersionA] = useState<DocumentVersion | DocumentSubVersion | null>(null);
  const [versionB, setVersionB] = useState<DocumentVersion | DocumentSubVersion | null>(null);
  const [loading, setLoading] = useState(true);
  const [versionTree, setVersionTree] = useState<VersionTree | null>(null);
  const [viewMode, setViewMode] = useState<'unified' | 'sidebyside'>('unified');
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    loadVersions();
  }, [documentId, versionAId, versionBId, isSubVersionA, isSubVersionB]);

  const loadVersions = async () => {
    try {
      setLoading(true);
      const [versionAData, versionBData, tree] = await Promise.all([
        documentVersionApi.getVersion(documentId, versionAId, isSubVersionA),
        documentVersionApi.getVersion(documentId, versionBId, isSubVersionB),
        documentVersionApi.getVersionHistory(documentId),
      ]);
      setVersionA(versionAData);
      setVersionB(versionBData);
      setVersionTree(tree);
    } catch (error) {
      console.error('Failed to load versions:', error);
    } finally {
      setLoading(false);
    }
  };

  const diffResult = useMemo(() => {
    if (!versionA || !versionB) return null;
    const contentA = versionA.content || '';
    const contentB = versionB.content || '';
    return computeWordDiff(contentA, contentB);
  }, [versionA, versionB]);

  const getVersionLabel = (version: DocumentVersion | DocumentSubVersion, isSubVersion: boolean): string => {
    if (isSubVersion) {
      const subVersion = version as DocumentSubVersion;
      const parentVersion = versionTree?.versions.find(v => v.version.id === subVersion.parentVersionId);
      const mainVersion = parentVersion?.version.mainVersion || 1;
      return `v${mainVersion}.${subVersion.subVersionLetter}`;
    } else {
      const mainVersion = version as DocumentVersion;
      return `v${mainVersion.mainVersion}`;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const stats = useMemo(() => {
    if (!diffResult) return { added: 0, removed: 0 };
    let added = 0;
    let removed = 0;
    diffResult.forEach(segment => {
      if (segment.type === 'added') added += segment.text.length;
      if (segment.type === 'removed') removed += segment.text.length;
    });
    return { added, removed };
  }, [diffResult]);

  const handleExportPdf = async () => {
    if (!versionA || !versionB) return;

    try {
      setIsExporting(true);
      const blob = await documentVersionApi.exportRedlinePdf(
        documentId,
        versionAId,
        versionBId,
        isSubVersionA,
        isSubVersionB
      );

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${versionTree?.document.name || 'document'}_${getVersionLabel(versionA, isSubVersionA)}_vs_${getVersionLabel(versionB, isSubVersionB)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export PDF:', error);
      alert('Failed to export PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) {
    return (
      <div className={cn("flex flex-col items-center justify-center gap-3 py-12", className)}>
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
        <span className="text-sm text-muted-foreground">Loading comparison...</span>
      </div>
    );
  }

  if (!versionA || !versionB) {
    return (
      <div className={cn("p-6 text-center text-destructive", className)}>
        Versions not found
      </div>
    );
  }

  return (
    <div className={cn("flex flex-1 flex-col overflow-hidden rounded-xl border bg-white", className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-white px-5 py-4">
        <div className="flex items-center justify-center gap-4">
          <div className="flex flex-col items-center gap-1">
            <Badge variant="outline" className="border-red-200 bg-red-50 text-sm font-bold text-red-600">
              {getVersionLabel(versionA, isSubVersionA)}
            </Badge>
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Previous
            </span>
            <span className="text-[11px] text-muted-foreground/70">
              {formatDate(versionA.createdAt)}
            </span>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-muted-foreground">
            <ArrowLeftRight className="h-4 w-4" />
          </div>
          <div className="flex flex-col items-center gap-1">
            <Badge variant="outline" className="border-green-200 bg-green-50 text-sm font-bold text-green-600">
              {getVersionLabel(versionB, isSubVersionB)}
            </Badge>
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Selected
            </span>
            <span className="text-[11px] text-muted-foreground/70">
              {formatDate(versionB.createdAt)}
            </span>
          </div>
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Stats and View Toggle */}
      <div className="flex items-center justify-between border-b bg-slate-50 px-5 py-3">
        <div className="flex gap-3">
          <span className="rounded bg-red-100 px-2 py-1 text-[11px] font-medium text-red-600">
            -{stats.removed} chars removed
          </span>
          <span className="rounded bg-green-100 px-2 py-1 text-[11px] font-medium text-green-600">
            +{stats.added} chars added
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPdf}
            disabled={isExporting}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            {isExporting ? 'Exporting...' : 'Export PDF'}
          </Button>
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
            <TabsList>
              <TabsTrigger value="unified">Unified</TabsTrigger>
              <TabsTrigger value="sidebyside">Side-by-Side</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'unified' ? (
        <div className="flex-1 overflow-hidden p-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[13px] font-semibold text-foreground">Changes</span>
            <div className="flex gap-3">
              <span className="rounded bg-red-100 px-2 py-1 text-[11px] font-medium text-red-600">
                Removed
              </span>
              <span className="rounded bg-green-100 px-2 py-1 text-[11px] font-medium text-green-600">
                Added
              </span>
            </div>
          </div>
          <ScrollArea className="h-full">
            <div className="rounded-lg border bg-slate-50 p-4 text-[13px] leading-relaxed text-foreground">
              {diffResult?.map((segment, idx) => (
                <span
                  key={idx}
                  className={cn(
                    segment.type === 'removed' &&
                      'rounded-sm bg-red-100 px-0.5 text-red-800 line-through',
                    segment.type === 'added' && 'rounded-sm bg-green-100 px-0.5 text-green-800'
                  )}
                >
                  {segment.text}
                </span>
              ))}
            </div>
          </ScrollArea>
        </div>
      ) : (
        <div className="grid flex-1 grid-cols-2 gap-px overflow-hidden bg-slate-200">
          <div className="flex flex-col bg-white">
            <div className="border-b bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-600">
              Previous ({getVersionLabel(versionA, isSubVersionA)})
            </div>
            <ScrollArea className="flex-1 p-4 text-xs leading-relaxed text-foreground whitespace-pre-wrap">
              {versionA.content || '(No content)'}
            </ScrollArea>
          </div>
          <div className="flex flex-col bg-white">
            <div className="border-b bg-green-50 px-4 py-2.5 text-xs font-semibold text-green-600">
              Selected ({getVersionLabel(versionB, isSubVersionB)})
            </div>
            <ScrollArea className="flex-1 p-4 text-xs leading-relaxed text-foreground whitespace-pre-wrap">
              {versionB.content || '(No content)'}
            </ScrollArea>
          </div>
        </div>
      )}
    </div>
  );
};

