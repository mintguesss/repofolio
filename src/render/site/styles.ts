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

export const PRESET_COLORS: Record<Preset, Colors> = {
  cyber: { bg: "#05060f", bg2: "#0b0e1f", fg: "#e6f1ff", muted: "#8892b0", line: "rgba(125,211,252,.14)", card: "rgba(15,20,40,.6)", accent: "#22d3ee", accent2: "#a855f7" },
  midnight: { bg: "#0b1020", bg2: "#121a33", fg: "#e2e8f0", muted: "#94a3b8", line: "rgba(148,163,184,.16)", card: "rgba(20,28,52,.65)", accent: "#6366f1", accent2: "#ec4899" },
  matrix: { bg: "#020a04", bg2: "#06140a", fg: "#c8ffd4", muted: "#5fa872", line: "rgba(34,197,94,.18)", card: "rgba(4,24,10,.7)", accent: "#22c55e", accent2: "#a3e635" },
  synthwave: { bg: "#13002b", bg2: "#1e0640", fg: "#fde7ff", muted: "#c39bd3", line: "rgba(244,114,182,.2)", card: "rgba(40,8,72,.6)", accent: "#f472b6", accent2: "#facc15" },
  ocean: { bg: "#03141f", bg2: "#06212f", fg: "#e0f7ff", muted: "#7fb3c8", line: "rgba(56,189,248,.16)", card: "rgba(6,36,52,.6)", accent: "#38bdf8", accent2: "#2dd4bf" },
  ember: { bg: "#120806", bg2: "#1d0f0a", fg: "#fff1e6", muted: "#c4a08a", line: "rgba(251,146,60,.18)", card: "rgba(40,18,10,.62)", accent: "#fb923c", accent2: "#ef4444" },
  aurora: { bg: "#06101a", bg2: "#0c1a28", fg: "#ecfeff", muted: "#8fb5c4", line: "rgba(45,212,191,.16)", card: "rgba(12,28,40,.55)", accent: "#2dd4bf", accent2: "#818cf8" },
  mono: { bg: "#0a0a0a", bg2: "#141414", fg: "#fafafa", muted: "#a1a1a1", line: "rgba(255,255,255,.12)", card: "rgba(24,24,24,.7)", accent: "#fafafa", accent2: "#737373" },
  paper: { bg: "#f6f3ee", bg2: "#ece7df", fg: "#1f1b16", muted: "#6f665c", line: "rgba(31,27,22,.12)", card: "rgba(255,255,255,.75)", accent: "#c2410c", accent2: "#0f766e", light: true },
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
.hero h1{font:800 clamp(2.4rem,7vw,4.6rem)/1.02 var(--display);letter-spacing:-.035em;margin:0 0 14px;background:linear-gradient(120deg,var(--fg) 30%,var(--accent) 60%,var(--accent2));background-size:200% auto;-webkit-background-clip:text;background-clip:text;color:transparent;animation:shimmer 8s linear infinite;position:relative;word-break:break-word}
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
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(310px,1fr));gap:18px}
.featured-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr));gap:20px}
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
.card-body{display:flex;flex-direction:column;gap:10px;padding:16px 18px 16px;flex:1;position:relative;z-index:3}
.card-top{display:flex;align-items:center;gap:8px}
.card h3{font:700 1.08rem/1.25 var(--display);margin:0;flex:1;min-width:0;overflow-wrap:anywhere}
.card.big h3{font-size:1.35rem}
.stars{font:600 .8rem var(--mono);color:#fbbf24;white-space:nowrap}
.pill{font-size:.68rem;padding:1px 7px;border-radius:999px;border:1px solid var(--line);color:var(--muted)}
.sum{margin:0;color:var(--muted);font-size:.92rem;flex:1;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.card.big .sum{-webkit-line-clamp:4;font-size:.98rem}
.techs{display:flex;flex-wrap:wrap;gap:6px}
.tech{display:inline-flex;align-items:center;gap:5px;font-size:.74rem;padding:3px 8px;border-radius:7px;background:color-mix(in srgb,var(--fg) 6%,transparent);color:var(--muted)}
.tech em{font-style:normal}
.spark{width:100%;height:28px;display:block}
.spark-line{fill:none;stroke:var(--accent);stroke-width:1.6;vector-effect:non-scaling-stroke;stroke-linejoin:round}
.spark-area{fill:color-mix(in srgb,var(--accent) 14%,transparent);stroke:none}
.card-foot{display:flex;align-items:center;justify-content:space-between;gap:8px;padding-top:10px;border-top:1px dashed var(--line);font-size:.78rem;color:var(--muted)}
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

/* layouts */
[data-layout="bento"] .grid{grid-template-columns:repeat(auto-fill,minmax(250px,1fr));grid-auto-flow:dense}
[data-layout="bento"] .grid .card:nth-child(6n+1):not([hidden]){grid-column:span 2;grid-row:span 2}
[data-layout="bento"] .grid .card:nth-child(6n+1) .cover{aspect-ratio:16/9}
[data-layout="bento"] .grid .card:nth-child(6n+4){grid-column:span 2}
@media (max-width:640px){[data-layout="bento"] .grid .card{grid-column:auto!important;grid-row:auto!important}}
[data-layout="list"] .grid{grid-template-columns:1fr;gap:12px}
[data-layout="list"] .grid .card{flex-direction:row}
[data-layout="list"] .grid .cover{aspect-ratio:auto;width:240px;flex:none}
[data-layout="list"] .grid .cover::after{background:linear-gradient(90deg,transparent 50%,var(--card))}
@media (max-width:640px){[data-layout="list"] .grid .card{flex-direction:column}[data-layout="list"] .grid .cover{width:auto;aspect-ratio:2/1}}
[data-layout="compact"] .grid{grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px}
[data-layout="compact"] .grid .cover,[data-layout="compact"] .grid .spark,[data-layout="compact"] .grid .techs em{display:none}
[data-layout="compact"] .grid .sum{-webkit-line-clamp:2;font-size:.85rem}
[data-layout="compact"] .grid .card-body{padding:12px 14px;gap:8px}
.empty{text-align:center;padding:48px 0;color:var(--muted)}

/* ── stack ── */
.stack-grid{display:grid;grid-template-columns:1fr 1.2fr;gap:20px}
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
.activity-grid{display:grid;grid-template-columns:2fr 1fr;gap:20px}
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

/* ── timeline ── */
.timeline{list-style:none;margin:0;padding:0 0 0 28px;position:relative}
.timeline::before{content:"";position:absolute;left:8px;top:4px;bottom:4px;width:2px;background:linear-gradient(var(--accent),var(--accent2),transparent)}
.timeline .year span{display:inline-block;font:700 1.2rem var(--display);margin:18px 0 8px -28px;padding:2px 12px;border-radius:999px;background:var(--accent);color:var(--bg)}
.tl-item{position:relative;padding:8px 0 14px}
.tl-dot{position:absolute;left:-25px;top:15px;width:12px;height:12px;border-radius:50%;border:2px solid var(--bg)}
.tl-item time{font:.75rem var(--mono);color:var(--muted);display:block}
.tl-item a{font-weight:700;font-size:1.02rem}
.tl-item p{margin:2px 0 0;color:var(--muted);font-size:.88rem;max-width:70ch}

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
.m-content{padding:4px 28px 28px}
.m-content h2{font:800 2rem/1.15 var(--display);margin:0 0 6px;letter-spacing:-.02em}
.m-sub{display:flex;flex-wrap:wrap;gap:8px 16px;color:var(--muted);font-size:.85rem;margin-bottom:16px;align-items:center}
.m-sum{font-size:1.05rem;margin:0 0 8px}
.m-purpose{color:var(--muted);margin:0 0 18px}
.m-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:18px}
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
.m-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:20px}
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
.cz-swatches button[aria-pressed="true"]{border-color:var(--fg)}
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
`;
}
