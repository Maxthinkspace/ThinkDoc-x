import * as React from "react";
import { ChevronLeft, User, LogOut, ArrowRight } from "lucide-react";
import { useNavigation } from "../../hooks/use-navigation";
import { useLanguage } from "../../contexts/LanguageContext";
import { useUser } from "../../contexts/UserContext";
import "./styles/ProfilePage.css";

export const ProfilePage: React.FC = () => {
  const { goBack } = useNavigation();
  const { translations } = useLanguage();
  const { user, subscription, logout, isLoading } = useUser();

  const handleSignOut = async () => {
    await logout();
  };

  // Show loading state only when actively loading
  if (isLoading) {
    return (
      <div className="profile-page">
        <div className="profile-header">
          <button className="profile-back-button" onClick={goBack} aria-label="Go back">
            <ChevronLeft size={20} />
          </button>
          <h1 className="profile-title">{translations.profile.title}</h1>
        </div>
        <div className="profile-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
          <div>Loading...</div>
        </div>
      </div>
    );
  }

  // Show error/empty state if no user after loading completes
  if (!user) {
    return (
      <div className="profile-page">
        <div className="profile-header">
          <button className="profile-back-button" onClick={goBack} aria-label="Go back">
            <ChevronLeft size={20} />
          </button>
          <h1 className="profile-title">{translations.profile.title}</h1>
        </div>
        <div className="profile-content" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '200px', padding: '20px' }}>
          <div style={{ textAlign: 'center', color: '#666' }}>
            <p>Unable to load profile information.</p>
            <p style={{ fontSize: '14px', marginTop: '10px' }}>Please ensure you are logged in.</p>
          </div>
        </div>
      </div>
    );
  }

  // Format user name - use email if name is not available
  const displayName = user.name || user.email.split('@')[0] || 'User';
  
  // Format role/company - use organization name if available
  const displayRole = user.organization?.name 
    ? `${user.organization.name.toUpperCase()}`
    : user.email.split('@')[1] 
      ? `${user.email.split('@')[1].split('.')[0].toUpperCase()}`
      : '';

  // Format account ID - use user ID (first 8 chars + last 4 chars for readability)
  const accountId = user.id.length > 12 
    ? `${user.id.substring(0, 8).toUpperCase()}-${user.id.substring(user.id.length - 4).toUpperCase()}`
    : user.id.toUpperCase();

  return (
    <div className="profile-page">
      {/* Header */}
      <div className="profile-header">
        <button className="profile-back-button" onClick={goBack} aria-label="Go back">
          <ChevronLeft size={20} />
        </button>
        <h1 className="profile-title">{translations.profile.title}</h1>
      </div>

      {/* Content */}
      <div className="profile-content">
        {/* Profile Card */}
        <div className="profile-card">
          <div className="profile-avatar">
            <User size={48} />
          </div>
          <div className="profile-name">{displayName}</div>
          {displayRole && (
            <div className="profile-role">{displayRole}</div>
          )}
          {subscription && (
            <div className="profile-role" style={{ marginTop: '4px', fontSize: '12px', opacity: 0.8 }}>
              {subscription.subscriptionType.toUpperCase()} • {subscription.status.toUpperCase()}
            </div>
          )}
        </div>

        {/* Contact & Account Card */}
        <div className="profile-info-card">
          <div className="profile-info-section">
            <div className="profile-info-label">{translations.profile.emailAddress}</div>
            <div className="profile-info-value">{user.email}</div>
          </div>
          <div className="profile-info-section">
            <div className="profile-info-label">{translations.profile.accountId}</div>
            <div className="profile-info-value">{accountId}</div>
          </div>
        </div>

        {/* Sign Out Button */}
        <button className="profile-signout-button" onClick={handleSignOut}>
          <ArrowRight size={18} />
          <span>{translations.profile.signOut}</span>
        </button>
      </div>
    </div>
  );
};

