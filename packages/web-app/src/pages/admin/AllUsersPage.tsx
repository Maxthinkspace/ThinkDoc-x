import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Edit, Eye } from "lucide-react";
import { superAdminApiClient, UserWithOrg } from "@/services/superadminApi";
import { adminApi, Role } from "@/services/adminApi";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";

export default function AllUsersPage() {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserWithOrg[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedUser, setSelectedUser] = useState<UserWithOrg | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);
  const [editSelectedRoles, setEditSelectedRoles] = useState<string[]>([]);
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, [page, searchTerm]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await superAdminApiClient.listUsers({
        page,
        limit: 50,
        search: searchTerm || undefined,
      });
      if (response.success && response.data) {
        const usersData = response.data.data || [];
        const paginationData = response.data.pagination || {};
        setUsers(Array.isArray(usersData) ? usersData : []);
        setTotalPages(paginationData.totalPages || 1);
      } else {
        throw new Error(response.error?.message || "Failed to fetch users");
      }
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch users",
        variant: "destructive",
      });
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await adminApi.listRoles();
      if (response.success && response.data) {
        setAvailableRoles(response.data);
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  };

  const handleEditUser = async () => {
    if (!selectedUser) return;
    setEditLoading(true);
    try {
      // Update user details
      const updateResponse = await superAdminApiClient.updateUser(selectedUser.id, {
        name: editName,
        isActive: editIsActive,
      });
      
      if (!updateResponse.success) {
        throw new Error(updateResponse.error?.message || "Failed to update user");
      }

      // Assign roles (even if empty array to remove all roles)
      const rolesResponse = await superAdminApiClient.assignUserRoles(
        selectedUser.id,
        editSelectedRoles,
        selectedUser.organizationId || null
      );
      
      if (!rolesResponse.success) {
        throw new Error(rolesResponse.error?.message || "Failed to assign roles");
      }

      toast({
        title: "Success",
        description: `User ${selectedUser.email} updated successfully.`,
      });
      setIsEditDialogOpen(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update user",
        variant: "destructive",
      });
    } finally {
      setEditLoading(false);
    }
  };

  const openEditDialog = async (user: UserWithOrg) => {
    setSelectedUser(user);
    setEditName(user.name || "");
    setEditIsActive(user.isActive);
    setEditSelectedRoles(user.roles || []);
    
    // Fetch available roles if not already fetched
    if (availableRoles.length === 0) {
      await fetchRoles();
    }
    
    setIsEditDialogOpen(true);
  };

  const filteredUsers = users.filter((user) =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto text-center">
        <p>Loading users...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-foreground mb-2">All Users</h1>
        <p className="text-muted-foreground">Manage users across all organizations</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users by email or name..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-3">
            {filteredUsers.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No users found.</p>
            ) : (
              filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{user.name || user.email}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {user.organizationName && (
                        <>
                          <Badge variant="outline">{user.organizationName}</Badge>
                          <span className="text-xs text-muted-foreground">·</span>
                        </>
                      )}
                      {user.roles.map((role) => (
                        <Badge key={role} variant="secondary">{role}</Badge>
                      ))}
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className={`text-xs ${user.isActive ? 'text-green-600' : 'text-red-600'}`}>
                        {user.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    {user.subscription && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        Subscription: {user.subscription.subscriptionType} ({user.subscription.status})
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => openEditDialog(user)}>
                      <Edit className="h-4 w-4 mr-2" /> Edit
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-6">
              <Button
                variant="outline"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Make changes to {selectedUser?.email}'s profile.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-name" className="text-right">
                Name
              </Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="col-span-3"
                disabled={editLoading}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-status" className="text-right">
                Status
              </Label>
              <Select
                value={editIsActive ? "active" : "inactive"}
                onValueChange={(val) => setEditIsActive(val === "active")}
                disabled={editLoading}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right pt-2">
                Roles
              </Label>
              <div className="col-span-3 space-y-2">
                {availableRoles.map((role) => (
                  <div key={role.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`role-${role.id}`}
                      checked={editSelectedRoles.includes(role.name)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setEditSelectedRoles([...editSelectedRoles, role.name]);
                        } else {
                          setEditSelectedRoles(editSelectedRoles.filter(r => r !== role.name));
                        }
                      }}
                      disabled={editLoading}
                    />
                    <label
                      htmlFor={`role-${role.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {role.name}
                      {role.description && (
                        <span className="text-xs text-muted-foreground block">{role.description}</span>
                      )}
                    </label>
                  </div>
                ))}
                {availableRoles.length === 0 && (
                  <p className="text-sm text-muted-foreground">Loading roles...</p>
                )}
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleEditUser} disabled={editLoading}>
              {editLoading ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

