import React, { useState, useEffect, useRef } from "react";
import "../../styles/PlaybookFilter.css";
import { FaChevronDown, FaChevronUp } from "react-icons/fa6";
import { PiCirclesFourLight } from "react-icons/pi";
import { IoLocationOutline } from "react-icons/io5";
import { IoSearch } from "react-icons/io5";
import TagMultiSelect from "./TagMultiSelect";

export interface FilterValues {
  searchText: string;
  type: string;
  jurisdiction: string;
  selectedTags: string[];
}

interface PlaybookFilterProps {
  onFilterChange?: (filters: FilterValues) => void;
  availableTags?: string[];
}

const PlaybookFilter: React.FC<PlaybookFilterProps> = ({ onFilterChange, availableTags = [] }) => {
  const [searchText, setSearchText] = useState<string>("");
  const [type, setType] = useState<string>("All Types");
  const [jurisdiction, setJurisdiction] = useState<string>("All Jurisdictions");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showTypeDropdown, setShowTypeDropdown] = useState<boolean>(false);
  const [showJurisdictionDropdown, setShowJurisdictionDropdown] = useState<boolean>(false);

  const types: string[] = ["All Types", "Contract Review", "Contract Drafting"];
  const jurisdictions: string[] = [
    "All Jurisdictions",
    "Singapore",
    "Hong Kong",
    "Malaysia",
    "Thailand",
  ];

  // Store callback in ref to avoid dependency issues
  const onFilterChangeRef = useRef(onFilterChange);
  onFilterChangeRef.current = onFilterChange;

  // Notify parent when filter VALUES change (not when callback changes)
  useEffect(() => {
    onFilterChangeRef.current?.({
      searchText,
      type,
      jurisdiction,
      selectedTags,
    });
  }, [searchText, type, jurisdiction, selectedTags]);

  const handleTagsChange = (tags: string[]) => {
    setSelectedTags(tags);
  };

  return (
    <div className="playbook-filter">
      <p
        style={{
          fontWeight: 500,
          color: "#333333",
          fontSize: "15px",
          margin: 0,
        }}
      >
        Playbooks for Contract Review
      </p>

      {/* Search bar */}
      <div className="search-bar">
        <IoSearch className="search-icon" size={18} />
        <input
          type="text"
          placeholder="Search playbook by name, description or tags"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
      </div>

      <div className="filters">
        {/* Type Dropdown */}
        <div className="dropdown">
          <button
            className="dropdown-btn"
            onClick={() => {
              setShowTypeDropdown(!showTypeDropdown);
              setShowJurisdictionDropdown(false);
            }}
          >
            <span className="dropdown-label">
              <span className="icon">
                <PiCirclesFourLight size={16} />
              </span>
              <span className="label-text">{type}</span>
            </span>

            <span className={`arrow ${showTypeDropdown ? "rotate" : ""}`}>
              <FaChevronDown />
            </span>
          </button>
          {showTypeDropdown && (
            <ul className="dropdown-menu">
              {types.map((t) => (
                <li
                  key={t}
                  onClick={() => {
                    setType(t);
                    setShowTypeDropdown(false);
                  }}
                >
                  {t}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Jurisdiction Dropdown */}
        <div className="dropdown">
          <button
            className="dropdown-btn"
            onClick={() => {
              setShowJurisdictionDropdown(!showJurisdictionDropdown);
              setShowTypeDropdown(false);
            }}
          >
            <span className="dropdown-label">
              <span className="icon">
                <IoLocationOutline size={16} />
              </span>
              <span className="label-text">{jurisdiction}</span>
            </span>

            <span className={`arrow ${showJurisdictionDropdown ? "rotate" : ""}`}>
              <FaChevronDown />
            </span>
          </button>

          {showJurisdictionDropdown && (
            <ul className="dropdown-menu">
              {jurisdictions.map((j) => (
                <li
                  key={j}
                  onClick={() => {
                    setJurisdiction(j);
                    setShowJurisdictionDropdown(false);
                  }}
                >
                  {j}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <TagMultiSelect onTagsChange={handleTagsChange} availableTags={availableTags} />
    </div>
  );
};

export default PlaybookFilter;
