import * as React from "react";
import { Info, X, AtSign, Slash, Sparkles, FileText, MessageSquare, Globe, Paperclip } from "lucide-react";
import "./ChatTips.css";

interface ChatTipsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChatTips: React.FC<ChatTipsProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="chat-tips-overlay" onClick={onClose}>
      <div className="chat-tips-modal" onClick={(e) => e.stopPropagation()}>
        <div className="chat-tips-header">
          <h3>How to Use Think AI</h3>
          <button className="chat-tips-close" onClick={onClose} type="button">
            <X size={20} />
          </button>
        </div>
        <div className="chat-tips-content">
          <div className="chat-tips-section">
            <div className="chat-tips-section-title">
              <AtSign size={16} />
              <span>@ Mentions</span>
            </div>
            <p>Use @ to add context from your document</p>
            <div className="chat-tips-example">
              Example: <code>@clause1</code> <code>@vault</code>
            </div>
          </div>

          <div className="chat-tips-section">
            <div className="chat-tips-section-title">
              <Slash size={16} />
              <span>/ Commands</span>
            </div>
            <p>Use / for quick commands</p>
            <div className="chat-tips-example">
              Example: <code>/summarize</code> <code>/explain</code>
            </div>
          </div>

          <div className="chat-tips-section">
            <div className="chat-tips-section-title">
              <Sparkles size={16} />
              <span>Mode Selection</span>
            </div>
            <ul className="chat-tips-list">
              <li>
                <strong>Agent:</strong> Multi-step reasoning and complex tasks
              </li>
              <li>
                <strong>Plan:</strong> Generate action plans and structured responses
              </li>
              <li>
                <strong>Ask:</strong> Simple Q&A and quick answers
              </li>
            </ul>
          </div>

          <div className="chat-tips-section">
            <div className="chat-tips-section-title">
              <FileText size={16} />
              <span>Model Selection</span>
            </div>
            <p>Choose from available AI models via the model dropdown</p>
          </div>

          <div className="chat-tips-section">
            <div className="chat-tips-section-title">
              <Globe size={16} />
              <span>Context Sources</span>
            </div>
            <ul className="chat-tips-list">
              <li>
                <strong>Document:</strong> Current Word document
              </li>
              <li>
                <strong>Web Search:</strong> Enable internet search for up-to-date information
              </li>
              <li>
                <strong>Files:</strong> Upload additional files for context
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

