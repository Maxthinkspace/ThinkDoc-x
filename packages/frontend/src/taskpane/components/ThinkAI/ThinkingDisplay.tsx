/**
 * ThinkingDisplay Component
 * 
 * Shows thinking/reasoning process and workflow steps during AI analysis.
 */

import * as React from 'react';
import { Loader2, CheckCircle2, Circle } from 'lucide-react';

interface WorkflowStep {
  name: string;
  status: 'pending' | 'active' | 'completed';
}

interface ThinkingDisplayProps {
  thinking: string;
  isLoading: boolean;
  workflowSteps: WorkflowStep[];
}

export const ThinkingDisplay: React.FC<ThinkingDisplayProps> = ({
  thinking,
  isLoading,
  workflowSteps,
}) => {
  return (
    <div className="thinking-display">
      {/* Workflow Steps */}
      {workflowSteps.length > 0 && (
        <div className="thinking-workflow-steps">
          {workflowSteps.map((step, index) => (
            <div
              key={index}
              className={`thinking-workflow-step ${step.status}`}
            >
              <span className="thinking-step-icon">
                {step.status === 'completed' ? (
                  <CheckCircle2 size={14} />
                ) : step.status === 'active' ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Circle size={14} />
                )}
              </span>
              <span className="thinking-step-name">{step.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* Thinking Content */}
      {thinking && (
        <div className="thinking-content">
          <div className="thinking-header">
            {isLoading && <Loader2 size={14} className="animate-spin" />}
            <span>Thinking...</span>
          </div>
          <div className="thinking-text">{thinking}</div>
        </div>
      )}

      {/* Loading indicator without thinking */}
      {isLoading && !thinking && workflowSteps.length === 0 && (
        <div className="thinking-loading">
          <Loader2 size={20} className="animate-spin" />
          <span>Analyzing...</span>
        </div>
      )}
    </div>
  );
};

export default ThinkingDisplay;


