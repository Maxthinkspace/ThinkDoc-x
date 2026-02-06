import React, { useState, useEffect, useMemo } from 'react'
import { libraryApi, type ClauseVersion, type PlaybookVersion } from '@/services/libraryApi'
import {
  Clock,
  RotateCcw,
  Eye,
  FileText,
  Book,
  GitBranch,
  Plus,
  Edit3,
  History,
  GitMerge,
  X,
  ChevronDown,
  ChevronUp,
  ArrowLeftRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'

interface VersionHistoryProps {
  resourceType: 'clause' | 'playbook'
  resourceId: string
  onRestore?: (versionId: string) => void
  onVersionChange?: () => void
  className?: string
}

type ChangeType = 'created' | 'edited' | 'restored' | 'merged' | null | undefined

export const VersionHistory: React.FC<VersionHistoryProps> = ({
  resourceType,
  resourceId,
  onRestore,
  onVersionChange,
  className,
}) => {
  const [versions, setVersions] = useState<(ClauseVersion | PlaybookVersion)[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null)
  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(new Set())
  const [comparingVersions, setComparingVersions] = useState<{
    left: string | null
    right: string | null
  }>({ left: null, right: null })
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false)
  const [versionToRestore, setVersionToRestore] = useState<string | null>(null)
  const [isRestoring, setIsRestoring] = useState(false)

  useEffect(() => {
    loadVersions()
  }, [resourceType, resourceId])

  const loadVersions = async () => {
    try {
      setLoading(true)
      if (resourceType === 'clause') {
        const clauseVersions = await libraryApi.getClauseVersions(resourceId)
        setVersions(clauseVersions)
      } else {
        const playbookVersions = await libraryApi.getPlaybookVersions(resourceId)
        setVersions(playbookVersions)
      }
    } catch (error) {
      console.error('Failed to load versions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRestoreClick = (versionId: string) => {
    setVersionToRestore(versionId)
    setRestoreDialogOpen(true)
  }

  const handleRestoreConfirm = async () => {
    if (!versionToRestore) return

    try {
      setIsRestoring(true)
      if (resourceType === 'clause') {
        await libraryApi.restoreClauseVersion(resourceId, versionToRestore)
      } else {
        await libraryApi.restorePlaybookVersion(resourceId, versionToRestore)
      }
      onRestore?.(versionToRestore)
      onVersionChange?.()
      await loadVersions()
      setRestoreDialogOpen(false)
      setVersionToRestore(null)
    } catch (error) {
      console.error('Failed to restore version:', error)
    } finally {
      setIsRestoring(false)
    }
  }

  const toggleVersionExpanded = (versionId: string) => {
    const newExpanded = new Set(expandedVersions)
    if (newExpanded.has(versionId)) {
      newExpanded.delete(versionId)
    } else {
      newExpanded.add(versionId)
    }
    setExpandedVersions(newExpanded)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return formatDate(dateString)
  }

  const getChangeTypeIcon = (changeType: ChangeType) => {
    switch (changeType) {
      case 'created':
        return <Plus className="h-3 w-3" />
      case 'edited':
        return <Edit3 className="h-3 w-3" />
      case 'restored':
        return <History className="h-3 w-3" />
      case 'merged':
        return <GitMerge className="h-3 w-3" />
      default:
        return <GitBranch className="h-3 w-3" />
    }
  }

  const getChangeTypeLabel = (changeType: ChangeType) => {
    switch (changeType) {
      case 'created':
        return 'Created'
      case 'edited':
        return 'Edited'
      case 'restored':
        return 'Restored'
      case 'merged':
        return 'Merged'
      default:
        return 'Modified'
    }
  }

  const getChangeTypeClasses = (changeType: ChangeType) => {
    switch (changeType) {
      case 'created':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200'
      case 'edited':
        return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'restored':
        return 'bg-violet-50 text-violet-700 border-violet-200'
      case 'merged':
        return 'bg-amber-50 text-amber-700 border-amber-200'
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  const getDotClasses = (changeType: ChangeType) => {
    switch (changeType) {
      case 'created':
        return 'bg-emerald-500 ring-emerald-100'
      case 'edited':
        return 'bg-blue-500 ring-blue-100'
      case 'restored':
        return 'bg-violet-500 ring-violet-100'
      case 'merged':
        return 'bg-amber-500 ring-amber-100'
      default:
        return 'bg-gray-500 ring-gray-100'
    }
  }

  if (loading) {
    return (
      <div className={cn("flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground", className)}>
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
        <span className="text-sm">Loading version history...</span>
      </div>
    )
  }

  if (versions.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground", className)}>
        <GitBranch className="h-8 w-8 stroke-[1.5]" />
        <span className="text-sm">No version history available</span>
      </div>
    )
  }

  // Sort versions by version number (newest first)
  const sortedVersions = [...versions].sort((a, b) => b.versionNumber - a.versionNumber)

  return (
    <TooltipProvider>
      <div className={cn("flex max-h-[600px] flex-col overflow-hidden rounded-xl border bg-gradient-to-br from-slate-50 to-slate-100/50", className)}>
        {/* Header */}
        <div className="flex items-center justify-between border-b bg-white px-5 py-4">
          <h3 className="flex items-center gap-2.5 text-base font-semibold text-foreground">
            {resourceType === 'clause' ? (
              <FileText className="h-[18px] w-[18px]" />
            ) : (
              <Book className="h-[18px] w-[18px]" />
            )}
            Version History
            <Badge variant="secondary" className="text-xs font-medium">
              {versions.length} versions
            </Badge>
          </h3>
          {comparingVersions.left && comparingVersions.right && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setComparingVersions({ left: null, right: null })}
              className="gap-1.5"
            >
              <X className="h-3.5 w-3.5" />
              Close Comparison
            </Button>
          )}
        </div>

        {comparingVersions.left && comparingVersions.right ? (
          <VersionComparison
            resourceType={resourceType}
            versions={sortedVersions}
            leftId={comparingVersions.left}
            rightId={comparingVersions.right}
          />
        ) : (
          <ScrollArea className="flex-1 p-5">
            <div className="space-y-0">
              {sortedVersions.map((version, index) => {
                const isLatest = index === 0
                const isLast = index === sortedVersions.length - 1
                const prevVersion = index < sortedVersions.length - 1 ? sortedVersions[index + 1] : null
                const isExpanded = expandedVersions.has(version.id)

                return (
                  <div key={version.id} className="flex gap-4">
                    {/* Timeline connector */}
                    <div className="flex w-7 flex-shrink-0 flex-col items-center">
                      <div
                        className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-full text-white ring-4 transition-transform hover:scale-110",
                          getDotClasses(version.changeType)
                        )}
                      >
                        {getChangeTypeIcon(version.changeType)}
                      </div>
                      {!isLast && (
                        <div className="mt-1 h-full min-h-5 w-0.5 bg-gradient-to-b from-gray-300 to-gray-200" />
                      )}
                    </div>

                    {/* Version content */}
                    <div
                      className={cn(
                        "mb-4 flex-1 overflow-hidden rounded-lg border bg-white shadow-sm transition-all",
                        isExpanded && "border-indigo-300 shadow-md shadow-indigo-100/50"
                      )}
                    >
                      <div
                        className="flex cursor-pointer items-start justify-between gap-3 p-4 transition-colors hover:bg-slate-50"
                        onClick={() => toggleVersionExpanded(version.id)}
                      >
                        <div className="flex-1">
                          <div className="mb-1.5 flex flex-wrap items-center gap-2">
                            <span className="text-sm font-bold text-foreground">
                              v{version.versionNumber}
                            </span>
                            {isLatest && (
                              <Badge className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-[10px] font-semibold uppercase tracking-wide">
                                Current
                              </Badge>
                            )}
                            <Badge
                              variant="outline"
                              className={cn("gap-1 text-[11px] font-medium", getChangeTypeClasses(version.changeType))}
                            >
                              {getChangeTypeIcon(version.changeType)}
                              {getChangeTypeLabel(version.changeType)}
                            </Badge>
                          </div>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {formatRelativeTime(version.createdAt)}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>{formatDate(version.createdAt)}</TooltipContent>
                          </Tooltip>
                        </div>
                        <div className="text-muted-foreground transition-colors">
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </div>

                      {version.changeDescription && (
                        <div className="px-4 pb-3 text-[13px] leading-relaxed text-muted-foreground">
                          {version.changeDescription}
                        </div>
                      )}

                      {isExpanded && (
                        <div className="animate-in slide-in-from-top-2 border-t bg-slate-50/50 p-4 duration-200">
                          <div className="mb-3 flex flex-wrap items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={e => {
                                e.stopPropagation()
                                setSelectedVersion(selectedVersion === version.id ? null : version.id)
                              }}
                              className="gap-1.5 text-xs"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              {selectedVersion === version.id ? 'Hide' : 'View'}
                            </Button>
                            {prevVersion && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={e => {
                                  e.stopPropagation()
                                  setComparingVersions({
                                    left: prevVersion.id,
                                    right: version.id,
                                  })
                                }}
                                className="gap-1.5 border-blue-200 bg-blue-50 text-xs text-blue-700 hover:bg-blue-100 hover:text-blue-800"
                              >
                                <ArrowLeftRight className="h-3.5 w-3.5" />
                                Compare
                              </Button>
                            )}
                            {!isLatest && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={e => {
                                  e.stopPropagation()
                                  handleRestoreClick(version.id)
                                }}
                                className="gap-1.5 border-violet-200 bg-violet-50 text-xs text-violet-700 hover:bg-violet-100 hover:text-violet-800"
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                                Restore
                              </Button>
                            )}
                          </div>

                          {selectedVersion === version.id && (
                            <VersionContentView
                              resourceType={resourceType}
                              version={version}
                              onClose={() => setSelectedVersion(null)}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        )}

        {/* Restore Confirmation Dialog */}
        <Dialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-foreground">
                <History className="h-6 w-6 text-violet-600" />
                Restore Version
              </DialogTitle>
              <DialogDescription>
                This will create a new version with the content from the selected version. The
                current version will remain in history.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setRestoreDialogOpen(false)}
                disabled={isRestoring}
              >
                Cancel
              </Button>
              <Button
                onClick={handleRestoreConfirm}
                disabled={isRestoring}
                className="bg-gradient-to-r from-violet-600 to-violet-700"
              >
                {isRestoring ? 'Restoring...' : 'Restore Version'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}

interface VersionContentViewProps {
  resourceType: 'clause' | 'playbook'
  version: ClauseVersion | PlaybookVersion
  onClose: () => void
}

const VersionContentView: React.FC<VersionContentViewProps> = ({
  resourceType,
  version,
  onClose,
}) => {
  if (resourceType === 'clause') {
    const clauseVersion = version as ClauseVersion
    return (
      <div className="mt-3 overflow-hidden rounded-lg border bg-white">
        <div className="flex items-center justify-between border-b bg-slate-100 px-4 py-3">
          <h4 className="text-[13px] font-semibold text-foreground">
            Version {clauseVersion.versionNumber} Content
          </h4>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-slate-200 hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-72 overflow-y-auto whitespace-pre-wrap p-4 text-[13px] leading-relaxed text-foreground">
          {clauseVersion.text}
        </div>
        {clauseVersion.summary && (
          <div className="border-t bg-slate-50 p-4 text-[13px] text-muted-foreground">
            <strong className="text-foreground">Summary:</strong> {clauseVersion.summary}
          </div>
        )}
      </div>
    )
  } else {
    const playbookVersion = version as PlaybookVersion
    return (
      <div className="mt-3 overflow-hidden rounded-lg border bg-white">
        <div className="flex items-center justify-between border-b bg-slate-100 px-4 py-3">
          <h4 className="text-[13px] font-semibold text-foreground">
            Version {playbookVersion.versionNumber} Rules Snapshot
          </h4>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-slate-200 hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-72 overflow-y-auto p-4">
          <pre className="font-mono text-xs leading-relaxed text-foreground">
            {JSON.stringify(playbookVersion.rulesSnapshot, null, 2)}
          </pre>
        </div>
      </div>
    )
  }
}

interface VersionComparisonProps {
  resourceType: 'clause' | 'playbook'
  versions: (ClauseVersion | PlaybookVersion)[]
  leftId: string
  rightId: string
}

// Simple diff algorithm that computes word-level differences
interface DiffSegment {
  type: 'unchanged' | 'added' | 'removed'
  text: string
}

function computeWordDiff(oldText: string, newText: string): DiffSegment[] {
  const oldWords = oldText.split(/(\s+)/)
  const newWords = newText.split(/(\s+)/)

  // LCS (Longest Common Subsequence) approach for better diff
  const lcsMatrix: number[][] = []
  for (let i = 0; i <= oldWords.length; i++) {
    lcsMatrix[i] = []
    for (let j = 0; j <= newWords.length; j++) {
      if (i === 0 || j === 0) {
        lcsMatrix[i][j] = 0
      } else if (oldWords[i - 1] === newWords[j - 1]) {
        lcsMatrix[i][j] = lcsMatrix[i - 1][j - 1] + 1
      } else {
        lcsMatrix[i][j] = Math.max(lcsMatrix[i - 1][j], lcsMatrix[i][j - 1])
      }
    }
  }

  // Backtrack to find the diff
  let i = oldWords.length
  let j = newWords.length

  const tempResult: DiffSegment[] = []

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldWords[i - 1] === newWords[j - 1]) {
      tempResult.unshift({ type: 'unchanged', text: oldWords[i - 1] })
      i--
      j--
    } else if (j > 0 && (i === 0 || lcsMatrix[i][j - 1] >= lcsMatrix[i - 1][j])) {
      tempResult.unshift({ type: 'added', text: newWords[j - 1] })
      j--
    } else if (i > 0) {
      tempResult.unshift({ type: 'removed', text: oldWords[i - 1] })
      i--
    }
  }

  // Merge consecutive segments of the same type
  const result: DiffSegment[] = []
  for (const segment of tempResult) {
    if (result.length > 0 && result[result.length - 1].type === segment.type) {
      result[result.length - 1].text += segment.text
    } else {
      result.push({ ...segment })
    }
  }

  return result
}

const VersionComparison: React.FC<VersionComparisonProps> = ({
  resourceType,
  versions,
  leftId,
  rightId,
}) => {
  const leftVersion = versions.find(v => v.id === leftId)
  const rightVersion = versions.find(v => v.id === rightId)

  const diffResult = useMemo(() => {
    if (!leftVersion || !rightVersion) return null

    if (resourceType === 'clause') {
      const left = leftVersion as ClauseVersion
      const right = rightVersion as ClauseVersion
      return computeWordDiff(left.text, right.text)
    }
    return null
  }, [leftVersion, rightVersion, resourceType])

  if (!leftVersion || !rightVersion) {
    return (
      <div className="p-6 text-center text-destructive">Versions not found</div>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (resourceType === 'clause') {
    const left = leftVersion as ClauseVersion
    const right = rightVersion as ClauseVersion

    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Comparison header */}
        <div className="flex items-center justify-center gap-4 border-b bg-white px-5 py-4">
          <div className="flex flex-col items-center gap-1">
            <Badge variant="outline" className="border-red-200 bg-red-50 text-sm font-bold text-red-600">
              v{left.versionNumber}
            </Badge>
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Previous
            </span>
            <span className="text-[11px] text-muted-foreground/70">
              {formatDate(left.createdAt)}
            </span>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-muted-foreground">
            <ArrowLeftRight className="h-4 w-4" />
          </div>
          <div className="flex flex-col items-center gap-1">
            <Badge variant="outline" className="border-green-200 bg-green-50 text-sm font-bold text-green-600">
              v{right.versionNumber}
            </Badge>
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Selected
            </span>
            <span className="text-[11px] text-muted-foreground/70">
              {formatDate(right.createdAt)}
            </span>
          </div>
        </div>

        {/* Unified diff view */}
        <div className="border-b p-5">
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
          <div className="max-h-48 overflow-y-auto rounded-lg border bg-slate-50 p-4 text-[13px] leading-relaxed text-foreground">
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
        </div>

        {/* Side-by-side view */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="border-b bg-slate-50 px-5 py-3 text-[13px] font-semibold text-foreground">
            Side-by-Side Comparison
          </div>
          <div className="grid flex-1 grid-cols-2 gap-px overflow-hidden bg-slate-200">
            <div className="flex flex-col bg-white">
              <div className="border-b bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-600">
                Previous (v{left.versionNumber})
              </div>
              <ScrollArea className="flex-1 p-4 text-xs leading-relaxed text-foreground">
                {left.text}
              </ScrollArea>
            </div>
            <div className="flex flex-col bg-white">
              <div className="border-b bg-green-50 px-4 py-2.5 text-xs font-semibold text-green-600">
                Selected (v{right.versionNumber})
              </div>
              <ScrollArea className="flex-1 p-4 text-xs leading-relaxed text-foreground">
                {right.text}
              </ScrollArea>
            </div>
          </div>
        </div>
      </div>
    )
  } else {
    const left = leftVersion as PlaybookVersion
    const right = rightVersion as PlaybookVersion

    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Comparison header */}
        <div className="flex items-center justify-center gap-4 border-b bg-white px-5 py-4">
          <div className="flex flex-col items-center gap-1">
            <Badge variant="outline" className="border-red-200 bg-red-50 text-sm font-bold text-red-600">
              v{left.versionNumber}
            </Badge>
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Previous
            </span>
            <span className="text-[11px] text-muted-foreground/70">
              {formatDate(left.createdAt)}
            </span>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-muted-foreground">
            <ArrowLeftRight className="h-4 w-4" />
          </div>
          <div className="flex flex-col items-center gap-1">
            <Badge variant="outline" className="border-green-200 bg-green-50 text-sm font-bold text-green-600">
              v{right.versionNumber}
            </Badge>
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Selected
            </span>
            <span className="text-[11px] text-muted-foreground/70">
              {formatDate(right.createdAt)}
            </span>
          </div>
        </div>

        {/* Side-by-side view */}
        <div className="grid flex-1 grid-cols-2 gap-px overflow-hidden bg-slate-200">
          <div className="flex flex-col bg-white">
            <div className="border-b bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-600">
              Previous Rules
            </div>
            <ScrollArea className="flex-1 p-4">
              <pre className="font-mono text-[11px] leading-relaxed text-foreground">
                {JSON.stringify(left.rulesSnapshot, null, 2)}
              </pre>
            </ScrollArea>
          </div>
          <div className="flex flex-col bg-white">
            <div className="border-b bg-green-50 px-4 py-2.5 text-xs font-semibold text-green-600">
              Selected Rules
            </div>
            <ScrollArea className="flex-1 p-4">
              <pre className="font-mono text-[11px] leading-relaxed text-foreground">
                {JSON.stringify(right.rulesSnapshot, null, 2)}
              </pre>
            </ScrollArea>
          </div>
        </div>
      </div>
    )
  }
}

export default VersionHistory

