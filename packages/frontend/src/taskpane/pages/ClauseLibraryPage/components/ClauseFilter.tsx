import React, { useState, useEffect, useRef } from "react";
import "../styles/ClauseFilter.css";
import { FaChevronDown, FaChevronUp } from "react-icons/fa6";
import { IoSearch } from "react-icons/io5";
import TagMultiSelect from "../../UnifiedLibraryPage/components/playbooks/TagMultiSelect";

export interface ClauseFilterValues {
  searchText: string;
  category: string;
  selectedTags: string[];
}

interface ClauseFilterProps {
  onFilterChange: (filters: ClauseFilterValues) => void;
  availableTags?: string[];
  availableCategories?: string[];
}

const ClauseFilter: React.FC<ClauseFilterProps> = ({ 
  onFilterChange, 
  availableTags = [],
  availableCategories = [],
}) => {
  const [searchText, setSearchText] = useState<string>("");
  const [category, setCategory] = useState<string>("All Categories");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState<boolean>(false);

  const categories = ["All Categories", ...availableCategories];

  // Store callback in ref to avoid dependency issues
  const onFilterChangeRef = useRef(onFilterChange);
  onFilterChangeRef.current = onFilterChange;

  // Notify parent when filter VALUES change
  useEffect(() => {
    onFilterChangeRef.current?.({
      searchText,
      category,
      selectedTags,
    });
  }, [searchText, category, selectedTags]);

  const handleTagsChange = (tags: string[]) => {
    setSelectedTags(tags);
  };

  return (
    <div className="clause-filter">
      <div className="search-bar">
        <IoSearch className="search-icon" size={18} />
        <input
          type="text"
          placeholder="Search clauses..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
      </div>

      <div className="filters">
        {/* Category Dropdown */}
        <div className="dropdown">
          <button
            className="dropdown-btn"
            onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
          >
            <span className="dropdown-label">
              <span className="label-text">{category}</span>
            </span>

            <span className={`arrow ${showCategoryDropdown ? "rotate" : ""}`}>
              <FaChevronDown />
            </span>
          </button>

          {showCategoryDropdown && (
            <ul className="dropdown-menu">
              {categories.map((cat) => (
                <li
                  key={cat}
                  onClick={() => {
                    setCategory(cat);
                    setShowCategoryDropdown(false);
                  }}
                >
                  {cat}
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

export default ClauseFilter;

