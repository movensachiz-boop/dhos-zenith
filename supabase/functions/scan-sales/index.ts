const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-branch",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["date", "lines"],
  properties: {
    date: { type: ["string", "null"], description: "YYYY-MM-DD if written on the form" },
    lines: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["product", "quantity", "unit_price"],
        properties: {
          product: { type: "string" },
          quantity: { type: "number" },
          unit_price: { type: ["number", "null"] },
        },
      },
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
  try {
    const { images, products } = await req.json();
    if (!Array.isArray(images) || images.length === 0) return json({ error: "No images uploaded" }, 400);
    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return json({ error: "AI is not configured" }, 500);

    const prompt = `You read handwritten or printed daily sales sheets for a cake shop. Extract every product line that has a quantity sold (ignore empty rows and quantity 0). Known products (match names to these when similar): ${
      (products ?? []).join(", ")
    }. Return product names exactly as in the known list when matched.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key, Authorization: `Bearer ${key}`, "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        stream: true,
        store: false,
        reasoning: { effort: "low" },
        text: { format: { type: "json_schema", name: "sales_sheet", strict: true, schema } },
        input: [{
          role: "user",
          content: [
            { type: "input_text", text: prompt },
            ...images.slice(0, 10).map((u: string) => ({ type: "input_image", image_url: u })),
          ],
        }],
      }),
    });
    if (!res.ok || !res.body) {
      const t = await res.text();
      const msg = res.status === 402 ? "AI credits used up. Please top up." : res.status === 429 ? "Too many requests, try again shortly." : `Scan failed (${res.status})`;
      console.error(res.status, t);
      return json({ error: msg }, res.status);
    }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "", out = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const parts = buf.split("\n");
      buf = parts.pop() ?? "";
      for (const line of parts) {
        if (!line.startsWith("data:")) continue;
        const d = line.slice(5).trim();
        if (!d || d === "[DONE]") continue;
        try {
          const ev = JSON.parse(d);
          if (ev.type === "response.output_text.delta") out += ev.delta;
        } catch { /* skip */ }
      }
    }
    if (!out) return json({ error: "Could not read the picture. Try a clearer photo." }, 422);
    return json(JSON.parse(out));
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : "Scan failed" }, 500);
  }
});
