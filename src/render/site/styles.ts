import type { THEME_PRESETS } from "../../schema.js";

type Preset = (typeof THEME_PRESETS)[number];

interface Colors {
  bg: string;
  bg2: string;
  fg: string;
  muted: string;
  line: string;
  card: string;
  accent: string;
  accent2: string;
  light?: boolean;
}

/** Default accent for simple mode (used for small highlights only). */
export const SIMPLE_ACCENT = "#2563eb";

export const PRESET_COLORS: Record<Preset, Colors> = {
  cyber: { bg: "#05060f", bg2: "#0b0e1f", fg: "#e6f1ff", muted: "#8892b0", line: "rgba(125,211,252,.14)", card: "rgba(15,20,40,.6)", accent: "#22d3ee", accent2: "#a855f7" },
  midnight: { bg: "#0b1020", bg2: "#121a33", fg: "#e2e8f0", muted: "#94a3b8", line: "rgba(148,163,184,.16)", card: "rgba(20,28,52,.65)", accent: "#6366f1", accent2: "#ec4899" },
  matrix: { bg: "#020a04", bg2: "#06140a", fg: "#c8ffd4", muted: "#5fa872", line: "rgba(34,197,94,.18)", card: "rgba(4,24,10,.7)", accent: "#22c55e", accent2: "#a3e635" },
  synthwave: { bg: "#13002b", bg2: "#1e0640", fg: "#fde7ff", muted: "#c39bd3", line: "rgba(244,114,182,.2)", card: "rgba(40,8,72,.6)", accent: "#f472b6", accent2: "#facc15" },
  ocean: { bg: "#03141f", bg2: "#06212f", fg: "#e0f7ff", muted: "#7fb3c8", line: "rgba(56,189,248,.16)", card: "rgba(6,36,52,.6)", accent: "#38bdf8", accent2: "#2dd4bf" },
  ember: { bg: "#120806", bg2: "#1d0f0a", fg: "#fff1e6", muted: "#c4a08a", line: "rgba(251,146,60,.18)", card: "rgba(40,18,10,.62)", accent: "#fb923c", accent2: "#ef4444" },
  aurora: { bg: "#06101a", bg2: "#0c1a28", fg: "#ecfeff", muted: "#8fb5c4", line: "rgba(45,212,191,.16)", card: "rgba(12,28,40,.55)", accent: "#2dd4bf", accent2: "#818cf8" },
  mono: { bg: "#0a0a0a", bg2: "#141414", fg: "#fafafa", muted: "#a1a1a1", line: "rgba(255,255,255,.12)", card: "rgba(24,24,24,.7)", accent: "#fafafa", accent2: "#737373" },
  paper: { bg: "#f7f6f3", bg2: "#efede8", fg: "#262421", muted: "#79746c", line: "rgba(38,36,33,.1)", card: "rgba(255,255,255,.85)", accent: "#0f766e", accent2: "#b45309", light: true },
  daylight: { bg: "#f5f7fb", bg2: "#e9eef7", fg: "#0f172a", muted: "#5b6476", line: "rgba(15,23,42,.1)", card: "rgba(255,255,255,.8)", accent: "#2563eb", accent2: "#7c3aed", light: true },
};

function presetCss(): string {
  return Object.entries(PRESET_COLORS)
    .map(
      ([k, c]) =>
        `[data-preset="${k}"]{--bg:${c.bg};--bg2:${c.bg2};--fg:${c.fg};--muted:${c.muted};--line:${c.line};--card:${c.card};--accent2:${c.accent2};--shadow:${c.light ? "0 10px 30px -12px rgba(15,23,42,.18)" : "0 20px 50px -20px rgba(0,0,0,.7)"};color-scheme:${c.light ? "light" : "dark"}}`,
    )
    .join("\n");
}

export function siteCss(): string {
  return `
${presetCss()}
:root{--radius:16px;--ease:cubic-bezier(.2,.8,.2,1);--sans:"Inter","Noto Sans TC",system-ui,-apple-system,"Segoe UI",sans-serif;--mono:"JetBrains Mono",ui-monospace,"SFMono-Regular",Consolas,monospace;--display:"Space Grotesk","Inter","Noto Sans TC",system-ui,sans-serif}
[data-font="mono"]{--sans:var(--mono);--display:var(--mono)}
[data-font="display"]{--sans:"Space Grotesk","Noto Sans TC",system-ui,sans-serif}
[data-font="system"]{--sans:system-ui,-apple-system,"Segoe UI","Noto Sans TC",sans-serif;--display:var(--sans);--mono:ui-monospace,Consolas,monospace}
*,*::before,*::after{box-sizing:border-box}
html{scroll-behavior:smooth;scroll-padding-top:72px}
body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.6 var(--sans);-webkit-font-smoothing:antialiased;overflow-x:hidden;transition:background .5s var(--ease),color .3s}
a{color:var(--accent);text-decoration:none}
a:hover{text-decoration:underline;text-underline-offset:3px}
button{font:inherit;color:inherit}
kbd{font:600 .72rem var(--mono);padding:1px 6px;border:1px solid var(--line);border-bottom-width:2px;border-radius:6px;color:var(--muted);background:color-mix(in srgb,var(--bg2) 70%,transparent)}
::selection{background:color-mix(in srgb,var(--accent) 35%,transparent)}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
img{max-width:100%}

/* ── background layers ── */
#bg{position:fixed;inset:0;width:100%;height:100%;z-index:-3;pointer-events:none}
.aurora{position:fixed;inset:-20%;z-index:-4;pointer-events:none;opacity:0;transition:opacity .8s;filter:blur(80px) saturate(140%)}
.aurora i{position:absolute;width:45vmax;height:45vmax;border-radius:50%;opacity:.45;mix-blend-mode:screen}
.aurora i:nth-child(1){background:var(--accent);top:5%;left:10%;animation:float1 22s ease-in-out infinite alternate}
.aurora i:nth-child(2){background:var(--accent2);top:30%;right:5%;animation:float2 28s ease-in-out infinite alternate}
.aurora i:nth-child(3){background:color-mix(in srgb,var(--accent) 50%,var(--accent2));bottom:0;left:30%;animation:float3 25s ease-in-out infinite alternate}
[data-preset="paper"] .aurora i,[data-preset="daylight"] .aurora i{mix-blend-mode:multiply;opacity:.18}
[data-bg="aurora"] .aurora{opacity:1}
@keyframes float1{to{transform:translate(20vw,15vh) scale(1.2)}}
@keyframes float2{to{transform:translate(-25vw,10vh) scale(.85)}}
@keyframes float3{to{transform:translate(10vw,-20vh) scale(1.15)}}
.gridlines{position:fixed;inset:0;z-index:-2;pointer-events:none;background-image:linear-gradient(var(--line) 1px,transparent 1px),linear-gradient(90deg,var(--line) 1px,transparent 1px);background-size:56px 56px;mask-image:radial-gradient(ellipse at 50% 0%,#000 10%,transparent 70%);opacity:.35}
[data-bg="grid"] .gridlines,[data-bg="none"] .gridlines{opacity:.15}
.noise{position:fixed;inset:0;z-index:-1;pointer-events:none;opacity:.035;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")}
.cursor-glow{position:fixed;left:0;top:0;width:520px;height:520px;margin:-260px 0 0 -260px;border-radius:50%;pointer-events:none;z-index:-1;background:radial-gradient(circle,color-mix(in srgb,var(--accent) 16%,transparent),transparent 65%);transform:translate(var(--cx,-999px),var(--cy,-999px));transition:opacity .3s;opacity:0}
[data-glow="true"] .cursor-glow.on{opacity:1}
#progress{position:fixed;top:0;left:0;height:2px;width:100%;transform-origin:0 50%;transform:scaleX(var(--p,0));background:linear-gradient(90deg,var(--accent),var(--accent2));z-index:60;box-shadow:0 0 12px var(--accent)}

/* ── nav ── */
.nav{position:sticky;top:0;z-index:50;display:flex;align-items:center;gap:16px;padding:10px max(16px,calc((100vw - 1180px)/2));backdrop-filter:blur(14px) saturate(160%);-webkit-backdrop-filter:blur(14px) saturate(160%);background:color-mix(in srgb,var(--bg) 65%,transparent);border-bottom:1px solid var(--line)}
.brand{display:flex;align-items:center;gap:10px;font:700 1rem var(--display);color:var(--fg)}
.brand:hover{text-decoration:none}
.brand img{border-radius:50%;border:1px solid var(--line)}
.nav nav{display:flex;gap:4px;margin:0 auto;overflow-x:auto;scrollbar-width:none}
.nav nav a{color:var(--muted);padding:6px 12px;border-radius:999px;font-size:.88rem;white-space:nowrap;transition:color .2s,background .2s}
.nav nav a:hover,.nav nav a.on{color:var(--fg);background:color-mix(in srgb,var(--accent) 14%,transparent);text-decoration:none}
.nav-actions{display:flex;gap:8px}
.icon-btn{display:inline-flex;align-items:center;gap:8px;height:36px;padding:0 10px;border-radius:10px;border:1px solid var(--line);background:color-mix(in srgb,var(--bg2) 60%,transparent);cursor:pointer;transition:border-color .2s,transform .2s}
.icon-btn:hover{border-color:var(--accent);transform:translateY(-1px)}
@media (max-width:760px){.nav nav{display:none}.nav-actions{margin-left:auto}.icon-btn kbd{display:none}}

main{max-width:1180px;margin:0 auto;padding:0 16px}

/* ── hero ── */
.hero{min-height:calc(100vh - 60px);display:grid;grid-template-columns:1.2fr 1fr;gap:48px;align-items:center;padding:64px 0 48px}
@media (max-width:960px){.hero{grid-template-columns:1fr;min-height:auto;padding-top:48px}}
.avatar{width:104px;height:104px;border-radius:50%;padding:3px;margin-bottom:20px;background:conic-gradient(from var(--ang,0deg),var(--accent),var(--accent2),var(--accent));animation:spin 6s linear infinite;box-shadow:0 0 40px -6px var(--accent)}
.avatar img{width:100%;height:100%;border-radius:50%;display:block;border:3px solid var(--bg);object-fit:cover}
@property --ang{syntax:"<angle>";initial-value:0deg;inherits:false}
@keyframes spin{to{--ang:360deg}}
.eyebrow{font:500 .9rem var(--mono);color:var(--accent);margin:0 0 8px;letter-spacing:.04em}
.blink{animation:blink 1s steps(1) infinite}
@keyframes blink{50%{opacity:0}}
.hero h1{font:800 clamp(2.4rem,7vw,4.6rem)/1.18 var(--display);padding-bottom:.06em;letter-spacing:-.035em;margin:0 0 14px;background:linear-gradient(120deg,var(--fg) 30%,var(--accent) 60%,var(--accent2));background-size:200% auto;-webkit-background-clip:text;background-clip:text;color:transparent;animation:shimmer 8s linear infinite;position:relative;word-break:break-word}
@keyframes shimmer{to{background-position:-200% center}}
.glitch:hover::before,.glitch:hover::after{content:attr(data-text);position:absolute;inset:0;background:inherit;-webkit-background-clip:text;background-clip:text}
.glitch:hover::before{animation:glitch1 .35s steps(2) infinite;color:var(--accent);opacity:.7;-webkit-text-fill-color:var(--accent);clip-path:inset(0 0 55% 0)}
.glitch:hover::after{animation:glitch2 .35s steps(2) infinite;-webkit-text-fill-color:var(--accent2);opacity:.7;clip-path:inset(50% 0 0 0)}
@keyframes glitch1{0%{transform:translate(2px,-1px)}50%{transform:translate(-3px,1px)}100%{transform:translate(1px,0)}}
@keyframes glitch2{0%{transform:translate(-2px,1px)}50%{transform:translate(3px,-1px)}100%{transform:translate(-1px,0)}}
.roles{font:500 clamp(1.05rem,2.4vw,1.4rem) var(--mono);color:var(--fg);margin:0 0 18px;min-height:1.6em}
.roles .cursor{color:var(--accent);animation:blink 1s steps(1) infinite;margin-left:2px}
.intro{color:var(--muted);font-size:1.05rem;max-width:56ch;margin:0 0 14px}
.hero-meta{display:flex;flex-wrap:wrap;gap:16px;color:var(--muted);font-size:.9rem;margin:0 0 22px}
.ctas{display:flex;flex-wrap:wrap;gap:12px;margin-bottom:34px}
.btn{display:inline-flex;align-items:center;gap:8px;padding:11px 20px;border-radius:calc(var(--radius) * .75);font-weight:600;border:1px solid var(--line);cursor:pointer;transition:transform .25s var(--ease),box-shadow .25s,border-color .25s,background .25s;position:relative;will-change:transform}
.btn:hover{text-decoration:none}
.btn.primary{background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff;border-color:transparent;box-shadow:0 8px 30px -10px var(--accent)}
[data-preset="mono"] .btn.primary{color:#000}
.btn.primary:hover{box-shadow:0 12px 40px -8px var(--accent)}
.btn.ghost{background:color-mix(in srgb,var(--bg2) 60%,transparent);color:var(--fg)}
.btn.ghost:hover{border-color:var(--accent)}
.bi{width:16px;height:16px;flex:none}
.counters{display:flex;flex-wrap:wrap;gap:12px 32px;margin:0}
.counters div{min-width:84px}
.counters dt{font:700 2rem/1 var(--display);background:linear-gradient(180deg,var(--fg),var(--muted));-webkit-background-clip:text;background-clip:text;color:transparent;font-variant-numeric:tabular-nums}
.counters dd{margin:6px 0 0;color:var(--muted);font-size:.82rem}

.terminal{border-radius:var(--radius);border:1px solid var(--line);background:color-mix(in srgb,var(--bg2) 85%,transparent);box-shadow:var(--shadow),0 0 0 1px color-mix(in srgb,var(--accent) 10%,transparent),0 0 60px -30px var(--accent);overflow:hidden;backdrop-filter:blur(10px);transform:perspective(1200px) rotateY(-8deg) rotateX(4deg);transition:transform .6s var(--ease)}
.terminal:hover{transform:none}
@media (max-width:960px){.terminal{transform:none}}
.term-bar{display:flex;align-items:center;gap:7px;padding:10px 14px;border-bottom:1px solid var(--line);font:.75rem var(--mono);color:var(--muted)}
.term-bar i{width:11px;height:11px;border-radius:50%;background:#ff5f57}
.term-bar i:nth-child(2){background:#febc2e}.term-bar i:nth-child(3){background:#28c840}
.term-bar span{margin-left:8px}
.term-body{margin:0;padding:16px 18px 20px;font:13px/1.7 var(--mono);color:var(--fg);min-height:290px;white-space:pre-wrap;word-break:break-word}
.term-body .p{color:var(--accent)}.term-body .ok{color:#4ade80}.term-body .dim{color:var(--muted)}.term-body .hl{color:var(--accent2)}
.term-body .cur{display:inline-block;width:8px;height:1.1em;vertical-align:-2px;background:var(--accent);animation:blink 1s steps(1) infinite}

/* ── sections ── */
.sec{padding:72px 0 24px}
.sec-head{display:flex;gap:18px;align-items:flex-start;margin-bottom:28px}
.sec-idx{font:600 .8rem var(--mono);color:var(--accent);padding:4px 8px;border:1px solid color-mix(in srgb,var(--accent) 40%,transparent);border-radius:8px;margin-top:8px;background:color-mix(in srgb,var(--accent) 8%,transparent)}
.sec-head h2{font:700 clamp(1.6rem,3.6vw,2.3rem)/1.15 var(--display);margin:0 0 4px;letter-spacing:-.02em}
.sec-head p{margin:0;color:var(--muted)}
.panel{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);padding:22px;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);box-shadow:var(--shadow)}

/* ── toolbar ── */
.toolbar{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-bottom:12px}
.search{flex:1 1 260px;display:flex;align-items:center;gap:8px;padding:0 12px;height:42px;border-radius:12px;border:1px solid var(--line);background:var(--card);transition:border-color .2s,box-shadow .2s}
.search:focus-within{border-color:var(--accent);box-shadow:0 0 0 4px color-mix(in srgb,var(--accent) 18%,transparent)}
.search span{color:var(--muted);font-size:1.1rem}
.search input{flex:1;min-width:0;border:0;background:none;color:var(--fg);font:inherit;outline:none;height:100%}
.seg{display:flex;flex-wrap:wrap;gap:4px;padding:4px;border-radius:12px;border:1px solid var(--line);background:var(--card)}
.seg button{display:inline-flex;align-items:center;gap:6px;border:0;background:none;padding:6px 10px;border-radius:8px;cursor:pointer;color:var(--muted);font-size:.85rem;transition:background .2s,color .2s}
.seg button b{font-weight:600;font-size:.75rem;opacity:.7}
.seg button[aria-pressed="true"]{background:color-mix(in srgb,var(--accent) 18%,transparent);color:var(--fg)}
.icon-seg button svg{width:15px;height:15px;fill:currentColor}
.tool-right{display:flex;gap:10px;margin-left:auto;flex-wrap:wrap}
.select{display:flex;align-items:center;gap:8px;padding:0 10px;height:42px;border-radius:12px;border:1px solid var(--line);background:var(--card);font-size:.85rem;color:var(--muted)}
.select select{border:0;background:none;color:var(--fg);font:inherit;outline:none;cursor:pointer}
.select option{background:var(--bg2);color:var(--fg)}
.chips{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:22px}
.chip{display:inline-flex;align-items:center;gap:6px;padding:5px 10px;border-radius:999px;border:1px solid var(--line);background:var(--card);cursor:pointer;font-size:.8rem;color:var(--muted);transition:all .2s var(--ease)}
.chip b{font-size:.7rem;opacity:.6}
.chip:hover{color:var(--fg);border-color:color-mix(in srgb,var(--accent) 50%,var(--line));transform:translateY(-1px)}
.chip[aria-pressed="true"]{color:var(--fg);border-color:var(--accent);background:color-mix(in srgb,var(--accent) 16%,transparent);box-shadow:0 0 18px -6px var(--accent)}
.ti{width:15px;height:15px;flex:none}
.mono{display:inline-grid;place-items:center;font:700 .55rem var(--mono);border-radius:4px;background:color-mix(in srgb,var(--accent) 20%,transparent);color:var(--fg);text-transform:uppercase}

/* ── cards ── */
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(310px,1fr));gap:28px}
.featured-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr));gap:30px}
@media (min-width:900px){.featured-grid .card:first-child:nth-last-child(odd){grid-column:1/-1;flex-direction:row;min-height:300px}.featured-grid .card:first-child:nth-last-child(odd) .cover{aspect-ratio:auto;width:55%;flex:none}.featured-grid .card:first-child:nth-last-child(odd) .cover::after{background:linear-gradient(90deg,transparent 55%,var(--card))}.featured-grid .card:first-child:nth-last-child(odd) .card-body{padding:28px}.featured-grid .card:first-child:nth-last-child(odd) h3{font-size:1.7rem}}
.card{position:relative;display:flex;flex-direction:column;border-radius:var(--radius);background:var(--card);border:1px solid var(--line);overflow:hidden;cursor:pointer;isolation:isolate;transform-style:preserve-3d;transform:perspective(900px) rotateX(var(--rx,0)) rotateY(var(--ry,0)) translateY(var(--ty,0));transition:transform .5s var(--ease),border-color .3s,box-shadow .3s,opacity .4s;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}
.card::before{content:"";position:absolute;inset:0;border-radius:inherit;padding:1px;background:radial-gradient(420px circle at var(--mx,50%) var(--my,50%),var(--accent),transparent 40%);-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;opacity:0;transition:opacity .3s;z-index:2;pointer-events:none}
.card:hover::before,.card:focus-visible::before{opacity:1}
.card:hover{--ty:-4px;box-shadow:var(--shadow),0 0 40px -18px var(--accent);border-color:transparent}
.shine{position:absolute;inset:0;pointer-events:none;background:radial-gradient(600px circle at var(--mx,50%) var(--my,50%),color-mix(in srgb,var(--fg) 7%,transparent),transparent 40%);opacity:0;transition:opacity .3s;z-index:1}
.card:hover .shine{opacity:1}
.card.featured{box-shadow:0 0 0 1px color-mix(in srgb,var(--accent) 35%,transparent)}
.cover{position:relative;aspect-ratio:2/1;overflow:hidden;background:linear-gradient(135deg,color-mix(in srgb,var(--accent) 30%,var(--bg2)),color-mix(in srgb,var(--accent2) 30%,var(--bg2)))}
.cover img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transition:transform .8s var(--ease),filter .4s;filter:saturate(.9)}
.card:hover .cover img{transform:scale(1.06);filter:saturate(1.1)}
.cover::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,transparent 40%,var(--card));pointer-events:none}
.cover-fallback{position:absolute;inset:0;display:none;place-items:center;font:800 4rem var(--display);color:color-mix(in srgb,var(--fg) 30%,transparent);background-image:linear-gradient(var(--line) 1px,transparent 1px),linear-gradient(90deg,var(--line) 1px,transparent 1px);background-size:22px 22px}
.cover.noimg .cover-fallback,.cover:not(:has(img)) .cover-fallback{display:grid}
[data-covers="false"] .cover{display:none}
.card-body{display:flex;flex-direction:column;gap:12px;padding:18px 20px 18px;flex:1;position:relative;z-index:3}
.card-top{display:flex;align-items:center;gap:8px}
.card h3{font:700 1.08rem/1.25 var(--display);margin:0;flex:1;min-width:0;overflow-wrap:anywhere}
.card.big h3{font-size:1.35rem}
.stars{font:600 .8rem var(--mono);color:#fbbf24;white-space:nowrap}
.pill{font-size:.68rem;padding:1px 7px;border-radius:999px;border:1px solid var(--line);color:var(--muted)}
.sum{margin:0;color:var(--muted);font-size:.92rem;flex:none;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.card.big .sum{-webkit-line-clamp:4;font-size:.98rem}
.techs{display:flex;flex-wrap:wrap;gap:8px}
.tech{display:inline-flex;align-items:center;gap:5px;font-size:.74rem;padding:3px 8px;border-radius:7px;background:color-mix(in srgb,var(--fg) 6%,transparent);color:var(--muted)}
.tech em{font-style:normal}
.spark{width:100%;height:28px;display:block}
.spark-line{fill:none;stroke:var(--accent);stroke-width:1.6;vector-effect:non-scaling-stroke;stroke-linejoin:round}
.spark-area{fill:color-mix(in srgb,var(--accent) 14%,transparent);stroke:none}
.card-foot{margin-top:auto;display:flex;align-items:center;justify-content:space-between;gap:10px;padding-top:12px;border-top:1px dashed var(--line);font-size:.78rem;color:var(--muted)}
.acts{display:flex;gap:6px;flex:none}
.card-foot .when{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.btn-mini{white-space:nowrap;display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:8px;border:1px solid var(--line);color:var(--fg);font-size:.78rem;font-weight:600;transition:all .2s;background:color-mix(in srgb,var(--bg2) 50%,transparent)}
.btn-mini:hover{border-color:var(--accent);text-decoration:none;color:var(--accent)}
.btn-mini.primary{background:color-mix(in srgb,var(--accent) 18%,transparent);border-color:color-mix(in srgb,var(--accent) 50%,transparent)}
.btn-mini .bi{width:13px;height:13px}
.dot{width:8px;height:8px;border-radius:50%;flex:none;background:var(--muted);box-shadow:0 0 0 3px color-mix(in srgb,currentColor 0%,transparent)}
.st-active{background:#22c55e;box-shadow:0 0 10px #22c55e}
.st-wip{background:#3b82f6;box-shadow:0 0 10px #3b82f6}
.st-maintenance{background:#eab308}
.st-paused{background:#f97316}
.st-done{background:#a855f7}
.st-idea{background:#06b6d4}
.st-archived{background:#6b7280}
.card .st-active{animation:pulse 2.4s infinite}
@keyframes pulse{0%{box-shadow:0 0 0 0 rgba(34,197,94,.6)}70%{box-shadow:0 0 0 8px rgba(34,197,94,0)}100%{box-shadow:0 0 0 0 rgba(34,197,94,0)}}

/* card styles */
[data-card="solid"] .card,[data-card="solid"] .panel{background:var(--bg2);backdrop-filter:none}
[data-card="outline"] .card,[data-card="outline"] .panel{background:transparent;backdrop-filter:none;box-shadow:none}
[data-card="neon"] .card{border-color:color-mix(in srgb,var(--accent) 55%,transparent);box-shadow:0 0 22px -8px var(--accent),inset 0 0 22px -14px var(--accent)}
[data-card="neon"] .card:hover{box-shadow:0 0 40px -6px var(--accent),inset 0 0 30px -12px var(--accent)}
[data-card="neon"] .card h3{text-shadow:0 0 12px color-mix(in srgb,var(--accent) 60%,transparent)}
[data-card="terminal"] .card,[data-card="terminal"] .panel{background:color-mix(in srgb,var(--bg) 92%,var(--accent));border-radius:6px;font-family:var(--mono);backdrop-filter:none}
[data-card="terminal"] .card h3::before{content:"$ ";color:var(--accent)}
[data-card="terminal"] .card h3,[data-card="terminal"] .sum{font-family:var(--mono)}
[data-card="terminal"] .cover{filter:grayscale(.6) contrast(1.1)}

/* layouts: grid (cards) | list (rows) */
[data-layout="list"] .grid{grid-template-columns:1fr;gap:0;border:1px solid var(--line);border-radius:var(--radius);overflow:hidden;background:var(--card)}
[data-layout="list"] .grid .card{border:0;border-radius:0;border-bottom:1px solid var(--line);background:transparent;box-shadow:none!important;transform:none!important;backdrop-filter:none}
[data-layout="list"] .grid .card:last-child{border-bottom:0}
[data-layout="list"] .grid .card:hover{background:color-mix(in srgb,var(--fg) 3%,transparent)}
[data-layout="list"] .grid .card::before,[data-layout="list"] .grid .shine,[data-layout="list"] .grid .cover,[data-layout="list"] .grid .spark{display:none}
[data-layout="list"] .grid .card-body{display:grid;grid-template-columns:220px minmax(0,1fr) 170px;grid-template-areas:"top sum foot" "top tech foot";column-gap:24px;row-gap:6px;align-items:center;padding:14px 20px}
[data-layout="list"] .grid .card-top{grid-area:top}
[data-layout="list"] .grid .sum{grid-area:sum;-webkit-line-clamp:1;font-size:.88rem}
[data-layout="list"] .grid .techs{grid-area:tech;gap:4px}
[data-layout="list"] .grid .tech{font-size:.7rem;padding:1px 7px}
[data-layout="list"] .grid .tech:nth-child(n+5){display:none}
[data-layout="list"] .grid .card-foot{grid-area:foot;border:0;padding:0;margin:0;flex-direction:column;align-items:flex-end;gap:6px}
@media (max-width:720px){[data-layout="list"] .grid .card-body{grid-template-columns:1fr;grid-template-areas:"top" "sum" "tech" "foot"}[data-layout="list"] .grid .card-foot{flex-direction:row;align-items:center;justify-content:space-between}}
.empty{text-align:center;padding:48px 0;color:var(--muted)}

/* ── stack ── */
.stack-grid{display:grid;grid-template-columns:1fr 1.2fr;gap:28px}
@media (max-width:860px){.stack-grid{grid-template-columns:1fr}}
.langs{list-style:none;margin:0;display:flex;flex-direction:column;gap:14px}
.langs li{display:grid;grid-template-columns:150px 1fr 56px;align-items:center;gap:12px;font-size:.9rem}
.lang-name{display:flex;align-items:center;gap:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bar{height:8px;border-radius:999px;background:color-mix(in srgb,var(--fg) 8%,transparent);overflow:hidden;position:relative}
.bar i{position:absolute;inset:0 auto 0 0;width:0;border-radius:inherit;background:linear-gradient(90deg,var(--accent),var(--accent2));box-shadow:0 0 12px var(--accent);transition:width 1.4s var(--ease)}
.in .bar i,.bar.in i{width:var(--w)}
.pct{font:600 .8rem var(--mono);color:var(--muted);text-align:right}
.cloud{list-style:none;margin:0;display:flex;flex-wrap:wrap;gap:10px;align-content:flex-start}
.orb{display:flex;align-items:center;gap:8px;padding:8px 14px;border-radius:14px;border:1px solid var(--line);background:color-mix(in srgb,var(--bg2) 50%,transparent);font-size:calc(.78rem + var(--n) * .05rem);cursor:pointer;transition:transform .3s var(--ease),border-color .3s,box-shadow .3s}
.orb:hover{transform:translateY(-3px) scale(1.04);border-color:var(--accent);box-shadow:0 10px 30px -12px var(--accent)}
.orb b{font:600 .7rem var(--mono);color:var(--muted)}
.oi{width:calc(16px + var(--n) * 2px);height:calc(16px + var(--n) * 2px);max-width:30px;max-height:30px}

/* ── activity ── */
.activity-grid{display:grid;grid-template-columns:2fr 1fr;gap:28px}
@media (max-width:860px){.activity-grid{grid-template-columns:1fr}}
.chart-wrap{position:relative;overflow:hidden}
.chart{width:100%;height:auto;display:block;overflow:visible}
.chart rect{fill:url(#none);fill:var(--accent);opacity:.85;transform-origin:center bottom;transform-box:fill-box;transform:scaleY(0);transition:transform .8s var(--ease) calc(var(--i) * 12ms),opacity .2s}
.chart rect.zero{fill:var(--muted);opacity:.25}
.chart rect:hover{opacity:1;fill:var(--accent2)}
.in .chart rect{transform:scaleY(1)}
.chart text{fill:var(--muted);font:10px var(--mono)}
.tip{position:absolute;pointer-events:none;padding:4px 8px;border-radius:6px;background:var(--fg);color:var(--bg);font:600 .75rem var(--mono);transform:translate(-50%,-130%);white-space:nowrap}
.kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:0 0 18px}
.kpis dt{font:700 1.6rem var(--display);color:var(--accent);font-variant-numeric:tabular-nums}
.kpis dd{margin:0;color:var(--muted);font-size:.75rem}
.top-repos{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:10px}
.top-repos li{display:grid;grid-template-columns:minmax(0,1fr) 1fr 40px;gap:10px;align-items:center;font-size:.85rem}
.top-repos a{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.top-repos b{font:600 .75rem var(--mono);color:var(--muted);text-align:right}

/* ── status ── */
.status-sum{display:flex;align-items:center;gap:10px;margin-bottom:14px;color:var(--muted);font-size:.9rem}
.status-sum b{color:var(--fg);font-family:var(--mono)}
.big-dot{width:12px;height:12px;border-radius:50%;background:#22c55e;animation:pulse 2s infinite}
.big-dot.bad{background:#ef4444}
.status-board ul{list-style:none;margin:0;padding:0}
.status-board li{display:grid;grid-template-columns:18px minmax(120px,1.1fr) 120px minmax(0,2fr) 70px 56px;gap:12px;align-items:center;padding:11px 4px;border-top:1px solid var(--line);font-size:.86rem}
.status-board li:hover{background:color-mix(in srgb,var(--accent) 5%,transparent)}
.pulse{width:10px;height:10px;border-radius:50%;background:#22c55e;position:relative}
.pulse::after{content:"";position:absolute;inset:0;border-radius:50%;background:inherit;animation:ping 2s cubic-bezier(0,0,.2,1) infinite}
.bad .pulse{background:#ef4444}
@keyframes ping{75%,100%{transform:scale(2.4);opacity:0}}
.sb-name{display:flex;flex-direction:column;min-width:0}
.sb-name small{color:var(--muted);font-size:.72rem}
.sb-prov{display:flex;align-items:center;gap:6px;color:var(--muted);font-size:.8rem}
.sb-url{font:.8rem var(--mono);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sb-ms{font:.78rem var(--mono);color:var(--muted);text-align:right}
.sb-state{font:600 .72rem var(--mono);text-transform:uppercase;color:#22c55e;text-align:right}
.bad .sb-state{color:#ef4444}
@media (max-width:760px){.status-board li{grid-template-columns:18px 1fr auto}.sb-prov,.sb-url,.sb-ms{display:none}}

@keyframes sweep{to{transform:translateX(120%)}}
/* reduced motion / animation off: a plain list on the axis */
/* wheel rims: light bands at the top and bottom edge of the drum, and a glass highlight on the front row */
/* ── admin build only ── */
.admin-bar{position:relative;z-index:51;display:flex;align-items:center;justify-content:center;gap:14px;flex-wrap:wrap;padding:6px 16px;font:600 .76rem var(--mono);color:#fff;background:linear-gradient(90deg,#b45309,#dc2626)}
.admin-bar a{color:#fff;text-decoration:underline}
.admin-bar button{font:inherit;color:#fff;background:rgba(0,0,0,.25);border:1px solid rgba(255,255,255,.4);border-radius:999px;padding:2px 10px;cursor:pointer}
.hp{display:inline-flex;align-items:center;gap:5px;font:600 .74rem var(--mono);color:var(--muted)}
.hp b{display:grid;place-items:center;min-width:30px;height:22px;padding:0 6px;border-radius:999px;color:var(--hc);background:color-mix(in srgb,var(--hc) 14%,transparent);border:1px solid color-mix(in srgb,var(--hc) 45%,transparent)}
.hp.sm b{min-width:26px;height:18px;font-size:.66rem}
.card-top .hp{margin-left:auto}
.card-top .stars+.hp,.card-top .pill+.hp{margin-left:6px}
.pill.ok{color:#22c55e;border-color:color-mix(in srgb,#22c55e 45%,transparent)}
.stat.bad{border-color:color-mix(in srgb,#ef4444 55%,var(--line))}
.stat.bad .stat-n{background:none;-webkit-text-fill-color:#ef4444;color:#ef4444}
.adm-list{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,340px),1fr));gap:20px}
.adm-row{border:1px solid var(--line);border-radius:calc(var(--radius) * .8);background:var(--card);padding:12px 14px}
.adm-name{display:flex;align-items:center;gap:8px;width:100%;padding:0;border:0;background:none;color:var(--fg);font:inherit;cursor:pointer;text-align:left}
.adm-name b{font-size:.95rem;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.adm-name .hp{margin-left:auto}
.adm-name:hover b{color:var(--accent)}
.adm-issues,.m-issues{list-style:none;margin:10px 0 0;padding:0;display:flex;flex-direction:column;gap:5px;font-size:.82rem;color:var(--muted)}
.adm-issues li,.m-issues li{position:relative;padding-left:16px;line-height:1.45}
.adm-issues li::before,.m-issues li::before{content:"";position:absolute;left:2px;top:.5em;width:7px;height:7px;border-radius:50%;background:#eab308}
.lv-error::before{background:#ef4444!important}
.lv-error{color:var(--fg)}
.adm-ok,.m-ok{margin:14px 0 0;color:#22c55e;font-size:.86rem}
.m-admin{margin:4px 0 18px;padding:14px 16px;border-radius:12px;border:1px dashed color-mix(in srgb,#f59e0b 55%,var(--line));background:color-mix(in srgb,#f59e0b 6%,transparent)}
.m-admin-top{display:flex;flex-wrap:wrap;align-items:center;gap:8px}
.m-env{margin:10px 0 0;font-size:.84rem;color:var(--muted)}
.m-env b{color:var(--fg)}
.m-env code{font:.78rem var(--mono);padding:1px 6px;border-radius:5px;background:var(--bg2)}
.m-next{margin:6px 0 0;padding-left:20px;font-size:.84rem;color:var(--muted)}
.adm-upd{opacity:.85;font-weight:500}
/* ── timeline: scroll-driven beam down the centre axis ── */
@keyframes tlstream{to{background-position:0 120px}}
@keyframes tlping{0%{transform:scale(1);opacity:.7}100%{transform:scale(3);opacity:0}}
.tl{position:relative;--mid:96px;--tip:0px;padding:8px 0 40px}
.tl-axis{position:absolute;left:50%;top:0;bottom:0;width:4px;margin-left:-2px;border-radius:4px;background:color-mix(in srgb,var(--fg) 10%,transparent)}
.tl-beam{position:absolute;left:-3px;right:-3px;top:0;height:var(--tip);border-radius:10px;background:linear-gradient(180deg,transparent,var(--accent) 60px,var(--accent2));box-shadow:0 0 18px color-mix(in srgb,var(--accent) 70%,transparent),0 0 46px -6px var(--accent2);overflow:hidden}
.tl-beam::after{content:"";position:absolute;inset:0;background:repeating-linear-gradient(180deg,transparent 0 70px,rgba(255,255,255,.75) 70px 82px,transparent 82px 120px);opacity:.55;mix-blend-mode:overlay}
body[data-anim="full"] .tl-beam::after{animation:tlstream 1.4s linear infinite}
.tl-comet{position:absolute;left:50%;top:var(--tip);width:18px;height:18px;margin:-9px 0 0 -9px;border-radius:50%;background:#fff;box-shadow:0 0 0 4px color-mix(in srgb,var(--accent) 45%,transparent),0 0 24px 6px var(--accent),0 0 60px 12px color-mix(in srgb,var(--accent2) 50%,transparent);transition:opacity .4s}
.tl.done .tl-comet{opacity:0}
.tl-list{position:relative;margin:0;padding:0;list-style:none}
.tl-year{display:flex;justify-content:center;padding:26px 0 14px;position:relative;z-index:2}
.tl-year span{display:inline-flex;align-items:baseline;gap:8px;padding:7px 18px;border-radius:999px;border:1px solid var(--line);background:var(--bg2);font:800 1.3rem var(--display);letter-spacing:-.01em;opacity:.55;transform:scale(.92);transition:opacity .5s,transform .5s var(--ease),border-color .5s,box-shadow .5s}
.tl-year small{font:600 .72rem var(--mono);color:var(--muted)}
.tl-year.lit span{opacity:1;transform:none;border-color:color-mix(in srgb,var(--accent) 60%,var(--line));box-shadow:0 0 0 4px color-mix(in srgb,var(--accent) 12%,transparent),0 10px 30px -14px var(--accent)}
.tl-year.lit b{background:linear-gradient(120deg,var(--accent),var(--accent2));-webkit-background-clip:text;background-clip:text;color:transparent}
.tl-item{display:grid;grid-template-columns:minmax(0,1fr) var(--mid) minmax(0,1fr);align-items:center;padding:16px 0}
.tl-item.L .tl-card{grid-column:1;grid-row:1;justify-self:end}
.tl-item.L .tl-date{grid-column:3;grid-row:1;justify-self:start;text-align:left}
.tl-item.R .tl-card{grid-column:3;grid-row:1;justify-self:start}
.tl-item.R .tl-date{grid-column:1;grid-row:1;justify-self:end;text-align:right}
.tl-node{grid-column:2;grid-row:1;justify-self:center;position:relative;z-index:2;width:16px;height:16px;border-radius:50%;background:var(--bg);border:2px solid color-mix(in srgb,var(--fg) 25%,var(--line));transition:border-color .4s,background .4s,box-shadow .4s,transform .4s var(--ease)}
.tl-node i{position:absolute;inset:-2px;border-radius:50%;border:2px solid var(--c);opacity:0}
.tl-item.lit .tl-node{background:var(--c);border-color:var(--c);transform:scale(1.15);box-shadow:0 0 0 5px color-mix(in srgb,var(--c) 20%,transparent),0 0 20px var(--c)}
body[data-anim="full"] .tl-item.lit .tl-node i{animation:tlping 1.2s ease-out 1}
.tl-item::before{content:"";grid-column:2;grid-row:1;align-self:center;height:2px;width:calc(var(--mid) / 2 - 10px);background:linear-gradient(90deg,var(--c),transparent);opacity:0;transition:opacity .5s}
.tl-item.L::before{justify-self:start;transform:scaleX(-1)}
.tl-item.R::before{justify-self:end}
.tl-item.lit::before{opacity:.8}
.tl-date{display:flex;flex-direction:column;gap:2px;padding:0 22px;font-variant-numeric:tabular-nums;opacity:.4;transition:opacity .5s}
.tl-date b{font:800 clamp(1.3rem,2.4vw,1.9rem)/1 var(--display);letter-spacing:-.02em}
.tl-date span{font:700 .9rem var(--mono);color:var(--muted)}
.tl-item.lit .tl-date{opacity:1}
.tl-item.lit .tl-date b{background:linear-gradient(120deg,var(--accent),var(--accent2));-webkit-background-clip:text;background-clip:text;color:transparent}
.tl-card{position:relative;display:grid;grid-template-columns:160px minmax(0,1fr);gap:16px;align-items:center;width:min(470px,100%);padding:12px 16px 12px 12px;border-radius:calc(var(--radius) * .9);border:1px solid var(--line);background:var(--card);color:var(--fg);text-decoration:none!important;transition:transform .35s var(--ease),border-color .3s,box-shadow .35s}
.tl-card:hover{transform:translateY(-3px);border-color:color-mix(in srgb,var(--c) 60%,var(--line));box-shadow:0 20px 44px -26px var(--c)}
.tl-item.lit .tl-card{border-color:color-mix(in srgb,var(--c) 35%,var(--line))}
.tl-img{position:relative;aspect-ratio:16/10;border-radius:calc(var(--radius) * .6);overflow:hidden;background:linear-gradient(135deg,color-mix(in srgb,var(--accent) 28%,var(--bg2)),color-mix(in srgb,var(--accent2) 28%,var(--bg2)))}
.tl-img img{display:block;width:100%;height:100%;object-fit:cover;object-position:top}
.tl-img span{position:absolute;inset:0;display:none;place-items:center;font:800 2rem var(--display);color:color-mix(in srgb,var(--fg) 30%,transparent)}
.tl-img.noimg span{display:grid}
.tl-body{min-width:0}
.tl-body time{display:none;font:600 .72rem var(--mono);color:var(--muted)}
.tl-body h3{display:flex;align-items:center;gap:8px;margin:0 0 5px;font:700 1.05rem/1.25 var(--display)}
.tl-body p{margin:0 0 8px;color:var(--muted);font-size:.82rem;line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.tl-tags{display:flex;flex-wrap:wrap;gap:5px}
.tl-tags span{font-size:.68rem;padding:1px 8px;border-radius:999px;border:1px solid var(--line);color:var(--muted)}
/* slide in from the side when scrolled into view */
body:not([data-anim="off"]) .tl-item .tl-card{opacity:0;transition:opacity .7s var(--ease),transform .7s var(--ease),border-color .3s,box-shadow .35s}
body:not([data-anim="off"]) .tl-item.L .tl-card{transform:translateX(-40px)}
body:not([data-anim="off"]) .tl-item.R .tl-card{transform:translateX(40px)}
body:not([data-anim="off"]) .tl-item.in .tl-card{opacity:1;transform:none}
body:not([data-anim="off"]) .tl-item.in .tl-card:hover{transform:translateY(-3px)}
.tl-end{display:flex;justify-content:center;padding-top:18px}
.tl-end span{width:12px;height:12px;border-radius:50%;background:var(--accent2);box-shadow:0 0 16px var(--accent2);opacity:.3;transition:opacity .5s}
.tl.done .tl-end span{opacity:1}
body[data-mode="simple"] .tl-beam{background:var(--fg);box-shadow:none}
body[data-mode="simple"] .tl-beam::after,body[data-mode="simple"] .tl-comet{display:none}
@media (max-width:760px){
.tl{--mid:44px}
.tl-axis{left:22px}
.tl-year{justify-content:flex-start;padding-left:4px}
.tl-item{grid-template-columns:var(--mid) minmax(0,1fr);padding:10px 0}
.tl-item.L .tl-card,.tl-item.R .tl-card{grid-column:2;justify-self:stretch;width:auto}
.tl-item .tl-date,.tl-item::before{display:none}
.tl-node{grid-column:1}
.tl-card{grid-template-columns:96px minmax(0,1fr);gap:12px;padding:9px 12px 9px 9px}
.tl-img{aspect-ratio:4/3}
.tl-body time{display:block}
.tl-body p{-webkit-line-clamp:1}
body:not([data-anim="off"]) .tl-item.L .tl-card,body:not([data-anim="off"]) .tl-item.R .tl-card{transform:translateX(24px)}
.tl-end{justify-content:flex-start;padding-left:16px}
}
.adm-tools{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px 20px;margin:0 0 22px;padding:14px 18px;border:1px solid color-mix(in srgb,var(--accent) 35%,var(--line));border-radius:var(--radius);background:color-mix(in srgb,var(--accent) 6%,var(--card))}
.adm-tools span{color:var(--muted);font-size:.86rem}
.adm-tools b{color:var(--fg);font-family:var(--mono);font-weight:600}
.adm-tools .btn{padding:9px 18px}
.fxs{display:none;flex-wrap:wrap;gap:6px;margin:8px 0 2px}
li.fixable>span{cursor:pointer;border-radius:6px;transition:color .2s}
li.fixable>span::after{content:"▾";display:inline-block;margin-left:6px;font-size:.7em;opacity:.45;transition:transform .2s,opacity .2s}
li.fixable>span:hover{color:var(--fg)}
li.fixable>span:hover::after{opacity:.9}
li.fixable>span:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
li.fixable.open>span{color:var(--fg)}
li.fixable.open>span::after{transform:rotate(180deg);opacity:.9}
li.fixable.open .fxs{display:flex;animation:fadein .2s var(--ease)}
.fx{padding:3px 10px;border-radius:8px;border:1px solid var(--line);background:none;color:var(--fg);font-size:.74rem;line-height:1.6;cursor:pointer;text-decoration:none!important;transition:border-color .2s,color .2s}
.fx:hover{border-color:var(--accent);color:var(--accent)}
.fx:disabled{opacity:.5;cursor:wait}
.fx-sent{display:block;margin-top:6px;font-size:.76rem;color:#22c55e;font-style:normal}
.adm-issues li,.m-issues li{display:block}
.m-ignored{display:flex;flex-wrap:wrap;align-items:center;gap:6px}
/* ── admin: settings ── */
.st-layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.5fr);gap:24px;align-items:start}
@media (max-width:900px){.st-layout{grid-template-columns:minmax(0,1fr)}}
.st-side{display:flex;flex-direction:column;gap:24px}
.st-card,.st-form{padding:20px 22px;border:1px solid var(--line);border-radius:var(--radius);background:var(--card)}
.st-card h4{margin:0 0 12px;font:600 .8rem var(--mono);letter-spacing:.05em;text-transform:uppercase;color:var(--muted)}
.st-card h5{margin:18px 0 8px;font:600 .74rem var(--mono);color:var(--muted)}
.st-ok{margin:0 0 12px;color:#22c55e;font-size:.88rem}
.st-warn{margin:0 0 12px;color:#eab308;font-size:.88rem;line-height:1.55}
.st-steps{margin:0 0 16px;padding-left:20px;font-size:.84rem;line-height:1.7;color:color-mix(in srgb,var(--fg) 85%,var(--muted))}
.st-steps code,.st-keys code{font:.76rem var(--mono);padding:1px 6px;border-radius:5px;background:var(--bg2)}
.st-usage{padding-top:14px;border-top:1px dashed var(--line)}
.st-hist{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px;font-size:.8rem}
.st-hist li{display:grid;grid-template-columns:80px 70px 1fr;gap:8px;align-items:baseline}
.st-hist small{color:var(--muted)}
.st-hint{margin:0 0 14px;color:var(--muted);font-size:.8rem;line-height:1.55}
.st-keys{list-style:none;margin:0 0 16px;padding:0;display:flex;flex-direction:column;gap:9px;font-size:.82rem}
.st-keys li{display:grid;grid-template-columns:90px minmax(0,1fr) auto;gap:10px;align-items:center}
.st-keys code{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.st-keys b{font:600 .76rem var(--mono);color:var(--muted)}
.st-keys b.ok{color:#22c55e}.st-keys b.bad{color:#ef4444}
.st-form{display:flex;flex-direction:column;gap:22px}
.st-form fieldset{margin:0;padding:0 0 22px;border:0;border-bottom:1px dashed var(--line);display:flex;flex-direction:column;gap:14px}
.st-form legend{padding:0;margin-bottom:12px;font:700 1rem var(--display)}
.st-field{display:flex;flex-direction:column;gap:6px;font-size:.84rem}
.st-field>span{color:var(--muted);font-size:.78rem}
.st-field input,.st-field select{padding:9px 12px;border-radius:10px;border:1px solid var(--line);background:var(--bg2);color:var(--fg);font:.88rem var(--body,inherit);max-width:420px}
.st-field input:focus,.st-field select:focus{outline:2px solid color-mix(in srgb,var(--accent) 60%,transparent);border-color:transparent}
.st-toggles{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:10px}
.st-toggle{display:flex;align-items:center;gap:10px;cursor:pointer;font-size:.86rem}
.st-toggle input{position:absolute;opacity:0;pointer-events:none}
.st-toggle i{flex:none;position:relative;width:36px;height:20px;border-radius:999px;background:color-mix(in srgb,var(--fg) 15%,transparent);transition:background .2s}
.st-toggle i::after{content:"";position:absolute;left:2px;top:2px;width:16px;height:16px;border-radius:50%;background:#fff;transition:transform .2s var(--ease)}
.st-toggle input:checked+i{background:linear-gradient(90deg,var(--accent),var(--accent2))}
.st-toggle input:checked+i::after{transform:translateX(16px)}
.st-toggle input:focus-visible+i{outline:2px solid var(--accent);outline-offset:2px}
.st-chips{display:flex;flex-wrap:wrap;gap:8px}
.st-chip{cursor:pointer}
.st-chip input{position:absolute;opacity:0;pointer-events:none}
.st-chip span{display:inline-block;padding:5px 12px;border-radius:999px;border:1px solid var(--line);font-size:.8rem;color:var(--muted);transition:all .2s}
.st-chip input:checked+span{color:var(--fg);border-color:var(--accent);background:color-mix(in srgb,var(--accent) 14%,transparent)}
.st-chip input:focus-visible+span{outline:2px solid var(--accent);outline-offset:2px}
.st-foot{display:flex;flex-wrap:wrap;align-items:center;gap:10px 14px}
.st-foot small{flex-basis:100%;color:var(--muted);font-size:.76rem}
.st-form.dirty .st-foot .pp-msg{color:#eab308}
.st-form.dirty .st-foot .btn{box-shadow:0 0 0 3px color-mix(in srgb,#eab308 45%,transparent)}
/* ── admin overview ── */
.adm-ov{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,290px),1fr));gap:20px}
.ov-card{padding:16px 18px;border:1px solid var(--line);border-radius:var(--radius);background:var(--card);min-width:0}
.ov-card h4{display:flex;align-items:center;justify-content:space-between;margin:0 0 12px;font:600 .82rem var(--mono);letter-spacing:.04em;color:var(--muted);text-transform:uppercase}
.ov-card h4 a{font-size:.74rem;text-transform:none;letter-spacing:0}
.ov-stack{display:flex;height:12px;border-radius:999px;overflow:hidden;gap:2px}
.ov-stack i{min-width:4px}
.ov-legend{list-style:none;margin:12px 0 0;padding:0;display:flex;flex-wrap:wrap;gap:6px 14px;font-size:.8rem;color:var(--muted)}
.ov-legend li{display:flex;align-items:center;gap:6px}
.ov-legend span{width:9px;height:9px;border-radius:3px}
.ov-legend b{color:var(--fg)}
.ov-bars{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:9px;font-size:.8rem}
.ov-bars li{display:grid;grid-template-columns:62px minmax(0,1fr) 28px;align-items:center;gap:10px;color:var(--muted)}
.ov-bars i{height:9px;border-radius:999px;background:color-mix(in srgb,var(--fg) 8%,transparent);overflow:hidden}
.ov-bars b{display:block;height:100%;border-radius:999px;transition:width 1s var(--ease)}
.ov-bars em{font:600 .8rem var(--mono);font-style:normal;color:var(--fg);text-align:right}
.ov-cols{display:flex;align-items:flex-end;gap:5px;height:64px}
.ov-cols i{flex:1;border-radius:4px 4px 1px 1px;background:linear-gradient(180deg,var(--accent),color-mix(in srgb,var(--accent2) 60%,transparent))}
.ov-big{margin:10px 0 0;color:var(--muted);font-size:.8rem}
.ov-big b{font:800 1.3rem var(--display);color:var(--fg);margin-right:4px}
.ov-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px;font-size:.84rem}
.ov-list li{display:flex;align-items:center;justify-content:space-between;gap:10px}
.ov-list .linklike{border:0;padding:0;color:var(--fg);font:inherit;text-align:left;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ov-list .linklike:hover{color:var(--accent)}
.ov-list b{font:600 .78rem var(--mono);color:var(--muted);white-space:nowrap}
.ov-nums{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:12px 22px}
.ov-nums li{display:flex;flex-direction:column;font-size:.76rem;color:var(--muted)}
.ov-nums b{font:800 1.5rem/1.1 var(--display);color:var(--fg)}
.ov-gap{margin:12px 0 0;padding:8px 10px;border-radius:8px;background:color-mix(in srgb,#f59e0b 9%,transparent);border-left:3px solid #f59e0b;font-size:.8rem;line-height:1.5}
.ov-gap small{display:block;color:var(--muted);font:600 .7rem var(--mono);margin-bottom:2px}
.ov-budget{height:8px;margin-top:10px;border-radius:999px;background:color-mix(in srgb,var(--fg) 8%,transparent);overflow:hidden}
.ov-budget i{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,#22c55e,var(--accent))}
.ov-budget.warn i{background:linear-gradient(90deg,#eab308,#f97316)}
.ov-budget.full i{background:#ef4444}
.ov-meta{margin:10px 0 0;font-size:.78rem;color:var(--muted);line-height:1.5}
.ov-meta code{font:.74rem var(--mono);padding:1px 6px;border-radius:5px;background:var(--bg2)}
.ov-feats{list-style:none;margin:12px 0 0;padding:0;display:flex;flex-direction:column;gap:6px;font-size:.8rem}
.ov-feats li{display:flex;justify-content:space-between;gap:10px}
.ov-feats li b{font:600 .76rem var(--mono)}
.ov-feats li.off{color:var(--muted)}
.ov-feats li.off b{opacity:.6}
.pp-tok{margin:0 0 22px;padding:12px 16px;border:1px dashed var(--line);border-radius:var(--radius);background:var(--card)}
/* ── project details: intro + numbers ── */
.btn.sm{padding:6px 12px;font-size:.8rem}
.btn:disabled{opacity:.55;cursor:default}
/* ── admin: posts ── */
.pp-note{color:var(--muted);font-size:.9rem}
.pp-top{display:flex;flex-direction:column;gap:12px;padding:14px 16px;border:1px solid var(--line);border-radius:var(--radius);background:var(--card)}
.pp-conns{display:flex;flex-wrap:wrap;gap:8px}
.pp-conn{display:inline-flex;align-items:center;gap:7px;padding:4px 11px;border-radius:999px;border:1px solid var(--line);font-size:.8rem}
.pp-conn i,.pp-tab i{width:8px;height:8px;border-radius:50%;background:var(--muted);flex:none}
.pp-conn small{color:var(--muted);font:600 .7rem var(--mono)}
.m-auto i,i.m-auto{background:#22c55e;box-shadow:0 0 8px #22c55e}
.m-error i,i.m-error{background:#ef4444;box-shadow:0 0 8px #ef4444}
.pp-conn.m-error{border-color:color-mix(in srgb,#ef4444 50%,var(--line))}
.pp-tok summary{cursor:pointer;font-size:.88rem}
.pp-tok p{margin:8px 0;color:var(--muted);font-size:.82rem}
.pp-tok-state{color:#22c55e;font-size:.78rem;margin-left:6px}
.pp-tok-row{display:flex;gap:8px;flex-wrap:wrap}
.pp-tok-row input{flex:1;min-width:200px;padding:9px 12px;border-radius:10px;border:1px solid var(--line);background:var(--bg2);color:var(--fg);font:.85rem var(--mono)}
.pp-tok-row .btn{padding:8px 14px}
.sub-h .pp-n{display:inline-grid;place-items:center;min-width:24px;height:22px;margin-left:6px;padding:0 6px;border-radius:999px;background:var(--accent);color:#fff;font-size:.75rem}
.pp-list{display:flex;flex-direction:column;gap:24px}
.pp{border:1px solid var(--line);border-radius:var(--radius);background:var(--card);overflow:hidden;transition:opacity .4s,border-color .3s}
.pp:focus-within{border-color:color-mix(in srgb,var(--accent) 55%,var(--line))}
.pp.sent{opacity:.6}
.pp-head{display:flex;align-items:center;flex-wrap:wrap;gap:10px;padding:12px 16px;border-bottom:1px solid var(--line)}
.pp-head h4{margin:0;font:700 1rem var(--display);min-width:0}
.pp-head small{color:var(--muted);font-size:.76rem;margin-left:auto}
.pp-kind{font:700 .66rem var(--mono);letter-spacing:.06em;text-transform:uppercase;padding:2px 8px;border-radius:6px;background:color-mix(in srgb,var(--accent) 16%,transparent);color:var(--accent);white-space:nowrap}
.pp-kind.k-release{background:color-mix(in srgb,#a855f7 18%,transparent);color:#c084fc}
.pp-kind.k-stars{background:color-mix(in srgb,#eab308 18%,transparent);color:#eab308}
.pp-kind.k-live{background:color-mix(in srgb,#22c55e 18%,transparent);color:#22c55e}
.pp-kind.k-weekly{background:color-mix(in srgb,#3b82f6 18%,transparent);color:#60a5fa}
.pp-body{display:grid;grid-template-columns:180px minmax(0,1fr);gap:16px;padding:14px 16px}
.pp-img{border-radius:10px;overflow:hidden;aspect-ratio:16/10;background:var(--bg2);align-self:start}
.pp-img img{width:100%;height:100%;object-fit:cover;object-position:top;display:block}
.pp-body:not(:has(.pp-img)){grid-template-columns:minmax(0,1fr)}
.pp-style{display:flex;align-items:center;flex-wrap:wrap;gap:8px 12px;margin-bottom:14px;padding-bottom:14px;border-bottom:1px dashed var(--line)}
.pp-style>span{font:600 .72rem var(--mono);letter-spacing:.05em;text-transform:uppercase;color:var(--muted)}
.pp-styles{display:flex;flex-wrap:wrap;gap:6px}
.pp-st{padding:5px 12px;border-radius:8px;border:1px solid var(--line);background:none;color:var(--muted);font-size:.8rem;cursor:pointer;transition:border-color .2s,color .2s,background .2s}
.pp-st:hover{color:var(--fg);border-color:color-mix(in srgb,var(--accent) 50%,var(--line))}
.pp-st.on{color:var(--fg);border-color:var(--accent2);background:color-mix(in srgb,var(--accent2) 14%,transparent)}
.pp-tabs{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px}
.pp-tab{display:inline-flex;align-items:center;gap:6px;padding:5px 11px;border-radius:999px;border:1px solid var(--line);background:none;color:var(--muted);font-size:.8rem;cursor:pointer}
.pp-tab.on{color:var(--fg);border-color:var(--accent);background:color-mix(in srgb,var(--accent) 12%,transparent)}
.pp-title,.pp-text{width:100%;padding:10px 12px;border-radius:10px;border:1px solid var(--line);background:var(--bg2);color:var(--fg);font:.88rem/1.55 var(--body,system-ui);resize:vertical}
.pp-title{margin-bottom:8px;font-weight:700}
.pp-title:focus,.pp-text:focus{outline:2px solid color-mix(in srgb,var(--accent) 60%,transparent);border-color:transparent}
.pp-meta{display:flex;align-items:center;flex-wrap:wrap;gap:10px;margin-top:8px;font-size:.8rem}
.pp-count{font:600 .74rem var(--mono);color:var(--muted)}
.pp-count.bad{color:#ef4444}
.pp-chk{display:inline-flex;align-items:center;gap:5px;cursor:pointer}
.pp-copy,.pp-share{padding:4px 10px;border-radius:8px;border:1px solid var(--line);background:none;color:var(--fg);cursor:pointer;font-size:.78rem}
.pp-copy:hover,.pp-share:hover{border-color:var(--accent)}
.pp-res.ok{color:#22c55e}.pp-res.bad{color:#ef4444}
.pp-foot{display:flex;align-items:center;flex-wrap:wrap;gap:10px;padding:12px 16px;border-top:1px solid var(--line);background:color-mix(in srgb,var(--fg) 3%,transparent)}
.pp-foot .btn{padding:8px 16px;font-size:.86rem}
.pp-msg{font-size:.82rem;color:var(--muted)}
.pp-msg.bad{color:#ef4444}
.pp-hist{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}
.pp-row{display:flex;align-items:center;flex-wrap:wrap;gap:8px;padding:10px 14px;border:1px solid var(--line);border-radius:12px;background:var(--card);font-size:.85rem}
.pp-row small{color:var(--muted)}
.pp-row.st-failed{border-color:color-mix(in srgb,#ef4444 45%,var(--line))}
.pp-row.st-skipped{opacity:.6}
.pp-chips{display:flex;flex-wrap:wrap;gap:6px;margin-left:auto}
.pp-chip{display:inline-flex;align-items:center;gap:4px;padding:2px 9px;border-radius:999px;border:1px solid var(--line);font-size:.74rem;color:var(--fg);background:none;cursor:pointer}
.pp-chip.ok{color:#22c55e;border-color:color-mix(in srgb,#22c55e 40%,var(--line))}
.pp-chip.bad{color:#ef4444;border-color:color-mix(in srgb,#ef4444 40%,var(--line))}
.pp-delta{font:600 .74rem var(--mono);color:#eab308}
.pp-runs{margin-top:14px;font-size:.82rem}
/* ── admin: competitors ── */
@media (max-width:760px){.pp-body{grid-template-columns:minmax(0,1fr)}.pp-img{max-height:160px;aspect-ratio:auto}.pp-head small{margin-left:0;flex-basis:100%}}

/* ── stat cards ── */
.stats-strip{padding-top:8px}
.stat-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,190px),1fr));gap:20px}
.stat-grid.kpi6{grid-template-columns:repeat(auto-fit,minmax(min(100%,170px),1fr));margin-bottom:8px}
.stat{position:relative;display:flex;flex-direction:column;gap:6px;padding:12px 14px 12px;border-radius:calc(var(--radius) * .8);border:1px solid var(--line);background:var(--card);color:var(--fg);text-decoration:none!important;overflow:hidden;isolation:isolate;transition:border-color .3s,transform .3s var(--ease),box-shadow .3s}
.stat::before{content:"";position:absolute;inset:0;z-index:-1;opacity:0;background:radial-gradient(400px circle at var(--mx,50%) var(--my,0%),color-mix(in srgb,var(--accent) 16%,transparent),transparent 60%);transition:opacity .3s}
a.stat:hover{transform:translateY(-3px);border-color:color-mix(in srgb,var(--accent) 60%,var(--line));box-shadow:0 16px 40px -24px var(--accent)}
.stat:hover::before{opacity:1}
.stat-head{display:flex;align-items:center;gap:8px;font-size:.76rem;color:var(--muted)}
.stat-ic{width:22px;height:22px;border-radius:6px;display:grid;place-items:center;background:color-mix(in srgb,var(--accent) 14%,transparent);color:var(--accent);flex:none}
.stat-ic svg{width:13px;height:13px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.stat-go{margin-left:auto;font-size:.75rem;opacity:0;transform:translateX(-4px);transition:opacity .25s,transform .25s;color:var(--accent);white-space:nowrap}
a.stat:hover .stat-go{opacity:1;transform:none}
@media (hover:none){.stat-go{opacity:.8;transform:none}}
.stat-main{display:flex;align-items:center;justify-content:space-between;gap:10px}
.stat-n{font:800 1.85rem/1.05 var(--display);letter-spacing:-.03em;font-variant-numeric:tabular-nums;background:linear-gradient(180deg,var(--fg) 40%,color-mix(in srgb,var(--fg) 55%,var(--accent)));-webkit-background-clip:text;background-clip:text;color:transparent}
.stat-viz{margin-top:auto;min-height:14px}
.ring{width:40px;height:40px;flex:none}
.ring circle{fill:none;stroke-width:5}
.ring-bg{stroke:var(--line)}
.ring-fg{stroke:var(--accent);stroke-linecap:round;stroke-dasharray:0 var(--c);transition:stroke-dasharray 1.4s var(--ease) .2s}
.stat.in .ring-fg,[data-anim="off"] .ring-fg{stroke-dasharray:var(--len) var(--c)}
.ring text{font:700 10px var(--mono);fill:var(--muted)}
.mspark{display:block;width:100%;height:24px;overflow:visible}
.mspark-a{fill:color-mix(in srgb,var(--accent) 16%,transparent);opacity:0;transition:opacity 1s .6s}
.mspark-l{fill:none;stroke:var(--accent);stroke-width:1.8;vector-effect:non-scaling-stroke;stroke-linejoin:round;stroke-dasharray:1;stroke-dashoffset:1;transition:stroke-dashoffset 1.6s var(--ease) .2s}
.stat.in .mspark-a,[data-anim="off"] .mspark-a{opacity:1}
.stat.in .mspark-l,[data-anim="off"] .mspark-l{stroke-dashoffset:0}
.sbar{display:flex;gap:3px;height:6px;border-radius:99px;overflow:hidden}
.sbar i{display:block;height:100%;width:0;border-radius:99px;transition:width 1s var(--ease);transition-delay:calc(.15s + var(--i) * .08s)}
.stat.in .sbar i,[data-anim="off"] .sbar i{width:var(--w)}
.cols{display:flex;align-items:flex-end;gap:4px;height:24px;padding-top:12px;box-sizing:content-box}
.cols i{position:relative;flex:1;max-width:34px;height:var(--h);border-radius:5px 5px 2px 2px;background:linear-gradient(180deg,var(--accent),color-mix(in srgb,var(--accent) 35%,transparent));transform:scaleY(0);transform-origin:bottom;transition:transform .8s var(--ease);transition-delay:calc(.15s + var(--i) * .07s)}
.stat.in .cols i,[data-anim="off"] .cols i{transform:none}
.cols em{position:absolute;bottom:calc(100% + 3px);left:50%;transform:translateX(-50%);font:600 .62rem var(--mono);font-style:normal;color:var(--muted);white-space:nowrap;opacity:0;transition:opacity .2s}
.cols i:hover em,.stat-since .cols i:last-child em,.stat-since .cols i:first-child em{opacity:1}

/* ── overlays ── */
.overlay{position:fixed;inset:0;z-index:80;display:grid;place-items:center;padding:16px;background:color-mix(in srgb,var(--bg) 60%,transparent);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);animation:fade .25s var(--ease)}
.overlay[hidden]{display:none}
@keyframes fade{from{opacity:0}}
@keyframes pop{from{opacity:0;transform:translateY(16px) scale(.97)}}
.modal{position:relative;width:min(860px,100%);max-height:calc(100vh - 32px);overflow:auto;border-radius:var(--radius);border:1px solid var(--line);background:var(--bg2);box-shadow:0 40px 120px -30px rgba(0,0,0,.8),0 0 0 1px color-mix(in srgb,var(--accent) 18%,transparent);animation:pop .35s var(--ease)}
.modal.small{width:min(440px,100%);padding:24px}
.modal .x{position:absolute;top:12px;right:12px;z-index:5;width:34px;height:34px;border-radius:50%;border:1px solid var(--line);background:color-mix(in srgb,var(--bg) 70%,transparent);cursor:pointer}
.m-cover{aspect-ratio:2.2/1;background:linear-gradient(135deg,var(--accent),var(--accent2));position:relative;overflow:hidden}
.m-cover img{width:100%;height:100%;object-fit:cover;display:block}
.m-cover::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,transparent 50%,var(--bg2))}
.m-cover.has{aspect-ratio:auto;display:flex;justify-content:center;align-items:center;background:var(--bg);padding:22px 22px 0}
.m-cover.has::after{display:none}
.m-cover:not(.has){aspect-ratio:6/1}
.m-cover.has i{position:absolute;inset:-40px;background-size:cover;background-position:center;filter:blur(36px) saturate(1.3);opacity:.5}
.m-cover.has img{position:relative;z-index:1;width:auto;max-width:100%;height:auto;max-height:min(480px,56vh);object-fit:contain;border-radius:10px;box-shadow:0 18px 50px -20px rgba(0,0,0,.6);border:1px solid color-mix(in srgb,var(--fg) 10%,transparent)}
.m-cover.has+.m-content{padding-top:20px}
@media (max-width:640px){.m-cover.has{padding:14px 14px 0}}
.m-content{padding:6px 32px 34px}
.m-content h2{font:800 2rem/1.15 var(--display);margin:0 0 6px;letter-spacing:-.02em}
.m-sub{display:flex;flex-wrap:wrap;gap:8px 16px;color:var(--muted);font-size:.85rem;margin-bottom:20px;align-items:center}
.m-sum{font-size:1.05rem;line-height:1.6;margin:0 0 12px}
.m-purpose{color:var(--muted);margin:0 0 20px;line-height:1.6}
.m-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:28px}
@media (max-width:640px){.m-grid{grid-template-columns:1fr}.m-content{padding:4px 18px 22px}}
.m-box{border:1px solid var(--line);border-radius:12px;padding:14px 16px;background:color-mix(in srgb,var(--bg) 40%,transparent)}
.m-box h4{margin:0 0 10px;font:600 .78rem var(--mono);text-transform:uppercase;letter-spacing:.08em;color:var(--muted)}
.m-box ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px;font-size:.88rem}
.m-box li{display:flex;align-items:center;gap:8px;min-width:0}
.m-box li a{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.langbar{display:flex;height:10px;border-radius:999px;overflow:hidden;margin-bottom:10px}
.langbar i{display:block;height:100%}
.lang-legend{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:.8rem;color:var(--muted)}
.lang-legend span::before{content:"";display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--c);margin-right:6px}
.m-activity{width:100%;height:70px}
.m-activity rect{fill:var(--accent)}
.m-actions{display:flex;flex-wrap:wrap;gap:12px;margin:22px 0 4px}
/* ── project details: tabs + panes ── */
.m-tabs{display:flex;gap:4px;margin:4px 0 22px;padding:4px;border:1px solid var(--line);border-radius:12px;background:color-mix(in srgb,var(--bg) 50%,transparent);overflow-x:auto;scrollbar-width:none}
.m-tabs::-webkit-scrollbar{display:none}
.m-tab{flex:1 0 auto;padding:8px 14px;border:0;border-radius:9px;background:none;color:var(--muted);font:600 .86rem var(--body,inherit);cursor:pointer;white-space:nowrap;transition:background .2s,color .2s}
.m-tab:hover{color:var(--fg)}
.m-tab.on{color:var(--fg);background:var(--card);box-shadow:0 0 0 1px color-mix(in srgb,var(--accent) 40%,var(--line))}
.m-pane{animation:fadein .25s var(--ease)}
@keyframes fadein{from{opacity:0;transform:translateY(4px)}}
.m-pane>h4,.m-pane .m-readme h4,.m-pane .m-rv-cols h4{margin:26px 0 10px;font:600 .76rem var(--mono);letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
.m-pane>h4:first-child,.m-readme>h4:first-child{margin-top:0}
.m-brief{margin:4px 0 20px;padding:14px 16px;border-radius:12px;border:1px solid var(--line);background:color-mix(in srgb,var(--accent) 5%,transparent)}
.m-brief p{margin:0;font-size:.92rem;line-height:1.7}
.m-brief p+ul{margin-top:12px}
.m-feat-list{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:8px;font-size:.88rem;line-height:1.55}
.m-feat-list li{position:relative;padding-left:20px}
.m-feat-list li::before{content:"";position:absolute;left:3px;top:.55em;width:8px;height:8px;border-radius:2px;background:linear-gradient(135deg,var(--accent),var(--accent2));transform:rotate(45deg)}
.m-readme p{margin:0 0 12px;font-size:.9rem;line-height:1.75;color:color-mix(in srgb,var(--fg) 88%,var(--muted))}
.m-readme h4 small{font-weight:500;text-transform:none;letter-spacing:0;margin-left:6px;padding:1px 7px;border-radius:999px;border:1px solid var(--line)}
.m-outline{display:flex;flex-wrap:wrap;gap:8px}
.m-mets{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:12px;margin:18px 0 8px}
.m-met{padding:11px 13px;border-radius:10px;border:1px solid var(--line);background:var(--card)}
.m-met span{display:block;font-size:.72rem;color:var(--muted);margin-bottom:2px}
.m-met b{font:700 1.05rem var(--display)}
.m-met.bad{border-color:color-mix(in srgb,#ef4444 45%,var(--line))}
.m-met.bad b{color:#ef4444}
.m-posts{list-style:none;margin:16px 0 0;padding:0;display:flex;flex-direction:column;gap:10px}
.m-posts li{display:flex;flex-wrap:wrap;align-items:center;gap:8px 10px;padding:10px 12px;border:1px solid var(--line);border-radius:10px;font-size:.86rem}
.m-posts small{color:var(--muted)}
/* competitors inside the details */
.m-pos{margin:0 0 18px;padding:12px 14px;border-radius:10px;background:color-mix(in srgb,var(--accent2) 7%,transparent);border-left:3px solid var(--accent2);font-size:.9rem;line-height:1.65}
.m-cmp{margin:0 0 14px;font:600 .76rem var(--mono);color:var(--muted)}
.m-starcmp{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
.m-starcmp div{padding:11px 13px;border-radius:10px;border:1px solid var(--line);background:var(--card)}
.m-starcmp div:first-child{border-color:color-mix(in srgb,var(--accent) 50%,var(--line))}
.m-starcmp span{display:block;font-size:.72rem;color:var(--muted)}
.m-starcmp b{font:700 1.05rem var(--display)}
.m-steps{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:10px;counter-reset:st}
.m-steps li{position:relative;padding:12px 14px 12px 46px;border:1px solid var(--line);border-radius:12px;background:var(--card);counter-increment:st}
.m-steps li::before{content:counter(st);position:absolute;left:14px;top:12px;width:22px;height:22px;border-radius:7px;display:grid;place-items:center;font:700 .76rem var(--mono);color:#fff;background:linear-gradient(135deg,var(--accent),var(--accent2))}
.m-steps li div{display:flex;flex-wrap:wrap;align-items:center;gap:6px 8px}
.m-steps li b{font-size:.92rem;margin-right:4px}
.m-steps li p{margin:6px 0 0;color:var(--muted);font-size:.84rem;line-height:1.55}
.chip{display:inline-flex;align-items:center;padding:1px 8px;border-radius:999px;border:1px solid var(--line);font:600 .7rem var(--mono);color:var(--muted);white-space:nowrap}
.chip.imp-high{color:#22c55e;border-color:color-mix(in srgb,#22c55e 45%,var(--line))}
.chip.imp-medium{color:#eab308;border-color:color-mix(in srgb,#eab308 45%,var(--line))}
.m-matrix-wrap{overflow-x:auto;border:1px solid var(--line);border-radius:12px}
.m-matrix{width:100%;border-collapse:collapse;font-size:.84rem;min-width:460px}
.m-matrix th,.m-matrix td{padding:9px 12px;border-bottom:1px solid var(--line);text-align:center;white-space:nowrap}
.m-matrix tr:last-child th,.m-matrix tr:last-child td{border-bottom:0}
.m-matrix tbody th{text-align:left;font-weight:500;white-space:normal;min-width:150px}
.m-matrix thead th{font:600 .74rem var(--mono);color:var(--muted);background:color-mix(in srgb,var(--fg) 3%,transparent)}
.m-matrix thead th a{color:inherit;max-width:110px;display:inline-block;overflow:hidden;text-overflow:ellipsis;vertical-align:bottom}
.m-matrix .me{background:color-mix(in srgb,var(--accent) 8%,transparent)}
.m-matrix i{font-style:normal;font-weight:700}
.m-matrix .has-yes{color:#22c55e}.m-matrix .has-partial{color:#eab308}.m-matrix .has-no{color:color-mix(in srgb,var(--fg) 30%,transparent)}
.m-rv{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:10px}
.m-rv li{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;padding:10px 12px;border:1px solid var(--line);border-radius:10px;font-size:.86rem}
.m-rv li small{flex-basis:100%;color:var(--muted);font-size:.76rem;line-height:1.45}
.m-rv li span{font:600 .76rem var(--mono);color:var(--muted)}
.m-rv-cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:4px 24px;font-size:.86rem}
/* competitors page */
.rv-sum{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:20px;margin-bottom:24px}
.rv-sum div{padding:16px 18px;border:1px solid var(--line);border-radius:var(--radius);background:var(--card)}
.rv-sum b{display:block;font:800 1.6rem/1.1 var(--display)}
.rv-sum span{font-size:.8rem;color:var(--muted)}
.rv-pending{margin-top:22px;display:flex;flex-wrap:wrap;align-items:center;gap:8px}
.rc-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px}
@media (max-width:1080px){.rc-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:680px){.rc-grid{grid-template-columns:minmax(0,1fr)}}
.rc{position:relative;display:flex;flex-direction:column;gap:18px;padding:22px 22px 18px;border:1px solid var(--line);border-radius:var(--radius);background:linear-gradient(180deg,color-mix(in srgb,var(--c) 7%,var(--card)),var(--card) 38%);overflow:hidden;transition:transform .35s var(--ease),border-color .3s,box-shadow .35s;transition-delay:var(--d,0ms)}
.rc::after{content:"";position:absolute;right:-60px;top:-60px;width:160px;height:160px;border-radius:50%;background:radial-gradient(closest-side,color-mix(in srgb,var(--c) 22%,transparent),transparent);pointer-events:none}
.rc:hover{transform:translateY(-3px);border-color:color-mix(in srgb,var(--accent) 45%,var(--line));box-shadow:0 22px 50px -30px var(--accent)}
.rc-head{display:flex;align-items:center;justify-content:space-between;gap:12px;position:relative;z-index:1}
.rc-name{display:flex;align-items:center;gap:9px;min-width:0;padding:0;border:0;background:none;color:var(--fg);font:inherit;cursor:pointer;text-align:left}
.rc-name b{font:700 1.08rem var(--display);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rc-name:hover b{color:var(--accent)}
.rc-rank{flex:none;display:flex;align-items:baseline;gap:1px;padding:5px 11px;border-radius:999px;border:1px solid var(--line);background:color-mix(in srgb,var(--bg) 60%,transparent);font-family:var(--mono)}
.rc-rank b{font-size:.95rem}
.rc-rank small{font-size:.72rem;color:var(--muted)}
.rc-rank.gold{border-color:#eab308;color:#eab308;box-shadow:0 0 16px -4px #eab308}
.rc-rank.silver{border-color:#cbd5e1;color:#cbd5e1}
.rc-rank.bronze{border-color:#d97706;color:#d97706}
.rc-track{padding:6px 0 0}
.rc-line{position:relative;height:8px;border-radius:999px;background:color-mix(in srgb,var(--fg) 8%,transparent)}
.rc-line .fill{position:absolute;left:0;top:0;bottom:0;border-radius:999px;background:linear-gradient(90deg,color-mix(in srgb,var(--accent) 35%,transparent),var(--accent))}
.rc-line .tick{position:absolute;top:-4px;width:2px;height:16px;margin-left:-1px;border-radius:2px;background:color-mix(in srgb,var(--fg) 40%,transparent)}
.rc-line .tick.top{background:color-mix(in srgb,var(--fg) 70%,transparent)}
.rc-line .me{position:absolute;top:50%;width:16px;height:16px;margin:-8px 0 0 -8px;border-radius:50%;background:var(--bg);border:3px solid var(--accent);box-shadow:0 0 12px var(--accent)}
.rc-nums{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:-6px}
.rc-nums span{font:700 1rem var(--display)}
.rc-nums span:nth-child(2){text-align:center}
.rc-nums span:nth-child(3){text-align:right}
.rc-nums small{display:block;font:600 .66rem var(--mono);letter-spacing:.05em;text-transform:uppercase;color:var(--muted)}
.rc-nums .me{color:var(--accent)}
.rc-block>small{display:block;margin-bottom:8px;font:600 .68rem var(--mono);letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
.rc-comps{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}
.rc-comps li{display:flex;align-items:center;gap:9px;min-width:0;font-size:.84rem}
.rc-comps img{flex:none;border-radius:6px;background:var(--bg2)}
.rc-comps a{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--fg)}
.rc-comps a:hover{color:var(--accent)}
.rc-comps span{margin-left:auto;font:600 .74rem var(--mono);color:var(--muted)}
.rc-steps{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px;counter-reset:rc}
.rc-steps li{position:relative;display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:9px 10px 9px 36px;border-radius:10px;background:color-mix(in srgb,var(--fg) 4%,transparent);font-size:.84rem;counter-increment:rc}
.rc-steps li::before{content:counter(rc);position:absolute;left:10px;top:9px;width:18px;height:18px;border-radius:5px;display:grid;place-items:center;font:700 .7rem var(--mono);color:#fff;background:linear-gradient(135deg,var(--accent),var(--accent2))}
.rc-steps b{flex-basis:100%;font-weight:600;line-height:1.4}
.rc-empty,.rc-note{margin:0;font-size:.84rem;color:var(--muted);line-height:1.5}
.rc-foot{margin-top:auto;display:flex;align-items:center;justify-content:space-between;gap:10px;padding-top:14px;border-top:1px dashed var(--line);font:600 .72rem var(--mono);color:var(--muted)}
.rc-foot button{padding:6px 12px;border-radius:9px;border:1px solid var(--line);background:none;color:var(--fg);font:600 .78rem var(--body,inherit);cursor:pointer}
.rc-foot button:hover{border-color:var(--accent);color:var(--accent)}
@media (max-width:560px){.m-starcmp{grid-template-columns:repeat(2,minmax(0,1fr))}.m-content{padding:4px 18px 24px}}
.palette{width:min(620px,100%);align-self:start;margin-top:12vh;border-radius:16px;border:1px solid var(--line);background:var(--bg2);box-shadow:0 40px 120px -30px rgba(0,0,0,.8),0 0 0 1px color-mix(in srgb,var(--accent) 20%,transparent);overflow:hidden;animation:pop .25s var(--ease)}
.palette input{width:100%;border:0;border-bottom:1px solid var(--line);background:none;color:var(--fg);font:1.05rem var(--sans);padding:18px 20px;outline:none}
.palette ul{list-style:none;margin:0;padding:8px;max-height:52vh;overflow:auto}
.palette li.grp{font:600 .7rem var(--mono);color:var(--muted);text-transform:uppercase;letter-spacing:.1em;padding:10px 12px 4px}
.palette li.it{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;cursor:pointer;font-size:.92rem}
.palette li.it small{color:var(--muted);margin-left:auto;font-size:.78rem;max-width:50%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.palette li.it[aria-selected="true"]{background:color-mix(in srgb,var(--accent) 18%,transparent)}
.palette mark{background:none;color:var(--accent);font-weight:700}
.keys{display:grid;grid-template-columns:auto 1fr;gap:10px 16px;margin:16px 0 0;font-size:.9rem}
.keys dd{margin:0;color:var(--muted)}

/* ── customizer ── */
.custom{position:fixed;top:0;right:0;bottom:0;z-index:90;width:min(360px,100%);overflow:auto;padding:20px 20px 32px;background:color-mix(in srgb,var(--bg2) 92%,transparent);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-left:1px solid var(--line);box-shadow:-30px 0 80px -30px rgba(0,0,0,.6);animation:slide .35s var(--ease)}
.custom[hidden]{display:none}
@keyframes slide{from{transform:translateX(100%)}}
.custom h3{margin:0 0 16px;font:700 1.15rem var(--display);display:flex;justify-content:space-between;align-items:center}
.cz-group{margin-bottom:18px}
.cz-group>label,.cz-group>span{display:block;font:600 .72rem var(--mono);text-transform:uppercase;letter-spacing:.1em;color:var(--muted);margin-bottom:8px}
.cz-opts{display:flex;flex-wrap:wrap;gap:6px}
.cz-opts button{padding:6px 10px;border-radius:8px;border:1px solid var(--line);background:color-mix(in srgb,var(--bg) 40%,transparent);cursor:pointer;font-size:.8rem;transition:all .2s}
.cz-opts button[aria-pressed="true"]{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 18%,transparent)}
.cz-presets{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}
.cz-presets button{aspect-ratio:1;border-radius:12px;border:2px solid transparent;cursor:pointer;position:relative;overflow:hidden;padding:0}
.cz-presets button[aria-pressed="true"]{border-color:var(--fg);transform:scale(1.06)}
.cz-presets button span{position:absolute;inset:auto 0 0;font-size:.55rem;padding:2px 0;background:rgba(0,0,0,.5);color:#fff;text-align:center}
.cz-swatches{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.cz-swatches button{width:26px;height:26px;border-radius:50%;border:2px solid transparent;cursor:pointer}
.cz-swatches button[aria-pressed="true"]{border-color:var(--accent);box-shadow:0 0 0 2px var(--bg2) inset}
.cz-swatches button{box-shadow:inset 0 0 0 1px var(--line)}
.cz-swatches .cz-default{display:grid;place-items:center;background:var(--bg2);color:var(--muted);font-size:.8rem}
.cz-swatches input[type=color]{width:34px;height:30px;border:1px solid var(--line);border-radius:8px;background:none;padding:2px;cursor:pointer}
.cz-toggle{display:flex;justify-content:space-between;align-items:center;padding:8px 0;font-size:.9rem;cursor:pointer}
.cz-toggle input{appearance:none;width:40px;height:22px;border-radius:999px;background:var(--line);position:relative;cursor:pointer;transition:background .2s}
.cz-toggle input::after{content:"";position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:var(--fg);transition:transform .2s var(--ease)}
.cz-toggle input:checked{background:var(--accent)}
.cz-toggle input:checked::after{transform:translateX(18px)}
.custom input[type=range]{width:100%;accent-color:var(--accent)}
.cz-actions{display:flex;gap:8px;margin-top:8px}
.cz-actions .btn{flex:1;justify-content:center;padding:9px 12px;font-size:.85rem}
.toast{position:fixed;left:50%;bottom:24px;z-index:100;transform:translate(-50%,120px);padding:10px 18px;border-radius:12px;background:var(--fg);color:var(--bg);font-weight:600;font-size:.9rem;transition:transform .35s var(--ease);pointer-events:none}
.toast.on{transform:translate(-50%,0)}

.foot{text-align:center;color:var(--muted);font-size:.85rem;padding:64px 16px 40px}
.linklike{border:1px solid var(--line);background:none;border-radius:6px;cursor:pointer;color:var(--muted);padding:0 6px}

/* ── reveal ── */
[data-anim="full"] .reveal,[data-anim="subtle"] .reveal{opacity:0;transform:translateY(24px);transition:opacity .8s var(--ease),transform .8s var(--ease)}
[data-anim="subtle"] .reveal{transform:none}
[data-anim] .reveal.in{opacity:1;transform:none}
[data-anim="full"] .card.reveal.in{transform:perspective(900px) rotateX(var(--rx,0)) rotateY(var(--ry,0)) translateY(var(--ty,0))}
[data-anim="off"] *,[data-anim="off"] *::before,[data-anim="off"] *::after{animation:none!important;transition:none!important}
[data-anim="off"] .bar i{width:var(--w)}
[data-anim="off"] .chart rect{transform:none}
@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms!important;transition-duration:.01ms!important}.reveal{opacity:1!important;transform:none!important}}
.card[hidden]{display:none}

/* ── pages ── */
.page[hidden]{display:none}
[data-multi="true"] .page{animation:pagein .45s var(--ease)}
[data-multi="true"] .page:not([data-page="home"])>.sec:first-child{padding-top:48px}
[data-multi="true"] .hero{min-height:min(78vh,760px)}
@keyframes pagein{from{opacity:0;transform:translateY(10px)}}
.tiles-sec{padding-top:24px}
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px}
.tile{display:flex;flex-direction:column;gap:2px;padding:18px 18px 16px;border-radius:var(--radius);border:1px solid var(--line);background:var(--card);color:var(--fg);transition:transform .25s var(--ease),border-color .25s}
.tile:hover{text-decoration:none;transform:translateY(-3px);border-color:var(--accent)}
.tile-n{font:700 1.8rem/1.1 var(--display);color:var(--accent);font-variant-numeric:tabular-nums}
.tile-l{color:var(--muted);font-size:.8rem}
.tile b{margin-top:10px;font-size:.92rem}

/* ── glow levels (strong = everything above) ── */
[data-fx="soft"] .avatar{box-shadow:0 4px 18px -10px var(--accent)}
[data-fx="soft"] .btn.primary,[data-fx="soft"] .btn.primary:hover{box-shadow:0 6px 16px -12px var(--accent)}
[data-fx="soft"] .terminal{box-shadow:var(--shadow)}
[data-fx="soft"] .card:hover{box-shadow:var(--shadow);border-color:color-mix(in srgb,var(--accent) 45%,var(--line))}
[data-fx="soft"] .card::before{opacity:0!important}
[data-fx="soft"] .chip[aria-pressed="true"],[data-fx="soft"] .orb:hover{box-shadow:none}
[data-fx="soft"] .bar i,[data-fx="soft"] #progress{box-shadow:none}
[data-fx="soft"] .st-active,[data-fx="soft"] .st-wip{box-shadow:none}
[data-fx="soft"] .card .st-active{animation:none}
[data-fx="soft"] .hero h1{animation:none;background:linear-gradient(120deg,var(--fg) 55%,var(--accent));-webkit-background-clip:text;background-clip:text}
[data-fx="soft"] .cursor-glow{background:radial-gradient(circle,color-mix(in srgb,var(--accent) 7%,transparent),transparent 65%)}
[data-fx="soft"] .aurora i{opacity:.22}
[data-fx="soft"][data-card="neon"] .card{box-shadow:0 0 10px -6px var(--accent)}
[data-fx="none"] *,[data-fx="none"] *::before{box-shadow:none!important;text-shadow:none!important}
[data-fx="none"] .card::before,[data-fx="none"] .shine,[data-fx="none"] .cursor-glow{display:none}
[data-fx="none"] .hero h1{animation:none;background:none;color:var(--fg);-webkit-text-fill-color:var(--fg)}
[data-fx="none"] .avatar{background:var(--line);animation:none}
[data-fx="none"] .btn.primary{background:var(--accent)}
[data-fx="none"] .aurora i{opacity:.12}
[data-fx="none"] .card .st-active,[data-fx="none"] .big-dot{animation:none}


/* ── projects toolbar / filters (both modes) ── */
.toolbar .search{flex:1 1 280px}
.filters{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;margin:0 0 14px}
.pills{display:flex;flex-wrap:wrap;gap:6px}
.pills button{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:999px;border:1px solid var(--line);background:transparent;color:var(--muted);font-size:.84rem;cursor:pointer;transition:all .2s}
.pills button b{font-weight:600;font-size:.74rem;opacity:.7}
.pills button:hover{color:var(--fg)}
.pills button[aria-pressed="true"]{color:var(--fg);border-color:var(--fg);background:color-mix(in srgb,var(--fg) 6%,transparent)}
.filter-toggle{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:999px;border:1px solid var(--line);background:transparent;color:var(--muted);font-size:.84rem;cursor:pointer}
.filter-toggle b{color:var(--accent)}
.filter-toggle[aria-expanded="true"]{color:var(--fg)}
.filter-toggle[aria-expanded="true"] span{display:inline-block;transform:rotate(180deg)}
#tech-filter{margin-bottom:18px}
#tech-filter[hidden]{display:none}

/* ── stats page ── */
.kpi-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:20px;margin:0 0 8px}
.kpi{padding:18px 20px}
.kpi dt{font:700 1.9rem/1.1 var(--display);font-variant-numeric:tabular-nums;color:var(--fg)}
.kpi dd{margin:4px 0 0;color:var(--muted);font-size:.82rem}
.sub-h{font:600 1.05rem var(--display);margin:34px 0 12px;color:var(--fg)}
.act-side h4,.breakdown h4{margin:14px 0 10px;font:600 .78rem var(--sans);color:var(--muted);text-transform:uppercase;letter-spacing:.06em}
.breakdown h4{margin-top:0}
.act-side .kpis{grid-template-columns:repeat(2,1fr)}
.breakdown{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px}
.donut-wrap{display:flex;align-items:center;gap:18px}
.donut{width:120px;height:120px;flex:none}
.donut circle{transition:stroke-dasharray 1s var(--ease)}
.donut-n{font:700 22px var(--display);fill:var(--fg)}
.legend{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px;font-size:.85rem;flex:1}
.legend li{display:flex;align-items:center;gap:8px}
.legend i{width:9px;height:9px;border-radius:3px;flex:none}
.legend b{margin-left:auto;font:600 .8rem var(--mono);color:var(--muted)}
.barlist{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:10px}
.barlist li{display:grid;grid-template-columns:minmax(0,120px) 1fr 32px;gap:10px;align-items:center;font-size:.85rem}
.bl-name{display:flex;align-items:center;gap:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.barlist b{font:600 .78rem var(--mono);color:var(--muted);text-align:right}
.barlist .bar,.top-repos .bar,.langs .bar{height:6px}

/* ══════════════ SIMPLE MODE ══════════════ */
body[data-mode="simple"]{
  --bg:#ffffff;--bg2:#f7f7f8;--fg:#18181b;--muted:#71717a;--line:#e9e9ec;--card:#ffffff;--accent2:var(--accent);
  --shadow:0 1px 2px rgba(24,24,27,.04),0 2px 8px -2px rgba(24,24,27,.06);
  --display:"Inter","Noto Sans TC",system-ui,-apple-system,"Segoe UI",sans-serif;
  color-scheme:light;letter-spacing:-.003em
}
body[data-mode="simple"][data-scheme="dark"]{--bg:#0b0b0d;--bg2:#141417;--fg:#f4f4f5;--muted:#9a9aa3;--line:#25252a;--card:#111114;--shadow:0 1px 2px rgba(0,0,0,.4);color-scheme:dark}
@media (prefers-color-scheme:dark){body[data-mode="simple"][data-scheme="auto"]{--bg:#0b0b0d;--bg2:#141417;--fg:#f4f4f5;--muted:#9a9aa3;--line:#25252a;--card:#111114;--shadow:0 1px 2px rgba(0,0,0,.4);color-scheme:dark}}
body[data-mode="simple"][data-font="sans"]{--sans:"Inter","Noto Sans TC",system-ui,-apple-system,"Segoe UI",sans-serif}
body[data-mode="simple"] #bg,body[data-mode="simple"] .aurora,body[data-mode="simple"] .gridlines,body[data-mode="simple"] .noise,body[data-mode="simple"] .cursor-glow,body[data-mode="simple"] #progress,body[data-mode="simple"] .eyebrow,body[data-mode="simple"] .roles .cursor,body[data-mode="simple"] .shine,body[data-mode="simple"] .sec-idx{display:none!important}
body[data-mode="simple"] .nav{background:color-mix(in srgb,var(--bg) 88%,transparent);backdrop-filter:saturate(180%) blur(12px)}
body[data-mode="simple"] .nav nav a.on,body[data-mode="simple"] .nav nav a:hover{background:var(--bg2);color:var(--fg)}
body[data-mode="simple"] .icon-btn{background:transparent}
body[data-mode="simple"] .icon-btn:hover{transform:none;border-color:var(--fg)}
body[data-mode="simple"] main{max-width:1080px}

/* hero */
body[data-mode="simple"] .hero{display:block;min-height:0;padding:80px 0 48px;position:relative}
body[data-mode="simple"] .avatar{width:76px;height:76px;padding:0;background:none;animation:none;box-shadow:none;margin-bottom:28px}
body[data-mode="simple"] .avatar img{border:1px solid var(--line)}
body[data-mode="simple"] .hero h1{font:700 clamp(2.2rem,5.6vw,3.4rem)/1.15 var(--display);letter-spacing:-.035em;background:none;-webkit-text-fill-color:var(--fg);color:var(--fg);animation:none;margin-bottom:10px}
body[data-mode="simple"] .glitch::before,body[data-mode="simple"] .glitch::after{display:none}
body[data-mode="simple"] .roles{font:500 1.1rem var(--sans);color:var(--muted);margin-bottom:20px;min-height:0}
body[data-mode="simple"] .intro{color:var(--fg);opacity:.85;font-size:1.08rem;line-height:1.7}
body[data-mode="simple"] .hero-meta{font-size:.88rem}
body[data-mode="simple"] .ctas{margin-bottom:44px}
body[data-mode="simple"] .btn{border-radius:10px;padding:10px 18px;font-weight:600;font-size:.92rem}
body[data-mode="simple"] .btn.primary{background:var(--fg);color:var(--bg);box-shadow:none}
body[data-mode="simple"] .btn.primary:hover{opacity:.88;box-shadow:none}
body[data-mode="simple"] .btn.ghost{background:transparent}
body[data-mode="simple"] .btn.ghost:hover{border-color:var(--fg)}
body[data-mode="simple"] .counters{gap:0;border-top:1px solid var(--line);padding-top:22px}
body[data-mode="simple"] .counters div{flex:1 1 110px;padding-right:16px}
body[data-mode="simple"] .counters dt{font:600 1.6rem var(--display);background:none;-webkit-text-fill-color:var(--fg);color:var(--fg)}
body[data-mode="simple"] .counters dd{font-size:.8rem}

/* sections */
body[data-mode="simple"] .sec{padding:56px 0 16px}
body[data-mode="simple"] .sec-head{margin-bottom:22px}
body[data-mode="simple"] .sec-head h2{font:700 1.6rem/1.2 var(--display);letter-spacing:-.02em}
body[data-mode="simple"] .sec-head p{font-size:.95rem}
body[data-mode="simple"] .panel{background:var(--card);backdrop-filter:none;-webkit-backdrop-filter:none;box-shadow:none;border-radius:calc(var(--radius) * .8)}
body[data-mode="simple"] .search,body[data-mode="simple"] .select,body[data-mode="simple"] .seg{background:var(--card);box-shadow:none}
body[data-mode="simple"] .search:focus-within{border-color:var(--fg);box-shadow:0 0 0 3px color-mix(in srgb,var(--fg) 8%,transparent)}
body[data-mode="simple"] .seg button[aria-pressed="true"]{background:var(--bg2);color:var(--fg)}
body[data-mode="simple"] .chip{background:transparent}
body[data-mode="simple"] .chip:hover{transform:none}
body[data-mode="simple"] .chip[aria-pressed="true"]{border-color:var(--fg);background:var(--bg2);box-shadow:none}

/* cards */
body[data-mode="simple"] .grid{gap:14px}
body[data-mode="simple"] .card{background:var(--card);backdrop-filter:none;-webkit-backdrop-filter:none;border:1px solid var(--line);border-radius:calc(var(--radius) * .8);box-shadow:none;transform:none!important}
body[data-mode="simple"] .card::before{display:none}
body[data-mode="simple"] .card:hover{border-color:color-mix(in srgb,var(--fg) 28%,var(--line));box-shadow:var(--shadow)}
body[data-mode="simple"] .card .cover{aspect-ratio:16/9;border-bottom:1px solid var(--line);background:var(--bg2)}
body[data-mode="simple"] .card .cover::after{display:none}
body[data-mode="simple"] .card .cover img{filter:none}
body[data-mode="simple"] .card:hover .cover img{transform:scale(1.03);filter:none}
body[data-mode="simple"] .cover-fallback{background-image:none;color:var(--muted);font-size:2.6rem}
body[data-mode="simple"] .card-body{padding:14px 16px 12px;gap:8px}
body[data-mode="simple"] .card h3{font:600 1.02rem/1.3 var(--display);letter-spacing:-.01em}
body[data-mode="simple"] .card.big h3{font-size:1.2rem}
body[data-mode="simple"] .sum{font-size:.88rem;line-height:1.55;color:var(--muted);-webkit-line-clamp:2}
body[data-mode="simple"] .card.big .sum{-webkit-line-clamp:2;font-size:.9rem}
body[data-mode="simple"] .techs{gap:2px 0;font-size:.75rem;color:var(--muted)}
body[data-mode="simple"] .tech:nth-child(n+4){display:none}
body[data-mode="simple"] .tech .ti{display:none}
body[data-mode="simple"] .tech+.tech::before{content:"·";margin:0 8px;opacity:.6}
body[data-mode="simple"] .tech{background:transparent;padding:0;border-radius:0;font-size:inherit}
body[data-mode="simple"] .tech .ti{filter:grayscale(1);opacity:.75}
body[data-mode="simple"] .spark{display:none}
body[data-mode="simple"] .spark-line{stroke:var(--muted)}
body[data-mode="simple"] .spark-area{fill:color-mix(in srgb,var(--fg) 5%,transparent)}
body[data-mode="simple"] .card-foot{border-top:1px solid var(--line)}
body[data-mode="simple"] .btn-mini{background:transparent}
body[data-mode="simple"] .btn-mini.primary{background:var(--fg);color:var(--bg);border-color:var(--fg)}
body[data-mode="simple"] .btn-mini:hover{color:inherit;border-color:var(--fg)}
body[data-mode="simple"] .btn-mini.primary:hover{color:var(--bg);opacity:.88}
body[data-mode="simple"] .stars{color:var(--muted)}
body[data-mode="simple"] .card.featured{box-shadow:none}
body[data-mode="simple"] .featured-grid{grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:14px}
body[data-mode="simple"] .featured-grid .card:first-child:nth-last-child(odd){grid-column:auto;flex-direction:column;min-height:0}
body[data-mode="simple"] .featured-grid .card:first-child:nth-last-child(odd) .card-body{padding:18px 18px 14px}
body[data-mode="simple"] .featured-grid .card:first-child:nth-last-child(odd) h3{font-size:1.2rem}
body[data-mode="simple"] .featured-grid .card:first-child:nth-last-child(odd) .cover{aspect-ratio:16/9;width:auto}
body[data-mode="simple"] .st-active,body[data-mode="simple"] .st-wip{box-shadow:none}
body[data-mode="simple"] .card .st-active{animation:none}

/* stats & misc */
body[data-mode="simple"] .bar i{background:var(--fg);box-shadow:none}
body[data-mode="simple"] .chart rect{fill:var(--fg);opacity:.75}
body[data-mode="simple"] .chart rect:hover{fill:var(--accent);opacity:1}
body[data-mode="simple"] .kpis dt{color:var(--fg)}
body[data-mode="simple"] .orb{background:transparent}
body[data-mode="simple"] .orb:hover{transform:none;box-shadow:none;border-color:var(--fg)}
body[data-mode="simple"] .tile{box-shadow:none}
body[data-mode="simple"] .tile:hover{transform:none;border-color:var(--fg)}
body[data-mode="simple"] .tile-n{color:var(--fg)}
body[data-mode="simple"] .tile b{color:var(--muted);font-weight:500}
body[data-mode="simple"] .big-dot{animation:none}
body[data-mode="simple"] .modal,body[data-mode="simple"] .palette{background:var(--bg);box-shadow:0 30px 80px -20px rgba(0,0,0,.35)}
body[data-mode="simple"] .m-cover::after{background:linear-gradient(180deg,transparent 60%,var(--bg))}
body[data-mode="simple"] .m-box{background:var(--bg2)}
body[data-mode="simple"] .custom{background:var(--bg);backdrop-filter:none}
body[data-mode="simple"] a{color:var(--fg);text-decoration:underline;text-decoration-color:var(--line);text-underline-offset:3px}
body[data-mode="simple"] a:hover{text-decoration-color:currentColor}
body[data-mode="simple"] .nav a,body[data-mode="simple"] .btn,body[data-mode="simple"] .btn-mini,body[data-mode="simple"] .tile,body[data-mode="simple"] .brand{text-decoration:none}
body[data-mode="simple"] .hero-meta a{color:var(--muted)}

/* customizer groups */
.cz-mode{display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:4px;border-radius:12px;border:1px solid var(--line);margin-bottom:20px}
.cz-mode button{padding:9px;border-radius:9px;border:0;background:transparent;cursor:pointer;font-weight:600;color:var(--muted)}
.cz-mode button[aria-pressed="true"]{background:var(--fg);color:var(--bg)}
.cz-fx{border:1px solid var(--line);border-radius:12px;padding:0 14px;margin-bottom:18px}
.cz-fx summary{cursor:pointer;padding:12px 0;font-weight:600;list-style:none;display:flex;justify-content:space-between}
.cz-fx summary::after{content:"▾";color:var(--muted)}
.cz-fx[open] summary::after{content:"▴"}
.cz-fx[open]{padding-bottom:4px}
body[data-mode="simple"] .tech-only,body[data-mode="tech"] .simple-only{display:none}


/* simple: hero with a quiet dot grid + terminal on the right */
body[data-mode="simple"] .hero::before{content:"";position:absolute;z-index:-1;inset:-20px -24px;background-image:radial-gradient(color-mix(in srgb,var(--fg) 13%,transparent) 1px,transparent 1.2px);background-size:22px 22px;-webkit-mask-image:radial-gradient(ellipse 60% 70% at 70% 45%,#000 20%,transparent 75%);mask-image:radial-gradient(ellipse 60% 70% at 70% 45%,#000 20%,transparent 75%);pointer-events:none}
@media (min-width:900px){body[data-mode="simple"] .hero{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,1fr);gap:56px;align-items:center}}
@media (max-width:899px){body[data-mode="simple"] .terminal{margin-top:36px}}
body[data-mode="simple"] .terminal{transform:none;backdrop-filter:none;background:#0f1115;border-color:color-mix(in srgb,var(--fg) 14%,transparent);box-shadow:0 30px 60px -30px rgba(0,0,0,.45);color-scheme:dark}
body[data-mode="simple"] .term-bar{border-color:rgba(255,255,255,.08);color:#8b929c}
body[data-mode="simple"] .term-body{color:#e6e8eb;min-height:250px;font-size:12.5px}
body[data-mode="simple"] .term-body .p{color:var(--accent)}
body[data-mode="simple"] .term-body .hl{color:#93c5fd}
body[data-mode="simple"] .term-body .dim{color:#6b7280}
body[data-mode="simple"] .term-body .cur{background:#e6e8eb}
body[data-mode="simple"] .hero h1 .accent-dot{color:var(--accent)}
body[data-mode="simple"] .ctas{margin-bottom:0}
body[data-mode="simple"] .sec-head p{display:none}
body[data-mode="simple"] .sec-head h2{display:flex;align-items:center;gap:10px}
body[data-mode="simple"] .sec-head h2::before{content:"";width:8px;height:8px;border-radius:2px;background:var(--accent)}
body[data-mode="simple"] .when{font-size:.78rem}
/* simple: stat cards stay calm but keep colour in the charts */
body[data-mode="simple"] .stat{box-shadow:none}
body[data-mode="simple"] a.stat:hover{transform:none;border-color:color-mix(in srgb,var(--fg) 30%,var(--line));box-shadow:var(--shadow)}
body[data-mode="simple"] .stat::before{display:none}
body[data-mode="simple"] .stat-n{background:none;-webkit-text-fill-color:var(--fg);color:var(--fg);font-weight:700}
body[data-mode="simple"] .stat-ic{background:var(--bg2);color:var(--fg)}
`;
}
