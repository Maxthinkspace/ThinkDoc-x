import * as React from "react";
import { ExternalLink, LayoutDashboard, FolderKanban, Database, Workflow } from "lucide-react";
import type { ClauseContext } from "../../../types/panelTypes";
import "./ThinkStudioIntegration.css";

interface ThinkStudioIntegrationProps {
  clauseContext?: ClauseContext | null;
  documentId?: string;
}

const THINKSTUDIO_BASE_URL = process.env.REACT_APP_THINKSTUDIO_URL || "http://localhost:8081";

export const ThinkStudioIntegration: React.FC<ThinkStudioIntegrationProps> = ({
  clauseContext,
  documentId,
}) => {
  const handleOpenThinkStudio = (path: string, params?: Record<string, string>) => {
    const url = new URL(path, THINKSTUDIO_BASE_URL);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
    }

    // Add context if available
    if (clauseContext) {
      url.searchParams.set("clauseText", clauseContext.text);
      if (clauseContext.location) {
        url.searchParams.set("section", clauseContext.location);
      }
    }
    if (documentId) {
      url.searchParams.set("documentId", documentId);
    }

    // Open in browser
    if (typeof Office !== "undefined" && Office.context && Office.context.ui) {
      Office.context.ui.openBrowserWindow(url.toString());
    } else {
      window.open(url.toString(), "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="thinkstudio-integration">
      <div className="thinkstudio-integration-header">
        <h3>ThinkStudio Legal</h3>
        <p className="thinkstudio-integration-subtitle">
          Advanced analysis and multi-document workflows
        </p>
      </div>

      <div className="thinkstudio-integration-actions">
        <button
          className="thinkstudio-integration-button"
          onClick={() => handleOpenThinkStudio("/")}
        >
          <LayoutDashboard className="thinkstudio-integration-icon" />
          <div className="thinkstudio-integration-button-content">
            <span className="thinkstudio-integration-button-title">Full Analysis Dashboard</span>
            <span className="thinkstudio-integration-button-description">
              Deep dive with visual risk mapping
            </span>
          </div>
          <ExternalLink className="thinkstudio-integration-external-icon" />
        </button>

        <button
          className="thinkstudio-integration-button"
          onClick={() => handleOpenThinkStudio("/projects")}
        >
          <FolderKanban className="thinkstudio-integration-icon" />
          <div className="thinkstudio-integration-button-content">
            <span className="thinkstudio-integration-button-title">Add to Project</span>
            <span className="thinkstudio-integration-button-description">
              Include in transaction/deal folder
            </span>
          </div>
          <ExternalLink className="thinkstudio-integration-external-icon" />
        </button>

        <button
          className="thinkstudio-integration-button"
          onClick={() => handleOpenThinkStudio("/vault")}
        >
          <Database className="thinkstudio-integration-icon" />
          <div className="thinkstudio-integration-button-content">
            <span className="thinkstudio-integration-button-title">Browse Clause Library</span>
            <span className="thinkstudio-integration-button-description">
              Compare precedents side-by-side
            </span>
          </div>
          <ExternalLink className="thinkstudio-integration-external-icon" />
        </button>

        <button
          className="thinkstudio-integration-button"
          onClick={() => handleOpenThinkStudio("/workflows")}
        >
          <Workflow className="thinkstudio-integration-icon" />
          <div className="thinkstudio-integration-button-content">
            <span className="thinkstudio-integration-button-title">Run Workflow</span>
            <span className="thinkstudio-integration-button-description">
              Execute custom automated workflows
            </span>
          </div>
          <ExternalLink className="thinkstudio-integration-external-icon" />
        </button>
      </div>
    </div>
  );
};

