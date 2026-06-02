/**
 * Proveedor OpenAI. Alternativa intercambiable. Se activa con
 * AI_PROVIDER=openai y OPENAI_API_KEY.
 */
export const openaiProvider = {
  name: "openai",
  async complete({ system, messages, meta = {} }) {
    const key = meta.apiKey || process.env.OPENAI_API_KEY;
    if (!key) throw new Error("Falta OPENAI_API_KEY (pégala en la interfaz o ponla en .env)");
    const model = meta.model || process.env.OPENAI_MODEL || "gpt-4o-mini";

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: system }, ...messages],
        max_tokens: meta.maxTokens || 400,
        temperature: meta.temperature ?? 0.7,
      }),
    });
    if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return {
      text: data.choices?.[0]?.message?.content?.trim() ?? "",
      provider: "openai",
      tokens: {
        prompt: data.usage?.prompt_tokens,
        completion: data.usage?.completion_tokens,
      },
    };
  },
};
