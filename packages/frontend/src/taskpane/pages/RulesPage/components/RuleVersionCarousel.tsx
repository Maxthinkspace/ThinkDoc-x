import * as React from "react";
import { Rule, RuleCategories } from "../index";
import { RuleCard } from "./RuleCard";

export type RuleVersion = {
  versionIndex: number;
  rules: Rule[];
  isOriginal: boolean;
};

export type RuleVersionCarouselProps = {
  versions: RuleVersion[];
  currentVersionIndex: number;
  displayStartIndex: number;
  type:
    | "Rules for Instruction Requests"
    | "Rules for Contract Amendments"
    | "Conditional Rules for Contract Amendments";
  onVersionChange: (newIndex: number) => void;
  onAcceptVersion: (versionIndex: number) => void;
  onCancelCarousel: () => void;
  onRemoveVersion: (versionIndex: number) => void;
  onRerun: () => void;
  isRerunning?: boolean;
  isHighlighted?: boolean;
  // Pass-through props for RuleCard
  moveRule: (ruleNumber: string) => void;
  addRules: (type: string, newRules: Rule[]) => void;
  removeRule: (type: string, removedRuleNumber: string) => void;
  setRules: (rules: RuleCategories) => void;
  updateRule: (
    type: string,
    ruleNumber: string,
    updated: {
      instruction: string;
      example_language?: string;
      brief_name?: string;
    }
  ) => void;
  onDragStart: (e: React.DragEvent, ruleNumber: string, type: string, index: number) => void;
  onDragOver: (e: React.DragEvent, targetIndex: number, categoryType: string) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, targetIndex: number, categoryType: string) => void;
  onDragEnd: () => void;
};

export const RuleVersionCarousel: React.FC<RuleVersionCarouselProps> = ({
  versions,
  currentVersionIndex,
  displayStartIndex,
  type,
  onVersionChange,
  onAcceptVersion,
  onRemoveVersion,
  onRerun,
  isRerunning = false,
  isHighlighted = false,
  moveRule,
  addRules,
  removeRule,
  setRules,
  updateRule,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
}) => {
  const currentVersion = versions[currentVersionIndex];
  const totalVersions = versions.length;

  const canGoPrev = currentVersionIndex > 0;
  const canGoNext = currentVersionIndex < totalVersions - 1;

  const handlePrev = () => {
    if (canGoPrev) {
      onVersionChange(currentVersionIndex - 1);
    }
  };

  const handleNext = () => {
    if (canGoNext) {
      onVersionChange(currentVersionIndex + 1);
    }
  };

  const handleAccept = () => {
    onAcceptVersion(currentVersionIndex);
  };

  const handleRemove = () => {
    onRemoveVersion(currentVersionIndex);
  };

  if (!currentVersion) {
    return null;
  }

  return (
    <>
      {currentVersion.rules.map((rule, idx) => (
        <RuleCard
          key={`${rule.id || rule.rule_number}-v${currentVersionIndex}-${idx}`}
          ruleId={rule.id}
          ruleNumber={rule.rule_number}
          briefName={rule.brief_name}
          type={type}
          index={displayStartIndex + idx}
          instruction={rule.instruction}
          example={rule.example_language}
          locationText={rule.location_text}
          sourceAnnotationKey={rule.sourceAnnotationKey}
          linkedRuleCount={0}
          linkedRules={[]}
          onRerun={onRerun}
          isRerunning={isRerunning}
          moveRule={() => moveRule(rule.rule_number)}
          addRules={addRules}
          removeRule={removeRule}
          setRules={setRules}
          updateRule={updateRule}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onDragEnd={onDragEnd}
          isDragged={false}
          showLocate={true}
          isInCarousel={true}
          isHighlighted={isHighlighted}
          onPrevVersion={handlePrev}
          onNextVersion={handleNext}
          onAcceptVersion={handleAccept}
          onCancelCarousel={handleRemove}
          canGoPrev={canGoPrev}
          canGoNext={canGoNext}
          currentVersionIndex={currentVersionIndex}
          totalVersions={totalVersions}
        />
      ))}
    </>
  );
};