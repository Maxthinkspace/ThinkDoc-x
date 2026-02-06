import * as React from "react";
import { ChevronDown, Monitor, Cloud, GitBranch } from "lucide-react";
import "./EnvironmentSelector.css";

export type EnvironmentType = "local" | "cloud" | "worktree";

interface EnvironmentSelectorProps {
  selectedEnvironment: EnvironmentType;
  onEnvironmentChange: (environment: EnvironmentType) => void;
}

const ENVIRONMENT_OPTIONS: Array<{
  value: EnvironmentType;
  label: string;
  icon: React.ReactNode;
}> = [
  { value: "local", label: "Local", icon: <Monitor size={14} /> },
  { value: "cloud", label: "Cloud", icon: <Cloud size={14} /> },
  { value: "worktree", label: "Worktree", icon: <GitBranch size={14} /> },
];

export const EnvironmentSelector: React.FC<EnvironmentSelectorProps> = ({
  selectedEnvironment,
  onEnvironmentChange,
}) => {
  const [showDropdown, setShowDropdown] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const currentOption = ENVIRONMENT_OPTIONS.find(
    (opt) => opt.value === selectedEnvironment
  ) || ENVIRONMENT_OPTIONS[0];

  // Close dropdown on outside click
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="environment-selector">
      <div className="environment-selector-wrapper" ref={dropdownRef}>
        <button
          className="environment-selector-btn"
          onClick={() => setShowDropdown(!showDropdown)}
          type="button"
        >
          {currentOption.icon}
          <span>{currentOption.label}</span>
          <ChevronDown size={12} />
        </button>
        {showDropdown && (
          <div className="environment-selector-dropdown">
            {ENVIRONMENT_OPTIONS.map((option) => (
              <button
                key={option.value}
                className={`environment-selector-item ${
                  selectedEnvironment === option.value ? "active" : ""
                }`}
                onClick={() => {
                  onEnvironmentChange(option.value);
                  setShowDropdown(false);
                }}
                type="button"
              >
                {option.icon}
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

