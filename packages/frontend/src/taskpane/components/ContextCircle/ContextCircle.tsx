import * as React from "react";
import "./ContextCircle.css";

interface ContextCircleProps {
  usage: number; // 0-100 percentage
  totalTokens?: number;
  maxTokens?: number;
  size?: number;
}

export const ContextCircle: React.FC<ContextCircleProps> = ({
  usage,
  totalTokens,
  maxTokens,
  size = 24,
}) => {
  const radius = (size - 4) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (usage / 100) * circumference;

  const getColor = () => {
    if (usage < 50) return "#22c55e"; // green
    if (usage < 80) return "#eab308"; // yellow
    return "#ef4444"; // red
  };

  const tooltipText = totalTokens && maxTokens
    ? `${totalTokens.toLocaleString()} / ${maxTokens.toLocaleString()} tokens`
    : `${Math.round(usage)}% used`;

  return (
    <div className="context-circle-wrapper" title={tooltipText}>
      <svg
        width={size}
        height={size}
        className="context-circle-svg"
        viewBox={`0 0 ${size} ${size}`}
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e5e5e5"
          strokeWidth="2"
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getColor()}
          strokeWidth="2"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className="context-circle-progress"
        />
      </svg>
      <div className="context-circle-percentage">{Math.round(usage)}%</div>
    </div>
  );
};

