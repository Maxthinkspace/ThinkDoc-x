import * as React from "react";
import { Calendar, FileText, CheckCircle, AlertCircle, Loader, BookOpen, PenTool, Database, RefreshCw, ChevronRight } from "lucide-react";
import { useNavigation } from "../../hooks/use-navigation";
import { useLanguage } from "../../contexts/LanguageContext";
import { jobTracker } from "../../utils/jobTracker";
import { getAuthHeaders } from "../../../services/api";
import { buildApiUrl } from "../../../services/apiBaseUrl";
import "./styles/HistoryPage.css";

type ActivityType = "review" | "draft" | "playbook" | "precedent" | "vault" | "all";
type ActivityStatus = "completed" | "in_progress" | "failed" | "pending";

interface HistoryActivity {
  id: string;
  type: ActivityType;
  title: string;
  subtitle: string;
  status: ActivityStatus;
  createdAt: string;
  jobId?: string;
  progress?: {
    currentStep: number;
    totalSteps: number;
    stepName: string;
  };
  metadata?: {
    documentName?: string;
    playbookName?: string;
    resultsCount?: number;
  };
}

export const HistoryPage: React.FC = () => {
  const { navigateTo } = useNavigation();
  const { translations } = useLanguage();
  const [reviewActivities, setReviewActivities] = React.useState<HistoryActivity[]>([]);
  const [jobActivities, setJobActivities] = React.useState<HistoryActivity[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = React.useState<ActivityType>("all");

  React.useEffect(() => {
    fetchActivities();
  }, []);

  React.useEffect(() => {
    const handleJobTrackerUpdate = () => {
      syncJobActivities();
    };

    syncJobActivities();
    window.addEventListener("jobTracker:updated", handleJobTrackerUpdate);
    return () => {
      window.removeEventListener("jobTracker:updated", handleJobTrackerUpdate);
    };
  }, []);

  const activities = React.useMemo(
    () =>
      [...reviewActivities, ...jobActivities].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [reviewActivities, jobActivities]
  );

  // Poll for in-progress jobs
  React.useEffect(() => {
    if (activities.length === 0) return () => {};
    
    const interval = setInterval(() => {
      activities.forEach((activity) => {
        if ((activity.status === "in_progress" || activity.status === "pending") && activity.jobId) {
          checkJobStatus(activity.jobId, activity.id);
        }
      });
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(interval);
  }, [activities]);

  const syncJobActivities = () => {
    const trackedJobs = jobTracker.getJobs();
    const mappedJobActivities: HistoryActivity[] = trackedJobs.map((job) => ({
      id: job.id,
      type: job.type,
      title: job.title,
      subtitle: job.subtitle,
      status:
        job.status === "done" ? "completed" : job.status === "error" ? "failed" : "pending",
      createdAt: new Date(job.createdAt).toISOString(),
      jobId: job.jobId,
      progress: job.progress,
    }));

    setJobActivities(mappedJobActivities);
  };

  const fetchActivities = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch review sessions
      const reviewResponse = await fetch(buildApiUrl("/api/review-sessions?limit=50"), {
        headers: getAuthHeaders(),
      });
      if (!reviewResponse.ok) {
        throw new Error("Failed to fetch activities");
      }
      const reviewData = await reviewResponse.json();
      
      // Transform review sessions to activities
      const mappedReviewActivities: HistoryActivity[] = (reviewData.data || []).map((session: any) => ({
        id: session.id,
        type: "review" as ActivityType,
        title: session.documentName || "Review Session",
        subtitle: session.playbookName ? `Playbook: ${session.playbookName}` : "Contract Review",
        status: session.status === "completed" ? "completed" : session.status === "in_progress" ? "in_progress" : "failed",
        createdAt: session.createdAt,
        metadata: {
          documentName: session.documentName,
          playbookName: session.playbookName,
          resultsCount: session.resultsCount,
        },
      }));
      setReviewActivities(mappedReviewActivities);
      syncJobActivities();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "An error occurred";
      setError(errorMsg);
      console.error("Error fetching activities:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const checkJobStatus = async (jobId: string, activityId: string) => {
    try {
      // Try different job endpoints
      const endpoints = [
        buildApiUrl(`/api/contract-review/jobs/${jobId}`),
        buildApiUrl(`/api/playbook-generation/jobs/${jobId}`),
        buildApiUrl(`/api/redraft/jobs/${jobId}`),
        buildApiUrl(`/api/review-with-precedents/jobs/${jobId}`),
        buildApiUrl(`/api/vault/jobs/${jobId}`),
      ];

      for (const endpoint of endpoints) {
        const response = await fetch(endpoint, { headers: getAuthHeaders() });
        if (response.ok) {
          const data = await response.json();
          if (data.status) {
            updateActivityStatus(activityId, jobId, data.status, data.progress, data.result, data.error);
            return;
          }
        }
      }
    } catch (err) {
      console.error("Error checking job status:", err);
    }
  };

  const updateActivityStatus = (
    activityId: string,
    jobId: string,
    status: string,
    progress?: any,
    result?: any,
    error?: string
  ) => {
    // Intentionally unused for now; keep signature for future UI surfacing.
    void result;
    void error;

    // Update in jobTracker
    if (status === "done" || status === "error") {
      jobTracker.updateJob(jobId, {
        status: status === "done" ? "done" : "error",
        progress: progress,
      });
    } else if (progress) {
      jobTracker.updateJob(jobId, { progress });
    }

    // Update in state
    setJobActivities((prev) =>
      prev.map((activity) => {
        if (activity.id === activityId || activity.jobId === jobId) {
          const newStatus: ActivityStatus =
            status === "done" ? "completed" : status === "error" ? "failed" : "in_progress";
          return {
            ...activity,
            status: newStatus,
            progress: progress,
          };
        }
        return activity;
      })
    );
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "Unknown date";
    }
  };

  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  const getTypeIcon = (type: ActivityType) => {
    switch (type) {
      case "review":
        return <FileText size={20} />;
      case "draft":
        return <PenTool size={20} />;
      case "playbook":
        return <BookOpen size={20} />;
      case "precedent":
        return <Database size={20} />;
      default:
        return <FileText size={20} />;
    }
  };

  const getStatusIcon = (status: ActivityStatus) => {
    switch (status) {
      case "completed":
        return <CheckCircle size={16} className="history-status-icon completed" />;
      case "in_progress":
      case "pending":
        return <Loader size={16} className="history-status-icon in-progress" />;
      case "failed":
        return <AlertCircle size={16} className="history-status-icon failed" />;
      default:
        return null;
    }
  };

  const handleActivityClick = (activity: HistoryActivity) => {
    // For in-progress jobs, navigate to the feature page with job context
    if ((activity.status === "in_progress" || activity.status === "pending") && activity.jobId) {
      // Find the tracked job to get navigation target
      const trackedJob = jobTracker.getJobByJobId(activity.jobId);
      const targetPage = trackedJob?.navigationTarget || 
        (activity.type === "review" ? "PlaybookRulesTabs" :
         activity.type === "precedent" ? "precedent-comparison" :
         activity.type === "draft" ? "redraft" :
         activity.type === "playbook" ? "PlaybookGenerator" :
         "menu");
      
      navigateTo(targetPage, { activeJobId: activity.jobId });
      return;
    }
    
    // For completed jobs, navigate to results
    if (activity.status === "completed") {
      switch (activity.type) {
        case "review":
          navigateTo("PlaybookRulesTabs");
          break;
        case "precedent":
          navigateTo("precedent-comparison");
          break;
        case "draft":
          navigateTo("redraft");
          break;
        default:
          break;
      }
    }
  };

  const filteredActivities = selectedFilter === "all" 
    ? activities 
    : activities.filter((a) => a.type === selectedFilter);

  const filterOptions: { type: ActivityType; label: string }[] = [
    { type: "all", label: translations.history.all },
    { type: "review", label: translations.history.review },
    { type: "draft", label: translations.history.draft },
    { type: "playbook", label: translations.history.playbook },
    { type: "precedent", label: translations.history.precedent },
  ];

  return (
    <div className="history-page">
      {/* Filters */}
      <div className="history-filters">
        {filterOptions.map((option) => (
          <button
            key={option.type}
            className={`history-filter-button ${selectedFilter === option.type ? "active" : ""}`}
            onClick={() => setSelectedFilter(option.type)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Refresh Button */}
      <div className="history-header">
        <button className="history-refresh-button" onClick={fetchActivities} aria-label="Refresh">
          <RefreshCw size={18} />
        </button>
      </div>

      <div className="history-content">
        {isLoading && (
          <div className="history-loading">
            <Loader size={24} className="spinner" />
            <p>{translations.history.loadingActivities}</p>
          </div>
        )}

        {error && (
          <div className="history-error">
            <AlertCircle size={20} />
            <p>{error}</p>
            <button onClick={fetchActivities} className="history-retry-button">
              {translations.common.retry}
            </button>
          </div>
        )}

        {!isLoading && !error && filteredActivities.length === 0 && (
          <div className="history-empty">
            <Calendar size={48} />
            <h3>{translations.history.noActivities}</h3>
            <p>{translations.history.noActivitiesSubtitle}</p>
          </div>
        )}

        {!isLoading && !error && filteredActivities.length > 0 && (
          <ul className="history-activities-list">
            {filteredActivities.map((activity) => (
              <li
                key={activity.id}
                className={`history-activity-item ${activity.status === "in_progress" ? "in-progress" : ""}`}
                onClick={() => handleActivityClick(activity)}
              >
                <div className="history-activity-icon">{getTypeIcon(activity.type)}</div>
                <div className="history-activity-details">
                  <div className="history-activity-name">{activity.title}</div>
                  <div className="history-activity-meta">
                    <span className="history-activity-subtitle">{activity.subtitle}</span>
                    {activity.progress && (
                      <span className="history-activity-progress">
                        {activity.progress.currentStep} / {activity.progress.totalSteps} - {activity.progress.stepName}
                      </span>
                    )}
                    <span className="history-activity-time">
                      {formatDate(activity.createdAt)} at {formatTime(activity.createdAt)}
                    </span>
                  </div>
                </div>
                <div className="history-activity-status">
                  {getStatusIcon(activity.status)}
                  {activity.status === "completed" && <ChevronRight size={16} className="history-activity-chevron" />}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

