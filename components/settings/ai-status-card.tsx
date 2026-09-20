import { Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getAIProvider } from "@/lib/ai/provider";

export function AiStatusCard() {
  const provider = getAIProvider();
  return (
    <Card className="space-y-2 p-5">
      <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
        <Sparkles className="size-4" /> AI enhancement
      </h3>
      <div className="flex items-center gap-2">
        <Badge variant={provider.configured ? "success" : "outline"}>{provider.configured ? provider.name : "Not configured"}</Badge>
      </div>
      <p className="text-xs text-muted-foreground">
        The Setup Copilot works fully without this — it answers from your actual data. Configuring a local Ollama
        server (set <code className="rounded bg-surface-muted px-1 py-0.5">OLLAMA_BASE_URL</code> in .env) lets it also
        draft and summarize. See README.md for setup.
      </p>
    </Card>
  );
}
