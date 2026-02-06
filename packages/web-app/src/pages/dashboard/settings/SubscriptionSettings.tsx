import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle, CreditCard, Users, Calendar, CheckCircle, XCircle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import adminApi, { SubscriptionInfo } from "@/services/adminApi";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://localhost:3003';

function getStatusColor(status: string): string {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'trialing':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case 'cancelled':
    case 'expired':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'active':
      return <CheckCircle className="h-4 w-4" />;
    case 'trialing':
      return <Clock className="h-4 w-4" />;
    case 'cancelled':
    case 'expired':
      return <XCircle className="h-4 w-4" />;
    default:
      return <Clock className="h-4 w-4" />;
  }
}

function formatDate(dateString: string | undefined): string {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function SubscriptionSettings() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  
  const [currentSubscription, setCurrentSubscription] = useState<any>(null);
  const [organizationSubscriptions, setOrganizationSubscriptions] = useState<SubscriptionInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingOrg, setIsLoadingOrg] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUpgrading, setIsUpgrading] = useState(false);

  const fetchCurrentSubscription = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/api/subscriptions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Get the most recent subscription
        const subs = data.data || [];
        if (subs.length > 0) {
          setCurrentSubscription(subs[0]);
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error?.message || "Failed to load subscription");
      }
    } catch (err) {
      setError("Failed to load subscription");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchOrganizationSubscriptions = useCallback(async () => {
    if (!isAdmin) return;
    
    setIsLoadingOrg(true);
    try {
      const response = await adminApi.listOrganizationSubscriptions();
      if (response.success && response.data) {
        setOrganizationSubscriptions(response.data);
      }
    } catch (err) {
      console.error("Failed to load organization subscriptions:", err);
    } finally {
      setIsLoadingOrg(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchCurrentSubscription();
    fetchOrganizationSubscriptions();
  }, [fetchCurrentSubscription, fetchOrganizationSubscriptions]);

  const handleUpgrade = async () => {
    setIsUpgrading(true);
    
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/api/subscriptions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscriptionType: 'professional',
          billingPeriod: 'monthly',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.url) {
          // Redirect to Stripe checkout
          window.location.href = data.url;
        } else {
          toast({
            title: "Subscription started",
            description: "Your subscription has been created",
          });
          fetchCurrentSubscription();
        }
      } else {
        const errorData = await response.json();
        toast({
          title: "Failed to start subscription",
          description: errorData.error?.message || "An error occurred",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Failed to start subscription",
        description: "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsUpgrading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!currentSubscription) return;
    if (!confirm("Are you sure you want to cancel your subscription?")) return;

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/api/subscriptions/${currentSubscription.id}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: "User requested cancellation",
        }),
      });

      if (response.ok) {
        toast({
          title: "Subscription cancelled",
          description: "Your subscription has been cancelled",
        });
        fetchCurrentSubscription();
      } else {
        const errorData = await response.json();
        toast({
          title: "Failed to cancel subscription",
          description: errorData.error?.message || "An error occurred",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Failed to cancel subscription",
        description: "An error occurred",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-foreground">Subscription</h1>
        <p className="text-muted-foreground mt-1">
          Manage your subscription and billing
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <Card>
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
            <p className="text-destructive">{error}</p>
            <Button variant="outline" className="mt-4" onClick={fetchCurrentSubscription}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Current Subscription Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Your Subscription
              </CardTitle>
              <CardDescription>
                View and manage your current subscription plan
              </CardDescription>
            </CardHeader>
            <CardContent>
              {currentSubscription ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-semibold capitalize">
                          {currentSubscription.subscriptionType} Plan
                        </span>
                        <Badge className={getStatusColor(currentSubscription.status)}>
                          <span className="flex items-center gap-1">
                            {getStatusIcon(currentSubscription.status)}
                            {currentSubscription.status}
                          </span>
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {currentSubscription.billingPeriod} billing
                      </p>
                    </div>
                    <div className="text-right">
                      {currentSubscription.amount && (
                        <p className="text-lg font-semibold">
                          ${currentSubscription.amount} / {currentSubscription.billingPeriod === 'monthly' ? 'mo' : currentSubscription.billingPeriod}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Calendar className="h-4 w-4" />
                        <span className="text-sm">Start Date</span>
                      </div>
                      <p className="font-medium">{formatDate(currentSubscription.startDate)}</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Calendar className="h-4 w-4" />
                        <span className="text-sm">Renewal Date</span>
                      </div>
                      <p className="font-medium">{formatDate(currentSubscription.endDate)}</p>
                    </div>
                  </div>

                  {currentSubscription.status === 'active' && (
                    <div className="flex justify-end pt-4">
                      <Button variant="outline" onClick={handleCancelSubscription}>
                        Cancel Subscription
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Active Subscription</h3>
                  <p className="text-muted-foreground mb-4">
                    Upgrade to a paid plan to unlock all features.
                  </p>
                  <Button onClick={handleUpgrade} disabled={isUpgrading}>
                    {isUpgrading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Upgrade to Professional
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Organization Subscriptions (Admin Only) */}
          {isAdmin && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Organization Subscriptions
                </CardTitle>
                <CardDescription>
                  View subscriptions for all users in your organization
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingOrg ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : organizationSubscriptions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No subscriptions found in your organization.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {organizationSubscriptions.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div>
                          <p className="font-medium">{item.user.email}</p>
                          {item.user.name && (
                            <p className="text-sm text-muted-foreground">{item.user.name}</p>
                          )}
                        </div>
                        <div className="text-right">
                          {item.subscription ? (
                            <div className="flex items-center gap-2">
                              <Badge className={getStatusColor(item.subscription.status)}>
                                {item.subscription.status}
                              </Badge>
                              <span className="text-sm capitalize">
                                {item.subscription.subscriptionType}
                              </span>
                            </div>
                          ) : (
                            <Badge variant="outline">No subscription</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}


