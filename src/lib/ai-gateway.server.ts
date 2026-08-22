/**
 * Server-only helper for the Lovable AI Gateway.
 * The API key never leaves the server; every caller is a server function.
 */
const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

export const AI_MODEL = "google/gemini-3.7-flash";

export type AiMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | Array<Record<string, unknown>> | null;
  tool_calls?: Array<{ id: string; type: "function"; function: { name: string; arguments: string } }>;
  tool_call_id?: string;
};

export type AiToolDef = {
  type: "function";
  function: { name: string; description: string; parameters: Record<string, unknown> };
};


export class AiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function friendly(status: number, message: string) {
  if (status === 429) return "MatchO AI is busy right now — please try again in a moment.";
  if (status === 402) return message || "AI credits are exhausted. Please add credits to continue using MatchO AI.";
  if (status === 403) return message || "MatchO AI is currently unavailable for this workspace.";
  if (status === 401) return "MatchO AI is not configured correctly (missing API key).";
  return message || "MatchO AI could not complete this request.";
}

/** Raw chat completion against the gateway. Throws AiError with a user-safe message. */
export async function callAi(messages: AiMessage[], opts?: { json?: boolean; temperature?: number }) {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new AiError(401, friendly(401, ""));

  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
    body: JSON.stringify({
      model: AI_MODEL,
      messages,
      temperature: opts?.temperature ?? 0.7,
      ...(opts?.json ? { response_format: { type: "json_object" } } : {}),
    }),
  });

  if (!res.ok) {
    let message = "";
    try {
      const body = (await res.json()) as { error?: { message?: string }; message?: string };
      message = body?.error?.message || body?.message || "";
    } catch {
      /* ignore body parse errors */
    }
    throw new AiError(res.status, friendly(res.status, message));
  }

  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content ?? "";
}

/** Chat completion that must return JSON. Falls back to extracting the first JSON block. */
export async function callAiJson<T>(messages: AiMessage[]): Promise<T> {
  const text = await callAi(messages, { json: true, temperature: 0.6 });
  try {
    return JSON.parse(text) as T;
  } catch {
    const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (match) {
      try {
        return JSON.parse(match[0]) as T;
      } catch {
        /* fall through */
      }
    }
    throw new AiError(502, "MatchO AI returned an unexpected response. Please try again.");
  }
}

/**
 * Chat completion with tool calling. Returns the raw assistant message so the
 * orchestrator can execute tools and continue the loop.
 */
export async function callAiWithTools(
  messages: AiMessage[],
  tools: AiToolDef[],
  opts?: { temperature?: number },
): Promise<{
  content: string;
  tool_calls: Array<{ id: string; type: "function"; function: { name: string; arguments: string } }>;
}> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new AiError(401, friendly(401, ""));

  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
    body: JSON.stringify({
      model: AI_MODEL,
      messages,
      tools,
      tool_choice: "auto",
      temperature: opts?.temperature ?? 0.5,
    }),
  });

  if (!res.ok) {
    let message = "";
    try {
      const body = (await res.json()) as { error?: { message?: string }; message?: string };
      message = body?.error?.message || body?.message || "";
    } catch {
      /* ignore */
    }
    throw new AiError(res.status, friendly(res.status, message));
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string; tool_calls?: never[] } }>;
  };
  const msg = data.choices?.[0]?.message;
  return { content: msg?.content ?? "", tool_calls: (msg?.tool_calls as never[]) ?? [] };
}
