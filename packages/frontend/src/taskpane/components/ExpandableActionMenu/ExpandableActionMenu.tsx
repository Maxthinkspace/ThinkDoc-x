import * as React from "react";
import {
  Book,
  Wand2,
  Globe,
  Bookmark,
  MessageSquare,
  Sparkles,
  ChevronRight,
  FileText,
  Type,
  Minus,
  Maximize,
  CheckCircle,
} from "lucide-react";
import askIcon from "@/src/assets/Ask Icon.png";
import "./ExpandableActionMenu.css";

interface ExpandableActionMenuProps {
  selectedText: string | null;
  hasSelection: boolean;
  onCheckDefinitions: () => void;
  onPolish: (action: "formal" | "informal" | "shorter" | "longer" | "grammar") => void;
  onTranslate: (text: string) => void;
  onSaveClause: (text: string) => void;
  onAskAI: (text: string | null) => void;
}

type PolishAction = "formal" | "informal" | "shorter" | "longer" | "grammar";

export const ExpandableActionMenu: React.FC<ExpandableActionMenuProps> = ({
  selectedText,
  hasSelection,
  onCheckDefinitions,
  onPolish,
  onTranslate,
  onSaveClause,
  onAskAI,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [showPolishSubmenu, setShowPolishSubmenu] = React.useState(false);
  const [position, setPosition] = React.useState({ bottom: 90, right: 20 });
  const menuRef = React.useRef<HTMLDivElement>(null);
  const polishSubmenuRef = React.useRef<HTMLDivElement>(null);

  // Drag tracking refs (refs avoid stale closures in document-level listeners)
  const isDraggingRef = React.useRef(false);
  const pointerDownRef = React.useRef(false);
  const dragStartRef = React.useRef({ x: 0, y: 0 });
  const positionAtDragStartRef = React.useRef({ bottom: 90, right: 20 });
  const positionRef = React.useRef(position);
  positionRef.current = position;

  const DRAG_THRESHOLD = 5;

  // Close menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        (!polishSubmenuRef.current || !polishSubmenuRef.current.contains(event.target as Node))
      ) {
        setIsExpanded(false);
        setShowPolishSubmenu(false);
      }
    };

    if (isExpanded || showPolishSubmenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
    
    return undefined;
  }, [isExpanded, showPolishSubmenu]);

  // Drag: document-level pointer listeners for move and release
  React.useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!pointerDownRef.current) return;

      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;

      if (!isDraggingRef.current) {
        if (Math.sqrt(dx * dx + dy * dy) < DRAG_THRESHOLD) return;
        isDraggingRef.current = true;
      }

      setPosition({
        right: Math.max(0, Math.min(
          window.innerWidth - 56,
          positionAtDragStartRef.current.right - dx
        )),
        bottom: Math.max(0, Math.min(
          window.innerHeight - 56,
          positionAtDragStartRef.current.bottom - dy
        )),
      });
    };

    const handlePointerUp = () => {
      if (!pointerDownRef.current) return;
      pointerDownRef.current = false;

      if (!isDraggingRef.current) {
        // Short press without movement — toggle menu
        setIsExpanded((prev) => !prev);
        setShowPolishSubmenu(false);
      }
      isDraggingRef.current = false;
    };

    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", handlePointerUp);

    return () => {
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handlePointerUp);
    };
  }, []);

  // Close polish submenu when main menu collapses
  React.useEffect(() => {
    if (!isExpanded) {
      setShowPolishSubmenu(false);
    }
  }, [isExpanded]);

  const handleButtonPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    pointerDownRef.current = true;
    isDraggingRef.current = false;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    positionAtDragStartRef.current = { ...positionRef.current };
    e.preventDefault();
  };

  const handlePolishClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedText) return;
    setShowPolishSubmenu(!showPolishSubmenu);
  };

  const handlePolishAction = (action: PolishAction) => {
    if (selectedText) {
      onPolish(action);
      setShowPolishSubmenu(false);
      setIsExpanded(false);
    }
  };

  const handleTranslate = () => {
    if (selectedText) {
      onTranslate(selectedText);
      setIsExpanded(false);
    }
  };

  const handleSaveClause = () => {
    if (selectedText) {
      onSaveClause(selectedText);
      setIsExpanded(false);
    }
  };

  const handleCheckDefinitions = () => {
    onCheckDefinitions();
    setIsExpanded(false);
  };

  const handleAskAI = () => {
    onAskAI(selectedText);
    setIsExpanded(false);
  };

  // Always show the button - actions will be disabled if no selection

  // If the sparkle is in the upper half of the viewport, expand the menu downward
  const expandsDown = position.bottom > window.innerHeight / 2;

  // Anchor from top when expanding down, from bottom when expanding up
  const containerStyle: React.CSSProperties = expandsDown
    ? { top: window.innerHeight - position.bottom - 56, right: position.right, bottom: "auto" }
    : { bottom: position.bottom, right: position.right };

  return (
    <>
      {/* Collapsed Button */}
      <div
        className={`expandable-menu-container ${isExpanded ? "expanded" : ""}`}
        ref={menuRef}
        style={containerStyle}
      >
        {!isExpanded && (
          <button
            className="expandable-menu-button"
            onPointerDown={handleButtonPointerDown}
            aria-label="Open action menu"
          >
            <img src={askIcon} alt="AI Actions" className="expandable-menu-icon" />
          </button>
        )}

        {/* Main Menu */}
        {isExpanded && (
          <div className={`expandable-menu-main ${expandsDown ? "expand-down" : ""}`}>
            {/* Check Definitions */}
            <button
              className={`expandable-menu-item ${!hasSelection ? "disabled" : ""}`}
              onClick={handleCheckDefinitions}
              title="Check Definitions"
              disabled={!hasSelection}
            >
              <Book size={20} />
            </button>

            {/* Polish (with submenu) */}
            <div className="expandable-menu-item-wrapper">
              <button
                className={`expandable-menu-item ${showPolishSubmenu ? "active" : ""} ${!hasSelection ? "disabled" : ""}`}
                onClick={handlePolishClick}
                title="Polish"
                disabled={!hasSelection}
              >
                <Wand2 size={20} />
              </button>
              {showPolishSubmenu && (
                <div className="expandable-menu-submenu" ref={polishSubmenuRef}>
                  <button
                    className="expandable-menu-submenu-item"
                    onClick={() => handlePolishAction("formal")}
                    title="Formal"
                  >
                    <FileText size={18} />
                  </button>
                  <button
                    className="expandable-menu-submenu-item"
                    onClick={() => handlePolishAction("informal")}
                    title="Informal"
                  >
                    <Type size={18} />
                  </button>
                  <button
                    className="expandable-menu-submenu-item"
                    onClick={() => handlePolishAction("shorter")}
                    title="Shorter"
                  >
                    <Minus size={18} />
                  </button>
                  <button
                    className="expandable-menu-submenu-item"
                    onClick={() => handlePolishAction("longer")}
                    title="Longer"
                  >
                    <Maximize size={18} />
                  </button>
                  <button
                    className="expandable-menu-submenu-item"
                    onClick={() => handlePolishAction("grammar")}
                    title="Fix Grammar"
                  >
                    <CheckCircle size={18} />
                  </button>
                </div>
              )}
            </div>

            {/* Translate */}
            <button
              className={`expandable-menu-item ${!hasSelection ? "disabled" : ""}`}
              onClick={handleTranslate}
              title="Translate"
              disabled={!hasSelection}
            >
              <Globe size={20} />
            </button>

            {/* Save Clause */}
            <button
              className={`expandable-menu-item ${!hasSelection ? "disabled" : ""}`}
              onClick={handleSaveClause}
              title="Save Clause"
              disabled={!hasSelection}
            >
              <Bookmark size={20} />
            </button>

            {/* Think AI */}
            <button
              className="expandable-menu-item"
              onClick={handleAskAI}
              title="Think AI"
            >
              <MessageSquare size={20} />
            </button>
          </div>
        )}
      </div>
    </>
  );
};

