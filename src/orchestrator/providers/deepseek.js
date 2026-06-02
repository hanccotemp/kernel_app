/**
 * Proveedor DeepSeek (API compatible con OpenAI). Es el proveedor primario
 * sugerido en la arquitectura por costo. Se activa con AI_PROVIDER=deepseek y
 * DEEPSEEK_API_KEY.
 */
export const deepseekProvider = {
  name: "deepseek",
  async complete({ system, messages, meta = {} }) {
    const key = process.env.DEEPSEEK_API_KEY;
    if (!key) throw new Error("Falta DEEPSEEK_API_KEY");
    const model = process.env.DEEPSEEK_MODEL || "deepseek-chat";

    const res = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: system }, ...messages],
        max_tokens: meta.maxTokens || 400,
        temperature: meta.temperature ?? 0.7,
      }),
    });
    if (!res.ok) throw new Error(`DeepSeek ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return {
      text: data.choices?.[0]?.message?.content?.trim() ?? "",
      provider: "deepseek",
      tokens: {
        prompt: data.usage?.prompt_tokens,
        completion: data.usage?.completion_tokens,
      },
    };
  },
};
