import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import DocumentViewer, { type DocumentViewerRef } from "./DocumentViewer";
import PdfViewer, { type PdfViewerRef } from "./PdfViewer";
import { X } from "lucide-react";

interface FilePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: File | null;
  fileName: string;
  fileBuffer?: ArrayBuffer;
}

export default function FilePreviewDialog({
  open,
  onOpenChange,
  file,
  fileName,
  fileBuffer,
}: FilePreviewDialogProps) {
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfBuffer, setPdfBuffer] = useState<ArrayBuffer | undefined>(undefined);
  const pdfViewerRef = useRef<PdfViewerRef>(null);
  const docViewerRef = useRef<DocumentViewerRef>(null);

  const isPDF = fileName.toLowerCase().endsWith('.pdf');
  const isWord = fileName.toLowerCase().endsWith('.doc') || fileName.toLowerCase().endsWith('.docx');

  // Load file content
  useEffect(() => {
    if (!open || !file) {
      setPdfBuffer(undefined);
      setContent("");
      return;
    }

    const loadFile = async () => {
      setLoading(true);
      setError(null);
      setContent("");
      setPdfBuffer(undefined);

      try {
        if (isPDF) {
          // For PDFs, use the buffer if available, otherwise read from file
          if (fileBuffer) {
            setPdfBuffer(fileBuffer);
          } else if (file) {
            const buffer = await file.arrayBuffer();
            setPdfBuffer(buffer);
          }
        } else if (isWord) {
          // For Word docs, we'll read as text (basic support)
          // In a production app, you'd want to use a library like mammoth or docx
          try {
            const text = await file.text();
            setContent(text);
          } catch (err) {
            setError("Word document preview requires conversion. Please upload to Vault for full support.");
          }
        } else {
          // For text files
          const text = await file.text();
          setContent(text);
        }
      } catch (err) {
        console.error("Error loading file:", err);
        setError(err instanceof Error ? err.message : "Failed to load file");
      } finally {
        setLoading(false);
      }
    };

    loadFile();
  }, [open, file, fileName, fileBuffer, isPDF, isWord]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold">{fileName}</DialogTitle>
            <button
              onClick={() => onOpenChange(false)}
              className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-muted-foreground">Loading document...</div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-destructive">{error}</div>
            </div>
          ) : isPDF ? (
            <PdfViewer
              ref={pdfViewerRef}
              fileBuffer={pdfBuffer}
              pageNumber={1}
            />
          ) : (
            <DocumentViewer
              ref={docViewerRef}
              content={content}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

