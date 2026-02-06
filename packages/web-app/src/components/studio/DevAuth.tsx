import { useState } from "react";
import { apiClient } from "@/services/api";
import { AlertCircle, LogIn } from "lucide-react";

export function DevAuth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const baseUrl = process.env.REACT_APP_API_BASE_URL || 'https://localhost:3003';
      const response = await fetch(
        `${baseUrl}/api/auth/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `Login failed: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.token) {
        apiClient.setToken(data.token);
        setSuccess(true);
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        throw new Error("No token received from server");
      }
    } catch (err) {
      let errorMessage = "Login failed";
      const baseUrl = process.env.REACT_APP_API_BASE_URL || 'https://localhost:3003';
      
      if (err instanceof TypeError && err.message.includes('fetch')) {
        errorMessage = `Cannot connect to backend at ${baseUrl}. Please ensure the backend is running.`;
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      console.error("Login error:", err);
    } finally {
      setLoading(false);
    }
  };

  const hasToken = localStorage.getItem("auth_token");

  if (hasToken && !error) {
    return null; // Already authenticated
  }

  const baseUrl = process.env.REACT_APP_API_BASE_URL || 'https://localhost:3003';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-lg">
        <div className="mb-4 flex items-center gap-2">
          <LogIn className="h-5 w-5" />
          <h2 className="text-xl font-semibold">Login Required</h2>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          Please log in to access ThinkStudio. If you don't have an account, register first.
        </p>
        
        <div className="mb-4 rounded-lg bg-blue-50 p-3 text-xs text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
          <strong>Backend URL:</strong> {baseUrl}
          <br />
          <strong>Note:</strong> Make sure the backend is running and responding properly.
        </div>

        {success && (
          <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">
            Login successful! Redirecting...
          </div>
        )}

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="your@email.com"
              required
              disabled={loading}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="••••••••"
              required
              disabled={loading}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="mt-4 text-xs text-muted-foreground">
          Need an account? Register at{" "}
          <a
            href={`${baseUrl}/api/auth/register`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            /api/auth/register
          </a>
        </p>
      </div>
    </div>
  );
}

