import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, X, FileText, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { MAX_VAULT_FILES, MAX_FILE_SIZE_MB, MAX_FILE_SIZE_BYTES } from "@/services/vaultApi";

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateProject: (name: string, clientMatter?: string, files?: FileList) => Promise<void>;
}

const SUPPORTED_FILE_TYPES = [
  "CSV",
  "Email",
  "Excel",
  "JPEG",
  "PDF",
  "PNG",
  "PowerPoint",
  "RTF",
  "Text",
  "TIFF",
  "Word",
  "Zip",
];

const CreateProjectDialog = ({ open, onOpenChange, onCreateProject }: CreateProjectDialogProps) => {
  const [projectName, setProjectName] = useState("");
  const [clientMatter, setClientMatter] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      handleFiles(files);
    }
  }, []);

  const handleFiles = (files: File[]) => {
    // Validate file count
    const totalFiles = selectedFiles.length + files.length;
    if (totalFiles > MAX_VAULT_FILES) {
      toast({
        title: "Too many files",
        description: `Maximum ${MAX_VAULT_FILES} files allowed. You have ${selectedFiles.length} selected and tried to add ${files.length} more.`,
        variant: "destructive",
      });
      return;
    }

    // Validate file sizes
    const oversizedFiles = files.filter(f => f.size > MAX_FILE_SIZE_BYTES);
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

    setSelectedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const calculateTotalSize = () => {
    return selectedFiles.reduce((total, file) => total + file.size, 0);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleCreate = async () => {
    if (!projectName.trim()) {
      toast({
        title: "Project name required",
        description: "Please enter a name for your project",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      const fileList = selectedFiles.length > 0 
        ? Object.assign(new DataTransfer(), { items: selectedFiles.map(f => new File([f], f.name)) }).files
        : undefined;
      
      await onCreateProject(
        projectName.trim(),
        clientMatter.trim() || undefined,
        fileList
      );
      
      // Reset form
      setProjectName("");
      setClientMatter("");
      setSelectedFiles([]);
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating project:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancel = () => {
    setProjectName("");
    setClientMatter("");
    setSelectedFiles([]);
    onOpenChange(false);
  };

  const totalSize = calculateTotalSize();
  const totalSizeKB = totalSize / 1024;
  const totalSizeMB = totalSizeKB / 1024;
  const totalSizeGB = totalSizeMB / 1024;
  const displaySize = totalSizeGB >= 1 
    ? `${totalSizeGB.toFixed(2)} GB`
    : totalSizeMB >= 1
    ? `${totalSizeMB.toFixed(2)} MB`
    : `${totalSizeKB.toFixed(2)} KB`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create project</DialogTitle>
          <DialogDescription>
            Upload a new collection of files
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Project Name */}
          <div className="space-y-2">
            <Label htmlFor="project-name">Project name</Label>
            <Input
              id="project-name"
              placeholder="Choose a name for your project"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
            />
          </div>

          {/* Client Matter */}
          <div className="space-y-2">
            <Label htmlFor="client-matter">Client matter</Label>
            <div className="flex gap-2">
              <Input
                id="client-matter"
                placeholder="CM#"
                value={clientMatter}
                onChange={(e) => setClientMatter(e.target.value)}
                className="flex-1"
              />
              <Select>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="matter-1">Matter 1</SelectItem>
                  <SelectItem value="matter-2">Matter 2</SelectItem>
                  <SelectItem value="matter-3">Matter 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Files Section */}
          <div className="space-y-2">
            <Label>Files (Optional)</Label>
            
            {/* Drag and Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center transition-colors
                ${isDragging ? 'border-primary bg-primary/5' : 'border-border'}
                ${selectedFiles.length > 0 ? 'border-solid' : ''}
              `}
            >
              {selectedFiles.length === 0 ? (
                <>
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-2">
                    Drag and drop files here
                  </p>
                  <p className="text-xs text-muted-foreground mb-4">OR</p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const input = document.createElement("input");
                      input.type = "file";
                      input.multiple = true;
                      input.accept = ".pdf,.doc,.docx,.txt,.csv,.xlsx,.xls,.pptx,.ppt,.rtf,.zip,.jpg,.jpeg,.png,.tiff,.tif";
                      input.onchange = (e) => {
                        const files = (e.target as HTMLInputElement).files;
                        if (files) handleFiles(Array.from(files));
                      };
                      input.click();
                    }}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Browse
                  </Button>
                </>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-medium">{selectedFiles.length} file(s) selected</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const input = document.createElement("input");
                        input.type = "file";
                        input.multiple = true;
                        input.accept = ".pdf,.doc,.docx,.txt,.csv,.xlsx,.xls,.pptx,.ppt,.rtf,.zip,.jpg,.jpeg,.png,.tiff,.tif";
                        input.onchange = (e) => {
                          const files = (e.target as HTMLInputElement).files;
                          if (files) handleFiles(Array.from(files));
                        };
                        input.click();
                      }}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Add More
                    </Button>
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {selectedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-muted rounded text-sm"
                      >
                        <span className="flex-1 truncate">{file.name}</span>
                        <span className="text-xs text-muted-foreground mx-2">
                          {formatFileSize(file.size)}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => removeFile(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Supported File Types */}
            <p className="text-xs text-muted-foreground">
              Supported file types: {SUPPORTED_FILE_TYPES.join(", ")}
            </p>
          </div>

          {/* Storage Info */}
          <div className="flex items-center justify-between text-sm border-t pt-4">
            <span className="text-muted-foreground">
              {displaySize} of 100 GB
            </span>
            <span className="text-muted-foreground">
              {selectedFiles.length} of 100,000 files
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleCancel} disabled={isCreating}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isCreating || !projectName.trim()}>
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Create"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateProjectDialog;


