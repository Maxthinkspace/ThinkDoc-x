import React, { useState, useEffect } from "react";
import { useNavigation } from "../../hooks/use-navigation";
import { RedraftConfigPage } from "./RedraftConfigPage";
import { RedraftResultsPage } from "./RedraftResultsPage";
import { RedraftProgressPage } from "./RedraftProgressPage";
import type { DraftedSection, SkeletonSection } from "@/src/types/redraft";
import { useJobPolling } from "../../hooks/useJobPolling";
import { jobTracker } from "../../utils/jobTracker";
import { backendApi } from "@/src/services/api";

type ViewState = "config" | "progress" | "results";

export const RedraftIndex: React.FC = () => {
  const { navigateTo, navigationState } = useNavigation();
  
  const [currentView, setCurrentView] = useState<ViewState>("config");
  const [draftedSections, setDraftedSections] = useState<DraftedSection[]>([]);
  const [skeleton, setSkeleton] = useState<SkeletonSection[]>([]);
  const [originalParsed, setOriginalParsed] = useState<any>(null);
  const [resumeJobId, setResumeJobId] = useState<string | null>(null);

  // Check if we're resuming a job from History
  useEffect(() => {
    const activeJobId = navigationState.activeJobId;
    if (activeJobId) {
      const trackedJob = jobTracker.getJobByJobId(activeJobId);
      if (trackedJob && trackedJob.type === "draft") {
        setResumeJobId(activeJobId);
        setCurrentView("progress");
        
        // Restore input context if available
        if (trackedJob.inputContext?.data) {
          setOriginalParsed(trackedJob.inputContext.data.originalParsed);
        }
      }
    }
  }, [navigationState.activeJobId]);

  // Poll for job status if resuming
  const pollingResult = useJobPolling<{
    success: boolean;
    draftedSections: DraftedSection[];
    skeleton: SkeletonSection[];
  }>(resumeJobId, "draft");

  // Handle job completion when resuming
  useEffect(() => {
    if (resumeJobId && pollingResult.status === "done" && pollingResult.result) {
      const result = pollingResult.result;
      if (result.success) {
        // Get input context from tracked job
        const trackedJob = jobTracker.getJobByJobId(resumeJobId);
        const inputContext = trackedJob?.inputContext?.data;
        
        setDraftedSections(result.draftedSections);
        setSkeleton(result.skeleton);
        if (inputContext?.originalParsed) {
          setOriginalParsed(inputContext.originalParsed);
        }
        setCurrentView("results");
        setResumeJobId(null);
      }
    } else if (resumeJobId && pollingResult.status === "error") {
      // Handle error - could show error message or go back to config
      console.error("Job failed:", pollingResult.error);
      setResumeJobId(null);
      setCurrentView("config");
    }
  }, [resumeJobId, pollingResult.status, pollingResult.result, pollingResult.error]);

  const handleConfigComplete = (
    sections: DraftedSection[],
    skeletonData: SkeletonSection[],
    originalParsedData: any
  ) => {
    setDraftedSections(sections);
    setSkeleton(skeletonData);
    setOriginalParsed(originalParsedData);
    setCurrentView("results");
  };

  const handleBackToConfig = () => {
    setCurrentView("config");
    setResumeJobId(null);
  };

  return (
    <div style={{ 
      position: "relative",
      height: "100vh", 
      width: "100%",
      overflow: "hidden" 
    }}>
      {currentView === "config" && (
        <RedraftConfigPage
          onComplete={handleConfigComplete}
          onBack={() => navigateTo("menu")}
        />
      )}
      {currentView === "progress" && resumeJobId && (
        <RedraftProgressPage
          jobId={resumeJobId}
          progress={pollingResult.progress}
          onBack={handleBackToConfig}
          onComplete={(sections, skeletonData, originalParsedData) => {
            setDraftedSections(sections);
            setSkeleton(skeletonData);
            setOriginalParsed(originalParsedData);
            setCurrentView("results");
            setResumeJobId(null);
          }}
        />
      )}
      {currentView === "results" && (
        <RedraftResultsPage
          onBack={handleBackToConfig}
          draftedSections={draftedSections}
          skeleton={skeleton}
          originalParsed={originalParsed}
        />
      )}
    </div>
  );
};