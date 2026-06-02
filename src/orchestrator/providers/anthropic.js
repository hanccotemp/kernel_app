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

    // Multimodal (capacidad reutilizable): adjunta imágenes al último msg de usuario.
    const msgs = messages.map((m) => ({ role: m.role, content: m.content }));
    if (meta.imagenes?.length) {
      for (let i = msgs.length - 1; i >= 0; i--) {
        if (msgs[i].role !== "user") continue;
        const blocks = [{ type: "text", text: msgs[i].content }];
        for (const img of meta.imagenes) {
          if (img.base64) blocks.push({ type: "image", source: { type: "base64", media_type: img.mediaType || "image/jpeg", data: img.base64 } });
          else if (img.url) blocks.push({ type: "image", source: { type: "url", url: img.url } });
        }
        msgs[i] = { role: "user", content: blocks };
        break;
      }
    }

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
        messages: msgs,
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
