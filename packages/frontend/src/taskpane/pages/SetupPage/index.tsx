import * as React from "react";
import { User, Users, CreditCard, Globe, Shield, HelpCircle, Bell, LogOut, ChevronRight, ChevronDown, Edit2, Save, X, Plus, Lock } from "lucide-react";
import { useNavigation } from "../../hooks/use-navigation";
import { useLanguage } from "../../contexts/LanguageContext";
import { useUser } from "../../contexts/UserContext";
import { useToast } from "../../hooks/use-toast";
import { libraryApi } from "../../../services/libraryApi";
import RedactAlert from "../MenuPage/components/RedactAlert";
import { ChangePasswordModal } from "./components/ChangePasswordModal";
import "./styles/SetupPage.css";

export const SetupPage: React.FC = () => {
  const { navigateTo } = useNavigation();
  const { translations } = useLanguage();
  const { user, subscription, logout, isLoading, updateUser } = useUser();
  const { toast } = useToast();
  const [redactionEnabled, setRedactionEnabled] = React.useState(false);
  const [isProfileExpanded, setIsProfileExpanded] = React.useState(false);
  const [isEditingProfile, setIsEditingProfile] = React.useState(false);
  const [editName, setEditName] = React.useState("");
  const [editEmail, setEditEmail] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);
  
  // Team & Roles state
  const [isTeamExpanded, setIsTeamExpanded] = React.useState(false);
  const [teams, setTeams] = React.useState<any[]>([]);
  const [selectedTeamId, setSelectedTeamId] = React.useState<string | null>(null);
  const [teamMembers, setTeamMembers] = React.useState<any[]>([]);
  const [isLoadingTeams, setIsLoadingTeams] = React.useState(false);
  const [inviteEmail, setInviteEmail] = React.useState("");
  const [isInviting, setIsInviting] = React.useState(false);
  
  // Change Password Modal state
  const [isChangePasswordOpen, setIsChangePasswordOpen] = React.useState(false);

  const handleLogout = async () => {
    await logout();
  };

  const toggleProfile = () => {
    setIsProfileExpanded(!isProfileExpanded);
    // Reset edit mode when collapsing
    if (isProfileExpanded) {
      setIsEditingProfile(false);
    }
  };

  const toggleTeam = () => {
    setIsTeamExpanded(!isTeamExpanded);
    // Load teams when expanding for the first time
    if (!isTeamExpanded && teams.length === 0) {
      loadTeams();
    }
  };

  const loadTeams = async () => {
    try {
      setIsLoadingTeams(true);
      const teamsList = await libraryApi.getTeams();
      setTeams(teamsList);
      if (teamsList.length > 0 && !selectedTeamId) {
        setSelectedTeamId(teamsList[0].id);
        await loadTeamMembers(teamsList[0].id);
      }
    } catch (error: any) {
      console.error("Failed to load teams:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load teams. Please try again.",
        variant: "error",
      });
    } finally {
      setIsLoadingTeams(false);
    }
  };

  const loadTeamMembers = async (teamId: string) => {
    try {
      const members = await libraryApi.getTeamMembers(teamId);
      setTeamMembers(members);
    } catch (error: any) {
      console.error("Failed to load team members:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load team members. Please try again.",
        variant: "error",
      });
    }
  };

  React.useEffect(() => {
    if (selectedTeamId) {
      loadTeamMembers(selectedTeamId);
    }
  }, [selectedTeamId]);

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'member') => {
    if (!selectedTeamId) return;
    
    try {
      await libraryApi.updateTeamMemberRole(selectedTeamId, userId, newRole);
      await loadTeamMembers(selectedTeamId);
      toast({
        title: "Role updated",
        description: "Member role has been updated successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update role. Please try again.",
        variant: "error",
      });
    }
  };

  const handleInviteMember = async () => {
    if (!inviteEmail || !selectedTeamId) return;
    
    setIsInviting(true);
    try {
      await libraryApi.inviteTeamMember(selectedTeamId, inviteEmail);
      setInviteEmail("");
      await loadTeamMembers(selectedTeamId);
      toast({
        title: "Invitation sent",
        description: `Invitation sent to ${inviteEmail}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to invite member. Please try again.",
        variant: "error",
      });
    } finally {
      setIsInviting(false);
    }
  };

  // Initialize edit values when entering edit mode
  React.useEffect(() => {
    if (isEditingProfile && user) {
      setEditName(user.name || "");
      setEditEmail(user.email || "");
    }
  }, [isEditingProfile, user]);

  const handleStartEdit = () => {
    setIsEditingProfile(true);
  };

  const handleCancelEdit = () => {
    setIsEditingProfile(false);
    setEditName("");
    setEditEmail("");
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      const updates: { name?: string; email?: string } = {};
      if (editName !== user.name) {
        updates.name = editName;
      }
      if (editEmail !== user.email) {
        updates.email = editEmail;
      }

      if (Object.keys(updates).length === 0) {
        setIsEditingProfile(false);
        return;
      }

      await updateUser(updates);
      setIsEditingProfile(false);
      toast({
        title: "Profile updated",
        description: "Your profile has been saved successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile. Please try again.",
        variant: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Format user name for display (matching ProfilePage logic)
  const displayName = user?.name 
    ? user.name.toUpperCase() 
    : user?.email 
      ? user.email.split('@')[0].toUpperCase()
      : 'USER';

  // Format user name for profile card (matching ProfilePage logic)
  const profileDisplayName = user?.name || user?.email?.split('@')[0] || 'User';
  
  // Format role/company - use organization name if available (matching ProfilePage logic)
  const displayRole = user?.organization?.name 
    ? `${user.organization.name.toUpperCase()}`
    : user?.email?.split('@')[1] 
      ? `${user.email.split('@')[1].split('.')[0].toUpperCase()}`
      : '';

  // Format account ID - use user ID (first 8 chars + last 4 chars for readability)
  const accountId = user?.id && user.id.length > 12 
    ? `${user.id.substring(0, 8).toUpperCase()}-${user.id.substring(user.id.length - 4).toUpperCase()}`
    : user?.id?.toUpperCase() || '';

  return (
    <div className="setup-page">
      <div className="setup-content">
        {/* ACCOUNT & IDENTITY Section */}
        <div className="setup-section">
          <h3 className="setup-section-label">{translations.setup.accountIdentity}</h3>
          <div className="setup-card">
            <div className="setup-item" onClick={toggleProfile}>
              <div className="setup-item-icon">
                <User size={20} />
              </div>
              <div className="setup-item-info">
                <div className="setup-item-title">{translations.setup.personalProfile}</div>
                <div className="setup-item-subtitle">{displayName}</div>
              </div>
              {isProfileExpanded ? (
                <ChevronDown size={16} className="setup-item-chevron" />
              ) : (
                <ChevronRight size={16} className="setup-item-chevron" />
              )}
            </div>
            {/* Expandable Profile Content */}
            <div className={`setup-profile-expanded ${isProfileExpanded ? 'expanded' : ''}`}>
              {isLoading ? (
                <div className="setup-profile-loading">Loading...</div>
              ) : user ? (
                <>
                  <div className="setup-profile-card">
                    <div className="setup-profile-avatar">
                      <User size={48} />
                    </div>
                    <div className="setup-profile-name">{profileDisplayName}</div>
                    {displayRole && (
                      <div className="setup-profile-role">{displayRole}</div>
                    )}
                    {subscription && (
                      <div className="setup-profile-role" style={{ marginTop: '4px', fontSize: '12px', opacity: 0.8 }}>
                        {subscription.subscriptionType.toUpperCase()} • {subscription.status.toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="setup-profile-info-card">
                    {isEditingProfile ? (
                      <>
                        <div className="setup-profile-info-section">
                          <div className="setup-profile-info-label">{translations.profile.emailAddress}</div>
                          <input
                            type="email"
                            className="setup-profile-input"
                            value={editEmail}
                            onChange={(e) => setEditEmail(e.target.value)}
                            disabled={isSaving}
                          />
                        </div>
                        <div className="setup-profile-info-section">
                          <div className="setup-profile-info-label">Name</div>
                          <input
                            type="text"
                            className="setup-profile-input"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder="Enter your name"
                            disabled={isSaving}
                          />
                        </div>
                        {accountId && (
                          <div className="setup-profile-info-section">
                            <div className="setup-profile-info-label">{translations.profile.accountId}</div>
                            <div className="setup-profile-info-value">{accountId}</div>
                          </div>
                        )}
                        <div className="setup-profile-actions">
                          <button
                            className="setup-profile-save-button"
                            onClick={handleSaveProfile}
                            disabled={isSaving}
                          >
                            <Save size={16} />
                            <span>{isSaving ? "Saving..." : "Save"}</span>
                          </button>
                          <button
                            className="setup-profile-cancel-button"
                            onClick={handleCancelEdit}
                            disabled={isSaving}
                          >
                            <X size={16} />
                            <span>Cancel</span>
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="setup-profile-info-section">
                          <div className="setup-profile-info-label">{translations.profile.emailAddress}</div>
                          <div className="setup-profile-info-value">{user.email}</div>
                        </div>
                        {user.name && (
                          <div className="setup-profile-info-section">
                            <div className="setup-profile-info-label">Name</div>
                            <div className="setup-profile-info-value">{user.name}</div>
                          </div>
                        )}
                        {accountId && (
                          <div className="setup-profile-info-section">
                            <div className="setup-profile-info-label">{translations.profile.accountId}</div>
                            <div className="setup-profile-info-value">{accountId}</div>
                          </div>
                        )}
                        <div className="setup-profile-actions">
                          <button
                            className="setup-profile-edit-button"
                            onClick={handleStartEdit}
                          >
                            <Edit2 size={16} />
                            <span>Edit Profile</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </>
              ) : (
                <div className="setup-profile-error">
                  <p>Unable to load profile information.</p>
                  <p>Please ensure you are logged in.</p>
                </div>
              )}
            </div>
            <div className="setup-item" onClick={toggleTeam}>
              <div className="setup-item-icon">
                <Users size={20} />
              </div>
              <div className="setup-item-info">
                <div className="setup-item-title">{translations.setup.sharingTeam}</div>
                <div className="setup-item-subtitle">{translations.setup.manageAccess}</div>
              </div>
              {isTeamExpanded ? (
                <ChevronDown size={16} className="setup-item-chevron" />
              ) : (
                <ChevronRight size={16} className="setup-item-chevron" />
              )}
            </div>
            {/* Expandable Team & Roles Content */}
            <div className={`setup-profile-expanded ${isTeamExpanded ? 'expanded' : ''}`}>
              {isLoadingTeams ? (
                <div className="setup-profile-loading">Loading...</div>
              ) : selectedTeamId && teamMembers.length > 0 ? (
                <>
                  <div className="setup-team-members">
                    {teamMembers.map((member) => (
                      <div key={member.userId} className="setup-team-member-item">
                        <div className="setup-team-member-avatar">
                          {member.user.name 
                            ? member.user.name.charAt(0).toUpperCase() 
                            : member.user.email.charAt(0).toUpperCase()}
                        </div>
                        <div className="setup-team-member-info">
                          <div className="setup-team-member-name">
                            {member.user.name || member.user.email}
                          </div>
                          <div className="setup-team-member-email">
                            {member.user.name ? member.user.email : ''}
                          </div>
                        </div>
                        <select
                          className="setup-team-member-role-select"
                          value={member.role}
                          onChange={(e) => handleRoleChange(member.userId, e.target.value as 'admin' | 'member')}
                        >
                          <option value="member">Member</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                    ))}
                  </div>
                  <div className="setup-team-invite">
                    <input
                      type="email"
                      className="setup-team-invite-input"
                      placeholder="Enter email address"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && inviteEmail) {
                          handleInviteMember();
                        }
                      }}
                    />
                    <button
                      className="setup-team-invite-button"
                      onClick={handleInviteMember}
                      disabled={!inviteEmail || isInviting}
                    >
                      <Plus size={16} />
                      <span>{isInviting ? "Inviting..." : "Invite"}</span>
                    </button>
                  </div>
                </>
              ) : selectedTeamId ? (
                <div className="setup-team-empty">
                  <div className="setup-team-empty-message">No team members yet.</div>
                  <div className="setup-team-invite">
                    <input
                      type="email"
                      className="setup-team-invite-input"
                      placeholder="Enter email address"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && inviteEmail) {
                          handleInviteMember();
                        }
                      }}
                    />
                    <button
                      className="setup-team-invite-button"
                      onClick={handleInviteMember}
                      disabled={!inviteEmail || isInviting}
                    >
                      <Plus size={16} />
                      <span>{isInviting ? "Inviting..." : "Invite"}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="setup-profile-error">
                  <p>No teams available.</p>
                  <p>Please contact your administrator.</p>
                </div>
              )}
            </div>
            <div className="setup-item">
              <div className="setup-item-icon">
                <CreditCard size={20} />
              </div>
              <div className="setup-item-info">
                <div className="setup-item-title">{translations.setup.billingPlan}</div>
                <div className="setup-item-subtitle">
                  {subscription 
                    ? `${subscription.subscriptionType.toUpperCase()} • ${subscription.status.toUpperCase()}`
                    : 'NO SUBSCRIPTION'}
                </div>
              </div>
              <ChevronRight size={16} className="setup-item-chevron" />
            </div>
          </div>
        </div>

        {/* SYSTEM PREFERENCES Section */}
        <div className="setup-section">
          <h3 className="setup-section-label">{translations.setup.systemPreferences}</h3>
          <div className="setup-card">
            <div className="setup-item" onClick={() => navigateTo("language")}>
              <div className="setup-item-icon">
                <Globe size={20} />
              </div>
              <div className="setup-item-info">
                <div className="setup-item-title">{translations.setup.language}</div>
                <div className="setup-item-subtitle">{translations.language.english.toUpperCase()}</div>
              </div>
              <ChevronRight size={16} className="setup-item-chevron" />
            </div>
            <div className="setup-item">
              <div className="setup-item-icon">
                <Shield size={20} />
              </div>
              <div className="setup-item-info">
                <div className="setup-item-title">{translations.setup.redactionMasking}</div>
                <div className="setup-item-subtitle">{translations.setup.privacyControls}</div>
              </div>
              <div className="setup-redaction-toggle">
                <RedactAlert 
                  checked={redactionEnabled}
                  onChange={setRedactionEnabled}
                />
              </div>
            </div>
            <div className="setup-item">
              <div className="setup-item-icon">
                <Bell size={20} />
              </div>
              <div className="setup-item-info">
                <div className="setup-item-title">{translations.setup.emailNotifications}</div>
                <div className="setup-item-subtitle">{translations.setup.emailNotificationsSubtitle}</div>
              </div>
              <label className="setup-toggle">
                <input type="checkbox" defaultChecked />
                <span className="setup-toggle-slider"></span>
              </label>
            </div>
            <div className="setup-item" onClick={() => setIsChangePasswordOpen(true)}>
              <div className="setup-item-icon">
                <Lock size={20} />
              </div>
              <div className="setup-item-info">
                <div className="setup-item-title">{translations.setup.changePassword}</div>
                <div className="setup-item-subtitle">{translations.setup.changePasswordSubtitle}</div>
              </div>
              <ChevronRight size={16} className="setup-item-chevron" />
            </div>
          </div>
        </div>

        {/* RESOURCES Section */}
        <div className="setup-section">
          <h3 className="setup-section-label">{translations.setup.resources}</h3>
          <div className="setup-card">
            <div className="setup-item" onClick={() => navigateTo("help-support")}>
              <div className="setup-item-icon">
                <HelpCircle size={20} />
              </div>
              <div className="setup-item-info">
                <div className="setup-item-title">{translations.setup.helpDocumentation}</div>
                <div className="setup-item-subtitle">{translations.setup.helpDocumentationSubtitle}</div>
              </div>
              <ChevronRight size={16} className="setup-item-chevron" />
            </div>
          </div>
        </div>

        {/* Log Out Button */}
        <div className="setup-section">
          <button className="setup-logout-button" onClick={handleLogout}>
            <LogOut size={18} />
            <span>{translations.setup.logOut}</span>
          </button>
        </div>
      </div>
      
      {/* Change Password Modal */}
      <ChangePasswordModal 
        open={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />
    </div>
  );
};

