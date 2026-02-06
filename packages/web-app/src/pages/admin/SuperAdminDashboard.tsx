import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { superAdminApiClient, PlatformStats } from "@/services/superadminApi";
import { useToast } from "@/hooks/use-toast";
import { Users, Building2, CreditCard, TrendingUp, UserPlus, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SuperAdminDashboard() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await superAdminApiClient.getStats();
      if (response.success && response.data) {
        setStats(response.data);
      } else {
        throw new Error(response.error?.message || "Failed to fetch stats");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load dashboard statistics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto text-center">
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-8 max-w-7xl mx-auto text-center text-red-500">
        <p>Failed to load dashboard statistics</p>
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Users",
      value: stats.totalUsers,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      onClick: () => navigate("/admin/users"),
    },
    {
      title: "Organizations",
      value: stats.totalOrganizations,
      icon: Building2,
      color: "text-green-600",
      bgColor: "bg-green-50",
      onClick: () => navigate("/admin/organizations"),
    },
    {
      title: "Total Subscriptions",
      value: stats.totalSubscriptions,
      icon: CreditCard,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      onClick: () => navigate("/admin/subscriptions"),
    },
    {
      title: "Active Subscriptions",
      value: stats.activeSubscriptions,
      icon: TrendingUp,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
      onClick: () => navigate("/admin/subscriptions?status=active"),
    },
    {
      title: "Trialing",
      value: stats.trialingSubscriptions,
      icon: AlertCircle,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      onClick: () => navigate("/admin/subscriptions?status=trialing"),
    },
    {
      title: "Recent Signups (7d)",
      value: stats.recentSignups,
      icon: UserPlus,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
      onClick: () => navigate("/admin/users"),
    },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Super Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Platform-wide statistics and management
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.title}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={stat.onClick}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`${stat.bgColor} p-2 rounded-lg`}>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stat.value.toLocaleString()}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => navigate("/admin/users")}
            >
              <Users className="h-4 w-4 mr-2" />
              Manage All Users
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => navigate("/admin/organizations")}
            >
              <Building2 className="h-4 w-4 mr-2" />
              View Organizations
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => navigate("/admin/subscriptions")}
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Manage Subscriptions
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Subscription Status</CardTitle>
            <CardDescription>Current subscription breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Active</span>
                <span className="font-semibold text-emerald-600">
                  {stats.activeSubscriptions}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Trialing</span>
                <span className="font-semibold text-orange-600">
                  {stats.trialingSubscriptions}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Canceled</span>
                <span className="font-semibold text-red-600">
                  {stats.canceledSubscriptions}
                </span>
              </div>
              <div className="pt-2 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Total</span>
                  <span className="font-bold">{stats.totalSubscriptions}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


