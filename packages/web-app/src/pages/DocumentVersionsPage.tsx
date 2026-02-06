import React, { useState, useEffect } from 'react';
import { FileText, History, ArrowLeftRight, Plus, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { documentVersionApi, type VersionedDocument } from '@/services/documentVersionApi';
import { SaveVersionDialog } from '@/components/document-versions/SaveVersionDialog';
import { VersionHistoryPanel } from '@/components/document-versions/VersionHistoryPanel';
import { VersionComparisonView } from '@/components/document-versions/VersionComparisonView';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type ViewMode = 'history' | 'compare' | 'save';

export const DocumentVersionsPage: React.FC = () => {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<VersionedDocument[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | undefined>();
  const [viewMode, setViewMode] = useState<ViewMode>('history');
  const [loading, setLoading] = useState(true);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [compareState, setCompareState] = useState<{
    versionAId: string;
    versionBId: string;
    isSubVersionA: boolean;
    isSubVersionB: boolean;
  } | null>(null);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const docs = await documentVersionApi.listDocuments();
      setDocuments(docs);
      if (docs.length > 0 && !selectedDocumentId) {
        setSelectedDocumentId(docs[0].id);
      }
    } catch (error) {
      console.error('Failed to load documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCompare = (
    versionAId: string,
    versionBId: string,
    isSubVersionA: boolean,
    isSubVersionB: boolean
  ) => {
    setCompareState({ versionAId, versionBId, isSubVersionA, isSubVersionB });
    setViewMode('compare');
  };

  const handleRestore = async () => {
    await loadDocuments();
  };

  const selectedDocument = documents.find(d => d.id === selectedDocumentId);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
        <span className="text-sm text-muted-foreground">Loading documents...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Document Version Control</h1>
            <p className="text-muted-foreground">
              Manage and compare document versions
            </p>
          </div>
        </div>
        <Button onClick={() => setShowSaveDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Save New Version
        </Button>
      </div>

      {/* Document Selector */}
      {documents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Select Document</CardTitle>
            <CardDescription>Choose a document to view its version history</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedDocumentId || ''} onValueChange={setSelectedDocumentId}>
              <SelectTrigger className="w-full max-w-md">
                <SelectValue placeholder="Select a document..." />
              </SelectTrigger>
              <SelectContent>
                {documents.map(doc => (
                  <SelectItem key={doc.id} value={doc.id}>
                    {doc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      {!selectedDocumentId ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No document selected</p>
            <p className="text-sm text-muted-foreground mt-2">
              {documents.length === 0
                ? 'Create a new document version to get started'
                : 'Select a document from the dropdown above'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
          <TabsList>
            <TabsTrigger value="history">
              <History className="mr-2 h-4 w-4" />
              History
            </TabsTrigger>
            <TabsTrigger value="compare" disabled={!compareState}>
              <ArrowLeftRight className="mr-2 h-4 w-4" />
              Compare
            </TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="mt-4">
            <VersionHistoryPanel
              documentId={selectedDocumentId}
              onRestore={handleRestore}
              onCompare={handleCompare}
              onView={(versionId, isSubVersion) => {
                console.log('View version:', versionId, isSubVersion);
              }}
            />
          </TabsContent>

          <TabsContent value="compare" className="mt-4">
            {compareState ? (
              <VersionComparisonView
                documentId={selectedDocumentId}
                versionAId={compareState.versionAId}
                versionBId={compareState.versionBId}
                isSubVersionA={compareState.isSubVersionA}
                isSubVersionB={compareState.isSubVersionB}
                onClose={() => {
                  setCompareState(null);
                  setViewMode('history');
                }}
              />
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <ArrowLeftRight className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">No comparison selected</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Select two versions from the history to compare them
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Save Dialog */}
      <SaveVersionDialog
        open={showSaveDialog}
        documentId={selectedDocumentId}
        documentName={selectedDocument?.name}
        onClose={() => setShowSaveDialog(false)}
        onSave={() => {
          setShowSaveDialog(false);
          loadDocuments();
        }}
      />
    </div>
  );
};

