/**
 * Proveedor Anthropic (Claude). Útil como motor de demostración de alta
 * calidad (los prototipos del proyecto usan Claude como motor de demo) y como
 * proveedor de respaldo. Se activa con AI_PROVIDER=anthropic y ANTHROPIC_API_KEY.
 *
 * Usa cache_control sobre el bloque de sistema (el personaje cambia poco) →
 * caché de prompt para abaratar, tal como pide la arquitectura (§2.5).
 */
export const anthropicProvider = {
  name: "anthropic",
  async complete({ system, messages, meta = {} }) {
    const key = meta.apiKey || process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error("Falta ANTHROPIC_API_KEY (pégala en la interfaz o ponla en .env)");
    const model = meta.model || process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: meta.maxTokens || 400,
        temperature: meta.temperature ?? 0.7,
        system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      }),
    });
    if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
    const data = await res.json();
    const text = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    return {
      text,
      provider: "anthropic",
      tokens: {
        prompt: data.usage?.input_tokens,
        completion: data.usage?.output_tokens,
      },
    };
  },
};
