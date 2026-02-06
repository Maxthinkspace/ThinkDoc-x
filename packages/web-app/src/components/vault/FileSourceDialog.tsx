import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Upload, 
  Cloud, 
  HardDrive, 
  FolderOpen,
  Search,
  ChevronRight,
  FileText,
  Loader2,
  AlertTriangle
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { MAX_VAULT_FILES, MAX_FILE_SIZE_MB, MAX_FILE_SIZE_BYTES } from "@/services/vaultApi";

// Import logos
import imanageLogo from "@/assets/imanage Logo.png";

interface FileSourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLocalUpload: (files: FileList) => void;
}

type SourceType = "select" | "local" | "imanage" | "sharepoint" | "google-drive";

interface MockFile {
  id: string;
  name: string;
  type: "folder" | "file";
  modified?: string;
}

const FileSourceDialog = ({ open, onOpenChange, onLocalUpload }: FileSourceDialogProps) => {
  const [source, setSource] = useState<SourceType>("select");
  const [isConnecting, setIsConnecting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());

  // Mock data for connected sources
  const mockIManageFiles: MockFile[] = [
    { id: "1", name: "Client Matters", type: "folder" },
    { id: "2", name: "2024 M&A Transactions", type: "folder" },
    { id: "3", name: "Template Library", type: "folder" },
    { id: "4", name: "Acme Corp - Stock Purchase Agreement.pdf", type: "file", modified: "Dec 10, 2024" },
    { id: "5", name: "GlobalTech Merger Agreement v3.docx", type: "file", modified: "Dec 8, 2024" },
  ];

  const mockSharePointFiles: MockFile[] = [
    { id: "1", name: "Legal Documents", type: "folder" },
    { id: "2", name: "Contracts", type: "folder" },
    { id: "3", name: "Board Materials", type: "folder" },
    { id: "4", name: "Q4 Contract Summary.xlsx", type: "file", modified: "Dec 9, 2024" },
  ];

  const mockGoogleDriveFiles: MockFile[] = [
    { id: "1", name: "Shared with Legal", type: "folder" },
    { id: "2", name: "My Documents", type: "folder" },
    { id: "3", name: "Draft NDA - TechCorp.docx", type: "file", modified: "Dec 11, 2024" },
  ];

  const getFilesForSource = () => {
    switch (source) {
      case "imanage": return mockIManageFiles;
      case "sharepoint": return mockSharePointFiles;
      case "google-drive": return mockGoogleDriveFiles;
      default: return [];
    }
  };

  const handleSourceSelect = (selectedSource: SourceType) => {
    if (selectedSource === "local") {
      // Trigger file input
      const input = document.createElement("input");
      input.type = "file";
      input.multiple = true;
      input.accept = ".pdf,.doc,.docx,.txt";
      input.onchange = (e) => {
        const files = (e.target as HTMLInputElement).files;
        if (files && files.length > 0) {
          // Validate file count
          if (files.length > MAX_VAULT_FILES) {
            toast({
              title: "Too many files",
              description: `Maximum ${MAX_VAULT_FILES} files allowed per upload. You selected ${files.length} files. Please select fewer files and try again.`,
              variant: "destructive",
            });
            return;
          }

          // Validate file sizes
          const fileArray = Array.from(files);
          const oversizedFiles = fileArray.filter(f => f.size > MAX_FILE_SIZE_BYTES);
          if (oversizedFiles.length > 0) {
            const names = oversizedFiles.slice(0, 3).map(f => f.name).join(', ');
            const moreCount = oversizedFiles.length > 3 ? ` and ${oversizedFiles.length - 3} more` : '';
            toast({
              title: "Files too large",
              description: `These files exceed the ${MAX_FILE_SIZE_MB}MB limit: ${names}${moreCount}`,
              variant: "destructive",
            });
            return;
          }

          onLocalUpload(files);
          onOpenChange(false);
        }
      };
      input.click();
    } else {
      setIsConnecting(true);
      // Simulate connection delay
      setTimeout(() => {
        setIsConnecting(false);
        setSource(selectedSource);
      }, 800);
    }
  };

  const toggleFileSelection = (fileId: string) => {
    const newSelection = new Set(selectedFiles);
    if (newSelection.has(fileId)) {
      newSelection.delete(fileId);
    } else {
      newSelection.add(fileId);
    }
    setSelectedFiles(newSelection);
  };

  const handleImport = () => {
    // In a real implementation, this would fetch the files from the source
    console.log("Importing files:", Array.from(selectedFiles));
    onOpenChange(false);
    setSource("select");
    setSelectedFiles(new Set());
  };

  const resetDialog = () => {
    setSource("select");
    setSelectedFiles(new Set());
    setSearchQuery("");
  };

  const files = getFilesForSource();
  const filteredFiles = files.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      onOpenChange(isOpen);
      if (!isOpen) resetDialog();
    }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {source === "select" ? "Upload files" : `Import from ${source === "imanage" ? "iManage" : source === "sharepoint" ? "SharePoint" : "Google Drive"}`}
          </DialogTitle>
          <DialogDescription>
            {source === "select" 
              ? "Choose where to upload files from" 
              : "Select files to import from your connected source"}
          </DialogDescription>
        </DialogHeader>

        {isConnecting ? (
          <div className="py-12 flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-sm text-muted-foreground">Connecting...</p>
          </div>
        ) : source === "select" ? (
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">Choose where to upload files from</p>
            
            {/* Local Upload */}
            <button
              onClick={() => handleSourceSelect("local")}
              className="w-full flex items-center gap-4 p-4 border border-border rounded-xl hover:border-foreground/30 transition-colors text-left"
            >
              <div className="p-3 rounded-lg bg-muted">
                <Upload className="h-5 w-5 text-foreground" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-foreground">Upload from computer</h3>
                <p className="text-sm text-muted-foreground">Max {MAX_VAULT_FILES} files, {MAX_FILE_SIZE_MB}MB each</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>

            {/* iManage */}
            <button
              onClick={() => handleSourceSelect("imanage")}
              className="w-full flex items-center gap-4 p-4 border border-border rounded-xl hover:border-foreground/30 transition-colors text-left"
            >
              <div className="p-2 rounded-lg bg-white border">
                <img src={imanageLogo} alt="iManage" className="h-7 w-7 object-contain" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-foreground">iManage</h3>
                <p className="text-sm text-muted-foreground">Import documents from iManage Work</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>

            {/* SharePoint */}
            <button
              onClick={() => handleSourceSelect("sharepoint")}
              className="w-full flex items-center gap-4 p-4 border border-border rounded-xl hover:border-foreground/30 transition-colors text-left"
            >
              <div className="p-3 rounded-lg bg-[#038387]/10">
                <Cloud className="h-5 w-5 text-[#038387]" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-foreground">SharePoint</h3>
                <p className="text-sm text-muted-foreground">Import from Microsoft SharePoint</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>

            {/* Google Drive */}
            <button
              onClick={() => handleSourceSelect("google-drive")}
              className="w-full flex items-center gap-4 p-4 border border-border rounded-xl hover:border-foreground/30 transition-colors text-left"
            >
              <div className="p-3 rounded-lg bg-muted">
                <HardDrive className="h-5 w-5 text-foreground" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-foreground">Google Drive</h3>
                <p className="text-sm text-muted-foreground">Import from Google Drive</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search files and folders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* File Browser */}
            <div className="border border-border rounded-xl max-h-80 overflow-auto">
              {filteredFiles.map((file) => (
                <button
                  key={file.id}
                  onClick={() => file.type === "file" && toggleFileSelection(file.id)}
                  className={`w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left border-b border-border last:border-0 ${
                    selectedFiles.has(file.id) ? "bg-primary/5" : ""
                  }`}
                >
                  {file.type === "folder" ? (
                    <FolderOpen className="h-5 w-5 text-amber-500" />
                  ) : (
                    <FileText className="h-5 w-5 text-destructive" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{file.name}</p>
                    {file.modified && (
                      <p className="text-xs text-muted-foreground">{file.modified}</p>
                    )}
                  </div>
                  {file.type === "folder" && (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  {file.type === "file" && selectedFiles.has(file.id) && (
                    <div className="h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                      <svg className="h-2.5 w-2.5 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <Button variant="ghost" onClick={() => setSource("select")}>
                Back
              </Button>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {selectedFiles.size} file{selectedFiles.size !== 1 ? "s" : ""} selected
                </span>
                <Button onClick={handleImport} disabled={selectedFiles.size === 0}>
                  Import Selected
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default FileSourceDialog;