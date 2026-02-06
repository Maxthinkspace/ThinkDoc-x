import { useState, useMemo } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search, UserPlus, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface User {
  id: string;
  email: string;
  name?: string;
  initials?: string;
}

interface AssignmentDropdownProps {
  assignedTo?: string;
  users: User[];
  onAssign: (userId: string | null) => void;
  className?: string;
}

export const AssignmentDropdown = ({
  assignedTo,
  users,
  onAssign,
  className,
}: AssignmentDropdownProps) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const assignedUser = useMemo(
    () => users.find(u => u.id === assignedTo || u.email === assignedTo),
    [users, assignedTo]
  );

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const query = searchQuery.toLowerCase();
    return users.filter(
      u =>
        u.email.toLowerCase().includes(query) ||
        u.name?.toLowerCase().includes(query) ||
        u.initials?.toLowerCase().includes(query)
    );
  }, [users, searchQuery]);

  const getUserInitials = (user: User): string => {
    if (user.initials) return user.initials;
    if (user.name) {
      return user.name
        .split(" ")
        .map(n => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return user.email[0].toUpperCase();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex items-center justify-center w-6 h-6 rounded-full border border-border hover:border-primary transition-colors",
            assignedUser
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-muted text-muted-foreground",
            className
          )}
        >
          {assignedUser ? (
            <span className="text-xs font-medium">{getUserInitials(assignedUser)}</span>
          ) : (
            <UserPlus className="h-3 w-3" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="max-h-64 overflow-y-auto">
          {assignedUser && (
            <div className="p-2 border-b">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() => {
                  onAssign(null);
                  setOpen(false);
                }}
              >
                <X className="h-4 w-4 mr-2" />
                Clear assignment
              </Button>
            </div>
          )}
          {filteredUsers.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No users found
            </div>
          ) : (
            <div className="p-2">
              {filteredUsers.map((user) => (
                <button
                  key={user.id}
                  className={cn(
                    "w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors text-left",
                    assignedTo === user.id || assignedTo === user.email
                      ? "bg-primary/10"
                      : ""
                  )}
                  onClick={() => {
                    onAssign(user.id);
                    setOpen(false);
                    setSearchQuery("");
                  }}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {getUserInitials(user)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {user.name || getUserInitials(user)}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {user.email}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default AssignmentDropdown;


