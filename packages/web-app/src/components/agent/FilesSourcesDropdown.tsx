import { useState, useEffect, useRef } from "react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { Upload, FolderOpen, Globe, FileText, Database, Folder, Search, Building2 } from "lucide-react";
import { vaultApi } from "@/services/vaultApi";
import { useToast } from "@/hooks/use-toast";

interface VaultProject {
  id: string;
  name: string;
}

interface VaultFile {
  id: string;
  name: string;
  projectId: string;
}

interface FilesSourcesDropdownProps {
  onUploadFiles?: () => void;
  onUploadFolder?: () => void;
  onVaultFileSelect?: (fileId: string, projectId: string, fileName: string) => void;
  onVaultFolderSelect?: (projectId: string, projectName: string, fileIds: string[]) => void;
  onWebSearch?: () => void;
  onEDGAR?: () => void;
  onEURLex?: () => void;
  onMemos?: () => void;
  trigger?: React.ReactNode;
}

export default function FilesSourcesDropdown({
  onUploadFiles,
  onUploadFolder,
  onVaultFileSelect,
  onVaultFolderSelect,
  onWebSearch,
  onEDGAR,
  onEURLex,
  onMemos,
  trigger,
}: FilesSourcesDropdownProps) {
  const [projects, setProjects] = useState<VaultProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<Record<string, VaultFile[]>>({});
  const [loadingFiles, setLoadingFiles] = useState<Record<string, boolean>>({});
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const projectsData = await vaultApi.projects.list();
      setProjects(projectsData);
    } catch (error) {
      console.error("Error loading vault projects:", error);
      toast({
        title: "Error",
        description: "Failed to load vault projects",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadProjectFiles = async (projectId: string) => {
    if (files[projectId]) return; // Already loaded

    try {
      setLoadingFiles((prev) => ({ ...prev, [projectId]: true }));
      const filesData = await vaultApi.files.list(projectId);
      const projectFiles: VaultFile[] = filesData.map((file) => ({
        id: file.id,
        name: file.name,
        projectId: file.projectId,
      }));
      setFiles((prev) => ({ ...prev, [projectId]: projectFiles }));
    } catch (error) {
      console.error(`Error loading files for project ${projectId}:`, error);
      toast({
        title: "Error",
        description: "Failed to load project files",
        variant: "destructive",
      });
    } finally {
      setLoadingFiles((prev) => ({ ...prev, [projectId]: false }));
    }
  };

  const handleUploadClick = () => {
    if (onUploadFiles) {
      onUploadFiles();
    } else {
      fileInputRef.current?.click();
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          // Handle file selection if needed
          if (e.target.files && e.target.files.length > 0) {
            console.log("Files selected:", Array.from(e.target.files));
          }
        }}
      />
      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <DropdownMenuTrigger asChild>
          {trigger || <button className="text-sm">Files and sources</button>}
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-64 p-2" align="start">
          {/* Upload files */}
          <DropdownMenuItem
            onClick={handleUploadClick}
            className="flex items-center gap-3 px-3 py-2 cursor-pointer"
          >
            <Upload className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Upload files</span>
          </DropdownMenuItem>

          {/* Upload folder */}
          <DropdownMenuItem
            onClick={onUploadFolder}
            className="flex items-center gap-3 px-3 py-2 cursor-pointer"
          >
            <Folder className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Upload folder</span>
          </DropdownMenuItem>

          {/* Add from Vault project */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="flex items-center gap-3 px-3 py-2">
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Add from Vault project</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-64">
              {loading ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">Loading...</div>
              ) : projects.length === 0 ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  No projects found
                </div>
              ) : (
                projects.map((project) => (
                  <DropdownMenuSub key={project.id}>
                    <DropdownMenuSubTrigger
                      className="flex items-center gap-2 px-3 py-2"
                      onMouseEnter={() => loadProjectFiles(project.id)}
                    >
                      <Database className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm flex-1">{project.name}</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="w-56 max-h-64 overflow-y-auto">
                      {loadingFiles[project.id] ? (
                        <div className="px-3 py-2 text-sm text-muted-foreground">Loading files...</div>
                      ) : !files[project.id] || files[project.id].length === 0 ? (
                        <div className="px-3 py-2 text-sm text-muted-foreground">
                          No files found
                        </div>
                      ) : (
                        <>
                          {/* Option to select entire project as folder */}
                          {onVaultFolderSelect && files[project.id].length > 0 && (
                            <DropdownMenuItem
                              onClick={() => {
                                const fileIds = files[project.id].map(f => f.id);
                                onVaultFolderSelect(project.id, project.name, fileIds);
                                setDropdownOpen(false);
                              }}
                              className="flex items-center gap-2 px-3 py-2 border-b border-border/50 mb-1"
                            >
                              <Folder className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-sm font-medium">Select all ({files[project.id].length} files)</span>
                            </DropdownMenuItem>
                          )}
                          {/* Individual files */}
                          {files[project.id].map((file) => (
                            <DropdownMenuItem
                              key={file.id}
                              onClick={() => {
                                onVaultFileSelect?.(file.id, file.projectId, file.name);
                                setDropdownOpen(false);
                              }}
                              className="flex items-center gap-2 px-3 py-2"
                            >
                              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-sm truncate">{file.name}</span>
                            </DropdownMenuItem>
                          ))}
                        </>
                      )}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                ))
              )}
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSeparator />

          {/* Web search */}
          <DropdownMenuItem
            onClick={onWebSearch}
            className="flex items-center gap-3 px-3 py-2 cursor-pointer"
          >
            <Globe className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Web search</span>
          </DropdownMenuItem>

          {/* EDGAR */}
          <DropdownMenuItem
            onClick={onEDGAR}
            className="flex items-center gap-3 px-3 py-2 cursor-pointer"
          >
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">EDGAR</span>
          </DropdownMenuItem>

          {/* EUR-Lex */}
          <DropdownMenuItem
            onClick={onEURLex}
            className="flex items-center gap-3 px-3 py-2 cursor-pointer"
          >
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">EUR-Lex</span>
          </DropdownMenuItem>

          {/* Memos */}
          <DropdownMenuItem
            onClick={onMemos}
            className="flex items-center gap-3 px-3 py-2 cursor-pointer"
          >
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Memos</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

