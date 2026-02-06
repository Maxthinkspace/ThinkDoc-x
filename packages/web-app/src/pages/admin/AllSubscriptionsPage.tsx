import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit } from "lucide-react";
import { superAdminApiClient, SubscriptionWithUser } from "@/services/superadminApi";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AllSubscriptionsPage() {
  const { toast } = useToast();
  const [subscriptions, setSubscriptions] = useState<SubscriptionWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [selectedSubscription, setSelectedSubscription] = useState<SubscriptionWithUser | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editStatus, setEditStatus] = useState("");
  const [editAutoRenew, setEditAutoRenew] = useState("true");
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => {
    fetchSubscriptions();
  }, [page, statusFilter]);

  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      const response = await superAdminApiClient.listSubscriptions({
        page,
        limit: 50,
        status: statusFilter || undefined,
      });
      if (response.success && response.data) {
        const subsData = response.data.data || [];
        const paginationData = response.data.pagination || {};
        setSubscriptions(Array.isArray(subsData) ? subsData : []);
        setTotalPages(paginationData.totalPages || 1);
      } else {
        throw new Error(response.error?.message || "Failed to fetch subscriptions");
      }
    } catch (error: any) {
      console.error('Error fetching subscriptions:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch subscriptions",
        variant: "destructive",
      });
      setSubscriptions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSubscription = async () => {
    if (!selectedSubscription) return;
    setEditLoading(true);
    try {
      const response = await superAdminApiClient.updateSubscription(selectedSubscription.id, {
        status: editStatus,
        autoRenew: editAutoRenew === "true",
      });
      if (response.success) {
        toast({
          title: "Success",
          description: `Subscription updated successfully.`,
        });
        setIsEditDialogOpen(false);
        setSelectedSubscription(null);
        fetchSubscriptions();
      } else {
        throw new Error(response.error?.message || "Failed to update subscription");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update subscription",
        variant: "destructive",
      });
    } finally {
      setEditLoading(false);
    }
  };

  const openEditDialog = (subscription: SubscriptionWithUser) => {
    setSelectedSubscription(subscription);
    setEditStatus(subscription.status);
    setEditAutoRenew(String(subscription.autoRenew));
    setIsEditDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'trialing':
        return 'bg-blue-100 text-blue-800';
      case 'past_due':
        return 'bg-yellow-100 text-yellow-800';
      case 'canceled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto text-center">
        <p>Loading subscriptions...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground mb-2">All Subscriptions</h1>
          <p className="text-muted-foreground">Manage subscriptions across all organizations</p>
        </div>
        <Select value={statusFilter} onValueChange={(val) => {
          setStatusFilter(val === "all" ? "" : val);
          setPage(1);
        }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="trialing">Trialing</SelectItem>
            <SelectItem value="past_due">Past Due</SelectItem>
            <SelectItem value="canceled">Canceled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-6">
          {subscriptions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No subscriptions found.</p>
          ) : (
            <div className="space-y-3">
              {subscriptions.map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-medium text-foreground">
                      {sub.userName || sub.userEmail}
                    </p>
                    <p className="text-sm text-muted-foreground">{sub.userEmail}</p>
                    {sub.organizationName && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Organization: {sub.organizationName}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className={getStatusColor(sub.status)}>
                        {sub.status.charAt(0).toUpperCase() + sub.status.slice(1)}
                      </Badge>
                      <Badge variant="outline">{sub.subscriptionType}</Badge>
                      <Badge variant="outline">{sub.billingPeriod}</Badge>
                      {sub.autoRenew && (
                        <Badge variant="secondary">Auto-renew</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date(sub.startDate).toLocaleDateString()} - {sub.endDate ? new Date(sub.endDate).toLocaleDateString() : 'No end date'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => openEditDialog(sub)}>
                      <Edit className="h-4 w-4 mr-2" /> Edit
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

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

      {/* Edit Subscription Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Subscription</DialogTitle>
            <DialogDescription>
              Make changes to the subscription for {selectedSubscription?.userEmail}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-status" className="text-right">
                Status
              </Label>
              <Select value={editStatus} onValueChange={setEditStatus} disabled={editLoading}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="trialing">Trialing</SelectItem>
                  <SelectItem value="past_due">Past Due</SelectItem>
                  <SelectItem value="canceled">Canceled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-autorenew" className="text-right">
                Auto-Renew
              </Label>
              <Select value={editAutoRenew} onValueChange={setEditAutoRenew} disabled={editLoading}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select auto-renew status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Yes</SelectItem>
                  <SelectItem value="false">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleUpdateSubscription} disabled={editLoading}>
              {editLoading ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

