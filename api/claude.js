// Vercel serverless-funksjon. Holder API-nøkkelen hemmelig på serveren.
// Nøkkelen settes som miljøvariabel ANTHROPIC_API_KEY i Vercel (se README).
// Bytt MODEL hvis du får "model not found" — sjekk gjeldende id på console.anthropic.com.

const MODEL = "claude-sonnet-4-6";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST only" });
    return;
  }

  const key = process.env.ANTHROPIC_API_KEY;
  // Ingen nøkkel satt? Si fra pent — appen bruker da lokal fallback.
  if (!key) {
    res.status(200).json({ noKey: true });
    return;
  }

  try {
    const { messages, system, max_tokens } = req.body || {};
    if (!Array.isArray(messages)) {
      res.status(400).json({ error: "messages mangler" });
      return;
    }

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: max_tokens || 1024,
        ...(system ? { system } : {}),
        messages,
      }),
    });

    if (!r.ok) {
      const detail = await r.text();
      res.status(502).json({ error: "anthropic", status: r.status, detail });
      return;
    }

    const data = await r.json();
    const text = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n");

    res.status(200).json({ text });
  } catch (e) {
    res.status(500).json({ error: "server", detail: String(e) });
  }
}
