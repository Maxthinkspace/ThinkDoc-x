import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Trash2, AlignLeft, Calendar, Grid2X2, Quote, Loader2, Plus, Clock, DollarSign, Hash } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { vaultApi } from "@/services/vaultApi";

export interface ColumnConfig {
  id: string;
  type: "free-response" | "date" | "classification" | "verbatim" | "duration" | "currency" | "number";
  name: string;
  query: string;
}

interface ColumnBuilderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onColumnsConfirmed: (columns: ColumnConfig[]) => void;
}

const columnTypeIcons: Record<string, React.ReactNode> = {
  "free-response": <AlignLeft className="h-4 w-4" />,
  "date": <Calendar className="h-4 w-4" />,
  "classification": <Grid2X2 className="h-4 w-4" />,
  "verbatim": <Quote className="h-4 w-4" />,
  "duration": <Clock className="h-4 w-4" />,
  "currency": <DollarSign className="h-4 w-4" />,
  "number": <Hash className="h-4 w-4" />,
};

const columnTypeLabels: Record<string, string> = {
  "free-response": "Free response",
  "date": "Date",
  "classification": "Classification",
  "verbatim": "Verbatim",
  "duration": "Duration",
  "currency": "Currency",
  "number": "Number",
};

const ColumnBuilderDialog = ({ 
  open, 
  onOpenChange,
  onColumnsConfirmed,
  documentType
}: ColumnBuilderDialogProps) => {
  const [prompt, setPrompt] = useState(documentType ? `These are ${documentType.toLowerCase()}.` : "");
  const [columns, setColumns] = useState<ColumnConfig[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingColumn, setEditingColumn] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newColumn, setNewColumn] = useState<Partial<ColumnConfig>>({
    type: "free-response",
    name: "",
    query: ""
  });

  // Reset prompt when documentType changes
  useEffect(() => {
    if (documentType && open) {
      setPrompt(`These are ${documentType.toLowerCase()}.`);
    }
  }, [documentType, open]);

  const generateColumns = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Please enter a prompt",
        description: "Describe what information you want to extract from the documents.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      // Call the real API to generate columns based on the prompt
      const generatedColumns = await vaultApi.ai.generateColumns(
        prompt,
        columns.length > 0 ? columns : undefined
      );

      // Add UUIDs to the generated columns if they don't have IDs
      const columnsWithIds: ColumnConfig[] = generatedColumns.map((col) => ({
        ...col,
        id: col.id || crypto.randomUUID(),
      }));

      setColumns(columnsWithIds);
      toast({
        title: "Columns generated",
        description: `Generated ${columnsWithIds.length} columns based on your prompt.`,
      });
    } catch (error) {
      console.error("Error generating columns:", error);
      toast({
        title: "Failed to generate columns",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteColumn = (id: string) => {
    setColumns(columns.filter(col => col.id !== id));
  };

  const handleEditColumn = (id: string) => {
    setEditingColumn(id);
  };

  const handleSaveEdit = (id: string, updates: Partial<ColumnConfig>) => {
    setColumns(columns.map(col => 
      col.id === id ? { ...col, ...updates } : col
    ));
    setEditingColumn(null);
  };

  const handleAddColumn = () => {
    if (!newColumn.name?.trim() || !newColumn.query?.trim()) {
      toast({
        title: "Missing fields",
        description: "Please fill in both column name and query.",
        variant: "destructive",
      });
      return;
    }

    const column: ColumnConfig = {
      id: crypto.randomUUID(),
      type: newColumn.type as ColumnConfig["type"] || "free-response",
      name: newColumn.name.trim(),
      query: newColumn.query.trim()
    };

    setColumns([...columns, column]);
    setNewColumn({ type: "free-response", name: "", query: "" });
    setShowAddForm(false);
  };

  const handleConfirmColumns = () => {
    if (columns.length === 0) {
      toast({
        title: "No columns",
        description: "Please generate or add at least one column.",
        variant: "destructive",
      });
      return;
    }
    onColumnsConfirmed(columns);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-center">Column builder</DialogTitle>
          <DialogDescription className="text-center">
            Define columns to extract information from your documents
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 py-4">
          {/* Prompt Section */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">
              What are some of the things you want to know?
            </label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Is there a change of control provision? What party(ies) are restricted? What is the verbatim change of control definition? What is the trigger? What is the definition of control? Is notice required, and if so, what is the period?"
              className="min-h-[100px] resize-none"
            />
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                ThinkSpace will generate suggested columns based on your questions or instructions
              </p>
              <Button 
                onClick={generateColumns} 
                disabled={isGenerating}
                className="gap-2"
              >
                {isGenerating && <Loader2 className="h-4 w-4 animate-spin" />}
                Generate columns
              </Button>
            </div>
          </div>

          {/* Generated Columns Table */}
          {columns.length > 0 && (
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/30">
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground w-32">Type</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground w-48">Column header</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Query</th>
                    <th className="w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {columns.map((column) => (
                    <tr key={column.id} className="border-b border-border last:border-0">
                      {editingColumn === column.id ? (
                        <>
                          <td className="px-4 py-3">
                            <Select 
                              value={column.type} 
                              onValueChange={(value) => handleSaveEdit(column.id, { type: value as ColumnConfig["type"] })}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="free-response">Free response</SelectItem>
                                <SelectItem value="date">Date</SelectItem>
                                <SelectItem value="duration">Duration</SelectItem>
                                <SelectItem value="currency">Currency</SelectItem>
                                <SelectItem value="number">Number</SelectItem>
                                <SelectItem value="classification">Classification</SelectItem>
                                <SelectItem value="verbatim">Verbatim</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-4 py-3">
                            <Input 
                              value={column.name}
                              onChange={(e) => handleSaveEdit(column.id, { name: e.target.value })}
                              className="h-8"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <Input 
                              value={column.query}
                              onChange={(e) => handleSaveEdit(column.id, { query: e.target.value })}
                              className="h-8"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => setEditingColumn(null)}
                            >
                              Done
                            </Button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              {columnTypeIcons[column.type]}
                              {columnTypeLabels[column.type]}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-foreground">{column.name}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground truncate max-w-[300px]">
                            {column.query}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <button 
                                onClick={() => handleEditColumn(column.id)}
                                className="p-1.5 hover:bg-muted rounded transition-colors"
                              >
                                <Pencil className="h-4 w-4 text-muted-foreground" />
                              </button>
                              <button 
                                onClick={() => handleDeleteColumn(column.id)}
                                className="p-1.5 hover:bg-muted rounded transition-colors"
                              >
                                <Trash2 className="h-4 w-4 text-muted-foreground" />
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Add New Column Form */}
          {showAddForm ? (
            <div className="border border-border rounded-lg p-4 space-y-4">
              <h4 className="text-sm font-medium">Add new column</h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Type</label>
                  <Select 
                    value={newColumn.type || "free-response"} 
                    onValueChange={(value) => setNewColumn({ ...newColumn, type: value as ColumnConfig["type"] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free-response">Free response</SelectItem>
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="classification">Classification</SelectItem>
                      <SelectItem value="verbatim">Verbatim</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Column header</label>
                  <Input 
                    value={newColumn.name || ""}
                    onChange={(e) => setNewColumn({ ...newColumn, name: e.target.value })}
                    placeholder="e.g., Termination Clause"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Query</label>
                  <Input 
                    value={newColumn.query || ""}
                    onChange={(e) => setNewColumn({ ...newColumn, query: e.target.value })}
                    placeholder="e.g., What are the termination conditions?"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowAddForm(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleAddColumn}>
                  Add column
                </Button>
              </div>
            </div>
          ) : (
            columns.length > 0 && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowAddForm(true)}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Add column
              </Button>
            )
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-4 border-t border-border flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirmColumns} disabled={columns.length === 0}>
            Add columns
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ColumnBuilderDialog;
