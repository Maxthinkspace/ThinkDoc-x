import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { superAdminApiClient, OrganizationWithStats } from "@/services/superadminApi";
import { useToast } from "@/hooks/use-toast";
import { Building2, Users, CreditCard } from "lucide-react";

export default function AllOrganizationsPage() {
  const { toast } = useToast();
  const [organizations, setOrganizations] = useState<OrganizationWithStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    setLoading(true);
    try {
      const response = await superAdminApiClient.listOrganizations();
      if (response.success && response.data) {
        setOrganizations(Array.isArray(response.data) ? response.data : []);
      } else {
        throw new Error(response.error?.message || "Failed to fetch organizations");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch organizations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto text-center">
        <p>Loading organizations...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-foreground mb-2">All Organizations</h1>
        <p className="text-muted-foreground">View all organizations and their statistics</p>
      </div>

      <Card>
        <CardContent className="p-6">
          {organizations.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No organizations found.</p>
          ) : (
            <div className="space-y-4">
              {organizations.map((org) => (
                <div
                  key={org.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                      <p className="font-medium text-foreground text-lg">{org.name}</p>
                    </div>
                    {org.domain && (
                      <p className="text-sm text-muted-foreground mb-2">{org.domain}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {org.userCount} {org.userCount === 1 ? 'user' : 'users'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {org.activeSubscriptionCount} active {org.activeSubscriptionCount === 1 ? 'subscription' : 'subscriptions'}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        Created {new Date(org.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-4 text-sm text-muted-foreground text-center">
        Showing {organizations.length} organization{organizations.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}

