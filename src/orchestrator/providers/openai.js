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

    // Multimodal (capacidad reutilizable): adjunta imágenes al último msg de usuario.
    const msgs = [{ role: "system", content: system }, ...messages.map((m) => ({ role: m.role, content: m.content }))];
    if (meta.imagenes?.length) {
      for (let i = msgs.length - 1; i >= 0; i--) {
        if (msgs[i].role !== "user") continue;
        const content = [{ type: "text", text: msgs[i].content }];
        for (const img of meta.imagenes) {
          const url = img.url || (img.base64 ? `data:${img.mediaType || "image/jpeg"};base64,${img.base64}` : null);
          if (url) content.push({ type: "image_url", image_url: { url } });
        }
        msgs[i] = { role: "user", content };
        break;
      }
    }

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        messages: msgs,
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
