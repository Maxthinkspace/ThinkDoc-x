import * as React from "react";
import { ChevronLeft, Users, MoreVertical, Plus } from "lucide-react";
import { useNavigation } from "../../hooks/use-navigation";
import { useLanguage } from "../../contexts/LanguageContext";
import { libraryApi } from "../../../services/libraryApi";
import "./styles/SharingPage.css";

interface TeamMember {
  userId: string;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  role: string;
}

interface Team {
  id: string;
  name: string;
  description?: string | null;
}

export const SharingPage: React.FC = () => {
  const { goBack } = useNavigation();
  const { translations } = useLanguage();
  const [organization, setOrganization] = React.useState<any>(null);
  const [teams, setTeams] = React.useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = React.useState<string | null>(null);
  const [teamMembers, setTeamMembers] = React.useState<TeamMember[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showInviteDialog, setShowInviteDialog] = React.useState(false);
  const [inviteEmail, setInviteEmail] = React.useState("");
  const [showCreateTeamDialog, setShowCreateTeamDialog] = React.useState(false);
  const [newTeamName, setNewTeamName] = React.useState("");
  const [newTeamDescription, setNewTeamDescription] = React.useState("");

  React.useEffect(() => {
    loadData();
  }, []);

  React.useEffect(() => {
    if (selectedTeam) {
      loadTeamMembers(selectedTeam);
    }
  }, [selectedTeam]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [org, teamsList] = await Promise.all([
        libraryApi.getOrganization(),
        libraryApi.getTeams(),
      ]);
      setOrganization(org);
      setTeams(teamsList);
      if (teamsList.length > 0 && !selectedTeam) {
        setSelectedTeam(teamsList[0].id);
      }
    } catch (error) {
      console.error("Failed to load sharing data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadTeamMembers = async (teamId: string) => {
    try {
      const members = await libraryApi.getTeamMembers(teamId);
      setTeamMembers(members);
    } catch (error) {
      console.error("Failed to load team members:", error);
    }
  };

  const handleInviteMember = async () => {
    if (!inviteEmail || !selectedTeam) return;
    try {
      await libraryApi.inviteTeamMember(selectedTeam, inviteEmail);
      setInviteEmail("");
      setShowInviteDialog(false);
      await loadTeamMembers(selectedTeam);
    } catch (error) {
      console.error("Failed to invite member:", error);
      alert("Failed to invite member. Please try again.");
    }
  };

  const handleCreateTeam = async () => {
    if (!newTeamName) return;
    try {
      const team = await libraryApi.createTeam(newTeamName, newTeamDescription);
      setTeams([...teams, team]);
      setNewTeamName("");
      setNewTeamDescription("");
      setShowCreateTeamDialog(false);
      setSelectedTeam(team.id);
    } catch (error) {
      console.error("Failed to create team:", error);
      alert("Failed to create team. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="sharing-page">
        <div className="sharing-header">
          <button className="sharing-back-button" onClick={goBack} aria-label="Go back">
            <ChevronLeft size={20} />
          </button>
          <h1 className="sharing-title">{translations.sharing.title}</h1>
        </div>
        <div className="sharing-content">
          <div>Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="sharing-page">
      {/* Header */}
      <div className="sharing-header">
        <button className="sharing-back-button" onClick={goBack} aria-label="Go back">
          <ChevronLeft size={20} />
        </button>
        <h1 className="sharing-title">{translations.sharing.title}</h1>
      </div>

      {/* Content */}
      <div className="sharing-content">
        {/* Organization Info */}
        {organization && (
          <div className="sharing-section">
            <h3 className="sharing-section-label">Organization</h3>
            <div className="sharing-card">
              <div className="sharing-org-name">{organization.name}</div>
              <div className="sharing-org-domain">{organization.domain}</div>
            </div>
          </div>
        )}

        {/* Teams Section */}
        <div className="sharing-section">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <h3 className="sharing-section-label">Teams</h3>
            <button
              className="sharing-invite-button"
              onClick={() => setShowCreateTeamDialog(true)}
              style={{ padding: "6px 12px", fontSize: "12px" }}
            >
              <Plus size={14} />
              <span>Create Team</span>
            </button>
          </div>
          {teams.length > 0 ? (
            <div className="sharing-card">
              {teams.map((team) => (
                <div
                  key={team.id}
                  className={`sharing-team-item ${selectedTeam === team.id ? "selected" : ""}`}
                  onClick={() => setSelectedTeam(team.id)}
                  style={{ cursor: "pointer", padding: "12px", border: selectedTeam === team.id ? "2px solid #0078d4" : "1px solid #e1e1e1", marginBottom: "8px", borderRadius: "4px" }}
                >
                  <div className="sharing-team-name">{team.name}</div>
                  {team.description && (
                    <div className="sharing-team-description">{team.description}</div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="sharing-card">
              <div style={{ padding: "20px", textAlign: "center", color: "#666" }}>
                No teams yet. Create your first team to start sharing.
              </div>
            </div>
          )}
        </div>

        {/* Team Members Section */}
        {selectedTeam && (
          <div className="sharing-section">
            <h3 className="sharing-section-label">{translations.sharing.activeTeamAccess}</h3>
            <div className="sharing-card">
              {teamMembers.length > 0 ? (
                teamMembers.map((member) => (
                  <div key={member.userId} className="sharing-member-item">
                    <div className="sharing-member-avatar">
                      {member.user.name ? member.user.name.charAt(0).toUpperCase() : member.user.email.charAt(0).toUpperCase()}
                    </div>
                    <div className="sharing-member-info">
                      <div className="sharing-member-name">{member.user.name || member.user.email}</div>
                      <div className="sharing-member-role">
                        {member.role.toUpperCase()}
                      </div>
                    </div>
                    <button className="sharing-member-menu" aria-label="More options">
                      <MoreVertical size={18} />
                    </button>
                  </div>
                ))
              ) : (
                <div style={{ padding: "20px", textAlign: "center", color: "#666" }}>
                  No members yet.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Invite Member Button */}
        {selectedTeam && (
          <button className="sharing-invite-button" onClick={() => setShowInviteDialog(true)}>
            <Users size={20} />
            <span>{translations.sharing.inviteMember}</span>
          </button>
        )}
      </div>

      {/* Invite Dialog */}
      {showInviteDialog && (
        <div className="sharing-dialog-overlay" onClick={() => setShowInviteDialog(false)}>
          <div className="sharing-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Invite Team Member</h3>
            <input
              type="email"
              placeholder="Email address"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              style={{ width: "100%", padding: "8px", marginBottom: "12px" }}
            />
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button onClick={() => setShowInviteDialog(false)}>Cancel</button>
              <button onClick={handleInviteMember} disabled={!inviteEmail}>Invite</button>
            </div>
          </div>
        </div>
      )}

      {/* Create Team Dialog */}
      {showCreateTeamDialog && (
        <div className="sharing-dialog-overlay" onClick={() => setShowCreateTeamDialog(false)}>
          <div className="sharing-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Create Team</h3>
            <input
              type="text"
              placeholder="Team name"
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              style={{ width: "100%", padding: "8px", marginBottom: "12px" }}
            />
            <textarea
              placeholder="Description (optional)"
              value={newTeamDescription}
              onChange={(e) => setNewTeamDescription(e.target.value)}
              style={{ width: "100%", padding: "8px", marginBottom: "12px", minHeight: "60px" }}
            />
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button onClick={() => setShowCreateTeamDialog(false)}>Cancel</button>
              <button onClick={handleCreateTeam} disabled={!newTeamName}>Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

