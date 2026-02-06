/**
 * ContextScopeSwitcher Component
 * 
 * Allows switching between clause, document, and general context scopes.
 */

import * as React from 'react';
import { FileText, File, Globe } from 'lucide-react';
import type { ContextScope } from './panelTypes';

interface ContextScopeSwitcherProps {
  currentScope: ContextScope;
  onScopeChange: (scope: ContextScope) => void;
  disabled?: boolean;
}

const SCOPES: Array<{ id: ContextScope; label: string; icon: React.ReactNode }> = [
  { id: 'clause', label: 'Clause', icon: <FileText size={14} /> },
  { id: 'document', label: 'Document', icon: <File size={14} /> },
  { id: 'general', label: 'General', icon: <Globe size={14} /> },
];

export const ContextScopeSwitcher: React.FC<ContextScopeSwitcherProps> = ({
  currentScope,
  onScopeChange,
  disabled = false,
}) => {
  return (
    <div className="context-scope-switcher">
      {SCOPES.map((scope) => (
        <button
          key={scope.id}
          className={`context-scope-button ${currentScope === scope.id ? 'active' : ''}`}
          onClick={() => !disabled && onScopeChange(scope.id)}
          disabled={disabled}
          type="button"
        >
          {scope.icon}
          <span>{scope.label}</span>
        </button>
      ))}
    </div>
  );
};

export default ContextScopeSwitcher;


