import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Bot } from "lucide-react";

const models = [
  {
    id: "gpt",
    name: "GPT",
    description: "General-purpose language model by OpenAI",
    color: "from-emerald-400 to-cyan-400",
    defaultEnabled: true,
  },
  {
    id: "claude",
    name: "Claude",
    description: "Conversational model by Anthropic",
    color: "from-amber-600 to-orange-500",
    defaultEnabled: false,
  },
  {
    id: "gemini",
    name: "Gemini",
    description: "Multimodal model by Google",
    color: "from-blue-500 to-indigo-600",
    defaultEnabled: false,
  },
];

export default function ModelsSettings() {
  const [modelStates, setModelStates] = useState(
    Object.fromEntries(models.map(m => [m.id, m.defaultEnabled]))
  );

  const toggleModel = (modelId: string) => {
    setModelStates(prev => ({ ...prev, [modelId]: !prev[modelId] }));
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-foreground">Models</h1>
        <p className="text-muted-foreground mt-1">Choose which models are available in ThinkSpace</p>
      </div>

      <Card>
        <CardHeader>
          <CardDescription>
            Once enabled, the model is available to all users by default. You can manage or restrict access to specific roles or users from the{" "}
            <Button variant="link" className="p-0 h-auto underline">Users page</Button>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {models.map((model) => (
            <div key={model.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${model.color} flex items-center justify-center shadow-sm`}>
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    {model.id === "gpt" && (
                      <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z"/>
                    )}
                    {model.id === "claude" && (
                      <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5zm0 18.5c-3.64-.89-6.5-4.76-6.5-8.5V8.72l6.5-3.17 6.5 3.17V12c0 3.74-2.86 7.61-6.5 8.5zm-1.5-6.5h3v2h-3v-2zm0-6h3v5h-3V8z"/>
                    )}
                    {model.id === "gemini" && (
                      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                    )}
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    {model.name}
                    {model.defaultEnabled && (
                      <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded">Default</span>
                    )}
                  </h3>
                  <p className="text-sm text-muted-foreground">{model.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm">View users</Button>
                <Switch
                  checked={modelStates[model.id]}
                  onCheckedChange={() => toggleModel(model.id)}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
