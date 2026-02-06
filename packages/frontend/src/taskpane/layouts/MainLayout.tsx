import * as React from "react";
import { LayoutDashboard, Lock, Clock, Settings } from "lucide-react";
import { useNavigation, PageType } from "../hooks/use-navigation";
import { useLanguage } from "../contexts/LanguageContext";
import { NotificationBell } from "../components/Notifications/NotificationBell";
import "./MainLayout.css";

interface MainLayoutProps {
  children: React.ReactNode;
}

interface BottomNavItem {
  id: PageType;
  label: string;
  icon: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { currentPage, navigateTo } = useNavigation();
  const { translations } = useLanguage();

  const BOTTOM_NAV_ITEMS: BottomNavItem[] = [
    {
      id: "dashboard",
      label: translations.nav.dashboard,
      icon: <LayoutDashboard size={20} />,
    },
    {
      id: "vault",
      label: translations.nav.vault,
      icon: <Lock size={20} />,
    },
    {
      id: "history",
      label: translations.nav.history,
      icon: <Clock size={20} />,
    },
    {
      id: "setup",
      label: translations.nav.setup,
      icon: <Settings size={20} />,
    },
  ];

  // Determine if current page is a bottom nav page
  const isBottomNavPage = BOTTOM_NAV_ITEMS.some((item) => item.id === currentPage) || currentPage === "menu";
  
  // Map "menu" to "dashboard" for bottom nav
  const activeNavItem = currentPage === "menu" ? "dashboard" : currentPage;

  const handleNavClick = (pageId: PageType) => {
    navigateTo(pageId);
  };

  return (
    <div className="main-layout">
      <div className="main-layout-header">
        <NotificationBell />
      </div>
      <div className="main-layout-content">{children}</div>
      
      {isBottomNavPage ? (
        <nav className="bottom-navigation">
          {BOTTOM_NAV_ITEMS.map((item) => {
            const isActive = activeNavItem === item.id;
            return (
              <button
                key={item.id}
                className={`bottom-nav-item ${isActive ? "active" : ""}`}
                onClick={() => handleNavClick(item.id)}
                aria-label={item.label}
              >
                <div className="bottom-nav-icon">{item.icon}</div>
                <span className="bottom-nav-label">{item.label}</span>
              </button>
            );
          })}
        </nav>
      ) : null}
    </div>
  );
};

