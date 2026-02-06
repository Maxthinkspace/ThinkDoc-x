import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Search, 
  UserPlus, 
  Loader2, 
  AlertCircle, 
  ChevronLeft, 
  ChevronRight,
  Settings2,
  Plus,
  Trash2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import adminApi, { UserWithRoles, Role } from "@/services/adminApi";

// Permission presets for simpler role creation
const permissionPresets = {
  "full-access": {
    label: "Full Access",
    description: "Can view, edit, and delete everything",
    permissions: [
      "users:read", "users:write", "users:delete",
      "roles:read", "roles:write",
      "subscriptions:read", "subscriptions:write", "subscriptions:delete",
      "vault:read", "vault:write", "vault:delete",
      "library:read", "library:write", "library:delete",
      "workflows:read", "workflows:write", "workflows:delete",
      "teams:read", "teams:write", "teams:delete",
    ],
  },
  "read-write": {
    label: "Read & Write",
    description: "Can view and edit, but not delete",
    permissions: [
      "users:read", "users:write",
      "roles:read",
      "subscriptions:read",
      "vault:read", "vault:write",
      "library:read", "library:write",
      "workflows:read", "workflows:write",
      "teams:read", "teams:write",
    ],
  },
  "read-only": {
    label: "Read Only",
    description: "Can only view content",
    permissions: [
      "users:read",
      "roles:read",
      "subscriptions:read",
      "vault:read",
      "library:read",
      "workflows:read",
      "teams:read",
    ],
  },
};

export default function UsersRolesSettings() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  
  // --- Users State ---
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  
  // Invite dialog state
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState("user");
  const [isInviting, setIsInviting] = useState(false);
  
  // Edit user dialog state
  const [editUserDialogOpen, setEditUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithRoles | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState("");
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);

  // --- Roles State ---
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoadingRoles, setIsLoadingRoles] = useState(true);

  // Manage roles dialog state
  const [manageRolesOpen, setManageRolesOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleAccess, setNewRoleAccess] = useState<string>("read-only");
  const [isCreatingRole, setIsCreatingRole] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
  const [isDeletingRole, setIsDeletingRole] = useState(false);

  // --- Users Functions ---
  const fetchUsers = useCallback(async (overridePage?: number, overrideSearch?: string) => {
    setIsLoadingUsers(true);
    setUsersError(null);
    
    const currentPage = overridePage !== undefined ? overridePage : page;
    const currentSearch = overrideSearch !== undefined ? overrideSearch : searchTerm;
    
    try {
      const response = await adminApi.listUsers({ page: currentPage, limit: 20, search: currentSearch || undefined });
      
      if (response.success && response.data) {
        setUsers(response.data.users || []);
        setTotalPages(response.data.pagination?.totalPages || 1);
        setTotal(response.data.pagination?.total || 0);
      } else {
        setUsersError(response.error?.message || "Failed to load users");
      }
    } catch (err) {
      setUsersError("Failed to load users");
    } finally {
      setIsLoadingUsers(false);
    }
  }, [page, searchTerm]);

  const fetchRoles = useCallback(async () => {
    setIsLoadingRoles(true);
    
    try {
      const response = await adminApi.listRoles();
      
      if (response.success && response.data) {
        setRoles(response.data);
      }
    } catch (err) {
      console.error("Failed to load roles:", err);
    } finally {
      setIsLoadingRoles(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, [fetchUsers, fetchRoles]);

  // Debounce search
  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(1);
      fetchUsers(1, searchTerm);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchTerm, fetchUsers]);

  const handleInviteUser = async () => {
    if (!inviteEmail) {
      toast({
        title: "Error",
        description: "Email is required",
        variant: "destructive",
      });
      return;
    }

    setIsInviting(true);
    try {
      const response = await adminApi.inviteUser({
        email: inviteEmail,
        name: inviteName || undefined,
        roles: [inviteRole],
      });

      if (response.success) {
        toast({
          title: "User invited",
          description: `Invitation sent to ${inviteEmail}`,
        });
        setInviteDialogOpen(false);
        setInviteEmail("");
        setInviteName("");
        setInviteRole("user");
        setSearchTerm("");
        setPage(1);
        fetchUsers(1, "");
      } else {
        toast({
          title: "Failed to invite user",
          description: response.error?.message || "An error occurred",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Failed to invite user",
        description: "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsInviting(false);
    }
  };

  const handleEditUser = (user: UserWithRoles) => {
    setEditingUser(user);
    setEditName(user.name || "");
    setEditRole(user.roles[0]?.name || "user");
    setEditUserDialogOpen(true);
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    setIsUpdatingUser(true);
    try {
      const updateResponse = await adminApi.updateUser(editingUser.id, {
        name: editName || undefined,
      });

      const roleResponse = await adminApi.assignUserRoles(editingUser.id, [editRole]);

      if (updateResponse.success && roleResponse.success) {
        toast({
          title: "User updated",
          description: "User details have been updated",
        });
        setEditUserDialogOpen(false);
        setEditingUser(null);
        fetchUsers();
      } else {
        toast({
          title: "Failed to update user",
          description: updateResponse.error?.message || roleResponse.error?.message || "An error occurred",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Failed to update user",
        description: "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingUser(false);
    }
  };

  const handleRemoveUser = async (user: UserWithRoles) => {
    if (!confirm(`Are you sure you want to remove ${user.email}?`)) return;

    try {
      const response = await adminApi.removeUser(user.id);

      if (response.success) {
        toast({
          title: "User removed",
          description: `${user.email} has been removed`,
        });
        fetchUsers();
      } else {
        toast({
          title: "Failed to remove user",
          description: response.error?.message || "An error occurred",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Failed to remove user",
        description: "An error occurred",
        variant: "destructive",
      });
    }
  };

  // --- Roles Functions ---
  const handleCreateRole = async () => {
    if (!newRoleName.trim()) {
      toast({
        title: "Error",
        description: "Role name is required",
        variant: "destructive",
      });
      return;
    }

    const permissions = permissionPresets[newRoleAccess as keyof typeof permissionPresets]?.permissions || [];

    setIsCreatingRole(true);
    try {
      const response = await adminApi.createRole({
        name: newRoleName.trim().toLowerCase(),
        permissions: permissions,
      });

      if (response.success) {
        toast({
          title: "Role created",
          description: `Role "${newRoleName}" has been created`,
        });
        setNewRoleName("");
        setNewRoleAccess("read-only");
        fetchRoles();
      } else {
        throw new Error(response.error?.message || "Failed to create role");
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to create role",
        variant: "destructive",
      });
    } finally {
      setIsCreatingRole(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!roleToDelete) return;

    setIsDeletingRole(true);
    try {
      const response = await adminApi.deleteRole(roleToDelete.id);

      if (response.success) {
        toast({
          title: "Role deleted",
          description: `Role "${roleToDelete.name}" has been deleted`,
        });
        setRoleToDelete(null);
        fetchRoles();
      } else {
        throw new Error(response.error?.message || "Failed to delete role");
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to delete role",
        variant: "destructive",
      });
    } finally {
      setIsDeletingRole(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <Card>
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">You need admin permissions to access this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Users</h1>
          <p className="text-muted-foreground mt-1">Manage workspace users and their roles</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setManageRolesOpen(true)}>
            <Settings2 className="h-4 w-4 mr-2" />
            Manage Roles
          </Button>
          <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Invite user
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite New User</DialogTitle>
                <DialogDescription>
                  Send an invitation to add a new user to your organization.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="user@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Name (optional)</Label>
                  <Input
                    id="name"
                    placeholder="John Doe"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={inviteRole} onValueChange={setInviteRole}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role.id} value={role.name}>
                          {role.name.charAt(0).toUpperCase() + role.name.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleInviteUser} disabled={isInviting}>
                  {isInviting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Send Invitation
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {isLoadingUsers ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : usersError ? (
            <div className="text-center py-12">
              <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
              <p className="text-destructive">{usersError}</p>
              <Button variant="outline" className="mt-4" onClick={() => fetchUsers()}>
                Retry
              </Button>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No users found
            </div>
          ) : (
            <div className="space-y-3">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{user.email}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {user.name && (
                        <>
                          <span className="text-sm text-muted-foreground">{user.name}</span>
                          <span className="text-xs text-muted-foreground">·</span>
                        </>
                      )}
                      {user.roles.map((role) => (
                        <Badge
                          key={role.id}
                          variant={role.name === 'admin' ? 'default' : 'outline'}
                        >
                          {role.name.charAt(0).toUpperCase() + role.name.slice(1)}
                        </Badge>
                      ))}
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className={`text-xs ${user.isActive ? 'text-green-600' : 'text-red-500'}`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleEditUser(user)}>
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleRemoveUser(user)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-between items-center mt-6 text-sm text-muted-foreground">
            <span>Showing {users.length} of {total} users</span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span>Page {page} of {totalPages}</span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={editUserDialogOpen} onOpenChange={setEditUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user details and role assignment.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={editingUser?.email || ""} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editName">Name</Label>
              <Input
                id="editName"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editRole">Role</Label>
              <Select value={editRole} onValueChange={setEditRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.name}>
                      {role.name.charAt(0).toUpperCase() + role.name.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUserDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateUser} disabled={isUpdatingUser}>
              {isUpdatingUser && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Roles Dialog */}
      <Dialog open={manageRolesOpen} onOpenChange={setManageRolesOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Roles</DialogTitle>
            <DialogDescription>
              Create and manage available roles for your workspace.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Existing Roles */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Existing Roles</Label>
              {isLoadingRoles ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-2">
                  {roles.map((role) => (
                    <div
                      key={role.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {role.name.charAt(0).toUpperCase() + role.name.slice(1)}
                        </span>
                        {role.isSystem && (
                          <Badge variant="secondary" className="text-xs">System</Badge>
                        )}
                      </div>
                      {!role.isSystem && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive h-8 w-8 p-0"
                          onClick={() => setRoleToDelete(role)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Create New Role */}
            <div className="border-t pt-4 space-y-3">
              <Label className="text-sm font-medium">Create New Role</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Role name"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  className="flex-1"
                />
                <Select value={newRoleAccess} onValueChange={setNewRoleAccess}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full-access">Full Access</SelectItem>
                    <SelectItem value="read-write">Read & Write</SelectItem>
                    <SelectItem value="read-only">Read Only</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  onClick={handleCreateRole} 
                  disabled={isCreatingRole || !newRoleName.trim()}
                  size="icon"
                >
                  {isCreatingRole ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManageRolesOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Role Confirmation Dialog */}
      <AlertDialog open={!!roleToDelete} onOpenChange={(open) => !open && setRoleToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Role</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{roleToDelete?.name}"? Users with this role will need to be reassigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingRole}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRole}
              disabled={isDeletingRole}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletingRole ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
