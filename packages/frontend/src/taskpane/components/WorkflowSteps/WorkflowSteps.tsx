import * as React from "react";
import { Check, Loader, ChevronDown, ChevronUp } from "lucide-react";
import "./WorkflowSteps.css";

export interface WorkflowStep {
  id: string;
  name: string;
  status: "pending" | "in_progress" | "completed";
  stepNumber?: number;
  totalSteps?: number;
}

interface WorkflowStepsProps {
  steps: WorkflowStep[];
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const WorkflowSteps: React.FC<WorkflowStepsProps> = ({
  steps,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const completedSteps = steps.filter((s) => s.status === "completed").length;
  const inProgressSteps = steps.filter((s) => s.status === "in_progress").length;
  const isFinished = inProgressSteps === 0 && completedSteps > 0;
  const totalSteps = steps.length > 0 ? steps[0].totalSteps || steps.length : steps.length;

  if (steps.length === 0) return null;

  return (
    <div className="workflow-steps">
      <div className="workflow-steps-header" onClick={onToggleCollapse}>
        <div className="workflow-steps-title">
          {isFinished ? (
            <span>Finished in {completedSteps} step{completedSteps !== 1 ? "s" : ""}</span>
          ) : (
            <span>
              {completedSteps > 0 && `Finished in ${totalSteps} steps`}
              {completedSteps === 0 && inProgressSteps > 0 && "Processing..."}
              {completedSteps === 0 && inProgressSteps === 0 && "Starting..."}
            </span>
          )}
        </div>
        {onToggleCollapse && (
          <button className="workflow-steps-toggle" type="button">
            {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
        )}
      </div>

      {!isCollapsed && (
        <div className="workflow-steps-list">
          {steps.map((step) => (
            <div
              key={step.id}
              className={`workflow-step workflow-step-${step.status}`}
            >
              <div className="workflow-step-icon">
                {step.status === "completed" ? (
                  <Check size={16} className="workflow-step-check" />
                ) : step.status === "in_progress" ? (
                  <Loader size={16} className="workflow-step-spinner spinning" />
                ) : (
                  <div className="workflow-step-pending" />
                )}
              </div>
              <div className="workflow-step-name">{step.name}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

