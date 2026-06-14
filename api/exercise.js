// Vercel serverless-funksjon for øvelses-GIF-er via WorkoutX.
// Nøkkel: miljøvariabel WORKOUTX_API_KEY i Vercel.
//   /api/exercise?name=squat         -> { ok, id, gif, instructions }
//   /api/exercise?name=squat&debug=1 -> rå info for feilsøking
//   /api/exercise?gif=0032           -> streamer selve GIF-en
// Hele kroppen er pakket i try/catch, så den kan aldri gi en blank 500.

const BASE = "https://api.workoutxapp.com";

export default async function handler(req, res) {
  try {
    const q = req.query || {};
    const key = process.env.WORKOUTX_API_KEY;
    const name = q.name;
    const gif = q.gif;
    const debug = q.debug;

    // GIF-proxy
    if (gif) {
      if (!key) return res.status(404).end();
      const id = String(gif).replace(/[^a-zA-Z0-9_-]/g, "");
      const r = await fetch(`${BASE}/v1/gifs/${id}`, { headers: { "X-WorkoutX-Key": key } });
      if (!r.ok) return res.status(404).end();
      const buf = Buffer.from(await r.arrayBuffer());
      res.setHeader("Content-Type", r.headers.get("content-type") || "image/gif");
      res.setHeader("Cache-Control", "public, max-age=604800, immutable");
      return res.status(200).send(buf);
    }

    // navneoppslag
    if (!name) return res.status(200).json({ ok: false, error: "name mangler" });
    if (!key) return res.status(200).json({ ok: false, noKey: true });

    const url = `${BASE}/v1/exercises/name/${encodeURIComponent(name)}`;
    const r = await fetch(url, { headers: { "X-WorkoutX-Key": key } });
    const text = await r.text();

    if (debug) {
      return res.status(200).json({
        debug: true, keyPresent: true, upstreamStatus: r.status, sample: text.slice(0, 700),
      });
    }

    if (!r.ok) return res.status(200).json({ ok: false, upstreamStatus: r.status });

    let data;
    try { data = JSON.parse(text); } catch (e) { return res.status(200).json({ ok: false, error: "ikke JSON" }); }

    const list = Array.isArray(data) ? data
      : Array.isArray(data && data.data) ? data.data
      : Array.isArray(data && data.results) ? data.results
      : Array.isArray(data && data.exercises) ? data.exercises
      : (data && data.name) ? [data] : [];

    const hit = list[0];
    if (!hit) return res.status(200).json({ ok: false, found: 0 });

    let id = hit.id || hit.exerciseId;
    if (!id && typeof hit.gifUrl === "string") {
      const m = hit.gifUrl.match(/gifs\/([a-zA-Z0-9_-]+)/);
      id = m ? m[1] : null;
    }
    if (!id) return res.status(200).json({ ok: false, error: "ingen id i svaret" });

    return res.status(200).json({
      ok: true,
      id,
      name: hit.name || name,
      instructions: hit.instructions || [],
      gif: `/api/exercise?gif=${encodeURIComponent(id)}`,
    });
  } catch (e) {
    return res.status(200).json({ ok: false, error: String((e && e.message) || e) });
  }
}
