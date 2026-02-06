import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getIntegrations, updateIntegration, type Integration, type IntegrationType } from "@/services/integrationsApi";
import imanageLogo from "@/assets/imanage Logo.png";

const integrationDefinitions = [
  {
    id: "imanage" as IntegrationType,
    name: "iManage",
    description: "Users can upload files from and export files directly into iManage.",
    color: "bg-blue-600",
  },
  {
    id: "imanage-onprem" as IntegrationType,
    name: "iManage OnPrem",
    description: "Users can upload files from and export files directly into iManage OnPrem.",
    color: "bg-blue-700",
  },
  {
    id: "sharepoint" as IntegrationType,
    name: "SharePoint (with OneDrive)",
    description: "Connect your work account to upload files directly from SharePoint or OneDrive.",
    color: "bg-teal-600",
  },
  {
    id: "googledrive" as IntegrationType,
    name: "Google Drive",
    description: "Users can upload files directly from Google Drive.",
    colors: ["#4285F4", "#34A853", "#FBBC04"],
  },
];

export default function IntegrationsSettings() {
  const queryClient = useQueryClient();

  // Fetch integrations from API
  const { data: integrations = [], isLoading } = useQuery({
    queryKey: ["integrations"],
    queryFn: getIntegrations,
  });

  // Create a map of integration type to integration data
  const integrationsMap = new Map(integrations.map(i => [i.integrationType, i]));

  // Mutation for updating integration
  const updateMutation = useMutation({
    mutationFn: ({ type, enabled, config }: { type: IntegrationType; enabled: boolean; config?: Record<string, unknown> }) =>
      updateIntegration(type, { enabled, config }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
    },
  });

  const toggleIntegration = async (integrationId: IntegrationType) => {
    const existing = integrationsMap.get(integrationId);
    const newEnabled = !existing?.enabled;
    
    await updateMutation.mutateAsync({
      type: integrationId,
      enabled: newEnabled,
      config: existing?.config,
    });
  };

  if (isLoading) {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold text-foreground">Integrations</h1>
          <p className="text-muted-foreground mt-1">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-foreground">Integrations</h1>
        <p className="text-muted-foreground mt-1">
          Allow anyone in your workspace to authenticate into enabled integrations.
        </p>
      </div>

      <div className="space-y-4">
        {integrationDefinitions.map((integrationDef) => {
          const integration = integrationsMap.get(integrationDef.id);
          const isEnabled = integration?.enabled || false;
          const config = integration?.config || {};
          
          return (
            <Card key={integrationDef.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {integrationDef.id === "googledrive" ? (
                        <div className="w-10 h-10 rounded-lg bg-white border flex items-center justify-center shadow-sm">
                          <svg className="w-7 h-7" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
                            <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                            <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
                            <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                            <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                            <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                            <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
                          </svg>
                        </div>
                      ) : integrationDef.id.startsWith("imanage") ? (
                        <div className="w-10 h-10 rounded-lg bg-white border flex items-center justify-center shadow-sm overflow-hidden">
                          <img src={imanageLogo} alt="iManage" className="w-full h-full object-contain" />
                        </div>
                      ) : (
                        <div className={`w-10 h-10 rounded-lg ${integrationDef.color} flex items-center justify-center shadow-sm`}>
                          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                            {integrationDef.id === "sharepoint" && (
                              <path d="M18.5 3h-13C4.12 3 3 4.12 3 5.5v13C3 19.88 4.12 21 5.5 21h13c1.38 0 2.5-1.12 2.5-2.5v-13C21 4.12 19.88 3 18.5 3zM8 17H6v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
                            )}
                          </svg>
                        </div>
                      )}
                      <div>
                        <h3 className="font-semibold text-foreground">{integrationDef.name}</h3>
                        <p className="text-sm text-muted-foreground">{integrationDef.description}</p>
                      </div>
                    </div>
                    
                    {isEnabled && config && (
                      <div className="ml-13 space-y-1 text-sm mt-3">
                        {config.customerId && (
                          <p className="text-muted-foreground">
                            <span className="font-medium">Customer ID:</span> {String(config.customerId)}
                          </p>
                        )}
                        {config.subdomain && (
                          <p className="text-muted-foreground">
                            <span className="font-medium">Subdomain:</span>{" "}
                            <a href={String(config.subdomain)} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                              {String(config.subdomain)}
                            </a>
                          </p>
                        )}
                        {config.resourceUrl && (
                          <p className="text-muted-foreground">
                            <span className="font-medium">Resource URL:</span>{" "}
                            <a href={String(config.resourceUrl)} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                              {String(config.resourceUrl)}
                            </a>
                            <Button variant="link" size="sm" className="ml-2 p-0 h-auto">
                              Edit
                            </Button>
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Button variant="ghost" size="sm">View users</Button>
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={() => toggleIntegration(integrationDef.id)}
                      disabled={updateMutation.isPending}
                    />
                  </div>
                </div>

                {!isEnabled && (
                  <div className="ml-13 mt-4">
                    <Button variant="outline" size="sm">
                      Connect
                    </Button>
                  </div>
                )}

                {isEnabled && (
                  <div className="ml-13 mt-4">
                    <Button variant="outline" size="sm">
                      Link to your work account
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
