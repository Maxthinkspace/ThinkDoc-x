import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronRight,
  FileText,
  Globe,
  Building2,
} from "lucide-react";
import iManageLogo from "@/assets/imanage Logo.png";
import lexisNexisLogo from "@/assets/Lexis Nexis Logo.png";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import AgentChat from "@/components/agent/AgentChat";
import UnifiedInput from "@/components/agent/UnifiedInput";
import FilesSourcesDropdown from "@/components/agent/FilesSourcesDropdown";
import { useNavigate } from "react-router-dom";

interface FileChip {
  id: string;
  name: string;
  isFolder?: boolean;
  fileCount?: number;
  file?: File; // Store actual file for folder uploads
  type?: string; // File type for icon display
}

interface Workflow {
  id: string;
  title: string;
  description: string;
  steps: number;
  type: "draft" | "output";
}

const workflows: Workflow[] = [
  {
    id: "1",
    title: "Translate into Another Language",
    description: "Output · 2 steps",
    steps: 2,
    type: "output"
  },
  {
    id: "2",
    title: "Draft from Template",
    description: "Draft · 3 steps",
    steps: 3,
    type: "draft"
  },
  {
    id: "3",
    title: "Draft a Client Alert",
    description: "Draft · 2 steps",
    steps: 2,
    type: "draft"
  },
  {
    id: "4",
    title: "Draft Memo from Legal Research",
    description: "Draft · 2 steps",
    steps: 2,
    type: "draft"
  }
];

export default function AssistantApp() {
  const [showInstructions, setShowInstructions] = useState(false);
  const [input, setInput] = useState("");
  const [files, setFiles] = useState<FileChip[]>([]);
  const [folderFilesMap, setFolderFilesMap] = useState<Map<string, File[]>>(new Map());
  const [vaultFolderFilesMap, setVaultFolderFilesMap] = useState<Map<string, string[]>>(new Map());
  const [deepResearch, setDeepResearch] = useState(false);
  const [hasMessages, setHasMessages] = useState(false);
  const [initialMessage, setInitialMessage] = useState<string>("");
  const [initialFiles, setInitialFiles] = useState<File[]>([]);
  const [initialVaultFiles, setInitialVaultFiles] = useState<string[]>([]);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const navigate = useNavigate();

  // Show instructions on first visit
  useEffect(() => {
    const hasSeenInstructions = localStorage.getItem('associateInstructionsSeen');
    if (!hasSeenInstructions) {
      setShowInstructions(true);
      localStorage.setItem('associateInstructionsSeen', 'true');
    }
  }, []);

  const handleFileUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.onchange = (e) => {
      const fileList = (e.target as HTMLInputElement).files;
      if (fileList) {
        const newFiles: FileChip[] = Array.from(fileList).map((file, idx) => ({
          id: `file-${Date.now()}-${idx}`,
          name: file.name,
          file: file,
        }));
        setFiles([...files, ...newFiles]);
      }
    };
    input.click();
  };

  const handleFolderUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.setAttribute('webkitdirectory', 'true');
    input.setAttribute('directory', 'true');
    input.multiple = true;
    input.onchange = async (e) => {
      const fileList = (e.target as HTMLInputElement).files;
      if (fileList && fileList.length > 0) {
        // Get folder name from the first file's path
        const firstFile = fileList[0];
        const folderPath = firstFile.webkitRelativePath.split('/')[0];
        const folderFiles = Array.from(fileList);
        const folderId = `folder-${Date.now()}`;
        
        // Store all files for this folder in a map
        setFolderFilesMap((prev) => {
          const newMap = new Map(prev);
          newMap.set(folderId, folderFiles);
          return newMap;
        });
        
        // Only show the folder chip in UI
        const folderChip: FileChip = {
          id: folderId,
          name: folderPath,
          isFolder: true,
          fileCount: folderFiles.length,
        };
        
        setFiles([...files, folderChip]);
      }
    };
    input.click();
  };

  const handleRemoveFile = (id: string) => {
    // Remove folder files from map if it's a folder
    const fileToRemove = files.find(f => f.id === id);
    if (fileToRemove?.isFolder) {
      if (id.startsWith('vault-folder-')) {
        // Remove from vault folder map
        setVaultFolderFilesMap((prev) => {
          const newMap = new Map(prev);
          newMap.delete(id);
          return newMap;
        });
      } else {
        // Remove from uploaded folder map
        setFolderFilesMap((prev) => {
          const newMap = new Map(prev);
          newMap.delete(id);
          return newMap;
        });
      }
    }
    setFiles(files.filter(f => f.id !== id));
  };

  const handleVaultFileSelect = (fileId: string, projectId: string, fileName: string) => {
    // Add vault file to the files list
    const newFile: FileChip = {
      id: `vault-${fileId}`,
      name: fileName,
    };
    setFiles([...files, newFile]);
  };

  const handleVaultFolderSelect = async (projectId: string, projectName: string, fileIds: string[]) => {
    try {
      // Create folder chip for vault project
      const folderId = `vault-folder-${projectId}-${Date.now()}`;
      
      // Create folder chip
      const folderChip: FileChip = {
        id: folderId,
        name: projectName,
        isFolder: true,
        fileCount: fileIds.length,
      };
      
      // Store file IDs for this vault folder
      setVaultFolderFilesMap((prev) => {
        const newMap = new Map(prev);
        newMap.set(folderId, fileIds);
        return newMap;
      });
      
      setFiles([...files, folderChip]);
    } catch (error) {
      console.error("Error selecting vault project folder:", error);
    }
  };

  const handleSubmit = async () => {
    if (!input.trim()) return;
    
    // Collect all files (local files and folders)
    const allFiles: File[] = [];
    const vaultFileIds: string[] = [];
    
    // Collect local files
    files.forEach(fileChip => {
      if (fileChip.file) {
        allFiles.push(fileChip.file);
      } else if (fileChip.isFolder && fileChip.id.startsWith('folder-')) {
        // Add all files from the folder
        const folderFiles = folderFilesMap.get(fileChip.id);
        if (folderFiles) {
          allFiles.push(...folderFiles);
        }
      } else if (fileChip.id.startsWith('vault-') && !fileChip.isFolder) {
        // Extract vault file ID (remove 'vault-' prefix)
        const fileId = fileChip.id.replace('vault-', '');
        vaultFileIds.push(fileId);
      } else if (fileChip.isFolder && fileChip.id.startsWith('vault-folder-')) {
        // Add all vault file IDs from the folder
        const folderFileIds = vaultFolderFilesMap.get(fileChip.id);
        if (folderFileIds) {
          vaultFileIds.push(...folderFileIds);
        }
      }
    });
    
    // Store initial state for AgentChat
    setInitialMessage(input.trim());
    setInitialFiles(allFiles);
    setInitialVaultFiles(vaultFileIds);
    setHasMessages(true);
  };

  const handleWorkflowClick = (workflowId: string) => {
    if (workflowId === "1") {
      navigate("/dashboard/workflow/translate");
    } else if (workflowId === "4") {
      navigate("/dashboard/workflow/redact");
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Instructions Dialog */}
      <Dialog open={showInstructions} onOpenChange={setShowInstructions}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold">Welcome to Think AI</DialogTitle>
            <DialogDescription className="text-base pt-4">
              Your AI-powered legal assistant designed to streamline your workflow.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                  1
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-1">Connect Your Resources</h4>
                  <p className="text-sm text-muted-foreground">
                    Add files, vault projects, web sources, or jurisdictions to provide context for your queries.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                  2
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-1">Ask Questions or Use Workflows</h4>
                  <p className="text-sm text-muted-foreground">
                    Chat with the AI agent for custom queries, or use pre-built workflows for common tasks like contract review, translation, or drafting.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                  3
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-1">Customize Your Experience</h4>
                  <p className="text-sm text-muted-foreground">
                    Use prompts to save common instructions, adjust settings, or let the AI improve your queries automatically.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-muted/30 rounded-lg p-4 space-y-2">
              <h4 className="font-semibold text-sm text-foreground">Quick Tips:</h4>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Start with a workflow if you're new to ThinkDoc</li>
                <li>Add resources before asking questions for better context</li>
                <li>Use the search and voice features for faster input</li>
                <li>Switch between AI Agent and Workflows tabs as needed</li>
              </ul>
            </div>

            <Button onClick={() => setShowInstructions(false)} className="w-full">
              Got it, let's start
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Main Content */}
      {hasMessages ? (
        <div className="flex-1">
          <AgentChat 
            resources={[]} 
            initialMessage={initialMessage}
            initialFiles={initialFiles}
            initialVaultFiles={initialVaultFiles}
            autoSend={true}
          />
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center px-8 py-16">
          <div className="w-full max-w-4xl mx-auto space-y-12">
            {/* Header */}
            <div className="text-center">
              <h1 className="text-4xl font-serif mb-4 text-foreground">Think AI</h1>
            </div>

            {/* Unified Input */}
            <div className="space-y-6">
              <UnifiedInput
                value={input}
                onChange={setInput}
                onSubmit={handleSubmit}
                files={files}
                onRemoveFile={handleRemoveFile}
                onFilesClick={handleFileUpload}
                onFolderClick={handleFolderUpload}
                onVaultFileSelect={handleVaultFileSelect}
                onVaultFolderSelect={handleVaultFolderSelect}
                deepResearch={deepResearch}
                onDeepResearchToggle={() => setDeepResearch(!deepResearch)}
                placeholder="Ask Think AI anything..."
              />

              {/* Integration Chips */}
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full gap-2 px-4 py-2"
                >
                  <img src={iManageLogo} alt="iManage" className="w-4 h-4 object-contain" />
                  <span className="text-sm">iManage</span>
                  <span className="text-lg">+</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full gap-2 px-4 py-2"
                >
                  <img src={lexisNexisLogo} alt="LexisNexis" className="w-4 h-4 object-contain" />
                  <span className="text-sm">LexisNexis®</span>
                  <span className="text-lg">+</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full gap-2 px-4 py-2"
                >
                  <Globe className="w-4 h-4" />
                  <span className="text-sm">Web search</span>
                  <span className="text-lg">+</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full gap-2 px-4 py-2"
                >
                  <Building2 className="w-4 h-4" />
                  <span className="text-sm">EDGAR</span>
                  <span className="text-lg">+</span>
                </Button>
              </div>
            </div>

            {/* Recommended Workflows */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">Recommended workflows</h2>
                <div className="flex items-center gap-4">
                  <Button variant="ghost" size="sm" className="text-sm">
                    Q Search
                  </Button>
                  <Button variant="ghost" size="sm" className="text-sm">
                    View all
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {workflows.map((workflow) => (
                  <Card
                    key={workflow.id}
                    className="p-6 hover:shadow-md transition-shadow cursor-pointer border-border/30 hover:border-border/50 bg-muted/20 rounded-xl"
                    onClick={() => handleWorkflowClick(workflow.id)}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <h3 className="font-semibold text-base text-foreground">
                          {workflow.title}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <FileText className="h-4 w-4" />
                        <span>{workflow.description}</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
