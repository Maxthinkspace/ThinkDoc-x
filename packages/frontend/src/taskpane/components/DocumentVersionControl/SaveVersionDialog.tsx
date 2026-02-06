import * as React from "react";
import { X, Save, ChevronDown, Check } from "lucide-react";
import { documentVersionApi, type SaveVersionParams } from "../../../services/documentVersionApi";
import "./DocumentVersionControl.css";

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
  documentId?: string;
  documentName?: string;
  onClose: () => void;
  onSave?: (newDocumentId?: string) => void;
}

// Helper function to get document content
async function getDocumentContent(): Promise<string> {
  return new Promise((resolve, reject) => {
    (window as any).Word.run(async (context: any) => {
      try {
        const body = context.document.body;
        body.load("text");
        await context.sync();
        resolve(body.text);
      } catch (error) {
        reject(error);
      }
    });
  });
}

// Helper function to get document file blob
function getCompressedDocumentPackage(): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    (window as any).Office.context.document.getFileAsync(
      (window as any).Office.FileType.Compressed,
      (res: any) => {
        if (res.status !== (window as any).Office.AsyncResultStatus.Succeeded) {
          reject(res.error);
          return;
        }
        const file = res.value;
        const sliceCount = file.sliceCount;
        const slices: Uint8Array[] = [];
        let next = 0;
        const readNext = () => {
          file.getSliceAsync(next, (sr: any) => {
            if (sr.status !== (window as any).Office.AsyncResultStatus.Succeeded) {
              file.closeAsync();
              reject(sr.error);
              return;
            }
            slices.push(new Uint8Array(sr.value.data as ArrayBuffer));
            next++;
            if (next < sliceCount) {
              readNext();
            } else {
              file.closeAsync();
              const total = slices.reduce((s, a) => s + a.byteLength, 0);
              const all = new Uint8Array(total);
              let off = 0;
              for (const a of slices) {
                all.set(a, off);
                off += a.byteLength;
              }
              resolve(all.buffer);
            }
          });
        };
        readNext();
      }
    );
  });
}

// Convert ArrayBuffer to base64
// Uses manual base64 encoding to avoid btoa() issues with binary data
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const base64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  let i = 0;
  
  while (i < bytes.length) {
    const byte1 = bytes[i++];
    const byte2 = i < bytes.length ? bytes[i++] : 0;
    const byte3 = i < bytes.length ? bytes[i++] : 0;
    
    // Combine 3 bytes into 24-bit value
    const bitmap = (byte1 << 16) | (byte2 << 8) | byte3;
    
    // Extract 4 base64 characters (6 bits each)
    result += base64Chars.charAt((bitmap >> 18) & 63); // First 6 bits
    result += base64Chars.charAt((bitmap >> 12) & 63); // Next 6 bits
    
    // Third character: need at least 2 bytes (i >= 2 means we read byte1 and byte2)
    if (i >= 2) {
      result += base64Chars.charAt((bitmap >> 6) & 63); // Next 6 bits
    } else {
      result += '='; // Padding
    }
    
    // Fourth character: need all 3 bytes (i >= 3 means we read byte1, byte2, and byte3)
    if (i >= 3) {
      result += base64Chars.charAt(bitmap & 63); // Last 6 bits
    } else {
      result += '='; // Padding
    }
  }
  
  return result;
}

export const SaveVersionDialog: React.FC<SaveVersionDialogProps> = ({
  documentId,
  documentName: initialDocumentName,
  onClose,
  onSave,
}) => {
  const [description, setDescription] = React.useState("");
  const [editorName, setEditorName] = React.useState("");
  const [versionType, setVersionType] = React.useState<'main' | 'sub'>('main');
  const [status, setStatus] = React.useState<'draft' | 'circulated' | 'executed' | 'archived'>('draft');
  const [documentType, setDocumentType] = React.useState("");
  const [matterReference, setMatterReference] = React.useState("");
  const [documentName, setDocumentName] = React.useState(initialDocumentName || "");
  const [showStatusDropdown, setShowStatusDropdown] = React.useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const statusRef = React.useRef<HTMLDivElement>(null);
  const typeRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (statusRef.current && !statusRef.current.contains(event.target as Node)) {
        setShowStatusDropdown(false);
      }
      if (typeRef.current && !typeRef.current.contains(event.target as Node)) {
        setShowTypeDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

    setError(null);
    setIsSaving(true);

    try {
      // Extract document content and file blob
      const [content, fileBlob] = await Promise.all([
        getDocumentContent(),
        getCompressedDocumentPackage(),
      ]);

      // Convert file blob to base64
      const fileBlobBase64 = arrayBufferToBase64(fileBlob);

      const docName = documentName || initialDocumentName || 'Untitled Document';
      const baseParams = {
        documentName: docName,
        content,
        fileBlob: fileBlobBase64,
        description: description.trim(),
        editorName: editorName.trim(),
        status,
        documentType: documentType || undefined,
        matterReference: matterReference || undefined,
      };

      let savedDocument;
      let newDocumentId: string | undefined;
      
      if (!documentId) {
        // Create new document
        console.log("Creating new document with params:", { ...baseParams, fileBlob: fileBlobBase64 ? `${fileBlobBase64.substring(0, 50)}...` : undefined });
        savedDocument = await documentVersionApi.createDocument(baseParams);
        console.log("Document created successfully:", savedDocument);
        // Extract documentId from the created version
        newDocumentId = savedDocument?.documentId;
      } else {
        // Save new version to existing document
        console.log("Saving new version to document:", documentId);
        savedDocument = await documentVersionApi.saveVersion({
          ...baseParams,
          documentId,
          versionType,
        });
        console.log("Version saved successfully:", savedDocument);
        newDocumentId = documentId; // Keep the same documentId
      }
      
      // Call onSave callback with the documentId before closing to ensure parent component refreshes
      onSave?.(newDocumentId);
      onClose();
    } catch (err) {
      console.error("Failed to save version:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to save version";
      setError(errorMessage);
      // Don't close dialog on error so user can see the error and retry
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="save-version-dialog-overlay" onClick={onClose}>
      <div className="save-version-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="save-version-dialog-header">
          <h3>Save Document Version</h3>
          <button className="save-version-dialog-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="save-version-dialog-error">
            {error}
          </div>
        )}

        <div className="save-version-dialog-form">
          {!documentId && (
            <div className="save-version-field">
              <label className="save-version-label">Document Name *</label>
              <input
                type="text"
                className="save-version-input"
                value={documentName}
                onChange={(e) => setDocumentName(e.target.value)}
                placeholder="Enter document name"
                disabled={isSaving}
              />
            </div>
          )}

          <div className="save-version-field">
            <label className="save-version-label">Description *</label>
            <textarea
              className="save-version-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Circulated to CFO for review"
              disabled={isSaving}
              rows={3}
            />
          </div>

          <div className="save-version-field">
            <label className="save-version-label">Editor Name *</label>
            <input
              type="text"
              className="save-version-input"
              value={editorName}
              onChange={(e) => setEditorName(e.target.value)}
              placeholder="Your name"
              disabled={isSaving}
            />
          </div>

          <div className="save-version-field">
            <label className="save-version-label">Version Type</label>
            <div className="save-version-radio-group">
              <label className="save-version-radio">
                <input
                  type="radio"
                  name="versionType"
                  value="main"
                  checked={versionType === 'main'}
                  onChange={(e) => setVersionType(e.target.value as 'main')}
                  disabled={isSaving}
                />
                <span>Main Version (v1, v2, v3...)</span>
              </label>
              <label className="save-version-radio">
                <input
                  type="radio"
                  name="versionType"
                  value="sub"
                  checked={versionType === 'sub'}
                  onChange={(e) => setVersionType(e.target.value as 'sub')}
                  disabled={isSaving || !documentId}
                />
                <span>Sub-Version (v1.A, v1.B...)</span>
              </label>
            </div>
            {!documentId && (
              <p className="save-version-hint">Sub-versions can only be created for existing documents</p>
            )}
          </div>

          <div className="save-version-field">
            <label className="save-version-label">Status</label>
            <div className="save-version-dropdown-wrapper" ref={statusRef}>
              <button
                className={`save-version-dropdown-button ${showStatusDropdown ? 'active' : ''}`}
                onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                disabled={isSaving}
              >
                <span>{STATUS_OPTIONS.find(s => s.value === status)?.label || 'Select status...'}</span>
                <ChevronDown size={16} className={`save-version-chevron ${showStatusDropdown ? 'open' : ''}`} />
              </button>
              {showStatusDropdown && (
                <div className="save-version-dropdown">
                  {STATUS_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      className={`save-version-dropdown-item ${status === option.value ? 'selected' : ''}`}
                      onClick={() => {
                        setStatus(option.value as any);
                        setShowStatusDropdown(false);
                      }}
                    >
                      <span>{option.label}</span>
                      {status === option.value && <Check size={16} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="save-version-field">
            <label className="save-version-label">Document Type</label>
            <div className="save-version-dropdown-wrapper" ref={typeRef}>
              <button
                className={`save-version-dropdown-button ${showTypeDropdown ? 'active' : ''}`}
                onClick={() => setShowTypeDropdown(!showTypeDropdown)}
                disabled={isSaving}
              >
                <span>{documentType || "Select document type..."}</span>
                <ChevronDown size={16} className={`save-version-chevron ${showTypeDropdown ? 'open' : ''}`} />
              </button>
              {showTypeDropdown && (
                <div className="save-version-dropdown">
                  {DOCUMENT_TYPES.map((type) => (
                    <button
                      key={type}
                      className={`save-version-dropdown-item ${documentType === type ? 'selected' : ''}`}
                      onClick={() => {
                        setDocumentType(type);
                        setShowTypeDropdown(false);
                      }}
                    >
                      <span>{type}</span>
                      {documentType === type && <Check size={16} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="save-version-field">
            <label className="save-version-label">Matter Reference</label>
            <input
              type="text"
              className="save-version-input"
              value={matterReference}
              onChange={(e) => setMatterReference(e.target.value)}
              placeholder="Optional matter/project reference"
              disabled={isSaving}
            />
          </div>
        </div>

        <div className="save-version-dialog-footer">
          <button
            className="save-version-cancel-button"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            className="save-version-save-button"
            onClick={handleSave}
            disabled={isSaving || !description.trim() || !editorName.trim() || (!documentId && !documentName.trim())}
          >
            {isSaving ? (
              <>
                <div className="save-version-spinner" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>Save Version</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

