import React, { useEffect, useRef, useState } from "react";
import "../../styles/TagMultiSelect.css";
import { IoChevronDown, IoClose } from "react-icons/io5";
import { CiFilter } from "react-icons/ci";

type Tag = {
  id: string;
  label: string;
};

const ChipLimit = 3;

interface TagMultiSelectProps {
  onTagsChange?: (tags: string[]) => void;
  availableTags?: string[];
}

const TagMultiSelect: React.FC<TagMultiSelectProps> = ({ onTagsChange, availableTags = [] }) => {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const toggleTag = (tag: string) => {
    setSelected((prev) => {
      const copy = { ...prev };
      if (copy[tag]) {
        delete copy[tag];
      } else {
        copy[tag] = true;
      }
      // Notify parent of selected tags
      if (onTagsChange) {
        const selectedTags = Object.keys(copy);
        onTagsChange(selectedTags);
      }
      return copy;
    });
  };

  const removeTag = (tag: string) => {
    setSelected((prev) => {
      const copy = { ...prev };
      delete copy[tag];
      // Notify parent of selected tags
      if (onTagsChange) {
        const selectedTags = Object.keys(copy);
        onTagsChange(selectedTags);
      }
      return copy;
    });
  };

  const selectedArray = Object.keys(selected);
  const overflowCount = Math.max(0, selectedArray.length - ChipLimit);

  return (
    <div className="tag-multiselect" ref={containerRef}>
      <button
        type="button"
        className="tag-control"
        onClick={() => setOpen((s) => !s)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="tag-control-left">
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <span>
              <CiFilter
                size={20}
                style={{
                  paddingTop: "3px",
                }}
              />
            </span>
            <span>Tag</span>
          </span>

          <div className="chips">
            {selectedArray.slice(0, ChipLimit).map((tag) => (
              <div className="chip" key={tag}>
                <span className="chip-text" title={tag}>
                  {tag}
                </span>
              </div>
            ))}

            {overflowCount > 0 && (
              <div
                className="chip overflow-chip"
                title={`${overflowCount} more selected`}
                onClick={(e) => {
                  // if someone clicks the overflow chip, open the dropdown to show all
                  e.stopPropagation();
                  setOpen(true);
                }}
              >
                +{overflowCount}
              </div>
            )}
          </div>
        </span>

        <span className={`chev ${open ? "open" : ""}`}>
          <IoChevronDown />
        </span>
      </button>

      {open && (
        <div className="tag-dropdown" role="menu" aria-label="Tag selector">
          <ul>
            {availableTags.length === 0 ? (
              <li className="tag-item" style={{ color: "#999", fontStyle: "italic" }}>
                No tags available
              </li>
            ) : (
              availableTags.map((tag) => {
                const checked = Boolean(selected[tag]);
                return (
                  <li
                    key={tag}
                    className={`tag-item ${checked ? "checked" : ""}`}
                    onClick={() => toggleTag(tag)}
                  >
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleTag(tag)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span className="tag-label">{tag}</span>
                    </label>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default TagMultiSelect;
