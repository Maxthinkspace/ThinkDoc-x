import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { FileText, Globe } from "lucide-react";

const knowledgeSources = [
  {
    id: "edgar",
    name: "EDGAR",
    description: "Key recurring and event-based filings by public companies",
    icon: FileText,
  },
  {
    id: "websearch",
    name: "Web search",
    description: "Get up-to-date information from the web along with links to relevant sources",
    icon: Globe,
  },
];

export default function KnowledgeSettings() {
  const [sourceStates, setSourceStates] = useState(
    Object.fromEntries(knowledgeSources.map(s => [s.id, true]))
  );

  const toggleSource = (sourceId: string) => {
    setSourceStates(prev => ({ ...prev, [sourceId]: !prev[sourceId] }));
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-foreground">Knowledge</h1>
        <p className="text-muted-foreground mt-1">
          Manage, customize, and add knowledge sources to enrich your firm's research
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardDescription>
            Once enabled, the knowledge source is available to all users with access to the knowledge source. You can manage or restrict access to specific roles or users from the{" "}
            <Button variant="link" className="p-0 h-auto underline">Users page</Button>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {knowledgeSources.map((source) => {
            const Icon = source.icon;
            return (
              <div key={source.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{source.name}</h3>
                    <p className="text-sm text-muted-foreground">{source.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="sm">View users</Button>
                  <Switch
                    checked={sourceStates[source.id]}
                    onCheckedChange={() => toggleSource(source.id)}
                  />
                </div>
              </div>
            );
          })}

          <div className="pt-4 text-center">
            <p className="text-sm text-muted-foreground">
              Some knowledge sources aren't enabled for you yet. Contact your admin for access.{" "}
              <Button variant="link" className="p-0 h-auto underline">Learn more</Button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
