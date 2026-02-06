import { useState, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Clock, Check } from "lucide-react";
import { documentVersionApi, type VersionTree, type DocumentVersion, type DocumentSubVersion } from "@/services/documentVersionApi";
import { cn } from "@/lib/utils";

interface VersionDropdownProps {
  documentId: string;
  currentVersionId?: string;
  onVersionSelect?: (versionId: string, isSubVersion: boolean) => void;
  className?: string;
}

export default function VersionDropdown({
  documentId,
  currentVersionId,
  onVersionSelect,
  className,
}: VersionDropdownProps) {
  const [versionTree, setVersionTree] = useState<VersionTree | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open && documentId) {
      loadVersionHistory();
    }
  }, [open, documentId]);

  const loadVersionHistory = async () => {
    try {
      setLoading(true);
      const tree = await documentVersionApi.getVersionHistory(documentId);
      setVersionTree(tree);
    } catch (error) {
      console.error("Failed to load version history:", error);
    } finally {
      setLoading(false);
    }
  };

  const getVersionLabel = (version: DocumentVersion | DocumentSubVersion, isSubVersion: boolean): string => {
    if (isSubVersion) {
      const subVersion = version as DocumentSubVersion;
      const parentVersion = versionTree?.versions.find(v => v.version.id === subVersion.parentVersionId);
      const mainVersion = parentVersion?.version.mainVersion || 1;
      return `Version ${mainVersion}.${subVersion.subVersionLetter}`;
    } else {
      const mainVersion = version as DocumentVersion;
      return `Version ${mainVersion.mainVersion}`;
    }
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const getCurrentVersionLabel = () => {
    if (!versionTree) return "Version 1";
    
    // Find current version
    for (const versionGroup of versionTree.versions) {
      if (versionGroup.version.id === currentVersionId) {
        return getVersionLabel(versionGroup.version, false);
      }
      for (const subVersion of versionGroup.subVersions) {
        if (subVersion.id === currentVersionId) {
          return getVersionLabel(subVersion, true);
        }
      }
    }
    
    // Default to latest version
    if (versionTree.versions.length > 0) {
      return getVersionLabel(versionTree.versions[0].version, false);
    }
    
    return "Version 1";
  };

  const getCurrentVersionDescription = () => {
    if (!versionTree) return "First draft";
    
    for (const versionGroup of versionTree.versions) {
      if (versionGroup.version.id === currentVersionId) {
        return versionGroup.version.description || "First draft";
      }
      for (const subVersion of versionGroup.subVersions) {
        if (subVersion.id === currentVersionId) {
          return subVersion.description || "Edit";
        }
      }
    }
    
    if (versionTree.versions.length > 0) {
      return versionTree.versions[0].version.description || "First draft";
    }
    
    return "First draft";
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-muted/50 transition-colors text-sm",
            className
          )}
        >
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{getCurrentVersionLabel()}</span>
          <span className="text-xs text-muted-foreground">
            {getCurrentVersionDescription()}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="end">
        {loading ? (
          <div className="px-2 py-4 text-sm text-muted-foreground text-center">
            Loading...
          </div>
        ) : !versionTree || versionTree.versions.length === 0 ? (
          <div className="px-2 py-4 text-sm text-muted-foreground text-center">
            No versions available
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {versionTree.versions.map((versionGroup) => {
              const mainVersion = versionGroup.version;
              const isMainSelected = mainVersion.id === currentVersionId;
              
              return (
                <div key={mainVersion.id}>
                  <DropdownMenuItem
                    onClick={() => {
                      onVersionSelect?.(mainVersion.id, false);
                      setOpen(false);
                    }}
                    className="flex items-center gap-2 px-3 py-2 cursor-pointer"
                  >
                    {isMainSelected && <Check className="h-4 w-4 text-primary" />}
                    {!isMainSelected && <div className="h-4 w-4" />}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">
                        {getVersionLabel(mainVersion, false)}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {mainVersion.description || "First draft"}
                      </div>
                    </div>
                  </DropdownMenuItem>
                  
                  {versionGroup.subVersions.map((subVersion) => {
                    const isSubSelected = subVersion.id === currentVersionId;
                    return (
                      <DropdownMenuItem
                        key={subVersion.id}
                        onClick={() => {
                          onVersionSelect?.(subVersion.id, true);
                          setOpen(false);
                        }}
                        className="flex items-center gap-2 px-3 py-2 pl-8 cursor-pointer"
                      >
                        {isSubSelected && <Check className="h-4 w-4 text-primary" />}
                        {!isSubSelected && <div className="h-4 w-4" />}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">
                            {getVersionLabel(subVersion, true)}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {subVersion.description || "Edit"}
                          </div>
                        </div>
                      </DropdownMenuItem>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

