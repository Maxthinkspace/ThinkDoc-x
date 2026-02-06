import { NavLink, useLocation } from "react-router-dom";
import { Database, Users, Home, LogOut, MessageSquare, Settings, ChevronDown, CreditCard, UserCog, Key, HelpCircle, FolderOpen, BookOpen } from "lucide-react";
import { 
  Sidebar, 
  SidebarContent, 
  SidebarGroup, 
  SidebarGroupContent, 
  SidebarMenu, 
  SidebarMenuItem, 
  SidebarMenuButton,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";

const products = [
  { 
    title: "Assistant", 
    url: "/dashboard/assistant", 
    icon: MessageSquare,
  },
  { 
    title: "Vault", 
    url: "/dashboard/vault", 
    icon: Database,
  },
  { 
    title: "Spaces", 
    url: "/dashboard", 
    icon: FolderOpen,
  },
  { 
    title: "Workflows", 
    url: "/dashboard/workflow", 
    icon: Users,
  },
  { 
    title: "Library", 
    url: "/dashboard/library", 
    icon: BookOpen,
  },
];

interface SettingsItem {
  title: string;
  url: string;
  icon?: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}

const settingsItems: SettingsItem[] = [
  { title: "Profile", url: "/dashboard/settings/profile" },
  { title: "Subscription", url: "/dashboard/settings/subscription", icon: CreditCard },
  { title: "Models", url: "/dashboard/settings/models" },
  { title: "Knowledge", url: "/dashboard/settings/knowledge" },
  { title: "Integrations", url: "/dashboard/settings/integrations" },
  { title: "Users", url: "/dashboard/settings/users", icon: UserCog, adminOnly: true },
  { title: "Teams", url: "/dashboard/settings/groups", icon: Users, adminOnly: false },
];

export function DashboardSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { logout, user, isAdmin, hasRole } = useAuth();
  const isSuperAdmin = hasRole('superadmin');
  const currentPath = location.pathname;
  const [settingsOpen, setSettingsOpen] = useState(
    currentPath.startsWith("/dashboard/settings")
  );
  const [adminOpen, setAdminOpen] = useState(
    currentPath.startsWith("/dashboard/admin")
  );

  const isActive = (path: string) => {
    if (path === "/dashboard") {
      return currentPath === "/dashboard";
    }
    return currentPath.startsWith(path);
  };

  const getNavCls = (isActiveItem: boolean) =>
    isActiveItem 
      ? "bg-sidebar-accent text-foreground font-medium" 
      : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground";

  const handleSignOut = async () => {
    await logout();
  };

  // Filter settings items based on admin role
  const visibleSettingsItems = settingsItems.filter(item => 
    !item.adminOnly || isAdmin
  );

  // Super Admin menu items
  const superAdminItems = [
    { title: "Dashboard", url: "/dashboard/admin", icon: Home },
    { title: "All Users", url: "/dashboard/admin/users", icon: Users },
    { title: "Organizations", url: "/dashboard/admin/organizations", icon: Database },
    { title: "Subscriptions", url: "/dashboard/admin/subscriptions", icon: CreditCard },
  ];

  // Get user initials for avatar
  const getUserInitials = () => {
    if (user?.name) {
      return user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return 'U';
  };

  const getDisplayName = () => {
    if (user?.name) {
      return user.name.split(' ')[0]; // First name only
    }
    if (user?.email) {
      return user.email.split('@')[0];
    }
    return 'User';
  };

  return (
    <Sidebar className={collapsed ? "w-14" : "w-52"} collapsible="icon">
      <SidebarHeader className="px-3 py-4">
        <div className="flex items-center gap-2">
          <img src="/thinkspace-logo.png" alt="ThinkSpace" className="h-7 w-7 object-contain" />
          {!collapsed && (
            <span className="text-sm font-medium text-foreground tracking-tight">ThinkSpace</span>
          )}
        </div>
        {!collapsed && (
          <Button variant="outline" size="sm" className="w-full mt-3 h-8 text-xs font-medium">
            Create
          </Button>
        )}
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {products.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="h-9">
                    <NavLink 
                      to={item.url} 
                      end={item.url === "/dashboard"}
                      className={({ isActive }) => `flex items-center gap-2.5 px-2.5 py-2 rounded-md transition-colors ${getNavCls(isActive)}`}
                    >
                      <item.icon className="h-4 w-4 flex-shrink-0" />
                      {!collapsed && (
                        <span className="text-[13px] font-normal">{item.title}</span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border px-2 py-3">
        <div className="space-y-0.5">
          {/* Super Admin Section */}
          {isSuperAdmin && (
            <Collapsible open={adminOpen} onOpenChange={setAdminOpen}>
              <CollapsibleTrigger asChild>
                <button 
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground transition-colors ${collapsed ? 'justify-center' : ''}`}
                >
                  <Key className="h-4 w-4" />
                  {!collapsed && (
                    <>
                      <span className="text-[13px] font-normal flex-1 text-left">Super Admin</span>
                      <ChevronDown className={`h-3.5 w-3.5 transition-transform ${adminOpen ? "rotate-180" : ""}`} />
                    </>
                  )}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-1 ml-2 space-y-0.5">
                  {superAdminItems.map((item) => (
                    <NavLink
                      key={item.title}
                      to={item.url}
                      className={({ isActive }) => 
                        `flex items-center gap-2 px-2.5 py-1.5 rounded-md transition-colors text-xs ${getNavCls(isActive)}`
                      }
                    >
                      {item.icon && <item.icon className="h-3.5 w-3.5" />}
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
          
          {/* Settings */}
          <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
            <CollapsibleTrigger asChild>
              <button 
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground transition-colors ${collapsed ? 'justify-center' : ''}`}
              >
                <Settings className="h-4 w-4" />
                {!collapsed && (
                  <>
                    <span className="text-[13px] font-normal flex-1 text-left">Settings</span>
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${settingsOpen ? "rotate-180" : ""}`} />
                  </>
                )}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-1 ml-2 space-y-0.5">
                {visibleSettingsItems.map((item) => (
                  <NavLink
                    key={item.title}
                    to={item.url}
                    className={({ isActive }) => 
                      `flex items-center gap-2 px-2.5 py-1.5 rounded-md transition-colors text-xs ${getNavCls(isActive)}`
                    }
                  >
                    {item.icon ? (
                      <item.icon className="h-3.5 w-3.5" />
                    ) : (
                      <Settings className="h-3.5 w-3.5" />
                    )}
                    {!collapsed && <span>{item.title}</span>}
                  </NavLink>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Help */}
          <NavLink
            to="/dashboard/help"
            className={({ isActive }) => 
              `flex items-center gap-2.5 px-2.5 py-2 rounded-md transition-colors ${getNavCls(isActive)} ${collapsed ? 'justify-center' : ''}`
            }
          >
            <HelpCircle className="h-4 w-4" />
            {!collapsed && <span className="text-[13px] font-normal">Help</span>}
          </NavLink>

          {/* Sign Out */}
          <button 
            onClick={handleSignOut}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors ${collapsed ? 'justify-center' : ''}`}
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span className="text-[13px] font-normal">Sign Out</span>}
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
