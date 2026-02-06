import React, { useState, useEffect } from 'react';
import {
  Clock,
  RotateCcw,
  Eye,
  FileText,
  X,
  ChevronDown,
  ChevronUp,
  ArrowLeftRight,
  GitBranch,
} from 'lucide-react';
import { documentVersionApi, type VersionTree, type DocumentVersion, type DocumentSubVersion } from '@/services/documentVersionApi';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface VersionHistoryPanelProps {
  documentId: string;
  onRestore?: (versionId: string, isSubVersion: boolean) => void;
  onCompare?: (versionAId: string, versionBId: string, isSubVersionA: boolean, isSubVersionB: boolean) => void;
  onView?: (versionId: string, isSubVersion: boolean) => void;
  className?: string;
}

export const VersionHistoryPanel: React.FC<VersionHistoryPanelProps> = ({
  documentId,
  onRestore,
  onCompare,
  onView,
  className,
}) => {
  const [versionTree, setVersionTree] = useState<VersionTree | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(new Set());
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [versionToRestore, setVersionToRestore] = useState<{ id: string; isSubVersion: boolean } | null>(null);

  useEffect(() => {
    loadVersionHistory();
  }, [documentId]);

  const loadVersionHistory = async () => {
    try {
      setLoading(true);
      const tree = await documentVersionApi.getVersionHistory(documentId);
      setVersionTree(tree);
      // Expand first version by default
      if (tree.versions.length > 0) {
        setExpandedVersions(new Set([tree.versions[0].version.id]));
      }
    } catch (error) {
      console.error('Failed to load version history:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleVersionExpanded = (versionId: string) => {
    const newExpanded = new Set(expandedVersions);
    if (newExpanded.has(versionId)) {
      newExpanded.delete(versionId);
    } else {
      newExpanded.add(versionId);
    }
    setExpandedVersions(newExpanded);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateString);
  };

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

  const isCurrentVersion = (version: DocumentVersion | DocumentSubVersion, isSubVersion: boolean): boolean => {
    if (!versionTree) return false;
    if (isSubVersion) {
      return versionTree.document.latestSubVersionId === version.id;
    } else {
      return versionTree.document.latestVersionId === version.id && !versionTree.document.currentSubVersion;
    }
  };

  if (loading) {
    return (
      <div className={cn("flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground", className)}>
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
        <span className="text-sm">Loading version history...</span>
      </div>
    );
  }

  if (!versionTree || versionTree.versions.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground", className)}>
        <GitBranch className="h-8 w-8 stroke-[1.5]" />
        <span className="text-sm">No version history available</span>
      </div>
    );
  }

  return (
    <div className={cn("flex max-h-[600px] flex-col overflow-hidden rounded-xl border bg-gradient-to-br from-slate-50 to-slate-100/50", className)}>
      <div className="flex items-center justify-between border-b bg-white px-5 py-4">
        <h3 className="flex items-center gap-2.5 text-base font-semibold text-foreground">
          <FileText className="h-[18px] w-[18px]" />
          Version History
          <Badge variant="secondary" className="text-xs font-medium">
            {versionTree.versions.length} main versions
          </Badge>
        </h3>
      </div>

      <ScrollArea className="flex-1 p-5">
        <div className="space-y-0">
          {versionTree.versions.map((versionGroup, mainIndex) => {
            const mainVersion = versionGroup.version;
            const isMainExpanded = expandedVersions.has(mainVersion.id);
            const isMainCurrent = isCurrentVersion(mainVersion, false);
            const isLastMain = mainIndex === versionTree.versions.length - 1;

            return (
              <div key={mainVersion.id} className="flex gap-4">
                <div className="flex w-7 flex-shrink-0 flex-col items-center">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-500 text-white ring-4 ring-blue-100">
                    <FileText className="h-3.5 w-3.5" />
                  </div>
                  {!isLastMain && (
                    <div className="mt-1 h-full min-h-5 w-0.5 bg-gradient-to-b from-gray-300 to-gray-200" />
                  )}
                </div>

                <div className={cn(
                  "mb-4 flex-1 overflow-hidden rounded-lg border bg-white shadow-sm transition-all",
                  isMainExpanded && "border-indigo-300 shadow-md shadow-indigo-100/50"
                )}>
                  <div
                    className="flex cursor-pointer items-start justify-between gap-3 p-4 transition-colors hover:bg-slate-50"
                    onClick={() => toggleVersionExpanded(mainVersion.id)}
                  >
                    <div className="flex-1">
                      <div className="mb-1.5 flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-foreground">
                          {getVersionLabel(mainVersion, false)}
                        </span>
                        {isMainCurrent && (
                          <Badge className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-[10px] font-semibold uppercase tracking-wide">
                            Current
                          </Badge>
                        )}
                        {mainVersion.status && (
                          <Badge variant="outline" className="text-[11px] font-medium">
                            {mainVersion.status}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3 w-3" />
                          {formatRelativeTime(mainVersion.createdAt)}
                        </div>
                        <span>{mainVersion.editorName}</span>
                      </div>
                    </div>
                    <div className="text-muted-foreground">
                      {isMainExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </div>

                  {mainVersion.description && (
                    <div className="px-4 pb-3 text-[13px] leading-relaxed text-muted-foreground">
                      {mainVersion.description}
                    </div>
                  )}

                  {isMainExpanded && (
                    <div className="animate-in slide-in-from-top-2 border-t bg-slate-50/50 p-4 duration-200">
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={e => {
                            e.stopPropagation();
                            onView?.(mainVersion.id, false);
                          }}
                          className="gap-1.5 text-xs"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </Button>
                        {mainIndex < versionTree.versions.length - 1 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={e => {
                              e.stopPropagation();
                              const prevVersion = versionTree.versions[mainIndex + 1].version;
                              onCompare?.(prevVersion.id, mainVersion.id, false, false);
                            }}
                            className="gap-1.5 border-blue-200 bg-blue-50 text-xs text-blue-700 hover:bg-blue-100 hover:text-blue-800"
                          >
                            <ArrowLeftRight className="h-3.5 w-3.5" />
                            Compare
                          </Button>
                        )}
                        {!isMainCurrent && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={e => {
                              e.stopPropagation();
                              setVersionToRestore({ id: mainVersion.id, isSubVersion: false });
                              setRestoreDialogOpen(true);
                            }}
                            className="gap-1.5 border-violet-200 bg-violet-50 text-xs text-violet-700 hover:bg-violet-100 hover:text-violet-800"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Restore
                          </Button>
                        )}
                      </div>

                      {versionGroup.subVersions.length > 0 && (
                        <div className="mt-4 space-y-2 border-t pt-4">
                          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Sub-versions
                          </div>
                          {versionGroup.subVersions.map((subVersion, subIndex) => {
                            const isSubExpanded = expandedVersions.has(subVersion.id);
                            const isSubCurrent = isCurrentVersion(subVersion, true);

                            return (
                              <div key={subVersion.id} className="ml-4 flex gap-2">
                                <div className="flex w-4 flex-shrink-0 flex-col items-center">
                                  <div className="h-4 w-4 rounded-full bg-gray-400 ring-2 ring-gray-100" />
                                  {subIndex < versionGroup.subVersions.length - 1 && (
                                    <div className="mt-1 h-full min-h-4 w-0.5 bg-gray-200" />
                                  )}
                                </div>
                                <div className={cn(
                                  "flex-1 rounded-lg border bg-white p-3",
                                  isSubExpanded && "border-indigo-200"
                                )}>
                                  <div
                                    className="flex cursor-pointer items-start justify-between gap-2"
                                    onClick={() => toggleVersionExpanded(subVersion.id)}
                                  >
                                    <div className="flex-1">
                                      <div className="mb-1 flex items-center gap-2">
                                        <span className="text-xs font-bold text-foreground">
                                          {getVersionLabel(subVersion, true)}
                                        </span>
                                        {isSubCurrent && (
                                          <Badge className="bg-emerald-500 text-[9px] font-semibold uppercase">
                                            Current
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                        <Clock className="h-3 w-3" />
                                        {formatRelativeTime(subVersion.createdAt)}
                                        <span>•</span>
                                        <span>{subVersion.editorName}</span>
                                      </div>
                                    </div>
                                    {isSubExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                  </div>

                                  {subVersion.description && (
                                    <div className="mt-2 text-[12px] text-muted-foreground">
                                      {subVersion.description}
                                    </div>
                                  )}

                                  {isSubExpanded && (
                                    <div className="mt-2 flex gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={e => {
                                          e.stopPropagation();
                                          onView?.(subVersion.id, true);
                                        }}
                                        className="h-7 gap-1 text-[11px]"
                                      >
                                        <Eye className="h-3 w-3" />
                                        View
                                      </Button>
                                      {subIndex > 0 && (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={e => {
                                            e.stopPropagation();
                                            const prevSub = versionGroup.subVersions[subIndex - 1];
                                            onCompare?.(prevSub.id, subVersion.id, true, true);
                                          }}
                                          className="h-7 gap-1 border-blue-200 bg-blue-50 text-[11px] text-blue-700"
                                        >
                                          <ArrowLeftRight className="h-3 w-3" />
                                          Compare
                                        </Button>
                                      )}
                                      {!isSubCurrent && (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={e => {
                                            e.stopPropagation();
                                            setVersionToRestore({ id: subVersion.id, isSubVersion: true });
                                            setRestoreDialogOpen(true);
                                          }}
                                          className="h-7 gap-1 border-violet-200 bg-violet-50 text-[11px] text-violet-700"
                                        >
                                          <RotateCcw className="h-3 w-3" />
                                          Restore
                                        </Button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <Dialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <RotateCcw className="h-6 w-6 text-violet-600" />
              Restore Version
            </DialogTitle>
            <DialogDescription>
              This will create a new version with the content from the selected version. The current
              version will remain in history.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestoreDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!versionToRestore || !versionTree) return;
                try {
                  // Find the version being restored to get its label
                  let versionToRestoreObj: DocumentVersion | DocumentSubVersion | null = null;
                  if (versionToRestore.isSubVersion) {
                    for (const vg of versionTree.versions) {
                      const subVersion = vg.subVersions.find(sv => sv.id === versionToRestore.id);
                      if (subVersion) {
                        versionToRestoreObj = subVersion;
                        break;
                      }
                    }
                  } else {
                    versionToRestoreObj = versionTree.versions.find(v => v.version.id === versionToRestore.id)?.version || null;
                  }

                  const versionLabel = versionToRestoreObj ? getVersionLabel(versionToRestoreObj, versionToRestore.isSubVersion) : 'unknown';

                  await documentVersionApi.restoreVersion(
                    documentId,
                    versionToRestore.id,
                    versionToRestore.isSubVersion,
                    `Restored from ${versionLabel}`,
                    'System'
                  );
                  onRestore?.(versionToRestore.id, versionToRestore.isSubVersion);
                  await loadVersionHistory();
                  setRestoreDialogOpen(false);
                  setVersionToRestore(null);
                } catch (error) {
                  console.error('Failed to restore version:', error);
                  alert('Failed to restore version');
                }
              }}
              className="bg-gradient-to-r from-violet-600 to-violet-700"
            >
              Restore Version
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

