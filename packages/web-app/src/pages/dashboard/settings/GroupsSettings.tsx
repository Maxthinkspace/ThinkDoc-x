import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2, AlertCircle, Users, Trash2, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import adminApi, { Team, TeamMember } from "@/services/adminApi";

export default function GroupsSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Create dialog state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  
  // Team detail dialog state
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [isTeamDialogOpen, setIsTeamDialogOpen] = useState(false);
  
  // Invite member state
  const [inviteEmail, setInviteEmail] = useState("");
  const [isInviting, setIsInviting] = useState(false);

  const fetchTeams = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await adminApi.listTeams();
      
      if (response.success && response.data) {
        setTeams(response.data);
      } else {
        setError(response.error?.message || "Failed to load teams");
      }
    } catch (err) {
      setError("Failed to load teams");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  const handleCreate = async () => {
    if (!groupName.trim()) {
      toast({
        title: "Error",
        description: "Team name is required",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      const response = await adminApi.createTeam({
        name: groupName,
        description: groupDescription || undefined,
      });

      if (response.success) {
        toast({
          title: "Team created",
          description: `${groupName} has been created`,
        });
        setIsCreateDialogOpen(false);
        setGroupName("");
        setGroupDescription("");
        fetchTeams();
      } else {
        toast({
          title: "Failed to create team",
          description: response.error?.message || "An error occurred",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Failed to create team",
        description: "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenTeam = async (team: Team) => {
    setSelectedTeam(team);
    setIsTeamDialogOpen(true);
    setIsLoadingMembers(true);
    
    try {
      const response = await adminApi.getTeamMembers(team.id);
      if (response.success && response.data) {
        setTeamMembers(response.data);
      }
    } catch (err) {
      console.error("Failed to load team members:", err);
    } finally {
      setIsLoadingMembers(false);
    }
  };

  const handleDeleteTeam = async (team: Team) => {
    if (!confirm(`Are you sure you want to delete "${team.name}"?`)) return;

    try {
      const response = await adminApi.deleteTeam(team.id);
      
      if (response.success) {
        toast({
          title: "Team deleted",
          description: `${team.name} has been deleted`,
        });
        fetchTeams();
      } else {
        toast({
          title: "Failed to delete team",
          description: response.error?.message || "An error occurred",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Failed to delete team",
        description: "An error occurred",
        variant: "destructive",
      });
    }
  };

  const handleInviteMember = async () => {
    if (!selectedTeam || !inviteEmail) return;

    setIsInviting(true);
    try {
      const response = await adminApi.inviteTeamMember(selectedTeam.id, {
        email: inviteEmail,
        role: "member",
      });

      if (response.success) {
        toast({
          title: "Member invited",
          description: `${inviteEmail} has been added to the team`,
        });
        setInviteEmail("");
        // Refresh members
        const membersResponse = await adminApi.getTeamMembers(selectedTeam.id);
        if (membersResponse.success && membersResponse.data) {
          setTeamMembers(membersResponse.data);
        }
      } else {
        toast({
          title: "Failed to invite member",
          description: response.error?.message || "An error occurred",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Failed to invite member",
        description: "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = async (member: TeamMember) => {
    if (!selectedTeam) return;
    if (!confirm(`Remove ${member.email} from the team?`)) return;

    try {
      const response = await adminApi.removeTeamMember(selectedTeam.id, member.userId);
      
      if (response.success) {
        toast({
          title: "Member removed",
          description: `${member.email} has been removed from the team`,
        });
        // Refresh members
        const membersResponse = await adminApi.getTeamMembers(selectedTeam.id);
        if (membersResponse.success && membersResponse.data) {
          setTeamMembers(membersResponse.data);
        }
      } else {
        toast({
          title: "Failed to remove member",
          description: response.error?.message || "An error occurred",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Failed to remove member",
        description: "An error occurred",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Teams</h1>
          <p className="text-muted-foreground mt-1">Create and manage teams for collaboration</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create team
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create team</DialogTitle>
              <DialogDescription>
                Create a new team to collaborate with others.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="Name your team"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the purpose of the team"
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={isCreating}>
                {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
              <p className="text-destructive">{error}</p>
              <Button variant="outline" className="mt-4" onClick={fetchTeams}>
                Retry
              </Button>
            </div>
          ) : teams.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No teams yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first team to start collaborating.
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create team
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {teams.map((team) => (
                <div
                  key={team.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => handleOpenTeam(team)}
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{team.name}</p>
                      {team.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {team.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {team.ownerId === user?.id && (
                      <Badge variant="outline">Owner</Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTeam(team);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-between items-center mt-6 text-sm text-muted-foreground">
            <span>{teams.length} teams</span>
          </div>
        </CardContent>
      </Card>

      {/* Team Detail Dialog */}
      <Dialog open={isTeamDialogOpen} onOpenChange={setIsTeamDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{selectedTeam?.name}</DialogTitle>
            <DialogDescription>
              {selectedTeam?.description || "Manage team members"}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex gap-2 mb-4">
              <Input
                placeholder="Enter email to invite"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
              <Button onClick={handleInviteMember} disabled={isInviting || !inviteEmail}>
                {isInviting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
              </Button>
            </div>
            
            <h4 className="font-medium mb-2">Members</h4>
            {isLoadingMembers ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : teamMembers.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4 text-center">
                No members yet. Invite someone to get started.
              </p>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {teamMembers.map((member) => (
                  <div
                    key={member.userId}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{member.email}</p>
                      {member.name && (
                        <p className="text-sm text-muted-foreground">{member.name}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={member.role === 'admin' ? 'default' : 'outline'}>
                        {member.role}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleRemoveMember(member)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTeamDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
