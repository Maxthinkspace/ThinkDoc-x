import React, { useState, useEffect } from "react";
import { useNavigation } from "../../hooks/use-navigation";
import { RedomicileConfigPage } from "./RedomicileConfigPage";
import { RedomicileResultsPage } from "./RedomicileResultsPage";
import { RedomicileProgressPage } from "./RedomicileProgressPage";
import type { RedomiciledSection, RedomicileMetadata } from "@/src/types/redomicile";
import { useJobPolling } from "../../hooks/useJobPolling";
import { jobTracker } from "../../utils/jobTracker";

type ViewState = "config" | "processing" | "results";

export const RedomicileIndex: React.FC = () => {
  const { navigateTo, navigationState } = useNavigation();
  
  const [currentView, setCurrentView] = useState<ViewState>("config");
  const [redomiciledSections, setRedomiciledSections] = useState<RedomiciledSection[]>([]);
  const [metadata, setMetadata] = useState<RedomicileMetadata | null>(null);
  const [originalParsed, setOriginalParsed] = useState<any>(null);
  const [config, setConfig] = useState<{
    sourceJurisdiction: string;
    targetJurisdiction: string;
    documentType: string;
    additionalGuidance?: string;
  } | null>(null);
  const [resumeJobId, setResumeJobId] = useState<string | null>(null);

  // Check if we're resuming a job from History
  useEffect(() => {
    const activeJobId = navigationState.activeJobId;
    if (activeJobId) {
      const trackedJob = jobTracker.getJobByJobId(activeJobId);
      if (trackedJob && trackedJob.type === "vault") {
        // Note: Redomicile uses "vault" type in jobTracker
        setResumeJobId(activeJobId);
        setCurrentView("processing");
        
        // Restore input context if available
        if (trackedJob.inputContext?.data) {
          setOriginalParsed(trackedJob.inputContext.data.originalParsed);
          setConfig(trackedJob.inputContext.data.config);
        }
      }
    }
  }, [navigationState.activeJobId]);

  // Poll for job status if resuming
  const pollingResult = useJobPolling<{
    success: boolean;
    sections: RedomiciledSection[];
    metadata: RedomicileMetadata;
  }>(resumeJobId, "redomicile");

  // Handle job completion when resuming
  useEffect(() => {
    if (resumeJobId && pollingResult.status === "done" && pollingResult.result) {
      const result = pollingResult.result;
      if (result && result.success !== false) {
        // Get input context from tracked job
        const trackedJob = jobTracker.getJobByJobId(resumeJobId);
        const inputContext = trackedJob?.inputContext?.data;
        
        setRedomiciledSections(result.sections || []);
        setMetadata(result.metadata || null);
        if (inputContext?.originalParsed) {
          setOriginalParsed(inputContext.originalParsed);
        }
        if (inputContext?.config) {
          setConfig(inputContext.config);
        }
        setCurrentView("results");
        setResumeJobId(null);
      }
    } else if (resumeJobId && pollingResult.status === "error") {
      console.error("Job failed:", pollingResult.error);
      setResumeJobId(null);
      setCurrentView("config");
    }
  }, [resumeJobId, pollingResult.status, pollingResult.result, pollingResult.error]);

  const handleConfigComplete = (
    sections: RedomiciledSection[],
    metadataData: RedomicileMetadata,
    originalParsedData: any,
    configData: {
      sourceJurisdiction: string;
      targetJurisdiction: string;
      documentType: string;
      additionalGuidance?: string;
    }
  ) => {
    setRedomiciledSections(sections);
    setMetadata(metadataData);
    setOriginalParsed(originalParsedData);
    setConfig(configData);
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
        <RedomicileConfigPage
          onComplete={handleConfigComplete}
          onBack={() => navigateTo("menu")}
        />
      )}
      {currentView === "processing" && resumeJobId && (
        <RedomicileProgressPage
          jobId={resumeJobId}
          progress={pollingResult.progress}
          onBack={handleBackToConfig}
          onComplete={(sections, metadataData, originalParsedData, configData) => {
            setRedomiciledSections(sections);
            setMetadata(metadataData);
            setOriginalParsed(originalParsedData);
            setConfig(configData);
            setCurrentView("results");
            setResumeJobId(null);
          }}
        />
      )}
      {currentView === "results" && redomiciledSections.length > 0 && metadata && config && (
        <RedomicileResultsPage
          onBack={handleBackToConfig}
          redomiciledSections={redomiciledSections}
          metadata={metadata}
          originalParsed={originalParsed}
          config={config}
        />
      )}
    </div>
  );
};

