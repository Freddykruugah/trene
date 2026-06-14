import React, { useState, useEffect, useRef } from "react";
import {
  Dumbbell, Flame, ChevronRight, ChevronLeft, Check, Play, Pause,
  RotateCcw, Calendar, History, MessageCircle, Home, X, Plus, Minus,
  Send, Loader2, Trophy, Clock, Target, Zap, Info,
  TrendingUp, Award, ChevronDown, Sparkles
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine } from "recharts";

/* ─────────────────────────────────────────────────────────────
   PT — personlig trener
   Single-file prototype. State lever i sesjonen (ingen localStorage
   i artifacts). For en deployet versjon legger vi på Firebase som i
   dine andre apper.
   ───────────────────────────────────────────────────────────── */

const C = {
  bg: "#14120E", surface: "#1F1C16", surface2: "#2A261E", line: "#3A352B",
  ink: "#F6F2E9", muted: "#A39B8B", accent: "#FF6A2B", accentDeep: "#E2531A",
  ok: "#8FE388", warn: "#FFD166",
};

const STYLE = `
@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@300;400;500;600;700&family=Inter:wght@400;500;600;700&display=swap');
* { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
.pt-root { font-family: 'Inter', system-ui, sans-serif; color: ${C.ink}; background: ${C.bg}; }
.disp { font-family: 'Oswald', sans-serif; letter-spacing: .01em; }
.up { text-transform: uppercase; letter-spacing: .08em; }
.pt-root button { font-family: inherit; cursor: pointer; border: none; }
@keyframes squat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(14px)} }
@keyframes squatLeg { 0%,100%{height:34px} 50%{height:20px} }
@keyframes pushup { 0%,100%{transform:translateY(0)} 50%{transform:translateY(9px)} }
@keyframes pulse { 0%,100%{opacity:.55;transform:scale(1)} 50%{opacity:1;transform:scale(1.06)} }
@keyframes spin { to { transform: rotate(360deg) } }
@keyframes pop { 0%{transform:scale(.7);opacity:0} 60%{transform:scale(1.12)} 100%{transform:scale(1);opacity:1} }
@keyframes slideUp { from{transform:translateY(18px);opacity:0} to{transform:translateY(0);opacity:1} }
.fade { animation: slideUp .28s ease both; }
.spin { animation: spin 1s linear infinite; }
.pt-root ::-webkit-scrollbar { width: 0; height: 0; }
.tapscale { transition: transform .08s ease; }
.tapscale:active { transform: scale(.96); }
`;

/* ── statiske data ───────────────────────────────────────────── */
const GOALS = [
  { id: "muskel", label: "Bygge muskler", icon: Dumbbell, sub: "Hypertrofi, volum" },
  { id: "styrke", label: "Bli sterkere", icon: Zap, sub: "Tunge løft, lav rep" },
  { id: "vekt", label: "Ned i vekt", icon: Flame, sub: "Forbrenning + styrke" },
  { id: "form", label: "Generell form", icon: Target, sub: "Balansert og sunt" },
];
const LEVELS = [
  { id: "ny", label: "Nybegynner", sub: "0–1 år" },
  { id: "middels", label: "Middels", sub: "1–3 år" },
  { id: "erfaren", label: "Erfaren", sub: "3 år +" },
];
const EQUIP = [
  { id: "hjemme", label: "Hjemme, ingen utstyr", sub: "Kroppsvekt" },
  { id: "manualer", label: "Hjemme med manualer", sub: "Manualer / strikk" },
  { id: "gym", label: "Fullt treningssenter", sub: "Alt tilgjengelig" },
];

const MOTIVATION = [
  "Bra! Ett sett nærmere.", "Sånn ja — hold tempoet.", "Sterkt. Pust og fortsett.",
  "Du eier dette settet.", "Kontroll på vei ned, kraft på vei opp.",
  "Det der teller. Videre.", "Beina/armene takker deg senere.",
  "Litt igjen nå — du har mer enn du tror.", "Solid. Neste sett venter.",
];

/* enkel øvelses-info ut fra nøkkelord */
function exInfo(name = "") {
  const n = name.toLowerCase();
  const lib = [
    { k: ["knebøy", "squat", "benkøy"], demo: "squat", cues: ["Føtter litt bredere enn hofte", "Brystet opp, blikk frem", "Press fra hælene opp"] },
    { k: ["push", "armhev", "benk", "press"], demo: "pushup", cues: ["Stram kjerne, rett kropp", "Albuer ~45° ut", "Senk kontrollert, press eksplosivt"] },
    { k: ["plank", "planke"], demo: "plank", cues: ["Rett linje hode–hæl", "Spenn rumpe og mage", "Pust rolig hele veien"] },
    { k: ["markløft", "deadlift", "rdl"], demo: "hinge", cues: ["Stang nær kroppen", "Nøytral rygg", "Skyv hoften frem på toppen"] },
    { k: ["utfall", "lunge"], demo: "squat", cues: ["Langt steg, senk bakkne", "Vekt på fremre hæl", "Overkropp oppreist"] },
    { k: ["roing", "row", "ro"], demo: "pull", cues: ["Trekk albuen bakover", "Klem skulderblad sammen", "Ikke rykk med ryggen"] },
    { k: ["curl", "bicep"], demo: "pull", cues: ["Albuene i ro ved siden", "Klem på toppen", "Senk sakte"] },
  ];
  const hit = lib.find((e) => e.k.some((kw) => n.includes(kw)));
  return hit || { demo: "pulse", cues: ["Kontrollert bevegelse", "Full bevegelsesbane", "Pust jevnt"] };
}

/* ── progresjon: beregninger ─────────────────────────────────── */
// Epley estimert 1RM
const e1rm = (kg, reps) => (kg > 0 && reps > 0 ? Math.round(kg * (1 + reps / 30)) : 0);
const topSet = (sets = []) =>
  sets.reduce((b, s) => {
    const kg = parseFloat(s.kg) || 0, reps = parseFloat(s.reps) || 0;
    const e = e1rm(kg, reps);
    return e > b.e ? { kg, reps, e } : b;
  }, { kg: 0, reps: 0, e: 0 });

// siste loggførte økt for en øvelse
const lastEntry = (log, name) => { const a = log[name]; return a && a.length ? a[a.length - 1] : null; };
// beste estimerte 1RM noensinne
const bestE1RM = (log, name) => (log[name] || []).reduce((m, e) => Math.max(m, topSet(e.sets).e), 0);

// smart vektforslag: traff du toppen av rep-spennet sist → opp i vekt
function suggestTarget(ex, last) {
  if (!last) return null;
  const t = topSet(last.sets);
  if (!t.kg) return null;
  const repHigh = (() => { const m = String(ex.reps).match(/(\d+)\s*[–\-]?\s*(\d+)?/); return m ? parseInt(m[2] || m[1], 10) : 0; })();
  if (repHigh && t.reps >= repHigh) {
    const bump = t.kg < 20 ? 1.25 : 2.5;
    return { kg: t.kg + bump, why: "opp", text: `Du traff toppen sist — prøv ${(t.kg + bump).toString().replace(".", ",")} kg` };
  }
  return { kg: t.kg, why: "hold", text: `Samme vekt (${t.kg.toString().replace(".", ",")} kg), jakt flere reps` };
}

/* ── animert øvelsesdemo (SVG) ───────────────────────────────── */
function Demo({ type = "pulse", size = 120 }) {
  const stroke = C.accent;
  const base = { stroke, strokeWidth: 5, strokeLinecap: "round", fill: "none" };
  if (type === "squat")
    return (
      <svg width={size} height={size} viewBox="0 0 100 100">
        <g style={{ animation: "squat 1.4s ease-in-out infinite" }}>
          <circle cx="50" cy="24" r="8" fill={stroke} />
          <line x1="50" y1="32" x2="50" y2="56" {...base} />
          <line x1="50" y1="40" x2="36" y2="50" {...base} />
          <line x1="50" y1="40" x2="64" y2="50" {...base} />
        </g>
        <line x1="50" y1="56" x2="40" y2="84" {...base} style={{ transformOrigin: "50px 56px", animation: "squatLeg 1.4s ease-in-out infinite" }} />
        <line x1="50" y1="56" x2="60" y2="84" {...base} style={{ transformOrigin: "50px 56px", animation: "squatLeg 1.4s ease-in-out infinite" }} />
        <line x1="20" y1="84" x2="80" y2="84" stroke={C.line} strokeWidth="3" />
      </svg>
    );
  if (type === "pushup")
    return (
      <svg width={size} height={size} viewBox="0 0 100 100">
        <line x1="14" y1="80" x2="86" y2="80" stroke={C.line} strokeWidth="3" />
        <g style={{ animation: "pushup 1.3s ease-in-out infinite" }}>
          <circle cx="74" cy="46" r="7" fill={stroke} />
          <line x1="68" y1="50" x2="26" y2="62" {...base} />
          <line x1="60" y1="52" x2="58" y2="78" {...base} />
          <line x1="42" y1="56" x2="42" y2="78" {...base} />
          <line x1="26" y1="62" x2="22" y2="78" {...base} />
        </g>
      </svg>
    );
  if (type === "plank")
    return (
      <svg width={size} height={size} viewBox="0 0 100 100">
        <line x1="14" y1="78" x2="86" y2="78" stroke={C.line} strokeWidth="3" />
        <g style={{ animation: "pulse 2s ease-in-out infinite" }}>
          <circle cx="76" cy="48" r="7" fill={stroke} />
          <line x1="70" y1="52" x2="24" y2="60" {...base} />
          <line x1="58" y1="54" x2="58" y2="74" {...base} />
          <line x1="32" y1="58" x2="28" y2="74" {...base} />
        </g>
      </svg>
    );
  if (type === "hinge")
    return (
      <svg width={size} height={size} viewBox="0 0 100 100">
        <g style={{ animation: "squat 1.6s ease-in-out infinite" }}>
          <circle cx="40" cy="30" r="8" fill={stroke} />
          <line x1="46" y1="34" x2="62" y2="50" {...base} />
          <line x1="62" y1="50" x2="62" y2="84" {...base} />
          <line x1="62" y1="50" x2="56" y2="72" {...base} />
        </g>
        <line x1="20" y1="84" x2="80" y2="84" stroke={C.line} strokeWidth="3" />
      </svg>
    );
  if (type === "pull")
    return (
      <svg width={size} height={size} viewBox="0 0 100 100">
        <g style={{ animation: "pushup 1.2s ease-in-out infinite" }}>
          <circle cx="50" cy="26" r="8" fill={stroke} />
          <line x1="50" y1="34" x2="50" y2="64" {...base} />
          <line x1="50" y1="42" x2="34" y2="52" {...base} />
          <line x1="50" y1="42" x2="66" y2="52" {...base} />
          <line x1="50" y1="64" x2="40" y2="86" {...base} />
          <line x1="50" y1="64" x2="60" y2="86" {...base} />
        </g>
      </svg>
    );
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="22" fill="none" stroke={stroke} strokeWidth="5" style={{ animation: "pulse 1.6s ease-in-out infinite" }} />
      <Dumbbell />
    </svg>
  );
}

/* ── API: kaller serverless-proxy (/api/claude) som holder nøkkelen ── */
async function callClaude(messages, system, maxTokens = 1400) {
  const res = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, system, max_tokens: maxTokens }),
  });
  if (!res.ok) throw new Error("api");
  const data = await res.json();
  if (data.noKey) throw new Error("nokey"); // utløser lokal fallback
  return data.text || "";
}

/* ── Øvelses-GIF via serverless-proxy (/api/exercise) ──────────── */
// norsk → engelsk reserve hvis AI ikke ga "en"-felt (f.eks. gamle program)
function noToEn(name = "") {
  const n = name.toLowerCase();
  const map = [
    [["knebøy", "squat"], "squat"], [["markløft", "deadlift", "rdl"], "deadlift"],
    [["benkpress", "benk"], "bench press"], [["push", "armhev"], "push up"],
    [["utfall", "lunge"], "lunge"], [["roing", "row"], "row"],
    [["skulderpress", "military"], "shoulder press"], [["bicep", "curl"], "bicep curl"],
    [["planke", "plank"], "plank"], [["nedtrekk", "pulldown"], "lat pulldown"],
    [["pull", "kroppshev"], "pull up"], [["dips"], "dips"], [["leg press", "beinpress"], "leg press"],
    [["triceps"], "triceps extension"], [["crunch", "situp", "sit-up"], "crunch"],
    [["hofteløft", "hip thrust"], "hip thrust"], [["flies", "flyes"], "dumbbell fly"],
  ];
  const hit = map.find(([k]) => k.some((kw) => n.includes(kw)));
  return hit ? hit[1] : "";
}
function enName(ex) { return (ex.en && ex.en.trim()) || noToEn(ex.name) || ex.name; }

// enkel cache (sesjon + localStorage) for å spare API-forespørsler
const gifCache = {};
try { Object.assign(gifCache, JSON.parse(localStorage.getItem("pt_gifcache_v1") || "{}")); } catch (e) {}
function cacheGif(key, val) {
  gifCache[key] = val;
  try { localStorage.setItem("pt_gifcache_v1", JSON.stringify(gifCache)); } catch (e) {}
}

async function fetchGif(ex) {
  const key = enName(ex).toLowerCase();
  if (key in gifCache) return gifCache[key]; // null = ingen treff, string = url
  try {
    const res = await fetch("/api/exercise?name=" + encodeURIComponent(key));
    if (!res.ok) { cacheGif(key, null); return null; }
    const data = await res.json();
    const url = data && data.ok && data.gif ? data.gif : null;
    cacheGif(key, url);
    return url;
  } catch (e) {
    return null; // ikke cache nettverksfeil — kan prøves igjen senere
  }
}

function fallbackProgram(p) {
  const ex = (name, en, sets, reps, rest, muscle) => ({ name, en, sets, reps, rest, muscle, notes: "" });
  return {
    name: "Helkroppsprogram",
    summary: "Et balansert helkroppsprogram som starter rolig. (Lokal mal — AI var ikke tilgjengelig.)",
    days: [
      { day: "Økt A — Helkropp", focus: "Helkropp", exercises: [
        ex("Knebøy", "squat", 3, "8–10", 90, "Bein"),
        ex("Push-ups", "push up", 3, "8–12", 60, "Bryst"),
        ex("Roing med manualer", "dumbbell row", 3, "10–12", 75, "Rygg"),
        ex("Planke", "plank", 3, "30 sek", 45, "Kjerne"),
      ]},
      { day: "Økt B — Helkropp", focus: "Helkropp", exercises: [
        ex("Utfall", "lunge", 3, "10/side", 75, "Bein"),
        ex("Skulderpress", "shoulder press", 3, "8–12", 75, "Skulder"),
        ex("Markløft (RDL)", "romanian deadlift", 3, "8–10", 90, "Bakside"),
        ex("Bicep curl", "bicep curl", 3, "10–12", 60, "Arm"),
      ]},
    ],
  };
}

async function generateProgram(profile) {
  const system =
    "Du er en erfaren norsk personlig trener. Lag et konkret, trygt og progressivt ukentlig treningsprogram. " +
    "Svar KUN med gyldig JSON, ingen markdown, ingen forklaring utenfor JSON. Bruk norske øvelsesnavn. " +
    'For hver øvelse skal "en" være det vanlige ENGELSKE navnet på øvelsen (for videooppslag), f.eks. "squat", "barbell bench press", "romanian deadlift", "push up". ' +
    'Format: {"name": string, "summary": string (1–2 setninger), "days": [{"day": string, "focus": string, "exercises": [{"name": string, "en": string, "sets": number, "reps": string, "rest": number (sekunder), "muscle": string, "notes": string}]}]}';
  const u =
    `Mål: ${profile.goalLabel}. Nivå: ${profile.levelLabel}. Utstyr: ${profile.equipLabel}. ` +
    `Dager per uke: ${profile.days}. Tid per økt: ${profile.time} min. ` +
    (profile.limits ? `Hensyn/skader: ${profile.limits}. ` : "") +
    `Lag nøyaktig ${profile.days} økter. Hver økt 4–6 øvelser. Tilpass volum og rep-spenn til mål og nivå.`;
  try {
    const raw = await callClaude([{ role: "user", content: u }], system);
    const clean = raw.replace(/```json|```/g, "").trim();
    const start = clean.indexOf("{");
    const end = clean.lastIndexOf("}");
    const parsed = JSON.parse(clean.slice(start, end + 1));
    if (!parsed.days || !parsed.days.length) throw new Error("tomt");
    return parsed;
  } catch (e) {
    return fallbackProgram(profile);
  }
}

/* ── UI-byggeklosser ─────────────────────────────────────────── */
const Card = ({ children, style, onClick, className = "" }) => (
  <div onClick={onClick} className={className}
    style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 16, padding: 16, ...style }}>
    {children}
  </div>
);

const Pill = ({ children, color = C.accent }) => (
  <span className="disp up" style={{ fontSize: 11, color, border: `1px solid ${color}55`, background: `${color}18`, padding: "3px 8px", borderRadius: 999 }}>
    {children}
  </span>
);

/* ── Onboarding ──────────────────────────────────────────────── */
function Onboarding({ onDone }) {
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState(null);
  const [level, setLevel] = useState(null);
  const [equip, setEquip] = useState(null);
  const [days, setDays] = useState(3);
  const [time, setTime] = useState(45);
  const [limits, setLimits] = useState("");
  const total = 5;

  const next = () => setStep((s) => s + 1);
  const back = () => setStep((s) => Math.max(0, s - 1));

  const finish = () => {
    onDone({
      goal: goal.id, goalLabel: goal.label,
      level: level.id, levelLabel: level.label,
      equip: equip.id, equipLabel: equip.label,
      days, time, limits: limits.trim(),
    });
  };

  const canNext = [goal, level, equip, true, true][step];

  return (
    <div style={{ minHeight: "100%", display: "flex", flexDirection: "column", padding: "28px 20px 24px" }}>
      <div style={{ display: "flex", gap: 6, marginBottom: 26 }}>
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} style={{ flex: 1, height: 4, borderRadius: 4, background: i <= step ? C.accent : C.line, transition: "background .3s" }} />
        ))}
      </div>

      <div className="fade" key={step} style={{ flex: 1 }}>
        {step === 0 && (
          <>
            <h2 className="disp" style={{ fontSize: 30, margin: "0 0 4px", fontWeight: 600 }}>Hva er målet ditt?</h2>
            <p style={{ color: C.muted, margin: "0 0 22px", fontSize: 14 }}>Programmet bygges rundt dette.</p>
            <div style={{ display: "grid", gap: 12 }}>
              {GOALS.map((g) => {
                const I = g.icon; const on = goal?.id === g.id;
                return (
                  <Card key={g.id} onClick={() => setGoal(g)} className="tapscale"
                    style={{ display: "flex", alignItems: "center", gap: 14, borderColor: on ? C.accent : C.line, background: on ? C.surface2 : C.surface }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: on ? C.accent : C.surface2, display: "grid", placeItems: "center", flexShrink: 0 }}>
                      <I size={22} color={on ? C.bg : C.accent} />
                    </div>
                    <div><div className="disp" style={{ fontSize: 18, fontWeight: 600 }}>{g.label}</div>
                      <div style={{ color: C.muted, fontSize: 13 }}>{g.sub}</div></div>
                    {on && <Check size={20} color={C.accent} style={{ marginLeft: "auto" }} />}
                  </Card>
                );
              })}
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h2 className="disp" style={{ fontSize: 30, margin: "0 0 4px", fontWeight: 600 }}>Erfaringsnivå</h2>
            <p style={{ color: C.muted, margin: "0 0 22px", fontSize: 14 }}>Så vi treffer riktig vanskelighetsgrad.</p>
            <div style={{ display: "grid", gap: 12 }}>
              {LEVELS.map((l) => {
                const on = level?.id === l.id;
                return (
                  <Card key={l.id} onClick={() => setLevel(l)} className="tapscale"
                    style={{ display: "flex", alignItems: "center", borderColor: on ? C.accent : C.line, background: on ? C.surface2 : C.surface }}>
                    <div><div className="disp" style={{ fontSize: 18, fontWeight: 600 }}>{l.label}</div>
                      <div style={{ color: C.muted, fontSize: 13 }}>{l.sub}</div></div>
                    {on && <Check size={20} color={C.accent} style={{ marginLeft: "auto" }} />}
                  </Card>
                );
              })}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="disp" style={{ fontSize: 30, margin: "0 0 4px", fontWeight: 600 }}>Hvor trener du?</h2>
            <p style={{ color: C.muted, margin: "0 0 22px", fontSize: 14 }}>Øvelsene tilpasses utstyret ditt.</p>
            <div style={{ display: "grid", gap: 12 }}>
              {EQUIP.map((e) => {
                const on = equip?.id === e.id;
                return (
                  <Card key={e.id} onClick={() => setEquip(e)} className="tapscale"
                    style={{ display: "flex", alignItems: "center", borderColor: on ? C.accent : C.line, background: on ? C.surface2 : C.surface }}>
                    <div><div className="disp" style={{ fontSize: 18, fontWeight: 600 }}>{e.label}</div>
                      <div style={{ color: C.muted, fontSize: 13 }}>{e.sub}</div></div>
                    {on && <Check size={20} color={C.accent} style={{ marginLeft: "auto" }} />}
                  </Card>
                );
              })}
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="disp" style={{ fontSize: 30, margin: "0 0 4px", fontWeight: 600 }}>Tid og frekvens</h2>
            <p style={{ color: C.muted, margin: "0 0 22px", fontSize: 14 }}>Vær ærlig — et program du faktisk følger slår et perfekt et du dropper.</p>
            <Card style={{ marginBottom: 14 }}>
              <div className="up" style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>Dager per uke</div>
              <Stepper value={days} setValue={setDays} min={2} max={6} suffix="dager" />
            </Card>
            <Card>
              <div className="up" style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>Minutter per økt</div>
              <Stepper value={time} setValue={setTime} min={20} max={90} step={15} suffix="min" />
            </Card>
          </>
        )}

        {step === 4 && (
          <>
            <h2 className="disp" style={{ fontSize: 30, margin: "0 0 4px", fontWeight: 600 }}>Noe vi bør ta hensyn til?</h2>
            <p style={{ color: C.muted, margin: "0 0 22px", fontSize: 14 }}>Skader, vondter eller ting du vil unngå. Valgfritt.</p>
            <textarea value={limits} onChange={(e) => setLimits(e.target.value)}
              placeholder="F.eks. «vond i venstre kne, vil unngå dype knebøy»"
              style={{ width: "100%", minHeight: 120, background: C.surface, color: C.ink, border: `1px solid ${C.line}`,
                borderRadius: 14, padding: 14, fontSize: 15, resize: "vertical", outline: "none", fontFamily: "inherit" }} />
          </>
        )}
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
        {step > 0 && (
          <button onClick={back} className="tapscale" style={{ width: 52, height: 52, borderRadius: 14, background: C.surface, border: `1px solid ${C.line}`, color: C.ink, display: "grid", placeItems: "center" }}>
            <ChevronLeft size={22} />
          </button>
        )}
        <button onClick={step === 4 ? finish : next} disabled={!canNext} className="tapscale"
          style={{ flex: 1, height: 52, borderRadius: 14, background: canNext ? C.accent : C.surface2, color: canNext ? C.bg : C.muted,
            fontWeight: 700, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <span className="disp up" style={{ fontSize: 15 }}>{step === 4 ? "Lag programmet mitt" : "Videre"}</span>
          {step < 4 && <ChevronRight size={20} />}
        </button>
      </div>
    </div>
  );
}

function Stepper({ value, setValue, min, max, step = 1, suffix }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <button onClick={() => setValue(Math.max(min, value - step))} className="tapscale"
        style={{ width: 46, height: 46, borderRadius: 12, background: C.surface2, color: C.ink, display: "grid", placeItems: "center" }}>
        <Minus size={20} />
      </button>
      <div className="disp" style={{ fontSize: 34, fontWeight: 600 }}>{value}<span style={{ fontSize: 15, color: C.muted, marginLeft: 6 }}>{suffix}</span></div>
      <button onClick={() => setValue(Math.min(max, value + step))} className="tapscale"
        style={{ width: 46, height: 46, borderRadius: 12, background: C.surface2, color: C.ink, display: "grid", placeItems: "center" }}>
        <Plus size={20} />
      </button>
    </div>
  );
}

/* ── Genererer-skjerm ────────────────────────────────────────── */
function Generating() {
  const lines = ["Leser inn målene dine…", "Velger øvelser…", "Setter sett og repetisjoner…", "Balanserer uka…"];
  const [i, setI] = useState(0);
  useEffect(() => { const t = setInterval(() => setI((x) => (x + 1) % lines.length), 1100); return () => clearInterval(t); }, []);
  return (
    <div style={{ minHeight: "100%", display: "grid", placeItems: "center", padding: 24 }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 70, height: 70, margin: "0 auto 24px", borderRadius: "50%", border: `4px solid ${C.surface2}`, borderTopColor: C.accent, animation: "spin 1s linear infinite" }} />
        <div className="disp" style={{ fontSize: 22, fontWeight: 600, marginBottom: 6 }}>Trener jobber…</div>
        <div style={{ color: C.muted, fontSize: 14 }}>{lines[i]}</div>
      </div>
    </div>
  );
}

/* ── Hjem / program ──────────────────────────────────────────── */
function HomeView({ profile, program, history, onStart, onReset }) {
  const doneDays = new Set(history.map((h) => h.dayIndex));
  return (
    <div style={{ padding: "24px 18px 100px" }}>
      <div className="fade">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div className="up" style={{ fontSize: 12, color: C.accent, marginBottom: 4 }}>Ditt program</div>
          {onReset && (
            <button onClick={() => { if (confirm("Nullstille og lage nytt program? All logg slettes.")) onReset(); }}
              style={{ background: "none", color: C.muted, fontSize: 12 }} className="up">Nytt program</button>
          )}
        </div>
        <h1 className="disp" style={{ fontSize: 30, fontWeight: 600, margin: "0 0 6px", lineHeight: 1.05 }}>{program.name}</h1>
        <p style={{ color: C.muted, fontSize: 14, margin: "0 0 18px" }}>{program.summary}</p>

        <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
          <Stat icon={Calendar} top={`${program.days.length}`} bot="økter/uke" />
          <Stat icon={Trophy} top={`${history.length}`} bot="fullført" />
          <Stat icon={Flame} top={`${profile.time}`} bot="min/økt" />
        </div>

        <div className="disp up" style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>Ukas økter</div>
        <div style={{ display: "grid", gap: 12 }}>
          {program.days.map((d, i) => {
            const done = doneDays.has(i);
            return (
              <Card key={i} className="tapscale" onClick={() => onStart(i)}
                style={{ display: "flex", alignItems: "center", gap: 14, borderColor: done ? `${C.ok}66` : C.line }}>
                <div style={{ width: 46, height: 46, borderRadius: 12, background: done ? `${C.ok}22` : C.surface2, display: "grid", placeItems: "center", flexShrink: 0 }}>
                  {done ? <Check size={22} color={C.ok} /> : <span className="disp" style={{ fontSize: 20, color: C.accent, fontWeight: 600 }}>{i + 1}</span>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="disp" style={{ fontSize: 17, fontWeight: 600 }}>{d.day}</div>
                  <div style={{ color: C.muted, fontSize: 13 }}>{d.exercises.length} øvelser · {d.focus}</div>
                </div>
                <Play size={20} color={C.accent} fill={C.accent} />
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const Stat = ({ icon: I, top, bot }) => (
  <Card style={{ flex: 1, padding: 14, textAlign: "center" }}>
    <I size={18} color={C.accent} style={{ marginBottom: 6 }} />
    <div className="disp" style={{ fontSize: 24, fontWeight: 600, lineHeight: 1 }}>{top}</div>
    <div style={{ color: C.muted, fontSize: 11 }}>{bot}</div>
  </Card>
);

/* ── Aktiv økt ───────────────────────────────────────────────── */
function Workout({ day, dayIndex, onFinish, onQuit, exerciseLog = {} }) {
  const [exIdx, setExIdx] = useState(0);
  const [prHit, setPrHit] = useState({}); // exIdx -> true når ny PR slått denne økten
  const [logs, setLogs] = useState(day.exercises.map((e) => Array.from({ length: e.sets }, () => ({ reps: "", kg: "", done: false }))));
  const [rest, setRest] = useState(0);
  const [resting, setResting] = useState(false);
  const [motiv, setMotiv] = useState("");
  const [showInfo, setShowInfo] = useState(false);
  const [gif, setGif] = useState(null); // url | null
  const [gifLoading, setGifLoading] = useState(false);

  const ex = day.exercises[exIdx];
  const info = exInfo(ex.name);

  // hent øvelses-GIF når vi bytter øvelse (faller stille tilbake på SVG)
  useEffect(() => {
    let alive = true;
    setGif(null); setGifLoading(true);
    fetchGif(ex).then((url) => { if (alive) { setGif(url); setGifLoading(false); } });
    return () => { alive = false; };
  }, [exIdx]);

  const last = lastEntry(exerciseLog, ex.name);
  const suggestion = suggestTarget(ex, last);
  const prevBest = bestE1RM(exerciseLog, ex.name);
  const totalSets = day.exercises.reduce((a, e) => a + e.sets, 0);
  const doneSets = logs.flat().filter((s) => s.done).length;
  const progress = Math.round((doneSets / totalSets) * 100);

  useEffect(() => {
    if (!resting) return;
    if (rest <= 0) { setResting(false); return; }
    const t = setTimeout(() => setRest((r) => r - 1), 1000);
    return () => clearTimeout(t);
  }, [resting, rest]);

  const completeSet = (si) => {
    let updated;
    setLogs((prev) => {
      const copy = prev.map((a) => a.map((s) => ({ ...s })));
      copy[exIdx][si].done = !copy[exIdx][si].done;
      if (!copy[exIdx][si].reps) copy[exIdx][si].reps = String(ex.reps).match(/\d+/)?.[0] || "";
      updated = copy;
      return copy;
    });
    // PR-sjekk: beste estimerte 1RM denne økten vs. tidligere beste
    if (updated && prevBest > 0) {
      const nowBest = topSet(updated[exIdx]).e;
      if (nowBest > prevBest && !prHit[exIdx]) setPrHit((p) => ({ ...p, [exIdx]: nowBest }));
    } else if (updated && prevBest === 0) {
      // første gang vi logger denne øvelsen med vekt — ingen PR-varsel ennå
    }
    setMotiv(MOTIVATION[Math.floor(Math.random() * MOTIVATION.length)]);
    setRest(ex.rest || 60); setResting(true);
    setTimeout(() => setMotiv(""), 2600);
  };
  const setField = (si, field, val) => {
    setLogs((prev) => { const c = prev.map((a) => a.map((s) => ({ ...s }))); c[exIdx][si][field] = val; return c; });
  };

  const lastEx = exIdx === day.exercises.length - 1;
  const exDone = logs[exIdx].every((s) => s.done);

  return (
    <div style={{ minHeight: "100%", display: "flex", flexDirection: "column" }}>
      {/* topp */}
      <div style={{ padding: "16px 18px 12px", borderBottom: `1px solid ${C.line}` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <button onClick={onQuit} className="tapscale" style={{ background: "none", color: C.muted, display: "flex", alignItems: "center", gap: 4, fontSize: 14 }}>
            <X size={18} /> Avslutt
          </button>
          <div className="disp up" style={{ fontSize: 12, color: C.muted }}>{day.day}</div>
          <div className="disp" style={{ fontSize: 14, color: C.accent, fontWeight: 600 }}>{progress}%</div>
        </div>
        <div style={{ height: 5, background: C.surface2, borderRadius: 5 }}>
          <div style={{ width: `${progress}%`, height: "100%", background: C.accent, borderRadius: 5, transition: "width .35s" }} />
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "18px 18px 120px" }}>
        <div className="fade" key={exIdx}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
            <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 18, padding: 8, position: "relative", minWidth: 136, minHeight: 136, display: "grid", placeItems: "center" }}>
              {gif ? (
                <img src={gif} alt={ex.name} loading="eager"
                  onError={() => setGif(null)}
                  style={{ width: 150, height: 150, objectFit: "contain", borderRadius: 12, background: "#fff" }} />
              ) : (
                <Demo type={info.demo} size={120} />
              )}
              {gifLoading && !gif && (
                <div style={{ position: "absolute", bottom: 6, right: 6 }}>
                  <Loader2 size={14} className="spin" color={C.muted} />
                </div>
              )}
            </div>
          </div>
          <div style={{ textAlign: "center", marginBottom: 4 }}>
            <Pill>{`Øvelse ${exIdx + 1}/${day.exercises.length}`}</Pill>
          </div>
          <h2 className="disp" style={{ fontSize: 28, fontWeight: 600, textAlign: "center", margin: "8px 0 2px" }}>{ex.name}</h2>
          <div style={{ textAlign: "center", color: C.muted, fontSize: 14, marginBottom: 6 }}>
            {ex.sets} sett × {ex.reps} {ex.muscle ? `· ${ex.muscle}` : ""}
          </div>

          {prHit[exIdx] && (
            <div className="fade" style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
              <span className="disp up" style={{ fontSize: 12, color: C.bg, background: C.warn, padding: "4px 12px", borderRadius: 999, display: "inline-flex", alignItems: "center", gap: 5, fontWeight: 700 }}>
                <Award size={14} /> Ny PR · {prHit[exIdx]} kg e1RM
              </span>
            </div>
          )}

          {(last || suggestion) && (
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 10 }}>
              {last && (
                <span style={{ fontSize: 12, color: C.muted, background: C.surface2, border: `1px solid ${C.line}`, padding: "5px 10px", borderRadius: 999 }}>
                  Sist: {topSet(last.sets).kg ? `${topSet(last.sets).reps}×${topSet(last.sets).kg.toString().replace(".", ",")} kg` : `${topSet(last.sets).reps} reps`}
                </span>
              )}
              {suggestion && (
                <span className="up" style={{ fontSize: 11, color: suggestion.why === "opp" ? C.ok : C.accent, background: suggestion.why === "opp" ? `${C.ok}18` : `${C.accent}18`, border: `1px solid ${suggestion.why === "opp" ? C.ok : C.accent}55`, padding: "5px 10px", borderRadius: 999, display: "inline-flex", alignItems: "center", gap: 5, fontWeight: 600 }}>
                  <TrendingUp size={13} /> {suggestion.text}
                </span>
              )}
            </div>
          )}

          <div style={{ textAlign: "center", marginBottom: 18 }}>
            <button onClick={() => setShowInfo((v) => !v)} className="tapscale"
              style={{ background: "none", color: C.accent, fontSize: 13, display: "inline-flex", alignItems: "center", gap: 5 }}>
              <Info size={15} /> {showInfo ? "Skjul teknikk" : "Vis teknikk"}
            </button>
          </div>

          {showInfo && (
            <Card className="fade" style={{ marginBottom: 18, background: C.surface2 }}>
              {ex.notes && <p style={{ fontSize: 14, margin: "0 0 10px", color: C.ink }}>{ex.notes}</p>}
              {info.cues.map((c, i) => (
                <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6, fontSize: 14, color: C.ink }}>
                  <span style={{ color: C.accent }}>›</span> {c}
                </div>
              ))}
            </Card>
          )}

          {/* sett */}
          <div style={{ display: "grid", gap: 10 }}>
            {logs[exIdx].map((s, si) => (
              <div key={si} style={{ display: "flex", alignItems: "center", gap: 10, background: s.done ? `${C.ok}14` : C.surface,
                border: `1px solid ${s.done ? `${C.ok}55` : C.line}`, borderRadius: 14, padding: "10px 12px" }}>
                <div className="disp" style={{ width: 26, fontSize: 18, color: s.done ? C.ok : C.muted, fontWeight: 600 }}>{si + 1}</div>
                <NumField label="reps" val={s.reps} onChange={(v) => setField(si, "reps", v)} ph={String(ex.reps).match(/\d+/)?.[0] || "—"} />
                <NumField label="kg" val={s.kg} onChange={(v) => setField(si, "kg", v)} ph="—" />
                <button onClick={() => completeSet(si)} className="tapscale"
                  style={{ marginLeft: "auto", width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                    background: s.done ? C.ok : C.surface2, color: s.done ? C.bg : C.muted, display: "grid", placeItems: "center" }}>
                  <Check size={22} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* hvile-overlay */}
      {resting && rest > 0 && (
        <div className="fade" style={{ position: "absolute", left: 16, right: 16, bottom: 96, background: C.surface2, border: `1px solid ${C.accent}55`,
          borderRadius: 16, padding: "12px 16px", display: "flex", alignItems: "center", gap: 14 }}>
          <Clock size={22} color={C.accent} />
          <div style={{ flex: 1 }}>
            <div className="disp" style={{ fontSize: 22, fontWeight: 600 }}>{rest}s <span style={{ fontSize: 13, color: C.muted }}>hvile</span></div>
            {motiv && <div style={{ fontSize: 12, color: C.accent }}>{motiv}</div>}
          </div>
          <button onClick={() => { setResting(false); setRest(0); }} style={{ background: "none", color: C.muted, fontSize: 13 }}>Hopp over</button>
        </div>
      )}

      {/* bunn-knapp */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: 16, background: `linear-gradient(transparent, ${C.bg} 30%)` }}>
        {lastEx ? (
          <button onClick={() => onFinish(logs)} className="tapscale"
            style={{ width: "100%", height: 54, borderRadius: 14, background: exDone ? C.ok : C.accent, color: C.bg, fontWeight: 700 }}>
            <span className="disp up" style={{ fontSize: 16 }}>Fullfør økt</span>
          </button>
        ) : (
          <button onClick={() => { setExIdx((i) => i + 1); setResting(false); setShowInfo(false); }} className="tapscale"
            style={{ width: "100%", height: 54, borderRadius: 14, background: C.accent, color: C.bg, fontWeight: 700,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <span className="disp up" style={{ fontSize: 16 }}>Neste øvelse</span><ChevronRight size={20} />
          </button>
        )}
      </div>
    </div>
  );
}

function NumField({ label, val, onChange, ph }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <input value={val} onChange={(e) => onChange(e.target.value.replace(/[^0-9.,]/g, ""))} inputMode="decimal" placeholder={ph}
        style={{ width: 58, textAlign: "center", background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 10,
          color: C.ink, fontSize: 18, padding: "8px 0", outline: "none", fontFamily: "'Oswald',sans-serif", fontWeight: 600 }} />
      <span className="up" style={{ fontSize: 10, color: C.muted, marginTop: 3 }}>{label}</span>
    </div>
  );
}

/* ── Fullført-skjerm ─────────────────────────────────────────── */
function Done({ day, logs, summary, loading, onHome }) {
  const sets = logs.flat().filter((s) => s.done).length;
  const volume = logs.flat().reduce((a, s) => a + (parseFloat(s.reps) || 0) * (parseFloat(s.kg) || 0), 0);
  return (
    <div style={{ minHeight: "100%", display: "flex", flexDirection: "column", padding: 24, justifyContent: "center" }}>
      <div className="fade" style={{ textAlign: "center" }}>
        <div style={{ width: 90, height: 90, margin: "0 auto 20px", borderRadius: "50%", background: `${C.ok}22`, display: "grid", placeItems: "center", animation: "pop .5s ease both" }}>
          <Trophy size={42} color={C.ok} />
        </div>
        <h1 className="disp" style={{ fontSize: 32, fontWeight: 700, margin: "0 0 4px" }}>Økt fullført</h1>
        <p style={{ color: C.muted, margin: "0 0 24px" }}>{day.day}</p>
        <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
          <Stat icon={Check} top={sets} bot="sett" />
          <Stat icon={Dumbbell} top={Math.round(volume) || "—"} bot="kg volum" />
          <Stat icon={Target} top={day.exercises.length} bot="øvelser" />
        </div>
        <Card style={{ textAlign: "left", marginBottom: 24, background: C.surface2 }}>
          <div className="up" style={{ fontSize: 11, color: C.accent, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
            <MessageCircle size={14} /> Fra treneren
          </div>
          {loading ? <Loader2 size={18} className="spin" color={C.muted} /> : <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5 }}>{summary}</p>}
        </Card>
        <button onClick={onHome} className="tapscale" style={{ width: "100%", height: 54, borderRadius: 14, background: C.accent, color: C.bg, fontWeight: 700 }}>
          <span className="disp up" style={{ fontSize: 16 }}>Tilbake til programmet</span>
        </button>
      </div>
    </div>
  );
}

/* ── Historikk ───────────────────────────────────────────────── */
function HistoryView({ history }) {
  return (
    <div style={{ padding: "24px 18px 100px" }}>
      <h1 className="disp" style={{ fontSize: 28, fontWeight: 600, margin: "0 0 18px" }}>Logg</h1>
      {history.length === 0 ? (
        <Card style={{ textAlign: "center", padding: 32 }}>
          <History size={32} color={C.muted} style={{ marginBottom: 10 }} />
          <p style={{ color: C.muted, margin: 0 }}>Ingen økter logget ennå. Fullfør en økt så dukker den opp her.</p>
        </Card>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {[...history].reverse().map((h, i) => (
            <Card key={i} style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: `${C.ok}22`, display: "grid", placeItems: "center" }}>
                <Check size={20} color={C.ok} />
              </div>
              <div style={{ flex: 1 }}>
                <div className="disp" style={{ fontSize: 16, fontWeight: 600 }}>{h.dayName}</div>
                <div style={{ color: C.muted, fontSize: 13 }}>{h.date} · {h.sets} sett · {h.volume} kg volum</div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Coach-chat ──────────────────────────────────────────────── */
function Coach({ profile, program }) {
  const [msgs, setMsgs] = useState([{ role: "assistant", content: "Hei! Jeg er treneren din. Spør om øvelser, teknikk, kosthold eller om du vil bytte noe i programmet." }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const newMsgs = [...msgs, { role: "user", content: text }];
    setMsgs(newMsgs); setInput(""); setLoading(true);
    const system = `Du er en kunnskapsrik, direkte og motiverende norsk personlig trener. Svar kort og praktisk på norsk. ` +
      `Brukeren har dette programmet: ${program.name}. Mål: ${profile.goalLabel}. Nivå: ${profile.levelLabel}. Utstyr: ${profile.equipLabel}. ` +
      (profile.limits ? `Hensyn: ${profile.limits}. ` : "") + `Gi konkrete råd. Ved tvil om helse/smerte, anbefal å sjekke med lege/fysioterapeut.`;
    try {
      const reply = await callClaude(newMsgs.map((m) => ({ role: m.role, content: m.content })), system, 700);
      setMsgs((m) => [...m, { role: "assistant", content: reply || "Beklager, jeg fikk ikke til å svare nå." }]);
    } catch {
      setMsgs((m) => [...m, { role: "assistant", content: "Klarte ikke å koble til akkurat nå — prøv igjen." }]);
    }
    setLoading(false);
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "20px 18px 12px", borderBottom: `1px solid ${C.line}` }}>
        <h1 className="disp" style={{ fontSize: 24, fontWeight: 600, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: C.ok, display: "inline-block" }} /> Treneren
        </h1>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px 90px", display: "flex", flexDirection: "column", gap: 12 }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "82%" }}>
            <div style={{ background: m.role === "user" ? C.accent : C.surface, color: m.role === "user" ? C.bg : C.ink,
              border: m.role === "user" ? "none" : `1px solid ${C.line}`, borderRadius: 16, padding: "10px 14px", fontSize: 15, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && <div style={{ alignSelf: "flex-start" }}><Loader2 className="spin" size={20} color={C.muted} /></div>}
        <div ref={endRef} />
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 70, padding: "0 14px 10px", background: `linear-gradient(transparent, ${C.bg} 40%)` }}>
        <div style={{ display: "flex", gap: 8, background: C.surface, border: `1px solid ${C.line}`, borderRadius: 16, padding: 6 }}>
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Spør treneren…" style={{ flex: 1, background: "none", border: "none", outline: "none", color: C.ink, fontSize: 15, padding: "8px 10px" }} />
          <button onClick={send} className="tapscale" style={{ width: 42, height: 42, borderRadius: 12, background: C.accent, color: C.bg, display: "grid", placeItems: "center", flexShrink: 0 }}>
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Fremgang / progresjon ───────────────────────────────────── */
function ExerciseTrend({ name, entries }) {
  const [open, setOpen] = useState(false);
  const data = entries.map((e, i) => { const t = topSet(e.sets); return { i: i + 1, date: e.date, e1rm: t.e, kg: t.kg, reps: t.reps }; });
  const best = data.reduce((m, d) => Math.max(m, d.e1rm), 0);
  const first = data[0]?.e1rm || 0;
  const latest = data[data.length - 1]?.e1rm || 0;
  const delta = latest - first;
  const trendColor = delta > 0 ? C.ok : delta < 0 ? "#E36A6A" : C.muted;
  const Arrow = delta >= 0 ? TrendingUp : TrendingUp;

  return (
    <Card style={{ padding: 0, overflow: "hidden" }}>
      <div onClick={() => setOpen((v) => !v)} className="tapscale" style={{ display: "flex", alignItems: "center", gap: 12, padding: 14, cursor: "pointer" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="disp" style={{ fontSize: 16, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
          <div style={{ color: C.muted, fontSize: 12 }}>
            {data.length} {data.length === 1 ? "økt" : "økter"} · beste {best} kg e1RM
          </div>
        </div>
        {delta !== 0 && (
          <span className="disp" style={{ fontSize: 13, color: trendColor, display: "inline-flex", alignItems: "center", gap: 3, fontWeight: 600 }}>
            <Arrow size={15} style={{ transform: delta < 0 ? "scaleY(-1)" : "none" }} /> {delta > 0 ? "+" : ""}{delta} kg
          </span>
        )}
        <ChevronDown size={18} color={C.muted} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
      </div>
      {open && (
        <div className="fade" style={{ padding: "0 8px 14px" }}>
          {data.length < 2 ? (
            <div style={{ color: C.muted, fontSize: 13, textAlign: "center", padding: "8px 0 14px" }}>
              Logg én økt til så tegner vi kurven. Sist: {data[0]?.reps}×{data[0]?.kg} kg.
            </div>
          ) : (
            <div style={{ height: 150 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 8, right: 14, left: -16, bottom: 0 }}>
                  <XAxis dataKey="date" stroke={C.muted} fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke={C.muted} fontSize={11} tickLine={false} axisLine={false} width={36} domain={["dataMin - 5", "dataMax + 5"]} />
                  <Tooltip
                    contentStyle={{ background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 10, fontSize: 12 }}
                    labelStyle={{ color: C.muted }} itemStyle={{ color: C.ink }}
                    formatter={(v) => [`${v} kg`, "Est. 1RM"]} />
                  <Line type="monotone" dataKey="e1rm" stroke={C.accent} strokeWidth={2.5} dot={{ r: 3, fill: C.accent }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function Progress({ program, history, exerciseLog }) {
  const names = Object.keys(exerciseLog);
  const totalVolume = history.reduce((a, h) => a + (h.volume || 0), 0);
  // beste enkeltløft på tvers
  let topLift = null;
  names.forEach((n) => exerciseLog[n].forEach((e) => { const t = topSet(e.sets); if (t.kg && (!topLift || t.kg > topLift.kg)) topLift = { name: n, kg: t.kg, reps: t.reps }; }));
  // sorter øvelser: flest økter først
  const sorted = [...names].sort((a, b) => exerciseLog[b].length - exerciseLog[a].length);

  return (
    <div style={{ padding: "24px 18px 100px" }}>
      <h1 className="disp" style={{ fontSize: 28, fontWeight: 600, margin: "0 0 4px" }}>Fremgang</h1>
      <p style={{ color: C.muted, fontSize: 14, margin: "0 0 18px" }}>Progressiv overbelastning — tallene over tid.</p>

      {names.length === 0 ? (
        <Card style={{ textAlign: "center", padding: 32 }}>
          <TrendingUp size={32} color={C.muted} style={{ marginBottom: 10 }} />
          <p style={{ color: C.muted, margin: 0 }}>Fullfør noen økter med vekt på, så ser du kurvene dine vokse her.</p>
        </Card>
      ) : (
        <>
          <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
            <Stat icon={Trophy} top={history.length} bot="økter" />
            <Stat icon={Dumbbell} top={(totalVolume / 1000).toFixed(1) + "t"} bot="total volum" />
            <Stat icon={Award} top={topLift ? topLift.kg : "—"} bot="tyngste løft" />
          </div>

          {topLift && (
            <Card style={{ marginBottom: 18, display: "flex", alignItems: "center", gap: 12, background: C.surface2, borderColor: `${C.warn}44` }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: `${C.warn}22`, display: "grid", placeItems: "center", flexShrink: 0 }}>
                <Award size={22} color={C.warn} />
              </div>
              <div>
                <div className="up" style={{ fontSize: 11, color: C.warn }}>Tyngste løft</div>
                <div className="disp" style={{ fontSize: 16, fontWeight: 600 }}>{topLift.name} · {topLift.reps}×{topLift.kg.toString().replace(".", ",")} kg</div>
              </div>
            </Card>
          )}

          <div className="disp up" style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>Per øvelse</div>
          <div style={{ display: "grid", gap: 12 }}>
            {sorted.map((n) => <ExerciseTrend key={n} name={n} entries={exerciseLog[n]} />)}
          </div>
        </>
      )}
    </div>
  );
}

/* ── Bunn-navigasjon ─────────────────────────────────────────── */
function Nav({ tab, setTab }) {
  const items = [
    { id: "home", label: "Trening", icon: Home },
    { id: "progress", label: "Fremgang", icon: TrendingUp },
    { id: "history", label: "Logg", icon: History },
    { id: "coach", label: "Trener", icon: MessageCircle },
  ];
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 70, background: C.surface, borderTop: `1px solid ${C.line}`,
      display: "flex", alignItems: "center", justifyContent: "space-around", paddingBottom: 4 }}>
      {items.map((it) => {
        const I = it.icon; const on = tab === it.id;
        return (
          <button key={it.id} onClick={() => setTab(it.id)} style={{ background: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, color: on ? C.accent : C.muted }}>
            <I size={22} />
            <span className="up" style={{ fontSize: 10, fontWeight: 600 }}>{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ── App ─────────────────────────────────────────────────────── */
export default function App() {
  const [screen, setScreen] = useState("onboarding"); // onboarding|generating|app|workout|done
  const [tab, setTab] = useState("home");
  const [profile, setProfile] = useState(null);
  const [program, setProgram] = useState(null);
  const [history, setHistory] = useState([]);
  const [exerciseLog, setExerciseLog] = useState({}); // navn -> [{date, sets:[{reps,kg}]}]
  const [active, setActive] = useState(null); // {day, dayIndex}
  const [finished, setFinished] = useState(null); // {day, logs, summary, loading}
  const [hydrated, setHydrated] = useState(false);

  // last lagret tilstand ved oppstart
  useEffect(() => {
    try {
      const raw = localStorage.getItem("pt_state_v1");
      if (raw) {
        const s = JSON.parse(raw);
        if (s.profile) setProfile(s.profile);
        if (s.program) { setProgram(s.program); setScreen("app"); }
        if (s.history) setHistory(s.history);
        if (s.exerciseLog) setExerciseLog(s.exerciseLog);
      }
    } catch (e) {}
    setHydrated(true);
  }, []);

  // lagre tilstand når den endres
  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem("pt_state_v1", JSON.stringify({ profile, program, history, exerciseLog })); } catch (e) {}
  }, [hydrated, profile, program, history, exerciseLog]);

  const reset = () => {
    try { localStorage.removeItem("pt_state_v1"); } catch (e) {}
    setProfile(null); setProgram(null); setHistory([]); setExerciseLog({});
    setActive(null); setFinished(null); setTab("home"); setScreen("onboarding");
  };

  const onOnboardDone = async (p) => {
    setProfile(p); setScreen("generating");
    const prog = await generateProgram(p);
    setProgram(prog); setScreen("app"); setTab("home");
  };

  const startWorkout = (i) => { setActive({ day: program.days[i], dayIndex: i }); setScreen("workout"); };

  const finishWorkout = async (logs) => {
    const day = active.day;
    const sets = logs.flat().filter((s) => s.done).length;
    const volume = Math.round(logs.flat().reduce((a, s) => a + (parseFloat(s.reps) || 0) * (parseFloat(s.kg) || 0), 0));
    const entry = { dayIndex: active.dayIndex, dayName: day.day, date: new Date().toLocaleDateString("no-NO", { day: "numeric", month: "short" }), sets, volume };
    setHistory((h) => [...h, entry]);
    // logg per øvelse for progresjon
    const stamp = Date.now();
    setExerciseLog((prev) => {
      const copy = { ...prev };
      day.exercises.forEach((e, ei) => {
        const done = logs[ei].filter((s) => s.done).map((s) => ({ reps: parseFloat(s.reps) || 0, kg: parseFloat(s.kg) || 0 }));
        if (!done.length) return;
        copy[e.name] = [...(copy[e.name] || []), { t: stamp, date: entry.date, sets: done }];
      });
      return copy;
    });
    setFinished({ day, logs, summary: "", loading: true });
    setScreen("done");
    try {
      const reply = await callClaude(
        [{ role: "user", content: `Jeg fullførte nettopp økten «${day.day}» med ${sets} sett${volume ? `, ca ${volume} kg total volum` : ""}. Gi meg én kort, ekte motiverende melding (1–2 setninger), ingen klisjeer.` }],
        "Du er en varm, ærlig norsk personlig trener. Svar med kun selve meldingen på norsk.", 200
      );
      setFinished((f) => ({ ...f, summary: reply || "Solid jobba. Hvile godt — det er der kroppen bygger seg opp.", loading: false }));
    } catch {
      setFinished((f) => ({ ...f, summary: "Solid jobba i dag. Restitusjon er en del av treningen — spis og sov godt.", loading: false }));
    }
  };

  return (
    <div className="pt-root" style={{ position: "relative", width: "100%", maxWidth: 480, margin: "0 auto",
      height: "100dvh", overflow: "hidden", background: C.bg }}>
      <style>{STYLE}</style>
      <div style={{ position: "absolute", inset: 0, overflowY: "auto" }}>
        {screen === "onboarding" && <Onboarding onDone={onOnboardDone} />}
        {screen === "generating" && <Generating />}
        {screen === "app" && (
          <>
            {tab === "home" && <HomeView profile={profile} program={program} history={history} onStart={startWorkout} onReset={reset} />}
            {tab === "progress" && <Progress program={program} history={history} exerciseLog={exerciseLog} />}
            {tab === "history" && <HistoryView history={history} />}
            {tab === "coach" && <Coach profile={profile} program={program} />}
            <Nav tab={tab} setTab={setTab} />
          </>
        )}
        {screen === "workout" && active && (
          <Workout day={active.day} dayIndex={active.dayIndex} onFinish={finishWorkout} onQuit={() => setScreen("app")} exerciseLog={exerciseLog} />
        )}
        {screen === "done" && finished && (
          <Done {...finished} onHome={() => { setScreen("app"); setTab("home"); setFinished(null); }} />
        )}
      </div>
    </div>
  );
}
