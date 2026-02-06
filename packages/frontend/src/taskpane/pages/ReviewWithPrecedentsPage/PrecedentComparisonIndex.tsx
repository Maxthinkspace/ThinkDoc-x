import React, { useState, useEffect } from "react";
import { useNavigation } from "../../hooks/use-navigation";
import { PrecedentUploadPage } from "./PrecedentUploadPage";
import { PrecedentResultsPage } from "./PrecedentResultsPage";
import { PrecedentProgressPage } from "./PrecedentProgressPage";
import type { FormattedAmendment } from "@/src/services/api";
import { useJobPolling } from "../../hooks/useJobPolling";
import { jobTracker } from "../../utils/jobTracker";

type ViewState = "upload" | "progress" | "results";

export const PrecedentComparisonIndex: React.FC = () => {
  // ===========================================================================
  // NOTE 11-28-2025:
  // Added useNavigation hook to enable back button navigation to menu
  // ===========================================================================
  const { navigateTo, navigationState } = useNavigation();
  
  const [currentView, setCurrentView] = useState<ViewState>("upload");
  const [results, setResults] = useState<FormattedAmendment[]>([]);
  const [referenceParsed, setReferenceParsed] = useState<any>(null);
  const [resumeJobId, setResumeJobId] = useState<string | null>(null);

  // Check if we're resuming a job from History
  useEffect(() => {
    const activeJobId = navigationState.activeJobId;
    if (activeJobId) {
      const trackedJob = jobTracker.getJobByJobId(activeJobId);
      if (trackedJob && trackedJob.type === "precedent") {
        setResumeJobId(activeJobId);
        setCurrentView("progress");
        
        // Restore input context if available
        if (trackedJob.inputContext?.data) {
          setReferenceParsed(trackedJob.inputContext.data.referenceParsed);
        }
      }
    }
  }, [navigationState.activeJobId]);

  // Poll for job status if resuming
  const pollingResult = useJobPolling<{
    success: boolean;
    formattedResults: FormattedAmendment[];
  }>(resumeJobId, "precedent");

  // Handle job completion when resuming
  useEffect(() => {
    if (resumeJobId && pollingResult.status === "done" && pollingResult.result) {
      const result = pollingResult.result;
      if (result && result.success !== false) {
        // Get input context from tracked job
        const trackedJob = jobTracker.getJobByJobId(resumeJobId);
        const inputContext = trackedJob?.inputContext?.data;
        
        setResults(result.formattedResults || []);
        if (inputContext?.referenceParsed) {
          setReferenceParsed(inputContext.referenceParsed);
        }
        setCurrentView("results");
        setResumeJobId(null);
      }
    } else if (resumeJobId && pollingResult.status === "error") {
      console.error("Job failed:", pollingResult.error);
      setResumeJobId(null);
      setCurrentView("upload");
    }
  }, [resumeJobId, pollingResult.status, pollingResult.result, pollingResult.error]);

  const handleUploadComplete = (
    resultsData: FormattedAmendment[],
    referenceParsedData: any
  ) => {
    setResults(resultsData);
    setReferenceParsed(referenceParsedData);
    setCurrentView("results");
  };

  const handleBackToUpload = () => {
    setCurrentView("upload");
    setResumeJobId(null);
  };

  return (
    <div style={{ 
      position: "relative",
      // FIX: Reverted to 100vh. This is necessary because 100% fails to propagate height
      // in the taskpane's embedded iframe environment, causing the container to collapse.
      height: "100vh", 
      width: "100%",
      overflow: "hidden" 
    }}>
      {currentView === "upload" && (
        <PrecedentUploadPage
          onComplete={handleUploadComplete}
          // ===========================================================================
          // NOTE 11-28-2025:
          // FIXED: Changed from console.log to actual navigation using navigateTo
          // ===========================================================================
          onBack={() => navigateTo("menu")}
        />
      )}
      {currentView === "progress" && resumeJobId && (
        <PrecedentProgressPage
          jobId={resumeJobId}
          progress={pollingResult.progress}
          onBack={handleBackToUpload}
          onComplete={(resultsData, referenceParsedData) => {
            setResults(resultsData);
            setReferenceParsed(referenceParsedData);
            setCurrentView("results");
            setResumeJobId(null);
          }}
        />
      )}
      {currentView === "results" && (
        <PrecedentResultsPage
          onBack={handleBackToUpload}
          results={results}
          referenceParsed={referenceParsed}
        />
      )}
    </div>
  );
};
