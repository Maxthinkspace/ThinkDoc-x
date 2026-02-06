import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Database, Folder, FileText, ChevronDown, ChevronRight } from "lucide-react";
import { vaultApi } from "@/services/vaultApi";
import { useToast } from "@/hooks/use-toast";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface VaultFile {
  id: string;
  name: string;
  type?: string;
  projectId: string;
}

interface VaultSelectorProps {
  selectedFiles: string[];
  onSelectionChange: (fileIds: string[]) => void;
}

export default function VaultSelector({ selectedFiles, onSelectionChange }: VaultSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [files, setFiles] = useState<Record<string, VaultFile[]>>({});
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      loadVaultData();
    }
  }, [isOpen]);

  const loadVaultData = async () => {
    try {
      const projectsData = await vaultApi.projects.list();
      setProjects(projectsData);

      // Load files for each project
      const filesMap: Record<string, VaultFile[]> = {};
      for (const project of projectsData) {
        try {
          const filesData = await vaultApi.files.list(project.id);
          filesMap[project.id] = filesData.map(file => ({
            id: file.id,
            name: file.name,
            type: file.mimeType || undefined,
            projectId: file.projectId
          }));
        } catch (error) {
          console.error(`Error loading files for project ${project.id}:`, error);
        }
      }
      setFiles(filesMap);
    } catch (error) {
      toast({
        title: "Error loading projects",
        description: error instanceof Error ? error.message : "Failed to load vault data",
        variant: "destructive"
      });
    }
  };

  const toggleProject = (projectId: string) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
    }
    setExpandedProjects(newExpanded);
  };

  const toggleFile = (fileId: string) => {
    if (selectedFiles.includes(fileId)) {
      onSelectionChange(selectedFiles.filter(id => id !== fileId));
    } else {
      onSelectionChange([...selectedFiles, fileId]);
    }
  };

  const toggleAllProjectFiles = (projectId: string) => {
    const projectFiles = files[projectId] || [];
    const projectFileIds = projectFiles.map(f => f.id);
    const allSelected = projectFileIds.every(id => selectedFiles.includes(id));

    if (allSelected) {
      onSelectionChange(selectedFiles.filter(id => !projectFileIds.includes(id)));
    } else {
      onSelectionChange([...new Set([...selectedFiles, ...projectFileIds])]);
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          <Database className="h-4 w-4 mr-2" />
          Vault Data
          {selectedFiles.length > 0 && (
            <span className="ml-2 text-xs bg-primary/20 px-2 py-0.5 rounded">
              {selectedFiles.length} selected
            </span>
          )}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2">
        <Card className="p-4 max-h-64 overflow-y-auto space-y-2">
          {projects.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No vault projects found
            </p>
          ) : (
            projects.map((project) => {
              const projectFiles = files[project.id] || [];
              const projectFileIds = projectFiles.map(f => f.id);
              const allSelected = projectFileIds.length > 0 && 
                projectFileIds.every(id => selectedFiles.includes(id));
              const someSelected = projectFileIds.some(id => selectedFiles.includes(id));

              return (
                <div key={project.id} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => toggleProject(project.id)}
                    >
                      {expandedProjects.has(project.id) ? (
                        <ChevronDown className="h-3 w-3" />
                      ) : (
                        <ChevronRight className="h-3 w-3" />
                      )}
                    </Button>
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={() => toggleAllProjectFiles(project.id)}
                      className={someSelected && !allSelected ? "data-[state=checked]:bg-primary/50" : ""}
                    />
                    <Folder className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{project.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({projectFiles.length} files)
                    </span>
                  </div>

                  {expandedProjects.has(project.id) && (
                    <div className="ml-8 space-y-1">
                      {projectFiles.map((file) => (
                        <div key={file.id} className="flex items-center gap-2">
                          <Checkbox
                            checked={selectedFiles.includes(file.id)}
                            onCheckedChange={() => toggleFile(file.id)}
                          />
                          <FileText className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{file.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
}
