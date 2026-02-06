import * as React from "react";
import { X, Save, ChevronDown, Check, Upload } from "lucide-react";
import { documentVersionApi, type SaveVersionParams } from "@/services/documentVersionApi";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/components/ui/use-toast";

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'circulated', label: 'Circulated' },
  { value: 'executed', label: 'Executed' },
  { value: 'archived', label: 'Archived' },
];

const DOCUMENT_TYPES = [
  'Contract',
  'NDA',
  'MOU',
  'Agreement',
  'Memo',
  'Letter',
  'Other',
];

interface SaveVersionDialogProps {
  open: boolean;
  documentId?: string;
  documentName?: string;
  onClose: () => void;
  onSave?: () => void;
}

// Convert File to base64
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix
      const base64 = result.split(',')[1] || result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Extract text from file (for .docx, .txt, etc.)
async function extractTextFromFile(file: File): Promise<string> {
  if (file.type === 'text/plain') {
    return file.text();
  }
  // For .docx files, we'd need a library like mammoth or docx
  // For now, return empty string and let backend handle it
  return '';
}

export const SaveVersionDialog: React.FC<SaveVersionDialogProps> = ({
  open,
  documentId,
  documentName: initialDocumentName,
  onClose,
  onSave,
}) => {
  const { toast } = useToast();
  const [description, setDescription] = React.useState("");
  const [editorName, setEditorName] = React.useState("");
  const [versionType, setVersionType] = React.useState<'main' | 'sub'>('main');
  const [status, setStatus] = React.useState<'draft' | 'circulated' | 'executed' | 'archived'>('draft');
  const [documentType, setDocumentType] = React.useState("");
  const [matterReference, setMatterReference] = React.useState("");
  const [documentName, setDocumentName] = React.useState(initialDocumentName || "");
  const [file, setFile] = React.useState<File | null>(null);
  const [content, setContent] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setDocumentName(initialDocumentName || "");
      setDescription("");
      setEditorName("");
      setVersionType('main');
      setStatus('draft');
      setDocumentType("");
      setMatterReference("");
      setFile(null);
      setContent("");
      setError(null);
    }
  }, [open, initialDocumentName]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      try {
        const text = await extractTextFromFile(selectedFile);
        setContent(text);
      } catch (err) {
        console.error("Failed to extract text from file:", err);
        setContent("");
      }
    }
  };

  const handleSave = async () => {
    if (!description.trim()) {
      setError("Description is required");
      return;
    }
    if (!editorName.trim()) {
      setError("Editor name is required");
      return;
    }
    if (!documentId && !documentName.trim()) {
      setError("Document name is required for new documents");
      return;
    }
    if (!file && !content.trim()) {
      setError("Please upload a file or provide content");
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      let fileBlobBase64: string | undefined;
      let finalContent = content;

      if (file) {
        fileBlobBase64 = await fileToBase64(file);
        if (!finalContent && file.type === 'text/plain') {
          finalContent = await file.text();
        }
      }

      const docName = documentName || initialDocumentName || 'Untitled Document';
      const baseParams = {
        documentName: docName,
        content: finalContent,
        fileBlob: fileBlobBase64,
        description: description.trim(),
        editorName: editorName.trim(),
        status,
        documentType: documentType || undefined,
        matterReference: matterReference || undefined,
      };

      if (!documentId) {
        // Create new document
        await documentVersionApi.createDocument(baseParams);
      } else {
        // Save new version to existing document
        await documentVersionApi.saveVersion({
          ...baseParams,
          documentId,
          versionType,
        });
      }
      toast({
        title: "Success",
        description: "Document version saved successfully",
      });
      onSave?.();
      onClose();
    } catch (err) {
      console.error("Failed to save version:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to save version";
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Save Document Version</DialogTitle>
          <DialogDescription>
            Save a new version of this document with metadata
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {!documentId && (
            <div className="space-y-2">
              <Label htmlFor="documentName">Document Name *</Label>
              <Input
                id="documentName"
                value={documentName}
                onChange={(e) => setDocumentName(e.target.value)}
                placeholder="Enter document name"
                disabled={isSaving}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Circulated to CFO for review"
              disabled={isSaving}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="editorName">Editor Name *</Label>
            <Input
              id="editorName"
              value={editorName}
              onChange={(e) => setEditorName(e.target.value)}
              placeholder="Your name"
              disabled={isSaving}
            />
          </div>

          <div className="space-y-2">
            <Label>Version Type</Label>
            <RadioGroup
              value={versionType}
              onValueChange={(value) => setVersionType(value as 'main' | 'sub')}
              disabled={isSaving || !documentId}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="main" id="main" />
                <Label htmlFor="main" className="font-normal cursor-pointer">
                  Main Version (v1, v2, v3...)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="sub" id="sub" disabled={!documentId} />
                <Label htmlFor="sub" className="font-normal cursor-pointer">
                  Sub-Version (v1.A, v1.B...)
                </Label>
              </div>
            </RadioGroup>
            {!documentId && (
              <p className="text-xs text-muted-foreground">
                Sub-versions can only be created for existing documents
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={(value) => setStatus(value as any)} disabled={isSaving}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="documentType">Document Type</Label>
            <Select value={documentType} onValueChange={setDocumentType} disabled={isSaving}>
              <SelectTrigger id="documentType">
                <SelectValue placeholder="Select document type..." />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="matterReference">Matter Reference</Label>
            <Input
              id="matterReference"
              value={matterReference}
              onChange={(e) => setMatterReference(e.target.value)}
              placeholder="Optional matter/project reference"
              disabled={isSaving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="file">Upload Document File</Label>
            <div className="flex items-center gap-2">
              <Input
                id="file"
                type="file"
                accept=".docx,.doc,.txt"
                onChange={handleFileChange}
                disabled={isSaving}
                className="flex-1"
              />
              {file && (
                <span className="text-sm text-muted-foreground">
                  {file.name}
                </span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Content (or paste text here)</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste document content here, or upload a file above"
              disabled={isSaving}
              rows={6}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !description.trim() || !editorName.trim() || (!documentId && !documentName.trim())}
          >
            {isSaving ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Version
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

