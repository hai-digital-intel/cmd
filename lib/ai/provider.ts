/**
 * AI provider abstraction. The app must be fully functional with NO provider configured —
 * the Copilot panel answers from deterministic Prisma queries (lib/services/copilot.ts)
 * regardless. This interface exists so a future local (Ollama) or hosted provider can sit
 * on top of the same deterministic answers to add summarization/drafting, never to replace
 * them as the source of truth.
 */
export interface AIProvider {
  readonly name: string;
  readonly configured: boolean;
  complete(prompt: string, context?: string): Promise<string>;
}

class NullAIProvider implements AIProvider {
  readonly name = "none";
  readonly configured = false;

  async complete(): Promise<string> {
    return "AI enhancement is not configured. Showing deterministic results instead.";
  }
}

/**
 * Placeholder for a future local Ollama connection (http://localhost:11434). Not wired up
 * or auto-installed — documented in README.md "Future migration options." Left here so the
 * provider seam already exists when someone wants to add it.
 */
class OllamaProvider implements AIProvider {
  readonly name = "ollama";
  readonly configured = true;

  constructor(private readonly baseUrl: string, private readonly model: string) {}

  async complete(prompt: string): Promise<string> {
    const res = await fetch(`${this.baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: this.model, prompt, stream: false }),
    });
    if (!res.ok) throw new Error(`Ollama request failed: ${res.status}`);
    const data = (await res.json()) as { response?: string };
    return data.response ?? "";
  }
}

let cachedProvider: AIProvider | null = null;

export function getAIProvider(): AIProvider {
  if (cachedProvider) return cachedProvider;
  const ollamaUrl = process.env.OLLAMA_BASE_URL;
  cachedProvider = ollamaUrl
    ? new OllamaProvider(ollamaUrl, process.env.OLLAMA_MODEL ?? "llama3.1")
    : new NullAIProvider();
  return cachedProvider;
}
