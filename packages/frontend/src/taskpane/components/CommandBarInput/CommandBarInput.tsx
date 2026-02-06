import * as React from "react";
import {
  ChevronDown,
  AtSign,
  Globe,
  Paperclip,
  ArrowUp,
  Loader,
  Sparkles,
  FileText,
  MessageSquare,
  RefreshCw,
} from "lucide-react";
import { backendApi } from "../../../services/api";
import { ContextCircle } from "../ContextCircle";
import { EnvironmentSelector, type EnvironmentType } from "../EnvironmentSelector";
import type { GeneralSourceConfig } from "../../../types/panelTypes";
import "./CommandBarInput.css";

export type ChatMode = "agent" | "plan" | "ask";

export interface ModelOption {
  provider: string;
  model: string;
  displayName: string;
}

interface CommandBarInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  mode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
  selectedModel: ModelOption | null;
  onModelChange: (model: ModelOption) => void;
  sourceConfig: GeneralSourceConfig;
  onSourceConfigChange: (config: GeneralSourceConfig) => void;
  onOpenContextSelector: () => void;
  onFileUpload?: (files: File[]) => void;
  contextUsage?: number; // 0-100 percentage
  agentCycle?: number; // Current agent cycle number
  totalAgentCycles?: number; // Total expected cycles
  selectedEnvironment?: EnvironmentType;
  onEnvironmentChange?: (environment: EnvironmentType) => void;
}

const MODE_OPTIONS: Array<{ value: ChatMode; label: string; icon: React.ReactNode }> = [
  { value: "agent", label: "Agent", icon: <Sparkles size={16} /> },
  { value: "plan", label: "Plan", icon: <FileText size={16} /> },
  { value: "ask", label: "Ask", icon: <MessageSquare size={16} /> },
];

export const CommandBarInput: React.FC<CommandBarInputProps> = ({
  value,
  onChange,
  onSend,
  isLoading = false,
  disabled = false,
  mode,
  onModeChange,
  selectedModel,
  onModelChange,
  sourceConfig,
  onSourceConfigChange,
  onOpenContextSelector,
  onFileUpload,
  contextUsage = 0,
  agentCycle,
  totalAgentCycles,
  selectedEnvironment,
  onEnvironmentChange,
}) => {
  const [showModeDropdown, setShowModeDropdown] = React.useState(false);
  const [showModelDropdown, setShowModelDropdown] = React.useState(false);
  const [availableModels, setAvailableModels] = React.useState<{
    openai: string[];
    anthropic: string[];
    google: string[];
    openrouter: string[];
    ollama: string[];
    azure: string[];
  } | null>(null);
  const [isLoadingModels, setIsLoadingModels] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const modeDropdownRef = React.useRef<HTMLDivElement>(null);
  const modelDropdownRef = React.useRef<HTMLDivElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Fetch available models on mount
  React.useEffect(() => {
    const fetchModels = async () => {
      setIsLoadingModels(true);
      try {
        const models = await backendApi.getAvailableModels();
        setAvailableModels(models);
        
        // Set default model if none selected
        if (!selectedModel && models.openrouter && models.openrouter.length > 0) {
          onModelChange({
            provider: "openrouter",
            model: models.openrouter[0],
            displayName: `OpenRouter ${models.openrouter[0]}`,
          });
        }
      } catch (error) {
        console.error("Failed to fetch models:", error);
      } finally {
        setIsLoadingModels(false);
      }
    };
    fetchModels();
  }, []);

  // Close dropdowns on outside click
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modeDropdownRef.current && !modeDropdownRef.current.contains(event.target as Node)) {
        setShowModeDropdown(false);
      }
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target as Node)) {
        setShowModelDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auto-resize textarea
  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && !isLoading && value.trim()) {
        onSend();
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0 && onFileUpload) {
      onFileUpload(files);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const toggleWebSearch = () => {
    onSourceConfigChange({
      ...sourceConfig,
      enableWebSearch: !sourceConfig.enableWebSearch,
    });
  };

  const getModelOptions = (): ModelOption[] => {
    if (!availableModels) return [];
    
    const options: ModelOption[] = [];
    
    if (availableModels.openai?.length > 0) {
      availableModels.openai.forEach((model) => {
        options.push({
          provider: "openai",
          model,
          displayName: `OpenAI ${model}`,
        });
      });
    }
    
    if (availableModels.anthropic?.length > 0) {
      availableModels.anthropic.forEach((model) => {
        options.push({
          provider: "anthropic",
          model,
          displayName: `Claude ${model.split("-").pop()}`,
        });
      });
    }
    
    if (availableModels.google?.length > 0) {
      availableModels.google.forEach((model) => {
        options.push({
          provider: "google",
          model,
          displayName: `Google ${model}`,
        });
      });
    }
    
    if (availableModels.openrouter?.length > 0) {
      availableModels.openrouter.forEach((model) => {
        options.push({
          provider: "openrouter",
          model,
          displayName: `OpenRouter ${model}`,
        });
      });
    }
    
    if (availableModels.ollama?.length > 0) {
      availableModels.ollama.forEach((model) => {
        options.push({
          provider: "ollama",
          model,
          displayName: `Ollama ${model}`,
        });
      });
    }
    
    if (availableModels.azure?.length > 0) {
      availableModels.azure.forEach((model) => {
        options.push({
          provider: "azure",
          model,
          displayName: `Azure ${model}`,
        });
      });
    }
    
    return options;
  };

  const currentMode = MODE_OPTIONS.find((m) => m.value === mode) || MODE_OPTIONS[2];
  const modelOptions = getModelOptions();
  const showAgentCycle = mode === "agent" && agentCycle !== undefined && totalAgentCycles !== undefined;

  return (
    <div className="command-bar-input dark-theme">
      {/* Input Field */}
      <div className="command-bar-input-wrapper">
        <textarea
          ref={textareaRef}
          className="command-bar-textarea"
          placeholder="Plan, @ for context, / for commands"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyPress={handleKeyPress}
          rows={1}
          disabled={disabled || isLoading}
        />
      </div>

      {/* Controls Row - All on one line */}
      <div className="command-bar-controls-row">
        {/* Mode Selector */}
        <div className="command-bar-selector-wrapper" ref={modeDropdownRef}>
          <button
            className="command-bar-mode-btn dark"
            onClick={() => setShowModeDropdown(!showModeDropdown)}
            disabled={disabled}
            type="button"
          >
            {currentMode.icon}
            <span>{currentMode.label}</span>
            {showAgentCycle && (
              <span className="command-bar-cycle-badge">
                {agentCycle}/{totalAgentCycles}
              </span>
            )}
            <ChevronDown size={12} />
          </button>
          {showModeDropdown && (
            <div className="command-bar-dropdown dark">
              {MODE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  className={`command-bar-dropdown-item dark ${mode === option.value ? "active" : ""}`}
                  onClick={() => {
                    onModeChange(option.value);
                    setShowModeDropdown(false);
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

          {/* Model Selector */}
          <div className="command-bar-selector-wrapper" ref={modelDropdownRef}>
            <button
              className="command-bar-mode-btn dark model-selector"
              onClick={() => setShowModelDropdown(!showModelDropdown)}
              disabled={disabled || isLoadingModels}
              type="button"
            >
              {isLoadingModels ? (
                <>
                  <Loader size={12} className="spinning" />
                  <span>Loading...</span>
                </>
              ) : selectedModel ? (
                <>
                  <span>{selectedModel.displayName}</span>
                  <ChevronDown size={12} />
                </>
              ) : (
                <>
                  <span>Select Model</span>
                  <ChevronDown size={12} />
                </>
              )}
            </button>
            {showModelDropdown && modelOptions.length > 0 && (
              <div className="command-bar-dropdown dark model-dropdown">
                {modelOptions.map((option, idx) => (
                  <button
                    key={`${option.provider}-${option.model}-${idx}`}
                    className={`command-bar-dropdown-item dark ${
                      selectedModel?.provider === option.provider &&
                      selectedModel?.model === option.model
                        ? "active"
                        : ""
                    }`}
                    onClick={() => {
                      onModelChange(option);
                      setShowModelDropdown(false);
                    }}
                    type="button"
                  >
                    <span>{option.displayName}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Environment Selector - Inline */}
          {selectedEnvironment !== undefined && onEnvironmentChange && (
            <div className="command-bar-environment-inline">
              <EnvironmentSelector
                selectedEnvironment={selectedEnvironment}
                onEnvironmentChange={onEnvironmentChange}
              />
            </div>
          )}

        {/* Action Icons */}
        <div className="command-bar-actions-group">
          <button
            className="command-bar-action-btn dark"
            onClick={() => {
              // Refresh/retry functionality
              if (onSend && value.trim()) {
                onSend();
              }
            }}
            disabled={disabled || !value.trim()}
            title="Refresh"
            type="button"
          >
            <RefreshCw size={16} />
          </button>
          <button
            className="command-bar-action-btn dark"
            onClick={onOpenContextSelector}
            disabled={disabled}
            title="Add context (@)"
            type="button"
          >
            <AtSign size={16} />
          </button>
          <button
            className={`command-bar-action-btn dark ${sourceConfig.enableWebSearch ? "active" : ""}`}
            onClick={toggleWebSearch}
            disabled={disabled}
            title="Enable web search"
            type="button"
          >
            <Globe size={16} />
          </button>
          {onFileUpload && (
            <label className="command-bar-action-btn dark" title="Upload file">
              <Paperclip size={16} />
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.docx,.doc,.txt"
                onChange={handleFileSelect}
                disabled={disabled}
                style={{ display: "none" }}
              />
            </label>
          )}
          {contextUsage > 0 && (
            <div className="command-bar-context-circle">
              <ContextCircle usage={contextUsage} size={20} />
            </div>
          )}
          <button
            className="command-bar-send-btn dark"
            onClick={onSend}
            disabled={disabled || isLoading || !value.trim()}
            title="Send"
            type="button"
          >
            {isLoading ? <Loader size={16} className="spinning" /> : <ArrowUp size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
};

