import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
// Marketing Pages
import Index from "./pages/Index";
import ThinkDoc from "./pages/products/ThinkDoc";
import ThinkStudio from "./pages/products/ThinkStudio";
import WordAddin from "./pages/WordAddin";
import Pricing from "./pages/Pricing";
import About from "./pages/About";
import Security from "./pages/Security";
import FAQ from "./pages/FAQ";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Blog from "./pages/Blog";
import SecurityBlog from "./pages/SecurityBlog";
import Resources from "./pages/Resources";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Demo from "./pages/Demo";
// Dashboard Layout and Pages
import DashboardLayout from "./layouts/DashboardLayout";
import DashboardHome from "./pages/DashboardHome";
import VaultApp from "./pages/dashboard/VaultApp";
import VaultWorkflowsPage from "./pages/dashboard/VaultWorkflowsPage";
import MAReview from "./pages/dashboard/MAReview";
import { LibraryDashboard } from "./pages/dashboard/LibraryDashboard";
import { DocumentVersionsPage } from "./pages/DocumentVersionsPage";
// Studio Pages
import StudioDashboard from "./pages/studio/StudioDashboard";
import ProjectsPage from "./pages/studio/ProjectsPage";
import ProjectDetailPage from "./pages/studio/ProjectDetailPage";
import WorkflowsPage from "./pages/studio/WorkflowsPage";
// Dashboard pages from thinkspace-web
import WorkflowApp from "./pages/dashboard/WorkflowApp";
import ResearchApp from "./pages/dashboard/ResearchApp";
import JuniorApp from "./pages/dashboard/JuniorApp";
import AssistantApp from "./pages/dashboard/AssistantApp";
import TranslateWorkflowPage from "./pages/dashboard/TranslateWorkflowPage";
import RedactWorkflowPage from "./pages/dashboard/RedactWorkflowPage";
import CircleUpWorkflowPage from "./pages/dashboard/CircleUpWorkflowPage";
import SignaturePageWorkflowPage from "./pages/dashboard/SignaturePageWorkflowPage";
// Settings Pages
import ProfileSettings from "./pages/dashboard/settings/ProfileSettings";
import ModelsSettings from "./pages/dashboard/settings/ModelsSettings";
import KnowledgeSettings from "./pages/dashboard/settings/KnowledgeSettings";
import IntegrationsSettings from "./pages/dashboard/settings/IntegrationsSettings";
import UsersRolesSettings from "./pages/dashboard/settings/UsersRolesSettings";
import GroupsSettings from "./pages/dashboard/settings/GroupsSettings";
import SubscriptionSettings from "./pages/dashboard/settings/SubscriptionSettings";
// Super Admin Pages
import SuperAdminDashboard from "./pages/admin/SuperAdminDashboard";
import AllUsersPage from "./pages/admin/AllUsersPage";
import AllOrganizationsPage from "./pages/admin/AllOrganizationsPage";
import AllSubscriptionsPage from "./pages/admin/AllSubscriptionsPage";
import ProtectedRoute from "./components/ProtectedRoute";
import { AdminRedirect } from "./components/AdminRedirect";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Marketing Routes */}
            <Route path="/" element={<Index />} />
            <Route path="/home" element={<Index />} />
            <Route path="/products/thinkdoc" element={<ThinkDoc />} />
            <Route path="/products/thinkstudio" element={<ThinkStudio />} />
            <Route path="/word-addin" element={<WordAddin />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/about" element={<About />} />
            <Route path="/security" element={<Security />} />
            <Route path="/help" element={<FAQ />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/security-blog" element={<SecurityBlog />} />
            <Route path="/resources" element={<Resources />} />
            <Route path="/demo" element={<Demo />} />
            <Route path="/dashboard-old" element={<Dashboard />} />
            
            {/* Auth Routes */}
            <Route path="/login" element={<Navigate to="/auth" replace />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            
            {/* Redirect /admin/* to /dashboard/admin/* */}
            <Route path="/admin" element={<Navigate to="/dashboard/admin" replace />} />
            <Route path="/admin/*" element={<AdminRedirect />} />
            
            {/* Dashboard with Sidebar Layout */}
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<DashboardHome />} />
              {/* Vault Routes */}
              <Route path="vault" element={<VaultApp />} />
              <Route path="vault/ma-review" element={<MAReview />} />
              <Route path="vault/workflows" element={<VaultWorkflowsPage />} />
              {/* Library & Document Versions */}
              <Route path="library" element={<LibraryDashboard />} />
              <Route path="document-versions" element={<DocumentVersionsPage />} />
              {/* Studio Routes */}
              <Route path="studio" element={<StudioDashboard />} />
              <Route path="projects" element={<ProjectsPage />} />
              <Route path="projects/:projectId" element={<ProjectDetailPage />} />
              <Route path="workflows" element={<WorkflowsPage />} />
              {/* Additional Dashboard Routes from thinkspace-web */}
              <Route path="assistant" element={<AssistantApp />} />
              <Route path="workflow" element={<WorkflowApp />} />
              <Route path="workflow/translate" element={<TranslateWorkflowPage />} />
              <Route path="workflow/redact" element={<RedactWorkflowPage />} />
              <Route path="junior" element={<JuniorApp />} />
              <Route path="junior/circle-up" element={<CircleUpWorkflowPage />} />
              <Route path="junior/signature-pages" element={<SignaturePageWorkflowPage />} />
              <Route path="research" element={<ResearchApp />} />
              {/* Settings Routes */}
              <Route path="settings/profile" element={<ProfileSettings />} />
              <Route path="settings/models" element={<ModelsSettings />} />
              <Route path="settings/knowledge" element={<KnowledgeSettings />} />
              <Route path="settings/integrations" element={<IntegrationsSettings />} />
              <Route path="settings/users" element={<UsersRolesSettings />} />
              <Route path="settings/groups" element={<GroupsSettings />} />
              <Route path="settings/subscription" element={<SubscriptionSettings />} />
              {/* Super Admin Routes - must be before catch-all */}
              <Route
                path="admin"
                element={
                  <ProtectedRoute requiredRoles={['superadmin']} requireAuth={true}>
                    <SuperAdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/users"
                element={
                  <ProtectedRoute requiredRoles={['superadmin']} requireAuth={true}>
                    <AllUsersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/organizations"
                element={
                  <ProtectedRoute requiredRoles={['superadmin']} requireAuth={true}>
                    <AllOrganizationsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/subscriptions"
                element={
                  <ProtectedRoute requiredRoles={['superadmin']} requireAuth={true}>
                    <AllSubscriptionsPage />
                  </ProtectedRoute>
                }
              />
            </Route>
            
            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
