import { useState, useEffect } from "react";
import { apiClient } from "@/services/api";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

export function ConnectionStatus() {
  const [status, setStatus] = useState<"checking" | "connected" | "error">("checking");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      setStatus("checking");
      const baseUrl = process.env.REACT_APP_API_BASE_URL || 'https://localhost:3003';
      // Try to hit the health endpoint (doesn't require auth)
      const response = await fetch(`${baseUrl}/health`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (response.ok) {
        setStatus("connected");
        setError(null);
      } else {
        setStatus("error");
        setError(`Backend responded with status ${response.status}. Check if backend is fully started.`);
      }
    } catch (err) {
      setStatus("error");
      const baseUrl = process.env.REACT_APP_API_BASE_URL || 'https://localhost:3003';
      let errorMessage = "Cannot connect to backend";
      
      if (err instanceof TypeError && err.message.includes('fetch')) {
        errorMessage = `Cannot reach ${baseUrl}. Is the backend running?`;
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 rounded-lg border bg-card p-3 shadow-lg">
      <div className="flex items-center gap-2">
        {status === "checking" && (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Checking connection...</span>
          </>
        )}
        {status === "connected" && (
          <>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span className="text-sm text-green-700 dark:text-green-400">Backend connected</span>
          </>
        )}
        {status === "error" && (
          <>
            <AlertCircle className="h-4 w-4 text-red-500" />
            <div className="flex flex-col">
              <span className="text-sm text-red-700 dark:text-red-400">Connection failed</span>
              {error && (
                <span className="text-xs text-muted-foreground mt-1 max-w-xs">{error}</span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

