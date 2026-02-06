/**
 * Main App Component
 * 
 * AUTHENTICATION & SUBSCRIPTION FLOW:
 * 1. Check local token on mount
 * 2. If no token → show login
 * 3. After login → call GET /api/auth/me
 * 4. Check if subscription.id exists
 * 5. If NO → show subscription screen
 * 6. If YES → use subscription object from response and check status
 * 7. Handle subscription statuses: active, trialing, past_due, canceled
 */
import * as React from "react";
import { UnifiedLibraryPage } from "../pages/UnifiedLibraryPage";
import { MenuPage } from "../pages/MenuPage";
import { ManualPlaybookPage } from "../pages/ManualPlaybookPage";

// ============================
// NOTE 11-27-2025:
// Removing index-Del 
// ============================

//import { PlaybookRulesPage } from "../pages/PlaybookRulesPage/index-Del";
import { ToastProvider } from "../hooks/use-toast";
import { NavigationProvider, useNavigation } from "../hooks/use-navigation";
import { ErrorProvider } from "../contexts/ErrorContext";
import { ErrorBoundaryWrapper } from "../components/ErrorBoundary";
import { Login, CreateAccount, ForgotPassword, ResetPassword } from "../pages/login";
import { SubscriptionPage } from "../pages/Subscription";
import { FixPaymentPage } from "../pages/Subscription/FixPaymentPage";
import { TrialBanner } from "./TrialBanner";
import { backendApi, Subscription } from "../../services/api";
import { RulesPage } from "../pages/RulesPage";
import PlaybookGenerator from "../pages/CreateNewPlaybook";
import { PlaybookRulesTabs } from "../pages/PlaybookRulesPage/Tabs";
import RulesConfiguration from "../pages/PlaybookRulesPage/RulesConfiguration";

// ===========================================================================
// NOTE 11-27-2025:
// Added import for PrecedentComparisonIndex (New Module)
// ===========================================================================
import { PrecedentComparisonIndex } from "../pages/ReviewWithPrecedentsPage/PrecedentComparisonIndex";
import { authService } from "../../services/auth";
import { RedraftIndex } from "../pages/RedraftPage";
import { RedomicileIndex } from "../pages/RedomicilePage";
import { AskPage } from "../pages/AskPage";
import { SummaryPage } from "../pages/AnnotationSummary";
import { SummaryAnnotationScope } from "../pages/AnnotationSummary/components/AnnotationScope";
import { CheckDefinitionsIndex } from "../pages/CheckDefinitionsPage";
import { MainLayout } from "../layouts/MainLayout";
import { VaultPage } from "../pages/VaultPage";
import { HistoryPage } from "../pages/HistoryPage";
import { SetupPage } from "../pages/SetupPage";
import { LanguagePage } from "../pages/LanguagePage";
import { HelpSupportPage } from "../pages/HelpSupportPage";
import { ProfilePage } from "../pages/ProfilePage";
import { TranslationPage } from "../pages/TranslationPage";
import { NegotiationPage } from "../pages/NegotiationPage";
import { ClauseLibraryPage } from "../pages/ClauseLibraryPage";
import { CreateClausePage } from "../pages/CreateClausePage";
import { ExtractClausePage } from "../pages/ExtractClausePage";
import { DraftClausePage } from "../pages/DraftClausePage";
import { DraftFromScratchPage } from "../pages/DraftFromScratchPage";
import { RedactionPage } from "../pages/RedactionPage";
import { LanguageProvider } from "../contexts/LanguageContext";
import { UserProvider } from "../contexts/UserContext";
import { NotificationProvider } from "../contexts/NotificationContext";
import { useToast } from "../hooks/use-toast";
import { getSelectedText, findAnnotationsInSelection } from "../../utils/annotationFilter";
import { SaveClauseDialog } from "./TextSelectionContextMenu/SaveClauseDialog";
import { useTextSelection } from "../hooks/use-text-selection";
import { ThinkAIProvider } from "../contexts/ThinkAIContext";
import { DocumentAnnotationsProvider, useDocumentAnnotations } from "../contexts/AnnotationContext";
import { ExpandableActionMenu } from "./ExpandableActionMenu";
import { DocumentVersionControlPanel } from "./DocumentVersionControl/DocumentVersionControlPanel";

const AppContentInner = () => {
  const { currentPage, navigateTo, navigationState } = useNavigation();
  const { toast } = useToast();
  const { annotations: docAnnotations, combinedStructure, recitals } = useDocumentAnnotations();
  const [showSaveClauseDialog, setShowSaveClauseDialog] = React.useState(false);
  const [clauseTextToSave, setClauseTextToSave] = React.useState<string | null>(null);

  // Determine if we should show bottom nav
  const showBottomNav = ["menu", "dashboard", "vault", "history", "setup"].includes(currentPage);

  // Show the expandable action menu on all pages except those that are
  // direct navigation targets of the menu's own actions (avoids circular navigation)
  const expandableMenuExcludePages = ["ask", "check-definitions", "translation"];
  const showExpandableMenu = !expandableMenuExcludePages.includes(currentPage);

  const { selectedText, hasSelection } = useTextSelection(showExpandableMenu);

  const handleCheckDefinitions = () => {
    navigateTo("check-definitions");
  };

  const handlePolish = async (action: "formal" | "informal" | "shorter" | "longer" | "grammar") => {
    if (!selectedText) return;
    
    // Store polish action and text in sessionStorage
    sessionStorage.setItem("polishAction", action);
    sessionStorage.setItem("polishText", selectedText);
    
    // Navigate to Ask page with polish instruction
    sessionStorage.setItem("askContextText", selectedText);
    const polishInstructions: Record<string, string> = {
      formal: "Rewrite this text in a formal legal tone",
      informal: "Rewrite this text in a simpler, more informal tone",
      shorter: "Make this text more concise while preserving all key points",
      longer: "Expand this text with more detail and elaboration",
      grammar: "Fix any grammar and punctuation errors in this text",
    };
    sessionStorage.setItem("askInitialMessage", polishInstructions[action]);
    navigateTo("ask");
  };

  const handleTranslate = (text: string) => {
    sessionStorage.setItem("translationText", text);
    navigateTo("translation");
  };

  const handleSaveClause = (text: string) => {
    setClauseTextToSave(text);
    setShowSaveClauseDialog(true);
  };

  const handleAskAI = async (text: string | null) => {
    // Fetch selection *fresh* on click (avoids stale 500ms polling).
    const freshSelection = text || (await getSelectedText());
    if (freshSelection && freshSelection.trim()) {
      // Store selection in sessionStorage and navigate to Ask page
      sessionStorage.setItem("askContextText", freshSelection);
      
      // Capture matching annotations at this moment (text + annotations must be paired)
      if (docAnnotations && combinedStructure) {
        const matchedAnnotations = findAnnotationsInSelection(
          freshSelection,
          docAnnotations,
          undefined,
          combinedStructure,
          recitals
        );
        sessionStorage.setItem("askContextAnnotations", JSON.stringify(matchedAnnotations));
      } else {
        // Clear stale annotations if extraction not ready
        sessionStorage.removeItem("askContextAnnotations");
      }
      
      navigateTo("ask");
      return;
    }

    // No selection: navigate to Ask page without context
    sessionStorage.removeItem("askContextAnnotations");
    navigateTo("ask");
  };

  React.useEffect(() => {
  }, [currentPage, showBottomNav]);

  return (
    <MainLayout>
      {/* Main Content */}
      <div className="">
        {(currentPage === "menu" || currentPage === "dashboard") && <MenuPage />}
        {currentPage === "vault" && <VaultPage />}
        <div style={{ display: currentPage === "history" ? "block" : "none" }}>
          <HistoryPage />
        </div>
        {currentPage === "setup" && <SetupPage />}
        {currentPage === "language" && <LanguagePage />}
        {currentPage === "help-support" && <HelpSupportPage />}
        {currentPage === "profile" && <ProfilePage />}
        {currentPage === "library" && <UnifiedLibraryPage />}
        {currentPage === "unified-library" && (
          <UnifiedLibraryPage initialTab={navigationState.tab || "clauses"} />
        )}
        {currentPage === "PlaybookGenerator" && <PlaybookGenerator />}
        {currentPage === "ManualPlaybook" && <ManualPlaybookPage />}
        {currentPage === "PlaybookRulesTabs" && <PlaybookRulesTabs />}
        {currentPage === "RulesConfiguration" && <RulesConfiguration />}
        {currentPage === "rules" && <RulesPage />}
        
        {/* NOTE 11-27-2025: Remove the obsolete route "PlaybookRules" after deleting index-Del.tsx */}
        
        {/* {currentPage === "playbookRules" && (
          <PlaybookRulesPage onBack={() => navigateTo("library")} />
        )} */}

        {/* NOTE 11-28-2025: Added route for Review with Precedents (Module 3) */}
        {currentPage === "precedent-comparison" && <PrecedentComparisonIndex />}
        {currentPage === "redraft" && <RedraftIndex />}
        {currentPage === "redomicile" && <RedomicileIndex />}
        {currentPage === "ask" && <AskPage />}
        {currentPage === "check-definitions" && <CheckDefinitionsIndex />}
        {currentPage === "translation" && <TranslationPage />}
        {currentPage === "negotiation" && <NegotiationPage />}
        {currentPage === "clause-library" && <ClauseLibraryPage />}
        {currentPage === "create-clause" && <CreateClausePage />}
        {currentPage === "extract-clause" && <ExtractClausePage />}
        {currentPage === "draft-clause" && <DraftClausePage />}
        {currentPage === "draft-from-scratch" && <DraftFromScratchPage />}
        {currentPage === "redaction" && <RedactionPage />}
        {currentPage === "summary" && <SummaryPage />}
        {currentPage === "summary-scope" && (
          <SummaryAnnotationScope onBack={() => navigateTo("menu")} />
        )}
        {currentPage === "document-versions" && <DocumentVersionControlPanel />}
      </div>
      {/* Expandable Action Menu - shown on all pages except its own action targets */}
      {showExpandableMenu && (
        <ExpandableActionMenu
          selectedText={selectedText || null}
          hasSelection={hasSelection}
          onCheckDefinitions={handleCheckDefinitions}
          onPolish={handlePolish}
          onTranslate={handleTranslate}
          onSaveClause={handleSaveClause}
          onAskAI={handleAskAI}
        />
      )}

      {/* Save Clause Dialog (triggered from the selection dialog) */}
      {showSaveClauseDialog && clauseTextToSave && (
        <SaveClauseDialog
          clauseText={clauseTextToSave}
          onClose={() => {
            setShowSaveClauseDialog(false);
            setClauseTextToSave(null);
          }}
          onSave={() => {
            setShowSaveClauseDialog(false);
            setClauseTextToSave(null);
            toast({ title: "Saved", description: "Clause saved to library." });
          }}
        />
      )}
    </MainLayout>
  );
};

// AppContent wrapper that adds the new providers from partner's branch
const AppContent = () => {
  return (
    <ErrorProvider>
      <ErrorBoundaryWrapper>
        <LanguageProvider>
          <UserProvider>
            <ThinkAIProvider>
              <NotificationProvider>
                <DocumentAnnotationsProvider>
                  <AppContentInner />
                </DocumentAnnotationsProvider>
              </NotificationProvider>
            </ThinkAIProvider>
          </UserProvider>
        </LanguageProvider>
      </ErrorBoundaryWrapper>
    </ErrorProvider>
  );
};

const App = () => {
  const [showSignup, setShowSignup] = React.useState(false);
  const [showForgotPassword, setShowForgotPassword] = React.useState(false);
  const [resetToken, setResetToken] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [user, setUser] = React.useState<any>(null);
  const [subscription, setSubscription] = React.useState<Subscription | null>(null);
  const [showPaymentScreen, setShowPaymentScreen] = React.useState(false);
  const [isNewAccount, setIsNewAccount] = React.useState(false);
  const [isRestartSubscription, setIsRestartSubscription] = React.useState(false);
  const [showFixPayment, setShowFixPayment] = React.useState(false);
  const [checkingAuth, setCheckingAuth] = React.useState(false);
  const bypassLogin = process.env.BYPASS_LOGIN === "true";

  // Check for reset token in URL on mount
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    if (token) {
      setResetToken(token);
    }
  }, []);

  React.useEffect(() => {
    authService.setupDevAuth().catch(console.warn);
  }, []); 

  // Check subscription status when user/subscription changes
  React.useEffect(() => {
    const checkAuthAndSubscription = async () => {
      if (bypassLogin) {
        console.log("Bypass login");
        const jwtToken = localStorage.getItem('authToken') ||
            localStorage.getItem('token') ||
            localStorage.getItem('jwt') ||
            localStorage.getItem('accessToken') ||
            localStorage.getItem('dev_api_token');

        if (!jwtToken) {
          alert('No authentication token found.');
          setIsLoading(false);
          setCheckingAuth(false);
          return;
        }
        setIsLoading(false);
        setCheckingAuth(false);
        return;
      }

      setIsLoading(true);
      setCheckingAuth(true);

      try {
          const token = backendApi.getAuthToken();
          if (!token) {
              console.log('🔒 No token found, showing login page');
              setUser(null);
              setSubscription(null);
              setShowPaymentScreen(false);
              setShowFixPayment(false);
              setShowSignup(false);
              setShowForgotPassword(false);
              setIsLoading(false);
              setCheckingAuth(false);
              return;
          }

          // Get user info from /api/auth/me
          console.log('🔍 Checking user info...');
          const meResponse = await backendApi.getMe();
          const userData = meResponse.data;
          setUser(userData);

          // Check if subscription exists
          // Allow users to use the app even without subscription (like web app)
          if (!userData.subscription?.id) {
              console.log('⚠️ No active subscription, allowing access anyway');
              setSubscription(null);
              setShowPaymentScreen(false);
              setShowFixPayment(false);
              setIsLoading(false);
              setCheckingAuth(false);
              return;
          }
          // Use subscription object from response
          console.log('✅ Using subscription from user data');
          const subscriptionData = userData.subscription;
          setSubscription(subscriptionData);

          // Commented out: expiresAt/endDate validation/checking
          // Check if subscription has expired (endDate has passed)
          // if (subscriptionData.endDate) {
          //   const endDate = new Date(subscriptionData.endDate);
          //   const now = new Date();
          //
          //   // Add a small buffer (1 minute) to account for time differences
          //   const bufferMs = 60 * 1000; // 1 minute
          //   const isExpired = endDate.getTime() + bufferMs < now.getTime();
          //
          //   if (isExpired) {
          //     console.log('⏰ Subscription has expired (endDate passed), showing payment screen');
          //     console.log(`   End date: ${endDate.toISOString()}, Current: ${now.toISOString()}`);
          //     setShowPaymentScreen(true);
          //     setIsRestartSubscription(true);
          //     setShowFixPayment(false);
          //     setIsLoading(false);
          //     setCheckingAuth(false);
          //     return;
          //   }
          // }

          // Evaluate subscription status
          switch (subscriptionData.status) {
              case 'active':
                  console.log('✅ Subscription active, unlocking app');
                  setShowPaymentScreen(false);
                  setShowFixPayment(false);
                  break;
              case 'trialing':
                  console.log('🎉 Subscription trialing, unlocking app with banner');
                  setShowPaymentScreen(false);
                  setShowFixPayment(false);
                  break;
              case 'past_due':
                  console.log('⚠️ Subscription past due, showing fix payment');
                  setShowPaymentScreen(false);
                  setShowFixPayment(true);
                  break;
              case 'canceled':
                  console.log('❌ Subscription canceled, showing restart subscription');
                  setShowPaymentScreen(true);
                  setIsRestartSubscription(true);
                  setShowFixPayment(false);
                  break;
              default:
                  console.log('⚠️ Unknown subscription status, showing payment screen');
                  setShowPaymentScreen(true);
          }
      }
      catch (error) {
            console.error('Error checking auth/subscription:', error);
            // On error, show login
            backendApi.clearAuthToken();
            setUser(null);
            setSubscription(null);
            setShowPaymentScreen(false);
            setShowFixPayment(false);
      } finally {
            setIsLoading(false);
            setCheckingAuth(false);
      }
    };

    checkAuthAndSubscription();
  }, [bypassLogin]);

    // Commented out: expiresAt/endDate validation/checking
    // Helper function to check if subscription has expired
    const isSubscriptionExpired = React.useCallback((_sub: Subscription): boolean => {
        // if (!sub.endDate) {
        //   return false; // If no endDate, assume not expired
        // }
        //
        // const endDate = new Date(sub.endDate);
        // const now = new Date();
        //
        // // Add a small buffer (1 minute) to account for time differences
        // const bufferMs = 60 * 1000; // 1 minute
        // return endDate.getTime() + bufferMs < now.getTime();
        return false; // Always return false (no expiration check)
    }, []);

    // Helper function to handle subscription status
    const handleSubscriptionStatus = React.useCallback((sub: Subscription) => {
        // Commented out: expiresAt/endDate validation/checking
        // Check if subscription has expired first
        // if (isSubscriptionExpired(sub)) {
        //   console.log('⏰ Subscription expired (endDate passed), showing payment screen');
        //   setShowPaymentScreen(true);
        //   setIsRestartSubscription(true);
        //   setShowFixPayment(false);
        //   return;
        // }

        switch (sub.status) {
            case 'active':
                setShowPaymentScreen(false);
                setShowFixPayment(false);
                setIsRestartSubscription(false);
                break;
            case 'trialing':
                setShowPaymentScreen(false);
                setShowFixPayment(false);
                break;
            case 'past_due':
                setShowPaymentScreen(false);
                setShowFixPayment(true);
                break;
            case 'canceled':
                setShowPaymentScreen(true);
                setIsRestartSubscription(true);
                setShowFixPayment(false);
                break;
        }
    }, []);

    // Re-check subscription after payment dialog closes
    const handlePaymentComplete = React.useCallback(async () => {
        setShowPaymentScreen(false);
        setIsLoading(true);

        try {
            // Re-check user info
            const meResponse = await backendApi.getMe();
            const userData = meResponse.data;
            setUser(userData);

            if (!userData.subscription?.id) {
                // Still no subscription, but allow access anyway (like web app)
                setSubscription(null);
                setShowPaymentScreen(false);
                setShowFixPayment(false);
                setIsLoading(false);
                return;
            }

            // Use subscription from response
            const subscriptionData = userData.subscription;
            setSubscription(subscriptionData);

            // Evaluate subscription status
            handleSubscriptionStatus(subscriptionData);
        } catch (error) {
            console.error('Error re-checking subscription:', error);
        } finally {
            setIsLoading(false);
        }
    }, [handleSubscriptionStatus]);


    if (bypassLogin) {
        return (
            <NavigationProvider initialPage="menu">
                <ToastProvider>
                    <AppContent />
                </ToastProvider>
            </NavigationProvider>
        );
    }

    // Show loading spinner while checking auth or subscription
    if (isLoading || checkingAuth) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh'
            }}>
                <div>Loading...</div>
            </div>
        );
    }

    // Show login screen if not authenticated
    if (!user) {
        console.log('🔒 Rendering login page - user is null');
        // Show reset password if token is present
        if (resetToken) {
            return (
                <ToastProvider>
                    <ResetPassword
                        token={resetToken}
                        onBack={() => {
                            setResetToken(null);
                            // Clear token from URL
                            window.history.replaceState({}, '', window.location.pathname);
                        }}
                        onSuccess={() => {
                            setResetToken(null);
                            // Clear token from URL
                            window.history.replaceState({}, '', window.location.pathname);
                        }}
                    />
                </ToastProvider>
            );
        }

        // Show forgot password screen
        if (showForgotPassword) {
            return (
                <ToastProvider>
                    <ForgotPassword
                        onBack={() => setShowForgotPassword(false)}
                    />
                </ToastProvider>
            );
        }

        // Show signup screen
        if (showSignup) {
            return (
                <ToastProvider>
                    <CreateAccount
                        onBack={() => setShowSignup(false)}
                        onAccountCreated={async (email) => {
                            console.log('Account created:', email);
                            // After account creation, automatically log in the user
                            // (the token is already stored by the register method)
                            setIsLoading(true);
                            try {
                                const meResponse = await backendApi.getMe();
                                const newUserData = meResponse.data;
                                setUser(newUserData);
                                
                                // Set subscription if it exists, but don't block access
                                // Allow users to use the app even without subscription (like web app)
                                if (newUserData.subscription?.id) {
                                    const subscriptionData = newUserData.subscription;
                                    setSubscription(subscriptionData);
                                    handleSubscriptionStatus(subscriptionData);
                                } else {
                                    // No subscription - allow access
                                    setSubscription(null);
                                    setShowPaymentScreen(false);
                                    setShowFixPayment(false);
                                }
                                setShowSignup(false);
                            } catch (error) {
                                console.error('Error after account creation:', error);
                                // On error, just return to login
                                setShowSignup(false);
                            } finally {
                                setIsLoading(false);
                            }
                        }}
                        onForgotPassword={() => console.log('Forgot password clicked')}
                    />
                </ToastProvider>
            );
        }

        // Show login screen
        return (
            <ToastProvider>
                <Login
                    onLoginSuccess={async (userData) => {
                        console.log('Login successful:', userData);
                        // Re-check auth and subscription
                        setIsLoading(true);
                        try {
                            const meResponse = await backendApi.getMe();
                            const newUserData = meResponse.data;
                            setUser(newUserData);

                            // Set subscription if it exists, but don't block access if it doesn't
                            // Allow users to use the app even without subscription (like web app)
                            if (newUserData.subscription?.id) {
                                const subscriptionData = newUserData.subscription;
                                setSubscription(subscriptionData);
                                handleSubscriptionStatus(subscriptionData);
                            } else {
                                // No subscription - allow access but set subscription to null
                                setSubscription(null);
                                setShowPaymentScreen(false);
                                setShowFixPayment(false);
                            }
                        } catch (error) {
                            console.error('Error after login:', error);
                        } finally {
                            setIsLoading(false);
                        }
                    }}
                    onCreateAccount={() => setShowSignup(true)}
                    onForgotPassword={() => setShowForgotPassword(true)}
                />
            </ToastProvider>
        );
    }


    // Show fix payment screen if subscription is past_due
    if (showFixPayment && subscription) {
        return (
            <ToastProvider>
                <FixPaymentPage portalUrl={subscription.portal_url || 'https://google.com'} />
            </ToastProvider>
        );
}

    // Show payment screen if subscription is inactive or canceled
    if (showPaymentScreen) {
        return (
            <ToastProvider>
                <SubscriptionPage
                    onPaymentComplete={handlePaymentComplete}
                    isNewAccount={isNewAccount}
                    isRestartSubscription={isRestartSubscription}
                />
            </ToastProvider>
        );
    }

    // Show main app when authenticated and subscription is active/trialing
    return (
        <NavigationProvider initialPage="menu">
            <ToastProvider>
                {subscription?.status === 'trialing' && (
                    <TrialBanner trialEndDate={subscription.trialEndDate} position="top" />
                )}
                <AppContent />
            </ToastProvider>
        </NavigationProvider>
    );
};

export default App;
