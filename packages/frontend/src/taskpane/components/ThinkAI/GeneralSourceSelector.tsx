/**
 * GeneralSourceSelector Component
 * 
 * Allows configuring sources for AI analysis (web search, vault, uploads, etc.)
 */

import * as React from 'react';
import { Globe, Database, Upload, FileText } from 'lucide-react';
import type { GeneralSourceConfig } from './panelTypes';

interface GeneralSourceSelectorProps {
  sourceConfig: GeneralSourceConfig;
  onSourceConfigChange: (config: GeneralSourceConfig) => void;
  disabled?: boolean;
}

export const GeneralSourceSelector: React.FC<GeneralSourceSelectorProps> = ({
  sourceConfig,
  onSourceConfigChange,
  disabled = false,
}) => {
  const handleToggle = (key: keyof Pick<GeneralSourceConfig, 'includeDocument' | 'enableWebSearch'>) => {
    if (disabled) return;
    onSourceConfigChange({
      ...sourceConfig,
      [key]: !sourceConfig[key],
    });
  };

  return (
    <div className="general-source-selector">
      <div className="source-selector-label">Sources:</div>
      <div className="source-selector-options">
        <button
          type="button"
          className={`source-option ${sourceConfig.includeDocument ? 'active' : ''}`}
          onClick={() => handleToggle('includeDocument')}
          disabled={disabled}
          title="Include current document"
        >
          <FileText size={14} />
          <span>Document</span>
        </button>
        
        <button
          type="button"
          className={`source-option ${sourceConfig.enableWebSearch ? 'active' : ''}`}
          onClick={() => handleToggle('enableWebSearch')}
          disabled={disabled}
          title="Enable web search"
        >
          <Globe size={14} />
          <span>Web</span>
        </button>

        {sourceConfig.vaultClauses.length > 0 && (
          <div className="source-badge" title="Vault clauses selected">
            <Database size={12} />
            <span>{sourceConfig.vaultClauses.length}</span>
          </div>
        )}

        {sourceConfig.uploadedFiles.length > 0 && (
          <div className="source-badge" title="Files uploaded">
            <Upload size={12} />
            <span>{sourceConfig.uploadedFiles.length}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default GeneralSourceSelector;


