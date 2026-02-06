import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Plus, Settings2, Download, Loader2, FileText, RefreshCw, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { vaultApi, VaultFile, ColumnConfig } from "@/services/vaultApi";
import CitationCell, { CellData } from "@/components/vault/CitationCell";

type DocumentReview = {
  id: string;
  fileName: string;
  status: "pending" | "analyzing" | "analyzed";
  results: Record<string, CellData>;
};

const MAReview = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [documents, setDocuments] = useState<DocumentReview[]>([]);
  const [columns, setColumns] = useState<ColumnConfig[]>([
    { id: '1', type: 'free-response', name: 'Effective Date', query: 'Extract the effective date of the agreement' },
    { id: '2', type: 'free-response', name: 'Acquiror', query: 'Identify the acquiring party or company' },
    { id: '3', type: 'free-response', name: 'Target', query: 'Identify the target party or company being acquired' },
  ]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [isColumnDialogOpen, setIsColumnDialogOpen] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");
  const [newColumnQuery, setNewColumnQuery] = useState("");
  
  // Project for M&A reviews
  const [projectId, setProjectId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      initializeProject();
    }
  }, [user]);

  const initializeProject = async () => {
    try {
      // Check if M&A Review project exists, or create one
      const projects = await vaultApi.projects.list();
      let maProject = projects.find(p => p.name === "M&A Document Reviews");
      
      if (!maProject) {
        maProject = await vaultApi.projects.create("M&A Document Reviews", "Bulk M&A agreement analysis");
      }
      
      setProjectId(maProject.id);
      
      // Load existing files
      const files = await vaultApi.files.list(maProject.id);
      setDocuments(files.map(f => ({
        id: f.id,
        fileName: f.name,
        status: "pending" as const,
        results: {}
      })));
    } catch (error) {
      console.error('Error initializing project:', error);
      toast({
        title: "Error",
        description: "Failed to initialize M&A review project",
        variant: "destructive"
      });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !projectId) return;

    setLoading(true);
    try {
      const result = await vaultApi.files.upload(projectId, files);
      
      const newDocs: DocumentReview[] = result.files.map(f => ({
        id: f.id,
        fileName: f.name,
        status: "pending" as const,
        results: {}
      }));
      
      setDocuments([...documents, ...newDocs]);
      
      toast({
        title: "Documents uploaded",
        description: `${result.files.length} document(s) added successfully`
      });
    } catch (error) {
      console.error('Error uploading files:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload documents",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  const analyzeDocuments = async () => {
    if (documents.length === 0 || !projectId) {
      toast({
        title: "No documents",
        description: "Please upload documents first",
        variant: "destructive"
      });
      return;
    }

    setAnalyzing(true);
    
    // Mark all as analyzing
    setDocuments(docs => docs.map(d => ({ ...d, status: "analyzing" as const })));

    try {
      const fileIds = documents.map(d => d.id);
      
      const { jobId } = await vaultApi.ai.runExtraction(projectId, fileIds, columns);
      
      // Poll for completion
      const finalStatus = await vaultApi.jobs.pollUntilComplete(jobId, (status) => {
        // Could update UI with progress here
      });

      if (finalStatus.status === "done" && finalStatus.result) {
        const results = finalStatus.result as { 
          results: Array<{ 
            fileId: string; 
            fileName: string; 
            columns: Record<string, { value: string; confidence?: "high" | "medium" | "low"; sourceSnippet?: string }> 
          }> 
        };
        
        setDocuments(docs => docs.map(doc => {
          const fileResult = results.results.find(r => r.fileId === doc.id);
          if (fileResult) {
            const extractedResults: Record<string, CellData> = {};
            for (const [colId, colResult] of Object.entries(fileResult.columns)) {
              extractedResults[colId] = {
                value: colResult.value,
                confidence: colResult.confidence,
                sourceSnippet: colResult.sourceSnippet,
              };
            }
            return { ...doc, status: "analyzed" as const, results: extractedResults };
          }
          return { ...doc, status: "analyzed" as const };
        }));

        toast({
          title: "Analysis complete",
          description: "All documents have been analyzed"
        });
      } else if (finalStatus.status === "error") {
        throw new Error(finalStatus.error || "Analysis failed");
      }
    } catch (error) {
      console.error('Error analyzing documents:', error);
      setDocuments(docs => docs.map(d => ({ ...d, status: "pending" as const })));
      toast({
        title: "Analysis failed",
        description: error instanceof Error ? error.message : "Failed to analyze documents",
        variant: "destructive"
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const addCustomColumn = () => {
    if (!newColumnName || !newColumnQuery) {
      toast({
        title: "Missing information",
        description: "Please provide both column name and query",
        variant: "destructive"
      });
      return;
    }

    const newColumn: ColumnConfig = {
      id: Date.now().toString(),
      type: 'free-response',
      name: newColumnName,
      query: newColumnQuery
    };

    setColumns([...columns, newColumn]);
    setNewColumnName("");
    setNewColumnQuery("");
    setIsColumnDialogOpen(false);

    toast({
      title: "Column added",
      description: "New column added. Re-analyze documents to populate data."
    });
  };

  const exportToCSV = () => {
    if (documents.length === 0) return;

    const headers = ['File', ...columns.map(col => col.name)];
    const rows = documents.map(doc => [
      doc.fileName,
      ...columns.map(col => doc.results[col.id] || '')
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ma-review-export.csv';
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Export complete",
      description: "Document data exported to CSV"
    });
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/vault')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              M&A Document Review
            </h1>
            <p className="text-muted-foreground">
              Bulk analyze merger agreements with AI-powered extraction
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={exportToCSV}
            disabled={documents.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          
          <Dialog open={isColumnDialogOpen} onOpenChange={setIsColumnDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Settings2 className="h-4 w-4 mr-2" />
                Configure Columns
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Custom Column</DialogTitle>
                <DialogDescription>
                  Define a new column and specify what information to extract
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="column-name">Column Name</Label>
                  <Input
                    id="column-name"
                    placeholder="e.g., Purchase Price"
                    value={newColumnName}
                    onChange={(e) => setNewColumnName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="column-query">Extraction Query</Label>
                  <Textarea
                    id="column-query"
                    placeholder="e.g., Extract the total purchase price from the agreement"
                    value={newColumnQuery}
                    onChange={(e) => setNewColumnQuery(e.target.value)}
                    className="min-h-[100px]"
                  />
                </div>
                <Button onClick={addCustomColumn} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Column
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <label htmlFor="file-upload">
            <Button disabled={loading || !projectId} asChild>
              <div className="cursor-pointer">
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Upload Documents
              </div>
            </Button>
            <input
              id="file-upload"
              type="file"
              multiple
              accept=".pdf,.doc,.docx"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          <Button
            onClick={analyzeDocuments}
            disabled={analyzing || documents.length === 0}
          >
            {analyzing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Analyze All
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Current Columns */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Active Columns</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {columns.map(col => (
              <div key={col.id} className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm">
                {col.name}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Document Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {documents.length} Document{documents.length !== 1 ? 's' : ''}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">No documents uploaded</p>
              <p className="text-sm text-muted-foreground mt-1">
                Upload merger agreements to start bulk review
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>File</TableHead>
                    {columns.map(col => (
                      <TableHead key={col.id}>{col.name}</TableHead>
                    ))}
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((doc, index) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell className="font-medium">{doc.fileName}</TableCell>
                      {columns.map(col => (
                        <TableCell key={col.id}>
                          <CitationCell 
                            data={doc.results[col.id]} 
                            fileName={doc.fileName}
                          />
                        </TableCell>
                      ))}
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          doc.status === 'analyzed' 
                            ? 'bg-green-100 text-green-700' 
                            : doc.status === 'analyzing'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {doc.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MAReview;
