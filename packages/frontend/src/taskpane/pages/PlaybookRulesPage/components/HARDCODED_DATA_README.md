# Hardcoded Data Implementation - Revert Guide

## Overview
This document explains the hardcoded data implementation in `PlayookResults.tsx` and how to revert back to using API data.

## Changes Made

### Location
File: `src/taskpane/pages/PlaybookRulesPage/components/PlayookResults.tsx`

### What Was Added

1. **Hardcoded Data Constants** (Lines ~771-852):
   - `HARDCODED_CHANGES_REQUIRED`: Contains 2 sample rules with "amended" status
   - `HARDCODED_NO_CHANGES_NEEDED`: Contains 2 sample rules with "not-amended" status
   - Marked with comment blocks: `// HARDCODED DATA FOR TESTING - START/END`

2. **Fallback Logic** (Lines ~879-886):
   - Modified to use hardcoded data when props are empty
   - Uses conditional: `groupedRules["changes-required"]?.length > 0 ? groupedRules["changes-required"] : HARDCODED_CHANGES_REQUIRED`
   - Marked with comment blocks: `// HARDCODED DATA FALLBACK LOGIC - START/END`

## Current Implementation

```typescript
// Hardcoded data for testing
const HARDCODED_CHANGES_REQUIRED: Array<{ rule: Rule; results: RuleResult[]; index: number }> = [
  // ... hardcoded data
];

const HARDCODED_NO_CHANGES_NEEDED: Array<{ rule: Rule; results: RuleResult[]; index: number }> = [
  // ... hardcoded data
];

// In component:
const changesRequired = groupedRules["changes-required"]?.length > 0 
  ? groupedRules["changes-required"] 
  : HARDCODED_CHANGES_REQUIRED;

const noChangesNeeded = groupedRules["no-changes-needed"]?.length > 0 
  ? groupedRules["no-changes-needed"] 
  : HARDCODED_NO_CHANGES_NEEDED;
```

## How to Revert to API Data

### Option 1: Remove Hardcoded Data (Recommended)
1. **Delete the hardcoded constants** (lines ~771-852):
   - Look for comment: `// HARDCODED DATA FOR TESTING - START`
   - Delete everything between `// HARDCODED DATA FOR TESTING - START` and `// HARDCODED DATA FOR TESTING - END`
   - This includes `HARDCODED_CHANGES_REQUIRED` and `HARDCODED_NO_CHANGES_NEEDED`

2. **Revert the fallback logic** (lines ~879-886):
   - Look for comment: `// HARDCODED DATA FALLBACK LOGIC - START`
   - **REPLACE** the following code:
   ```typescript
   // HARDCODED DATA FALLBACK LOGIC - START
   const changesRequired = groupedRules["changes-required"]?.length > 0 
     ? groupedRules["changes-required"] 
     : HARDCODED_CHANGES_REQUIRED;
   
   const noChangesNeeded = groupedRules["no-changes-needed"]?.length > 0 
     ? groupedRules["no-changes-needed"] 
     : HARDCODED_NO_CHANGES_NEEDED;
   // HARDCODED DATA FALLBACK LOGIC - END
   ```
   
   **WITH:**
   ```typescript
   // Use props directly from API
   const changesRequired = groupedRules["changes-required"];
   const noChangesNeeded = groupedRules["no-changes-needed"];
   ```

3. **No changes needed in `groupConfigs`** - it already uses `changesRequired` and `noChangesNeeded` variables

### Option 2: Comment Out Hardcoded Data (For Quick Testing)
1. **Comment the hardcoded constants** (lines ~771-852):
   - Find `// HARDCODED DATA FOR TESTING - START`
   - Comment out everything between START and END markers
   ```typescript
   // ============================================================================
   // HARDCODED DATA FOR TESTING - START
   // const HARDCODED_CHANGES_REQUIRED: Array<...> = [...];
   // const HARDCODED_NO_CHANGES_NEEDED: Array<...> = [...];
   // ============================================================================
   // HARDCODED DATA FOR TESTING - END
   ```

2. **Comment the fallback logic and use props directly** (lines ~879-886):
   ```typescript
   // ============================================================================
   // HARDCODED DATA FALLBACK LOGIC - START
   // const changesRequired = groupedRules["changes-required"]?.length > 0 
   //   ? groupedRules["changes-required"] 
   //   : HARDCODED_CHANGES_REQUIRED;
   // const noChangesNeeded = groupedRules["no-changes-needed"]?.length > 0 
   //   ? groupedRules["no-changes-needed"] 
   //   : HARDCODED_NO_CHANGES_NEEDED;
   // ============================================================================
   // HARDCODED DATA FALLBACK LOGIC - END
   
   // Use props directly from API:
   const changesRequired = groupedRules["changes-required"];
   const noChangesNeeded = groupedRules["no-changes-needed"];
   ```

## Quick Revert Steps

1. Open `src/taskpane/pages/PlaybookRulesPage/components/PlayookResults.tsx`
2. **Search for**: `// HARDCODED DATA FOR TESTING - START`
   - **DELETE** everything from START to END (lines ~771-852)
3. **Search for**: `// HARDCODED DATA FALLBACK LOGIC - START`
   - **REPLACE** the fallback logic (lines ~879-886) with:
   ```typescript
   const changesRequired = groupedRules["changes-required"];
   const noChangesNeeded = groupedRules["no-changes-needed"];
   ```
4. **No other changes needed** - `groupConfigs` already uses these variables

## Testing

- **With Hardcoded Data**: Component shows sample data even when API returns empty arrays
- **With API Data**: Component only shows data from `groupedRules` prop (from API)

## Notes

- The hardcoded data is only used as a fallback when `groupedRules` arrays are empty
- If API returns data, it will be used instead of hardcoded data
- To force hardcoded data, you can temporarily set the props to empty arrays in the parent component

