// @ts-nocheck — browser code. clientMain is serialised with Function#toString() into the
// generated page, so it must stay self-contained: no imports, no references to outer scope.

export function clientMain(): void {
  const D = JSON.parse(document.getElementById("rf-data").textContent);
  const C = D.config;
  const S = C.strings;
  const P = D.projects;
  const byId = Object.fromEntries(P.map((p) => [p.id, p]));
  const body = document.body;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const KEY = "repofolio:theme:v2";

  /* ───────── settings ───────── */
  let st = Object.assign({}, C.defaults);
  if (C.customizer) {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || "null");
      if (saved && typeof saved === "object") st = Object.assign(st, saved);
    } catch (e) {}
  }
  const save = () => {
    const diff = {};
    for (const k in st) if (st[k] !== C.defaults[k]) diff[k] = st[k];
    try {
      if (Object.keys(diff).length) localStorage.setItem(KEY, JSON.stringify(diff));
      else localStorage.removeItem(KEY);
    } catch (e) {}
  };
  const simple = () => st.mode === "simple";
  // Simple mode switches every effect off (mirrors effectiveTheme() in index.ts).
  const eff = () => (simple()
    ? Object.assign({}, st, { background: "none", cardStyle: "simple", animation: st.animation === "off" ? "off" : "subtle", glow: "none", cursorGlow: false, tilt: false, covers: true })
    : st);
  const motion = () => (reduceMotion ? "off" : eff().animation);

  function applyTheme() {
    const e = eff();
    body.dataset.mode = st.mode;
    body.dataset.scheme = st.scheme;
    body.dataset.preset = e.preset;
    body.dataset.bg = e.background;
    body.dataset.card = e.cardStyle;
    body.dataset.layout = e.layout;
    body.dataset.font = e.font;
    body.dataset.anim = motion();
    body.dataset.covers = String(e.covers);
    body.dataset.glow = String(e.cursorGlow);
    body.dataset.tilt = String(e.tilt);
    body.dataset.fx = e.glow;
    applyBg();
    body.style.setProperty("--accent", st.accent);
    body.style.setProperty("--radius", st.radius + "px");
    const meta = $('meta[name="theme-color"]');
    if (meta) meta.content = getComputedStyle(body).getPropertyValue("--bg").trim();
    $$("#layout-switch button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.layout === st.layout)));
    syncRoles();
    bg.start(e.background);
    syncCustomizer();
  }
  // Custom background colour: mirrors bgColorVars() in index.ts.
  const BG_PROPS = ["--bg", "--bg2", "--card", "--fg", "--muted", "--line", "color-scheme"];
  function applyBg() {
    BG_PROPS.forEach((k) => body.style.removeProperty(k));
    if (!st.bgColor || !/^#[0-9a-f]{6}$/i.test(st.bgColor)) return;
    const n = parseInt(st.bgColor.slice(1), 16);
    const lin = (v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    const light = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255) > 0.4;
    const mix = light ? "#000" : "#fff";
    const v = {
      "--bg": st.bgColor,
      "--bg2": `color-mix(in srgb,${st.bgColor} 92%,${mix})`,
      "--card": `color-mix(in srgb,${st.bgColor} 94%,${mix})`,
      "--fg": light ? "#1c1917" : "#e8edf2",
      "--muted": light ? "#6b6560" : "#949ba4",
      "--line": light ? "rgba(0,0,0,.1)" : "rgba(255,255,255,.12)",
      "color-scheme": light ? "light" : "dark",
    };
    for (const k in v) body.style.setProperty(k, v[k]);
  }
  const defaultAccent = () => (simple() ? C.simpleAccent : C.presetAccents[st.preset]);
  function set(patch, silent) {
    const wasDefault = st.accent === defaultAccent();
    if (patch.preset && !("bgColor" in patch)) patch.bgColor = undefined;
    if (patch.mode && patch.mode !== st.mode && !("bgColor" in patch)) patch.bgColor = undefined;
    Object.assign(st, patch);
    // Keep the accent following the mode / preset unless the visitor picked one.
    if (!("accent" in patch) && (patch.preset || patch.mode) && wasDefault) st.accent = defaultAccent();
    if (patch.preset && !("accent" in patch)) st.accent = C.presetAccents[patch.preset];
    save();
    applyTheme();
    if (!silent && patch.preset) toast(`${S.theme}: ${patch.preset}`);
    if (!silent && patch.mode) toast(`${S.mode}: ${S.modes[patch.mode]}`);
  }

  /* ───────── background canvas ───────── */
  const bg = (() => {
    const cv = $("#bg");
    const ctx = cv.getContext("2d");
    let W = 0, H = 0, dpr = 1, raf = 0, mode = "", state = null, last = 0;
    const mouse = { x: -9999, y: -9999 };
    addEventListener("pointermove", (e) => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
    addEventListener("pointerleave", () => { mouse.x = mouse.y = -9999; });
    const css = (n) => getComputedStyle(body).getPropertyValue(n).trim();
    function hexA(hex, a) {
      const h = hex.replace("#", "");
      const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
      return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
    }
    function resize() {
      dpr = Math.min(devicePixelRatio || 1, 2);
      W = innerWidth; H = innerHeight;
      cv.width = W * dpr; cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (mode) state = effects[mode] && effects[mode].init();
    }
    const effects = {
      particles: {
        init() {
          const n = Math.min(130, Math.round((W * H) / 12000));
          return { pts: Array.from({ length: n }, () => ({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35, r: Math.random() * 1.6 + 0.6 })) };
        },
        frame(s, c) {
          ctx.clearRect(0, 0, W, H);
          const pts = s.pts, R = 130;
          for (const p of pts) {
            p.x += p.vx; p.y += p.vy;
            if (p.x < 0 || p.x > W) p.vx *= -1;
            if (p.y < 0 || p.y > H) p.vy *= -1;
            const dx = mouse.x - p.x, dy = mouse.y - p.y, d = Math.hypot(dx, dy);
            if (d < 180) { p.x -= dx * 0.004; p.y -= dy * 0.004; }
          }
          for (let i = 0; i < pts.length; i++) {
            const a = pts[i];
            for (let j = i + 1; j < pts.length; j++) {
              const b = pts[j], d = Math.hypot(a.x - b.x, a.y - b.y);
              if (d < R) { ctx.strokeStyle = hexA(c.a, (1 - d / R) * 0.35); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
            }
            const dm = Math.hypot(a.x - mouse.x, a.y - mouse.y);
            if (dm < 200) { ctx.strokeStyle = hexA(c.b, (1 - dm / 200) * 0.6); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke(); }
            ctx.fillStyle = hexA(c.a, 0.85);
            ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, 7); ctx.fill();
          }
        },
      },
      grid: {
        init() { return { off: 0 }; },
        frame(s, c, dt) {
          ctx.clearRect(0, 0, W, H);
          const hz = H * 0.58;
          s.off = (s.off + dt * 0.04) % 1;
          // sun
          const g = ctx.createLinearGradient(0, hz - 220, 0, hz);
          g.addColorStop(0, hexA(c.b, 0.55)); g.addColorStop(1, hexA(c.a, 0.05));
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(W / 2, hz, Math.min(220, W * 0.22), Math.PI, 0); ctx.fill();
          ctx.fillStyle = c.bg;
          for (let i = 0; i < 7; i++) { const y = hz - 18 - i * 22; ctx.fillRect(0, y, W, 2 + i * 0.9); }
          // floor
          const fg = ctx.createLinearGradient(0, hz, 0, H);
          fg.addColorStop(0, hexA(c.a, 0)); fg.addColorStop(1, hexA(c.a, 0.12));
          ctx.fillStyle = fg; ctx.fillRect(0, hz, W, H - hz);
          ctx.lineWidth = 1;
          for (let i = 0; i < 24; i++) {
            const z = (i + s.off) / 24, y = hz + Math.pow(z, 2.2) * (H - hz);
            ctx.strokeStyle = hexA(c.a, 0.08 + z * 0.5);
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
          }
          const vx = W / 2 + (mouse.x > -1 ? (mouse.x - W / 2) * 0.05 : 0);
          for (let i = -24; i <= 24; i++) {
            ctx.strokeStyle = hexA(c.a, 0.35);
            ctx.beginPath(); ctx.moveTo(vx, hz); ctx.lineTo(W / 2 + i * (W / 12), H); ctx.stroke();
          }
          const fade = ctx.createLinearGradient(0, hz, 0, hz + 60);
          fade.addColorStop(0, c.bg); fade.addColorStop(1, hexA("#000000", 0));
          ctx.fillStyle = fade; ctx.fillRect(0, hz, W, 60);
        },
      },
      matrix: {
        init() {
          ctx.fillStyle = css("--bg"); ctx.fillRect(0, 0, W, H);
          const fs = 16;
          return { fs, drops: Array.from({ length: Math.ceil(W / fs) }, () => Math.random() * -50), acc: 0 };
        },
        frame(s, c, dt) {
          s.acc += dt;
          if (s.acc < 50) return;
          s.acc = 0;
          ctx.fillStyle = hexA(c.bg, 0.12); ctx.fillRect(0, 0, W, H);
          ctx.font = `${s.fs}px "JetBrains Mono", monospace`;
          const chars = "アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789{}<>/=+*#$ABCDEF";
          for (let i = 0; i < s.drops.length; i++) {
            const ch = chars[(Math.random() * chars.length) | 0], x = i * s.fs, y = s.drops[i] * s.fs;
            ctx.fillStyle = Math.random() > 0.96 ? c.fg : hexA(c.a, 0.75);
            ctx.fillText(ch, x, y);
            if (y > H && Math.random() > 0.975) s.drops[i] = 0;
            s.drops[i]++;
          }
        },
      },
      stars: {
        init() { return { s: Array.from({ length: 420 }, () => ({ x: (Math.random() - 0.5) * W, y: (Math.random() - 0.5) * H, z: Math.random() * W, pz: 0 })) }; },
        frame(s, c, dt) {
          ctx.fillStyle = hexA(c.bg, 0.35); ctx.fillRect(0, 0, W, H);
          const cx = W / 2 + (mouse.x > -1 ? (mouse.x - W / 2) * 0.15 : 0), cy = H / 2 + (mouse.y > -1 ? (mouse.y - H / 2) * 0.15 : 0);
          const speed = dt * 0.25;
          for (const p of s.s) {
            p.pz = p.z; p.z -= speed;
            if (p.z < 1) { p.x = (Math.random() - 0.5) * W; p.y = (Math.random() - 0.5) * H; p.z = W; p.pz = p.z; }
            const sx = cx + (p.x / p.z) * W * 0.5, sy = cy + (p.y / p.z) * W * 0.5;
            const px = cx + (p.x / p.pz) * W * 0.5, py = cy + (p.y / p.pz) * W * 0.5;
            const a = 1 - p.z / W;
            ctx.strokeStyle = hexA(a > 0.7 ? c.b : c.a, a);
            ctx.lineWidth = a * 2;
            ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(sx, sy); ctx.stroke();
          }
        },
      },
      circuit: {
        init() {
          ctx.clearRect(0, 0, W, H);
          const g = 24;
          const mk = () => ({ x: Math.round((Math.random() * W) / g) * g, y: Math.round((Math.random() * H) / g) * g, dir: (Math.random() * 4) | 0, life: 40 + Math.random() * 120, col: Math.random() > 0.5 });
          return { g, w: Array.from({ length: 16 }, mk), mk, acc: 0 };
        },
        frame(s, c, dt) {
          s.acc += dt;
          if (s.acc < 30) return;
          s.acc = 0;
          ctx.fillStyle = hexA(c.bg, 0.09); ctx.fillRect(0, 0, W, H);
          const D = [[1, 0], [0, 1], [-1, 0], [0, -1]];
          s.w.forEach((w, i) => {
            const [dx, dy] = D[w.dir];
            const nx = w.x + dx * s.g * 0.5, ny = w.y + dy * s.g * 0.5;
            ctx.strokeStyle = hexA(w.col ? c.a : c.b, 0.45); ctx.lineWidth = 1.2;
            ctx.shadowColor = w.col ? c.a : c.b; ctx.shadowBlur = 8;
            ctx.beginPath(); ctx.moveTo(w.x, w.y); ctx.lineTo(nx, ny); ctx.stroke();
            ctx.shadowBlur = 0;
            w.x = nx; w.y = ny; w.life--;
            if (Math.random() < 0.08) w.dir = (w.dir + (Math.random() > 0.5 ? 1 : 3)) % 4;
            if (w.life <= 0 || w.x < 0 || w.y < 0 || w.x > W || w.y > H) {
              ctx.fillStyle = hexA(w.col ? c.a : c.b, 0.9);
              ctx.beginPath(); ctx.arc(w.x, w.y, 3, 0, 7); ctx.fill();
              s.w[i] = s.mk();
            }
          });
        },
      },
    };
    function colors() { return { a: css("--accent") || "#22d3ee", b: css("--accent2") || "#a855f7", bg: css("--bg") || "#000000", fg: css("--fg") || "#ffffff" }; }
    function loop(t) {
      const dt = Math.min(64, t - (last || t));
      last = t;
      if (state && effects[mode]) effects[mode].frame(state, colorsCache, dt);
      raf = requestAnimationFrame(loop);
    }
    let colorsCache = null;
    function start(m) {
      cancelAnimationFrame(raf);
      last = 0;
      mode = effects[m] ? m : "";
      ctx.clearRect(0, 0, W, H);
      cv.style.display = mode ? "block" : "none";
      if (!mode) return;
      // Let the new preset's CSS variables land first.
      requestAnimationFrame(() => {
        colorsCache = colors();
        state = effects[mode].init();
        if (motion() === "off") { for (let i = 0; i < 40; i++) effects[mode].frame(state, colorsCache, 60); return; }
        raf = requestAnimationFrame(loop);
      });
    }
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) cancelAnimationFrame(raf);
      else if (mode && motion() !== "off") { last = 0; raf = requestAnimationFrame(loop); }
    });
    addEventListener("resize", () => { clearTimeout(resize.t); resize.t = setTimeout(() => { resize(); }, 150); });
    resize();
    return { start };
  })();

  /* ───────── cursor glow, progress, nav ───────── */
  const glow = $(".cursor-glow");
  addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    glow.style.setProperty("--cx", e.clientX + "px");
    glow.style.setProperty("--cy", e.clientY + "px");
    glow.classList.add("on");
  }, { passive: true });
  const progress = $("#progress");
  const onScroll = () => {
    const h = document.documentElement.scrollHeight - innerHeight;
    progress.style.setProperty("--p", h > 0 ? String(scrollY / h) : "0");
  };
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  const navLinks = $$(".nav nav a");
  if (!C.multi) {
    const secObs = new IntersectionObserver((ents) => {
      ents.forEach((e) => { if (e.isIntersecting) navLinks.forEach((a) => a.classList.toggle("on", a.dataset.nav === e.target.id)); });
    }, { rootMargin: "-45% 0px -50% 0px" });
    $$("main section[id]").forEach((s) => secObs.observe(s));
  }

  /* ───────── pages (hash router: #/, #/projects, #/p/<id>) ───────── */
  let currentPage = "";
  const pages = $$(".page");
  function parseRoute() {
    const h = location.hash;
    let m = h.match(/^#\/?p\/(.+)$/);
    if (m) return { page: currentPage || "projects", project: decodeURIComponent(m[1]) };
    m = h.match(/^#\/([\w-]*)$/);
    return { page: (m && m[1]) || "home" };
  }
  function showPage(name) {
    if (!C.multi || !pages.length) return;
    if (!pages.some((p) => p.dataset.page === name)) name = pages[0].dataset.page;
    if (name === currentPage) return;
    const go = () => {
      pages.forEach((p) => (p.hidden = p.dataset.page !== name));
      navLinks.forEach((a) => a.classList.toggle("on", a.dataset.nav === name));
      body.dataset.page = name;
      if (currentPage) scrollTo({ top: 0 });
      currentPage = name;
      dispatchEvent(new CustomEvent("rf:page", { detail: name }));
    };
    if (currentPage && document.startViewTransition && motion() === "full") document.startViewTransition(go);
    else go();
  }
  const goPage = (name) => {
    if (C.multi) location.hash = "#/" + (name === "home" ? "" : name);
    else { const el = $("#" + name); if (el) el.scrollIntoView({ behavior: motion() === "off" ? "auto" : "smooth" }); }
  };
  showPage(parseRoute().page);

  /* ───────── reveal, scramble, counters ───────── */
  function scramble(el) {
    const final = el.textContent;
    if (motion() !== "full" || el.dataset.done) return;
    el.dataset.done = "1";
    const glyphs = "!<>-_\\/[]{}—=+*^?#01ABCDEF";
    const start = performance.now(), dur = 700;
    (function step(t) {
      const k = Math.min(1, (t - start) / dur);
      const n = Math.floor(final.length * k);
      el.textContent = final.slice(0, n) + Array.from(final.slice(n)).map((ch) => (ch === " " ? " " : glyphs[(Math.random() * glyphs.length) | 0])).join("");
      if (k < 1) requestAnimationFrame(step);
      else el.textContent = final;
    })(start);
  }
  function countUp(el) {
    const to = Number(el.dataset.to || 0);
    if (el.dataset.done) return;
    el.dataset.done = "1";
    const f = (v) => (el.dataset.plain ? String(v) : v.toLocaleString());
    if (motion() === "off") { el.textContent = f(to); return; }
    const start = performance.now(), dur = 1400;
    (function step(t) {
      const k = Math.min(1, (t - start) / dur), e = 1 - Math.pow(1 - k, 3);
      el.textContent = f(el.dataset.plain ? Math.round(to - (1 - e) * Math.min(to, 30)) : Math.round(to * e));
      if (k < 1) requestAnimationFrame(step);
    })(start);
  }
  const revObs = new IntersectionObserver((ents) => {
    let i = 0;
    ents.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target;
      const delay = (i++ % 8) * 60;
      el.style.transitionDelay = delay + "ms";
      el.classList.add("in");
      setTimeout(() => (el.style.transitionDelay = ""), 900 + delay);
      $$("[data-scramble]", el).forEach(scramble);
      $$(".count", el).forEach(countUp);
      revObs.unobserve(el);
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
  $$(".reveal").forEach((el) => revObs.observe(el));

  /* ───────── hero: typing roles + terminal ───────── */
  const roleEl = $("#role");
  let roles = [];
  try { roles = JSON.parse((roleEl && roleEl.dataset.roles) || "[]"); } catch (e) {}
  let typingTimer = 0, typingGen = 0;
  // Simple mode: all roles on one quiet line. Tech mode: typing animation.
  function syncRoles() {
    if (!roleEl) return;
    clearTimeout(typingTimer);
    const gen = ++typingGen;
    if (simple() || motion() === "off" || roles.length < 2) {
      roleEl.textContent = simple() ? roles.join(" · ") : roles[0] || "";
      return;
    }
    roleEl.textContent = roles[0];
    let ri = 0, ci = roles[0].length, del = true;
    const tick = () => {
      if (gen !== typingGen) return;
      const r = roles[ri];
      if (del) { ci--; if (ci <= 0) { del = false; ri = (ri + 1) % roles.length; } }
      else { ci++; if (ci >= roles[ri].length) { del = true; roleEl.textContent = roles[ri]; typingTimer = setTimeout(tick, 1800); return; } }
      roleEl.textContent = (del ? r : roles[ri]).slice(0, Math.max(0, ci));
      typingTimer = setTimeout(tick, del ? 35 : 70);
    };
    typingTimer = setTimeout(tick, 2200);
  }
  const term = $("#term");
  if (term) {
    const T = C.terminal;
    const zh = C.lang === "zh-TW";
    const shownNames = T.projects.slice(0, 6);
    const lines = [
      ["cmd", "whoami"],
      ["out", `<span class="hl">${esc(T.name)}</span>${T.roles.length ? ` <span class="dim">·</span> ${esc(T.roles.join(" / "))}` : ""}`],
      ["cmd", "ls ~/projects"],
      ["out", shownNames.map((n) => `<span class="ok">${esc(n)}/</span>`).join("  ") + (T.projects.length > shownNames.length ? `  <span class="dim">+${T.projects.length - shownNames.length}</span>` : "")],
      ["cmd", "cat stack.txt"],
      ["out", T.langs.map((l) => `<span class="hl">${esc(l)}</span>`).join(" <span class=\"dim\">·</span> ")],
      ["cmd", "uptime"],
      ["out", zh
        ? `${T.shown} 個專案 <span class="dim">·</span> <span class="ok">${T.live} 個上線中</span>${T.commits ? ` <span class="dim">·</span> 今年 ${T.commits} 次提交` : ""}`
        : `${T.shown} projects <span class="dim">·</span> <span class="ok">${T.live} live</span>${T.commits ? ` <span class="dim">·</span> ${T.commits} commits this year` : ""}`],
    ];
    const prompt = '<span class="p">❯</span> ';
    let html = "";
    if (motion() === "off") {
      term.innerHTML = lines.map(([k, l]) => (k === "cmd" ? prompt + esc(l) : l)).join("\n") + "\n" + prompt + '<span class="cur"></span>';
    } else {
      let li = 0;
      const next = () => {
        if (li >= lines.length) { term.innerHTML = html + prompt + '<span class="cur"></span>'; return; }
        const [kind, text] = lines[li++];
        if (kind === "out") { html += text + "\n"; term.innerHTML = html + '<span class="cur"></span>'; return setTimeout(next, 260 + Math.random() * 300); }
        let ci = 0;
        const type = () => {
          term.innerHTML = html + prompt + esc(text.slice(0, ci)) + '<span class="cur"></span>';
          if (ci++ < text.length) return setTimeout(type, 45 + Math.random() * 50);
          html += prompt + esc(text) + "\n";
          setTimeout(next, 400);
        };
        type();
      };
      const tObs = new IntersectionObserver((e) => { if (e[0].isIntersecting) { tObs.disconnect(); setTimeout(next, 600); } });
      tObs.observe(term);
    }
  }

  $$(".stat").forEach((el) => el.addEventListener("pointermove", (e) => {
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", e.clientX - r.left + "px");
    el.style.setProperty("--my", e.clientY - r.top + "px");
  }));

  /* ───────── timeline: the page scroll drives a light beam down the centre axis ───────── */
  const tl = $("#tl");
  if (tl) {
    const items = $$(".tl-item, .tl-year", tl);
    const reveal = new IntersectionObserver((ents) => {
      ents.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); reveal.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -12% 0px" });
    items.forEach((el) => reveal.observe(el));
    let ticking = false;
    function update() {
      ticking = false;
      const r = tl.getBoundingClientRect();
      if (!r.height) return;
      // The beam's tip follows a line 60% down the viewport.
      const tip = Math.min(r.height, Math.max(0, innerHeight * 0.6 - r.top));
      tl.style.setProperty("--tip", tip.toFixed(1) + "px");
      tl.classList.toggle("done", tip >= r.height - 2);
      items.forEach((el) => {
        const lit = el.offsetTop + el.offsetHeight / 2 <= tip;
        if (lit !== el.classList.contains("lit")) el.classList.toggle("lit", lit);
      });
    }
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll);
    addEventListener("rf:page", () => setTimeout(update, 40));
    if (motion() === "off") items.forEach((el) => el.classList.add("in"));
    update();
  }

  /* ───────── tilt + glow follow + magnetic ───────── */
  function bindCard(card) {
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      card.style.setProperty("--mx", x + "px");
      card.style.setProperty("--my", y + "px");
      if (eff().tilt && motion() === "full" && e.pointerType === "mouse") {
        card.style.setProperty("--rx", ((0.5 - y / r.height) * 7).toFixed(2) + "deg");
        card.style.setProperty("--ry", ((x / r.width - 0.5) * 9).toFixed(2) + "deg");
      }
    });
    card.addEventListener("pointerleave", () => { card.style.setProperty("--rx", "0deg"); card.style.setProperty("--ry", "0deg"); });
    card.addEventListener("click", (e) => { if (!e.target.closest("a,button")) openProject(card.dataset.id, true); });
    card.addEventListener("keydown", (e) => { if (e.key === "Enter" && e.target === card) openProject(card.dataset.id, true); });
  }
  $$(".card").forEach(bindCard);
  $$(".magnetic").forEach((b) => {
    b.addEventListener("pointermove", (e) => {
      if (motion() !== "full") return;
      const r = b.getBoundingClientRect();
      b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.25}px,${(e.clientY - r.top - r.height / 2) * 0.35}px)`;
    });
    b.addEventListener("pointerleave", () => (b.style.transform = ""));
  });

  /* ───────── filtering / sorting ───────── */
  const grid = $("#grid");
  const F = { q: "", status: "", tech: new Set(), sort: "featured" };
  function runFilter() {
    if (!grid) return;
    const cards = $$(".card", grid);
    const terms = F.q.toLowerCase().split(/\s+/).filter(Boolean);
    let shown = 0;
    const doIt = () => {
      cards.forEach((c) => {
        const tech = (c.dataset.tech || "").split("|");
        const ok = (!F.status || c.dataset.status === F.status) && terms.every((t) => c.dataset.text.includes(t)) && [...F.tech].every((t) => tech.includes(t));
        c.hidden = !ok;
        if (ok) { shown++; c.classList.add("in"); }
      });
      const key = {
        featured: (c) => [-Number(c.dataset.featured), -Number(c.dataset.stars), -Date.parse(c.dataset.updated)],
        stars: (c) => [-Number(c.dataset.stars), -Date.parse(c.dataset.updated)],
        updated: (c) => [-Date.parse(c.dataset.updated)],
        created: (c) => [-Date.parse(c.dataset.created)],
        name: (c) => [c.dataset.name],
      }[F.sort];
      cards
        .map((c) => [key(c), c])
        .sort((a, b) => { for (let i = 0; i < a[0].length; i++) { if (a[0][i] < b[0][i]) return -1; if (a[0][i] > b[0][i]) return 1; } return 0; })
        .forEach(([, c]) => grid.appendChild(c));
      $("#empty").hidden = shown > 0;
    };
    if (document.startViewTransition && motion() === "full") document.startViewTransition(doIt);
    else doIt();
  }
  const q = $("#q");
  if (q) q.addEventListener("input", () => { F.q = q.value; runFilter(); });
  $$("#status-filter button").forEach((b) => b.addEventListener("click", () => {
    F.status = b.dataset.status;
    $$("#status-filter button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    runFilter();
  }));
  function toggleTech(t, force) {
    const on = force != null ? force : !F.tech.has(t);
    if (on) F.tech.add(t); else F.tech.delete(t);
    $$("#tech-filter .chip").forEach((c) => c.setAttribute("aria-pressed", String(F.tech.has(c.dataset.tech))));
    syncTechToggle(F.tech.size > 0);
    runFilter();
  }
  const techToggle = $("#tech-toggle"), techBox = $("#tech-filter");
  function syncTechToggle(open) {
    if (!techToggle) return;
    if (open) { techBox.hidden = false; techToggle.setAttribute("aria-expanded", "true"); }
    const c = $("#tech-count");
    if (c) c.textContent = F.tech.size ? String(F.tech.size) : "";
  }
  if (techToggle) techToggle.addEventListener("click", () => {
    const open = techBox.hidden;
    techBox.hidden = !open;
    techToggle.setAttribute("aria-expanded", String(open));
  });
  $$("#tech-filter .chip").forEach((c) => c.addEventListener("click", () => toggleTech(c.dataset.tech)));
  $$(".cloud .orb").forEach((o) => o.addEventListener("click", () => {
    F.tech.clear();
    toggleTech(o.dataset.tech, true);
    goPage("projects");
  }));
  const sortSel = $("#sort");
  if (sortSel) sortSel.addEventListener("change", () => { F.sort = sortSel.value; runFilter(); });
  $$("#layout-switch button").forEach((b) => b.addEventListener("click", () => {
    const go = () => set({ layout: b.dataset.layout });
    if (document.startViewTransition && motion() === "full") document.startViewTransition(go); else go();
  }));
  const clear = $("#clear");
  if (clear) clear.addEventListener("click", () => {
    F.q = ""; F.status = ""; F.tech.clear();
    if (q) q.value = "";
    $$("#status-filter button").forEach((x, i) => x.setAttribute("aria-pressed", String(i === 0)));
    $$("#tech-filter .chip").forEach((c) => c.setAttribute("aria-pressed", "false"));
    runFilter();
  });

  /* ───────── relative times ───────── */
  function ago(iso) {
    const s = (Date.now() - Date.parse(iso)) / 1000;
    if (!isFinite(s)) return "";
    const A = S.ago;
    if (s < 60) return A.s;
    if (s < 3600) return Math.floor(s / 60) + A.m;
    if (s < 86400) return Math.floor(s / 3600) + A.h;
    if (s < 86400 * 30) return Math.floor(s / 86400) + A.d;
    if (s < 86400 * 365) return Math.floor(s / 86400 / 30) + A.mo;
    return Math.floor(s / 86400 / 365) + A.y;
  }
  $$("[data-time]").forEach((el) => {
    const r = ago(el.dataset.time);
    if (!r) return;
    if (el.classList.contains("when")) el.textContent += " · " + r;
    else el.textContent = r;
  });

  /* ───────── chart tooltip ───────── */
  const tip = $("#chart-tip");
  $$(".chart rect").forEach((r) => {
    r.addEventListener("pointerenter", () => {
      const wrap = r.closest(".chart-wrap").getBoundingClientRect(), b = r.getBoundingClientRect();
      tip.textContent = r.dataset.tip;
      tip.style.left = b.left - wrap.left + b.width / 2 + "px";
      tip.style.top = b.top - wrap.top + "px";
      tip.hidden = false;
    });
    r.addEventListener("pointerleave", () => (tip.hidden = true));
  });

  /* ───────── modal ───────── */
  const LANG_COLORS = { TypeScript: "#3178c6", JavaScript: "#f1e05a", Python: "#3572A5", HTML: "#e34c26", CSS: "#663399", SCSS: "#c6538c", Kotlin: "#A97BFF", Java: "#b07219", Shell: "#89e051", Dockerfile: "#384d54", Vue: "#41b883", PowerShell: "#012456", Go: "#00ADD8", Rust: "#dea584", "C++": "#f34b7d", C: "#555555", "C#": "#178600", "Jupyter Notebook": "#DA5B0B", PLpgSQL: "#336790", Batchfile: "#C1F12E", Swift: "#F05138", Dart: "#00B4AB", Svelte: "#ff3e00", Astro: "#ff5a03", PHP: "#4F5D95", Ruby: "#701516", VBScript: "#15dcdc" };
  const langColor = (n) => LANG_COLORS[n] || `hsl(${[...n].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7)} 65% 55%)`;
  const iconHtml = (label) => {
    const k = String(label).toLowerCase().replace(/[^a-z0-9]/g, "_");
    if (document.getElementById("i-" + k)) {
      const src = document.querySelector(`[style*="color"] use[href="#i-${k}"]`);
      const color = src ? src.parentNode.style.color : "currentColor";
      return `<svg class="ti" style="color:${color}"><use href="#i-${k}"/></svg>`;
    }
    return `<span class="ti mono">${esc(String(label).replace(/[^\p{L}\p{N}]/gu, "").slice(0, 2))}</span>`;
  };
  /* Fix actions for a health issue: a link to the right GitHub page, plus decisions saved to the config. */
  const FIX_URL = {
    "no-topics": (r) => `https://github.com/${r}`,
    "no-description": (r) => `https://github.com/${r}`,
    "no-homepage": (r) => `https://github.com/${r}`,
    "no-license": (r, b) => `https://github.com/${r}/community/license/new?branch=${b}&template=mit`,
    "no-readme": (r, b) => `https://github.com/${r}/new/${b}?filename=README.md`,
    "readme-short": (r, b) => `https://github.com/${r}/edit/${b}/README.md`,
    "meta-invalid": (r, b) => `https://github.com/${r}/edit/${b}/.project.yml`,
  };
  function fixButtons(p, id) {
    const a = p.admin;
    if (!a || !C.admin || !C.admin.dispatch) return "";
    const F = S.fix;
    const btn = (act, label, extra) => `<button type="button" class="fx" data-fix="${act}" data-pid="${esc(p.id)}" data-issue="${esc(id)}"${extra || ""}>${esc(label)}</button>`;
    if (id === "stale") return `<span class="fxs">${btn("snooze", F.keepGoing)}${btn("done", F.done)}${btn("paused", F.pause)}<a class="fx" href="https://github.com/${esc(p.repo)}/settings#danger-zone" target="_blank" rel="noopener">${esc(F.archive)}</a></span>`;
    const url = FIX_URL[id] ? FIX_URL[id](p.repo, a.branch || "main") : "";
    return `<span class="fxs">${url ? `<a class="fx" href="${esc(url)}" target="_blank" rel="noopener">${esc(F.fix)}</a>` : ""}${btn("ignore", F.ignore)}</span>`;
  }
  const modal = $("#modal");
  let pushed = false, lastFocus = null;
  function openProject(id, push, tab) {
    const p = byId[id];
    if (!p) return;
    lastFocus = document.activeElement;
    const tech = [...new Set([...p.stack, ...p.languages.slice(0, 2).map((l) => l.name)])];
    const live = p.links.find((l) => l.label === "live");
    const act = p.activity && p.activity.some((n) => n > 0)
      ? (() => {
          const max = Math.max(...p.activity, 1), w = 52 * 8;
          return `<svg class="m-activity" viewBox="0 0 ${w} 70" preserveAspectRatio="none">${p.activity.map((n, i) => `<rect x="${i * 8}" y="${68 - (n / max) * 64}" width="6" height="${Math.max(1, (n / max) * 64)}" rx="1.5" opacity="${n ? 0.9 : 0.2}"><title>${n}</title></rect>`).join("")}</svg>`;
        })()
      : "";
    const fmt = (iso) => { const d = new Date(iso); return isNaN(d) ? esc(iso) : d.toLocaleDateString(C.lang === "zh-TW" ? "zh-TW" : "en-US", { year: "numeric", month: "short", day: "numeric" }); };
    const T = S.tabs, R = S.rivals, R2 = S.rv2, X = S.adminx, A = S.admin, a = p.admin;
    const li = (xs) => xs.map((x) => "<li>" + esc(x) + "</li>").join("");
    const clip = (t, n) => (t.length > n ? t.slice(0, n - 1) + "…" : t);
    // Short intro: Claude's (already in the site language), else the README's first paragraph when it's in the site language.
    const siteZh = C.lang === "zh-TW";
    const readmeMatches = !!p.intro && (p.introLang === "zh") === siteZh;
    const fromReadme = p.intro && readmeMatches ? { about: clip(p.intro.paragraphs.find((x) => x !== p.summary) || "", 220), features: p.intro.features.slice(0, 3).map((x) => clip(x, 90)) } : null;
    const brief = p.brief || fromReadme;
    const briefHtml = brief && (brief.about || brief.features.length) ? `<div class="m-brief">${brief.about ? `<p>${esc(brief.about)}</p>` : ""}${brief.features.length ? `<ul class="m-feat-list">${li(brief.features)}</ul>` : ""}</div>` : "";

    const overview = `
      <p class="m-sum">${esc(p.summary || "—")}</p>
      ${p.purpose ? `<p class="m-purpose">${esc(p.purpose)}</p>` : ""}
      ${briefHtml}
      <div class="techs">${tech.map((t) => `<span class="tech">${iconHtml(t)}<em>${esc(t)}</em></span>`).join("")}${p.tags.filter((t) => !tech.some((x) => x.toLowerCase() === t.toLowerCase())).map((t) => `<span class="tech">#${esc(t)}</span>`).join("")}</div>
      <div class="m-actions">${live ? `<a class="btn primary" href="${esc(live.url)}" target="_blank" rel="noopener">${esc(S.visit)} ↗</a>` : ""}${p.codeUrl ? `<a class="btn ghost" href="${esc(p.codeUrl)}" target="_blank" rel="noopener">${iconHtml("github")} ${esc(S.code)}</a>` : ""}</div>
      <div class="m-grid">
        ${p.languages.length ? `<div class="m-box"><h4>${esc(S.stack)}</h4><div class="langbar">${p.languages.map((l) => `<i style="width:${l.pct}%;background:${langColor(l.name)}" title="${esc(l.name)} ${l.pct}%"></i>`).join("")}</div><div class="lang-legend">${p.languages.map((l) => `<span style="--c:${langColor(l.name)}">${esc(l.name)} ${l.pct}%</span>`).join("")}</div></div>` : ""}
        ${p.deployments.length ? `<div class="m-box"><h4>${esc(S.deployments)}</h4><ul>${p.deployments.map((d) => `<li><span class="dot ${d.ok ? "st-active" : ""}" style="${d.ok ? "" : "background:#ef4444"}"></span>${d.provider ? iconHtml(d.provider) : ""}<a href="${esc(d.url)}" target="_blank" rel="noopener">${esc(d.url.replace(/^https?:\/\//, ""))}</a>${d.ms != null ? `<small style="margin-left:auto;color:var(--muted)">${d.ms} ms</small>` : ""}</li>`).join("")}</ul></div>` : ""}
        ${act ? `<div class="m-box" style="grid-column:1/-1"><h4>${esc(S.commits52)} · ${p.activity.reduce((x, y) => x + y, 0)}</h4>${act}</div>` : ""}
        ${p.links.filter((l) => l.label !== "live").length ? `<div class="m-box"><h4>${esc(S.links)}</h4><ul>${p.links.filter((l) => l.label !== "live").map((l) => `<li>↗ <a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)}</a></li>`).join("")}</ul></div>` : ""}
      </div>`;

    const intro = p.intro && (p.intro.paragraphs.length || p.intro.features.length || p.intro.sections.length) ? `
      ${p.brief ? briefHtml : ""}
      <div class="m-readme">
        <h4>README${readmeMatches ? "" : ` <small>${esc(T.original)}</small>`}</h4>
        ${p.intro.paragraphs.map((x) => `<p>${esc(x)}</p>`).join("")}
        ${p.intro.features.length ? `<h4>${esc(S.features)}</h4><ul class="m-feat-list">${li(p.intro.features)}</ul>` : ""}
        ${p.intro.sections.length ? `<h4>${esc(S.outline)}</h4><div class="m-outline">${p.intro.sections.map((x) => p.codeUrl ? `<a class="tech" href="${esc(p.codeUrl)}#${esc(x.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, "").trim().replace(/\s+/g, "-"))}" target="_blank" rel="noopener">${esc(x)}</a>` : `<span class="tech">${esc(x)}</span>`).join("")}</div>` : ""}
      </div>` : "";

    const data = a ? (() => {
      const hc = a.health >= 80 ? "#22c55e" : a.health >= 60 ? "#eab308" : "#ef4444";
      const m = a.metrics;
      const cell = (l, v, bad) => `<div class="m-met${bad ? " bad" : ""}"><span>${esc(l)}</span><b>${v}</b></div>`;
      return `<div class="m-admin-top"><span class="hp" style="--hc:${hc}"><b>${a.health}</b> ${esc(A.health)}</span><span class="pill ${a.shown ? "ok" : ""}">${esc(a.shown ? A.shown : A.notShown)}</span>${p.private ? `<span class="pill">🔒 ${esc(A.private)}</span>` : ""}${a.cost ? `<span class="pill">${esc(A.cost)} ${esc(a.cost)}</span>` : ""}</div>
        ${m ? `<div class="m-mets">${[
          cell(X.lastPush, `${m.daysSincePush} ${esc(X.days)}`, m.daysSincePush > 90),
          cell(X.commits4w, m.commits4w),
          cell(X.commits52w, m.commits52w),
          cell(X.openIssues, m.openIssues, m.openIssues > 10),
          cell(X.deploys, `${m.deploysUp} / ${m.deploysDown}`, m.deploysDown > 0),
          cell(X.age, `${m.ageDays} ${esc(X.days)}`),
          cell(X.readme, m.readmeLength ? `${m.readmeLength} ${esc(X.chars)}` : esc(X.no), !m.readmeLength),
          cell(X.topics, m.topics, m.topics < 3),
          cell(X.meta, esc(m.hasMetaFile ? X.yes : X.no)),
        ].join("")}</div>` : ""}
        <h4>${esc(A.issues)}</h4>
        ${a.issues.length ? `<ul class="m-issues">${a.issues.map((i) => `<li class="lv-${i.level}" data-issue="${esc(i.id)}" data-pid="${esc(p.id)}"><span>${esc(i.message)}</span>${fixButtons(p, i.id)}</li>`).join("")}</ul>` : `<p class="m-ok">✓ ${esc(A.allGood)}</p>`}
        ${a.ignored && a.ignored.length ? `<p class="m-env m-ignored"><b>${esc(S.fix.ignored)}</b> ${a.ignored.map((id) => `<button type="button" class="pp-chip" data-fix="restore" data-pid="${esc(p.id)}" data-issue="${esc(id)}">${esc(S.fix.names[id] || id)} ↺</button>`).join(" ")}</p>` : ""}
        ${a.env ? `<p class="m-env"><b>${esc(A.env)}</b> ${a.env.vars.map((v) => `<code>${esc(v)}</code>`).join(" ")}${a.env.location ? ` · ${esc(A.envAt)} <b>${esc(a.env.location)}</b>` : ""}</p>` : ""}
        ${a.next.length ? `<h4>${esc(A.next)}</h4><ul class="m-next">${li(a.next)}</ul>` : ""}`;
    })() : "";

    const rivals = a && a.competitors ? (() => {
      const r = a.competitors, c = r.compare;
      const mark = (h) => `<i class="has-${h}" title="${esc(R2[h])}">${h === "yes" ? "✓" : h === "partial" ? "◐" : "—"}</i>`;
      const short = (n) => n.split("/").pop();
      const matrix = r.features && r.features.length && r.items.length ? `<h4>${esc(R2.matrix)}</h4><div class="m-matrix-wrap"><table class="m-matrix"><thead><tr><th></th><th class="me">${esc(R2.mine)}</th>${r.items.map((x) => `<th title="${esc(x.fullName)}"><a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(short(x.fullName))}</a></th>`).join("")}</tr></thead><tbody>${r.features.map((f) => `<tr><th>${esc(f.name)}</th><td class="me">${mark(f.mine)}</td>${r.items.map((x) => { const o = f.others.find((y) => y.repo === x.fullName); return `<td>${mark(o ? o.has : "no")}</td>`; }).join("")}</tr>`).join("")}</tbody></table></div>` : "";
      const steps = r.steps && r.steps.length ? `<h4>${esc(R2.steps)}</h4><ol class="m-steps">${r.steps.map((x) => `<li><div><b>${esc(x.title)}</b><span class="chip imp-${x.impact}">${esc(R2.impact)} ${esc(R2.levels[x.impact])}</span><span class="chip">${esc(R2.effort)} ${esc(R2.sizes[x.effort])}</span></div><p>${esc(x.why)}</p></li>`).join("")}</ol>` : "";
      return `<p class="m-cmp">${esc(r.source === "llm" ? R.llm : R.rules)} · ${esc(R.analysed)} ${esc(ago(r.at))}</p>
        ${r.positioning ? `<p class="m-pos">${esc(r.positioning)}</p>` : ""}
        ${r.items.length ? `<div class="m-starcmp"><div><span>${esc(R.yours)}</span><b>★${c.myStars}</b></div><div><span>${esc(R.median)}</span><b>★${c.medianStars}</b></div><div><span>${esc(R.top)}</span><b>★${c.topStars}</b></div><div><span>${esc(R2.rank)}</span><b>${c.rank} / ${r.items.length + 1}</b></div></div>` : `<p class="m-ok">${esc(R.empty)}</p>`}
        ${steps}
        ${matrix}
        ${r.items.length ? `<h4>${esc(R2.list)}</h4><ul class="m-rv">${r.items.map((x) => `<li><a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.fullName)}</a><span>★${x.stars}</span>${x.homepage ? `<span class="pill">${esc(R.demo)}</span>` : ""}<small>${esc(x.description || "")}</small><small>${esc(R.updated)} ${esc(ago(x.pushedAt))}</small></li>`).join("")}</ul>` : ""}
        ${r.strengths.length || r.gaps.length ? `<div class="m-rv-cols">${r.strengths.length ? `<div><h4>${esc(R.strengths)}</h4><ul class="m-next">${li(r.strengths)}</ul></div>` : ""}${r.gaps.length ? `<div><h4>${esc(R.gaps)}</h4><ul class="m-next">${li(r.gaps)}</ul></div>` : ""}</div>` : ""}`;
    })() : "";

    const posts = a && (a.postable || (a.postList && a.postList.length)) ? `
      ${a.postable && C.promo && C.admin && C.admin.dispatch ? `<p><button type="button" class="btn ghost sm" data-spotlight="${esc(p.repo)}">📣 ${esc(S.promo.spotlight)}</button></p>` : ""}
      ${a.postList && a.postList.length ? `<ul class="m-posts">${a.postList.map((x) => `<li><span class="pill">${esc(S.promo.status[x.status])}</span><b>${esc(x.title)}</b><small>${esc(ago(x.at))}</small>${x.links.map((l) => `<a class="pp-chip ok" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)} ↗</a>`).join("")}</li>`).join("")}</ul>` : `<p class="m-ok">${esc(T.noPosts)}</p>`}` : "";

    const panes = [["overview", T.overview, overview], ["intro", T.intro, intro], ["data", T.data, data], ["rivals", T.rivals, rivals], ["posts", T.posts, posts]].filter((x) => x[2]);
    const cur = panes.some((x) => x[0] === tab) ? tab : "overview";
    $("#m-body").innerHTML = `
      ${p.image && (simple() || st.covers) ? `<div class="m-cover has"><i style="background-image:url('${esc(p.image)}')"></i><img src="${esc(p.image)}" alt="" referrerpolicy="no-referrer" onerror="this.parentNode.classList.remove('has');this.remove()"></div>` : `<div class="m-cover"></div>`}
      <div class="m-content">
        <h2 id="m-title">${esc(p.name)}</h2>
        <div class="m-sub"><span><span class="dot st-${p.status}" style="display:inline-block;margin-right:6px"></span>${esc(S.statusLabels[p.status])}</span>${p.stars ? `<span>★ ${p.stars}</span>` : ""}${p.forks ? `<span>⑂ ${p.forks}</span>` : ""}${p.release ? `<span>⬢ ${esc(p.release)}</span>` : ""}${p.license ? `<span>⚖ ${esc(p.license)}</span>` : ""}<span>${esc(S.created)} ${fmt(p.created)}</span><span>${esc(S.updated)} ${esc(ago(p.updated))}</span></div>
        ${panes.length > 1 ? `<div class="m-tabs" role="tablist">${panes.map(([k, label]) => `<button type="button" role="tab" class="m-tab${k === cur ? " on" : ""}" data-mtab="${k}" aria-selected="${k === cur}">${esc(label)}</button>`).join("")}</div>` : ""}
        ${panes.map(([k, , html]) => `<div class="m-pane" data-mpane="${k}"${k === cur ? "" : " hidden"}>${html}</div>`).join("")}
      </div>`;
    $$(".m-tab", modal).forEach((b) => b.addEventListener("click", () => {
      $$(".m-tab", modal).forEach((x) => { x.classList.toggle("on", x === b); x.setAttribute("aria-selected", String(x === b)); });
      $$(".m-pane", modal).forEach((x) => (x.hidden = x.dataset.mpane !== b.dataset.mtab));
    }));
    modal.hidden = false;
    document.documentElement.style.overflow = "hidden";
    $(".x", modal).focus();
    if (push) { history.pushState({ p: id }, "", (C.multi ? "#/p/" : "#p/") + id); pushed = true; }
  }
  function closeModal(fromPop) {
    if (modal.hidden) return;
    modal.hidden = true;
    document.documentElement.style.overflow = "";
    if (!fromPop) {
      if (pushed) history.back();
      else history.replaceState(null, "", location.pathname + location.search + (C.multi && currentPage !== "home" ? "#/" + currentPage : ""));
    }
    pushed = false;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function fromHash(fromPop) {
    const r = parseRoute();
    showPage(r.page);
    if (r.project && byId[r.project]) openProject(r.project, false);
    else closeModal(fromPop);
  }
  addEventListener("popstate", () => fromHash(true));
  addEventListener("hashchange", () => fromHash(true));
  $$("[data-open]").forEach((a) => a.addEventListener("click", (e) => { e.preventDefault(); openProject(a.dataset.open, true, a.dataset.tab); }));
  $$(".overlay").forEach((o) => o.addEventListener("click", (e) => {
    if (e.target === o || e.target.closest("[data-close]")) { if (o === modal) closeModal(); else o.hidden = true; }
  }));
  fromHash(true);

  /* ───────── toast / clipboard ───────── */
  const toastEl = $("#toast");
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("on");
    clearTimeout(toast.t);
    toast.t = setTimeout(() => toastEl.classList.remove("on"), 1800);
  }
  async function copy(text) {
    try { await navigator.clipboard.writeText(text); }
    catch (e) {
      const ta = document.createElement("textarea");
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); } catch (e2) {}
      ta.remove();
    }
    toast(S.copied);
  }

  /* ───────── customizer ───────── */
  const panel = $("#custom");
  const PRESET_SWATCH = {};
  const BG_SWATCHES = ["#ffffff", "#f6f3ee", "#f1f5f9", "#ecfdf5", "#fdf2f8", "#18181b", "#0d1117", "#0b1020", "#111827", "#1a1625", "#0f1f1a", "#1f1410"];
  function buildCustomizer() {
    if (!panel) return;
    const O = C.options;
    const opt = (key, vals) => `<div class="cz-group"><span>${esc(S[key] || key)}</span><div class="cz-opts">${vals.map((v) => `<button type="button" data-k="${key}" data-v="${v}">${esc(v)}</button>`).join("")}</div></div>`;
    const tog = (key) => `<label class="cz-toggle">${esc(S[key])}<input type="checkbox" data-k="${key}"></label>`;
    const probe = document.createElement("div");
    probe.style.display = "none";
    document.body.appendChild(probe);
    for (const p of O.preset) {
      probe.dataset.preset = p;
      const cs = getComputedStyle(probe);
      PRESET_SWATCH[p] = [cs.getPropertyValue("--bg").trim(), C.presetAccents[p], cs.getPropertyValue("--accent2").trim()];
    }
    probe.remove();
    const swatches = [...new Set([C.simpleAccent, "#18181b", ...Object.values(C.presetAccents), "#ef4444", "#f59e0b", "#84cc16", "#14b8a6"])];
    const labelled = (key, vals, labels) => `<div class="cz-group"><span>${esc(S[key] || key)}</span><div class="cz-opts">${vals.map((v) => `<button type="button" data-k="${key}" data-v="${v}">${esc(labels[v] || v)}</button>`).join("")}</div></div>`;
    panel.innerHTML = `
      <h3>${esc(S.customize)} <button type="button" class="icon-btn" data-close-panel aria-label="${esc(S.close)}">✕</button></h3>
      <div class="cz-mode" role="group" aria-label="${esc(S.mode)}">${O.mode.map((m) => `<button type="button" data-k="mode" data-v="${m}">${esc(S.modes[m])}</button>`).join("")}</div>
      <div class="simple-only">${labelled("scheme", O.scheme, S.schemes)}</div>
      <div class="cz-group"><span>${esc(S.accent)}</span><div class="cz-swatches">${swatches.map((c) => `<button type="button" data-k="accent" data-v="${c}" style="background:${c}" title="${c}"></button>`).join("")}<input type="color" id="cz-color" aria-label="${esc(S.accent)}"></div></div>
      <div class="cz-group"><span>${esc(S.bgColor)}</span><div class="cz-swatches"><button type="button" class="cz-default" data-k="bgColor" data-v="" title="${esc(S.presetBg)}">∅</button>${BG_SWATCHES.map((c) => `<button type="button" data-k="bgColor" data-v="${c}" style="background:${c}" title="${c}"></button>`).join("")}<input type="color" id="cz-bg" aria-label="${esc(S.bgColor)}"></div></div>
      ${opt("layout", O.layout)}
      ${opt("font", O.font)}
      <div class="cz-group"><label for="cz-radius">${esc(S.radius)} · <b id="cz-rv"></b></label><input type="range" id="cz-radius" min="0" max="32" step="1"></div>
      <details class="cz-fx tech-only" open><summary>${esc(S.effects)}</summary>
        <div class="cz-group"><span>${esc(S.theme)}</span><div class="cz-presets">${O.preset.map((p) => `<button type="button" data-k="preset" data-v="${p}" title="${p}" style="background:linear-gradient(135deg,${PRESET_SWATCH[p][0]} 45%,${PRESET_SWATCH[p][1]} 46%,${PRESET_SWATCH[p][2]})"><span>${p}</span></button>`).join("")}</div></div>
        ${opt("background", O.background)}
        ${opt("cardStyle", O.cardStyle)}
        ${opt("animation", O.animation)}
        ${opt("glow", O.glow)}
        <div class="cz-group">${tog("covers")}${tog("cursorGlow")}${tog("tilt")}</div>
      </details>
      <div class="cz-actions"><button type="button" class="btn ghost" id="cz-reset">${esc(S.reset)}</button><button type="button" class="btn primary" id="cz-copy">${esc(S.copyConfig)}</button></div>`;
    panel.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-k]");
      if (b) {
        const go = () => set({ [b.dataset.k]: b.dataset.v });
        if (document.startViewTransition && motion() === "full" && b.dataset.k === "layout") document.startViewTransition(go); else go();
      }
      if (e.target.closest("[data-close-panel]")) panel.hidden = true;
    });
    panel.addEventListener("change", (e) => { if (e.target.type === "checkbox") set({ [e.target.dataset.k]: e.target.checked }); });
    $("#cz-color", panel).addEventListener("input", (e) => set({ accent: e.target.value }));
    $("#cz-bg", panel).addEventListener("input", (e) => set({ bgColor: e.target.value }));
    $("#cz-radius", panel).addEventListener("input", (e) => set({ radius: Number(e.target.value) }));
    $("#cz-reset", panel).addEventListener("click", () => { st = Object.assign({}, C.defaults); save(); applyTheme(); toast(S.reset); });
    $("#cz-copy", panel).addEventListener("click", () => {
      const keys = (simple() ? ["mode", "scheme", "accent", "bgColor", "layout", "font", "radius"] : ["mode", "preset", "accent", "bgColor", "background", "cardStyle", "layout", "font", "animation", "glow", "radius", "covers", "cursorGlow", "tilt"]).filter((k) => st[k] !== undefined && st[k] !== "");
      const yaml = ["site:", "  theme:", ...keys.map((k) => `    ${k}: ${typeof st[k] === "string" && st[k].startsWith("#") ? `"${st[k]}"` : st[k]}`)].join("\n");
      copy(yaml);
    });
  }
  function syncCustomizer() {
    if (!panel || !panel.innerHTML) return;
    $$("button[data-k]", panel).forEach((b) => b.setAttribute("aria-pressed", String(String(st[b.dataset.k] ?? "").toLowerCase() === String(b.dataset.v).toLowerCase())));
    $$("input[type=checkbox]", panel).forEach((i) => (i.checked = !!st[i.dataset.k]));
    $("#cz-color", panel).value = st.accent;
    $("#cz-bg", panel).value = st.bgColor || getComputedStyle(body).getPropertyValue("--bg").trim().slice(0, 7) || "#000000";
    $("#cz-radius", panel).value = st.radius;
    $("#cz-rv", panel).textContent = st.radius + "px";
  }
  function openCustomizer() {
    if (!panel) return;
    if (!panel.innerHTML) buildCustomizer();
    panel.hidden = !panel.hidden;
    syncCustomizer();
  }
  const oc = $("#open-custom");
  if (oc) oc.addEventListener("click", openCustomizer);

  /* ───────── command palette ───────── */
  const pal = $("#palette"), palQ = $("#pal-q"), palList = $("#pal-list");
  let palItems = [], palSel = 0;
  function actions() {
    const A = [];
    C.options.mode.forEach((m) => A.push({ label: `${S.mode}: ${S.modes[m]}`, kw: "mode style simple tech", run: () => set({ mode: m }) }));
    C.options.preset.forEach((p) => A.push({ label: `${S.theme}: ${p}`, kw: "theme preset color", run: () => set({ mode: "tech", preset: p }) }));
    C.options.background.forEach((b) => A.push({ label: `${S.background}: ${b}`, kw: "background bg effect", run: () => set({ mode: "tech", background: b }) }));
    C.options.layout.forEach((l) => A.push({ label: `${S.layout}: ${l}`, kw: "layout view", run: () => set({ layout: l }) }));
    C.options.cardStyle.forEach((c) => A.push({ label: `${S.cardStyle}: ${c}`, kw: "card style", run: () => set({ mode: "tech", cardStyle: c }) }));
    A.push({ label: S.toggleMotion, kw: "motion animation", run: () => set({ animation: st.animation === "off" ? "full" : "off" }) });
    if (panel) A.push({ label: S.customize, kw: "customize settings theme", run: openCustomizer });
    A.push({ label: S.copyLink, kw: "copy link share url", run: () => copy(location.href.split("#")[0]) });
    const gh = $('.ctas a[href*="github.com"]');
    if (gh) A.push({ label: S.openGithub, kw: "github profile", run: () => window.open(gh.href, "_blank", "noopener") });
    $$(".nav nav a").forEach((a) => A.push({ label: `→ ${a.textContent}`, kw: "go page section", run: () => goPage(a.dataset.nav) }));
    A.push({ label: S.shortcuts, kw: "help keyboard shortcuts", run: () => ($("#help").hidden = false) });
    return A;
  }
  function fuzzy(text, query) {
    if (!query) return { score: 0, html: esc(text) };
    const t = text.toLowerCase(), qq = query.toLowerCase();
    const idx = t.indexOf(qq);
    if (idx >= 0) return { score: 100 - idx, html: esc(text.slice(0, idx)) + "<mark>" + esc(text.slice(idx, idx + qq.length)) + "</mark>" + esc(text.slice(idx + qq.length)) };
    let ti = 0, score = 0, html = "";
    for (const ch of qq) {
      const f = t.indexOf(ch, ti);
      if (f < 0) return null;
      html += esc(text.slice(ti, f)) + "<mark>" + esc(text[f]) + "</mark>";
      score += f === ti ? 3 : 1;
      ti = f + 1;
    }
    return { score, html: html + esc(text.slice(ti)) };
  }
  function renderPalette() {
    const qq = palQ.value.trim();
    const proj = P.map((p) => ({ p, m: fuzzy(p.name, qq) || (qq && p.summary.toLowerCase().includes(qq.toLowerCase()) ? { score: 1, html: esc(p.name) } : null) }))
      .filter((x) => x.m).sort((a, b) => b.m.score - a.m.score).slice(0, 8)
      .map((x) => ({ html: `<span class="dot st-${x.p.status}"></span>${x.m.html}<small>${esc(x.p.summary)}</small>`, run: () => openProject(x.p.id, true) }));
    const acts = actions().map((a) => ({ a, m: fuzzy(a.label, qq) || (qq && a.kw && qq.toLowerCase().split(/\s+/).every((w) => (a.kw + " " + a.label).toLowerCase().includes(w)) ? { score: 2, html: esc(a.label) } : null) })).filter((x) => x.m).sort((a, b) => b.m.score - a.m.score).slice(0, qq ? 10 : 6)
      .map((x) => ({ html: `<span>⚡</span>${x.m.html}`, run: x.a.run }));
    palItems = [...proj, ...acts];
    palSel = Math.min(palSel, Math.max(0, palItems.length - 1));
    let i = 0;
    const li = (it) => `<li class="it" role="option" data-i="${i}" aria-selected="${i++ === palSel}">${it.html}</li>`;
    palList.innerHTML = (proj.length ? `<li class="grp">${esc(S.paletteProjects)}</li>` + proj.map(li).join("") : "") + (acts.length ? `<li class="grp">${esc(S.paletteActions)}</li>` + acts.map(li).join("") : "");
  }
  function openPalette() { pal.hidden = false; palQ.value = ""; palSel = 0; renderPalette(); palQ.focus(); }
  function runPal(i) { const it = palItems[i]; if (!it) return; pal.hidden = true; it.run(); }
  palQ.addEventListener("input", () => { palSel = 0; renderPalette(); });
  palQ.addEventListener("keydown", (e) => {
    if (!palItems.length && e.key !== "Escape") return;
    if (e.key === "ArrowDown") { palSel = (palSel + 1) % palItems.length; renderPalette(); e.preventDefault(); }
    else if (e.key === "ArrowUp") { palSel = (palSel - 1 + palItems.length) % palItems.length; renderPalette(); e.preventDefault(); }
    else if (e.key === "Enter") { runPal(palSel); e.preventDefault(); }
  });
  palList.addEventListener("click", (e) => { const li = e.target.closest("li.it"); if (li) runPal(Number(li.dataset.i)); });
  $("#open-palette").addEventListener("click", openPalette);
  const oh = $("#open-help");
  if (oh) oh.addEventListener("click", () => ($("#help").hidden = false));

  /* ───────── keyboard ───────── */
  const konami = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
  let kpos = 0;
  addEventListener("keydown", (e) => {
    kpos = e.key === konami[kpos] ? kpos + 1 : e.key === konami[0] ? 1 : 0;
    if (kpos === konami.length) { kpos = 0; set({ preset: "matrix", background: "matrix" }, true); toast("Wake up, Neo…"); }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); pal.hidden ? openPalette() : (pal.hidden = true); return; }
    if (e.key === "Escape") {
      if (!pal.hidden) pal.hidden = true;
      else if (!modal.hidden) closeModal();
      else if (!$("#help").hidden) $("#help").hidden = true;
      else if (panel && !panel.hidden) panel.hidden = true;
      return;
    }
    const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
    if (typing || e.metaKey || e.ctrlKey || e.altKey || !modal.hidden || !pal.hidden) return;
    const cycle = (k) => { const arr = C.options[k]; set({ mode: "tech", [k]: arr[(arr.indexOf(st[k]) + 1) % arr.length] }, true); toast(`${S[k] || k}: ${st[k]}`); };
    if (e.key === "/") {
      e.preventDefault();
      if (!q) return;
      if (C.multi) showPage("projects"), history.replaceState(null, "", "#/projects");
      setTimeout(() => { q.focus(); q.scrollIntoView({ block: "center", behavior: "smooth" }); }, 30);
    }
    else if (e.key === "t") cycle("preset");
    else if (e.key === "b") cycle("background");
    else if (e.key === "," && panel) openCustomizer();
    else if (e.key === "g") scrollTo({ top: 0, behavior: "smooth" });
    else if (e.key === "?") $("#help").hidden = false;
  });

  /* ───────── admin: post review + approvals (dispatches the workflow with the owner's token) ───────── */
  const AD = C.admin;
  const PR = C.promo;
  const SP = S.promo;
  const TK = "repofolio-admin-gh";
  const store = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} };
  const load = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  /** Trigger the workflow with the owner's token (approvals, "update now"). */
  async function dispatch(reqs) {
    const tok = load(TK);
    const tokBox = $("#pp-tok-box");
    if (!tok || !AD || !AD.dispatch) {
      if (tokBox) { goPage("admin"); setTimeout(() => { tokBox.open = true; tokBox.scrollIntoView({ block: "center", behavior: "smooth" }); }, 120); }
      throw new Error(SP.needToken);
    }
    const d = AD.dispatch;
      const r = await fetch(`https://api.github.com/repos/${d.repo}/actions/workflows/${encodeURIComponent(d.workflow)}/dispatches`, {
        method: "POST",
        headers: { Authorization: "Bearer " + tok, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "Content-Type": "application/json" },
        body: JSON.stringify({ ref: d.ref, inputs: { posts: JSON.stringify(reqs) } }),
      });
      if (!r.ok) { let m = ""; try { m = (await r.json()).message || ""; } catch (e) {} throw new Error(`${SP.failed} (${r.status}${m ? ": " + m : ""})`); }
  }
  if (AD) {
    const tokEl = $("#pp-tok"), tokState = $("#pp-tok-state"), tokBox = $("#pp-tok-box");
    const syncTok = () => { if (tokState) tokState.textContent = load(TK) ? "✓ " + SP.tokenSaved : ""; };
    if (tokEl) {
      $("#pp-tok-save").addEventListener("click", () => { const v = tokEl.value.trim(); if (!v) return; store(TK, v); tokEl.value = ""; syncTok(); tokBox.open = false; toast(SP.tokenSaved); });
      $("#pp-tok-forget").addEventListener("click", () => { store(TK, null); syncTok(); });
      syncTok();
    }
    // Settings form: send only what changed; the workflow commits it to the config file.
    const sf = $("#st-form");
    if (sf) sf.addEventListener("submit", async (e) => {
      e.preventDefault();
      const msg = $(".pp-msg", sf), btn = $("button[type=submit]", sf);
      const set = {};
      const put = (path, v) => { const ks = path.split("."); let o = set; ks.slice(0, -1).forEach((k) => (o = o[k] = o[k] || {})); o[ks[ks.length - 1]] = v; };
      $$("input[type=checkbox][data-init]", sf).forEach((el) => { if (String(el.checked) !== el.dataset.init) put(el.name, el.checked); });
      $$("input[type=number][data-init]", sf).forEach((el) => { if (el.value !== el.dataset.init && el.value !== "") put(el.name, Number(el.value)); });
      $$("select[data-init]", sf).forEach((el) => { if (el.value !== el.dataset.init) put(el.name, el.name === "promote.events.weekly" && el.value === "off" ? false : el.value); });
      const tags = $("input[name='promote.hashtags']", sf);
      if (tags && tags.value !== tags.dataset.init) put("promote.hashtags", tags.value.split(/[,，\s]+/).map((t) => t.replace(/^#/, "")).filter(Boolean));
      const plats = $$("input[name='promote.platforms']:checked", sf).map((el) => el.value);
      // Same set in a different order is not a change.
      if ([...plats].sort().join(",") !== sf.dataset.platforms.split(",").filter(Boolean).sort().join(",")) put("promote.platforms", plats);
      if (!Object.keys(set).length) { msg.textContent = S.settings.nothing; return; }
      btn.disabled = true; msg.textContent = "…"; msg.classList.remove("bad");
      try { await dispatch([{ op: "config", set }]); msg.textContent = "✓ " + S.settings.saved; }
      catch (err) { btn.disabled = false; msg.textContent = err.message; msg.classList.add("bad"); }
    });
    // Health issue decisions (ignore / snooze / mark done / pause / restore), saved to `projects:` in the config.
    $$(".adm-issues li[data-issue]").forEach((li) => li.insertAdjacentHTML("beforeend", fixButtons(byId[li.dataset.pid], li.dataset.issue)));
    document.addEventListener("click", async (e) => {
      const b = e.target.closest("[data-fix]");
      if (!b) return;
      const p = byId[b.dataset.pid];
      if (!p || !p.admin) return;
      const id = b.dataset.issue, act = b.dataset.fix, key = p.admin.cfgKey;
      const proj = {};
      if (act === "ignore") proj.ignore = [...new Set([...(p.admin.ignored || []), id])];
      else if (act === "restore") proj.ignore = (p.admin.ignored || []).filter((x) => x !== id);
      else if (act === "snooze") proj.snooze = { [id]: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10) };
      else proj.status = act;
      b.disabled = true;
      try {
        await dispatch([{ op: "config", set: { projects: { [key]: proj } } }]);
        if (proj.ignore) p.admin.ignored = proj.ignore;
        const holder = b.closest(".fxs") || b;
        holder.outerHTML = `<em class="fx-sent">✓ ${esc(S.fix.sent)}</em>`;
      } catch (err) { b.disabled = false; toast(err.message); }
    });
    $$("#adm-refresh, [data-refresh]").forEach((rb) => rb.addEventListener("click", async () => {
      rb.disabled = true;
      try { await dispatch([]); $$("#adm-refresh, [data-refresh]").forEach((x) => { x.disabled = true; x.textContent = "✓ " + S.adminx.refreshSent; }); }
      catch (e) { rb.disabled = false; toast(e.message); }
    }));
  }
  if (PR) {
    // Character count the way each platform counts (X: links = 23, CJK = 2).
    const seg = typeof Intl !== "undefined" && Intl.Segmenter ? new Intl.Segmenter() : null;
    const glen = (t) => (seg ? Array.from(seg.segment(t)).length : Array.from(t).length);
    const plen = (pf, t) => {
      if (pf !== "x") return glen(t);
      let n = 0;
      const rest = t.replace(/https?:\/\/\S+/g, () => { n += 23; return ""; });
      for (const ch of rest) n += /[ᄀ-ᇿ⺀-꓏가-힯豈-﫿︰-﹏＀-￯]/.test(ch) ? 2 : 1;
      return n;
    };
    const enc = encodeURIComponent;
    const shareUrl = (pf, text, url, title) => ({
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`,
      bluesky: `https://bsky.app/intent/compose?text=${enc(text)}`,
      mastodon: `https://mastodonshare.com/?text=${enc(text)}`,
      threads: `https://www.threads.net/intent/post?text=${enc(text)}`,
      x: `https://x.com/intent/post?text=${enc(text)}`,
      devto: "https://dev.to/new",
      telegram: `https://t.me/share/url?url=${enc(url)}&text=${enc(text.replace(url, "").trim())}`,
      hn: `https://news.ycombinator.com/submitlink?u=${enc(url)}&t=${enc(text || title)}`,
      reddit: `https://www.reddit.com/submit?url=${enc(url)}&title=${enc(text || title)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`,
    })[pf];
    const SENT = (id) => "repofolio-admin-sent:" + id;
    const DRAFT = (id, pf) => `repofolio-admin-draft:${id}:${pf}`;

    $$(".pp[data-post]").forEach((card) => {
      const id = card.dataset.post, url = card.dataset.url, title = card.dataset.title;
      const msg = $(".pp-msg", card), approve = $(".pp-approve", card), skip = $(".pp-skip", card);
      const panes = $$(".pp-pane", card), tabs = $$(".pp-tab", card);
      const setMsg = (t, bad) => { msg.textContent = t; msg.classList.toggle("bad", !!bad); };
      const markSent = (t) => { card.classList.add("sent"); approve.disabled = skip.disabled = true; setMsg(t || SP.sent); };
      const sentAt = Number(load(SENT(id)) || 0);
      if (sentAt && Date.now() - sentAt < 30 * 60 * 1000) markSent();
      $$(".pp-st", card).forEach((b) => b.addEventListener("click", async () => {
        if (b.classList.contains("on") || card.classList.contains("sent")) return;
        const prev = $(".pp-st.on", card);
        $$(".pp-st", card).forEach((x) => { x.classList.toggle("on", x === b); x.setAttribute("aria-checked", String(x === b)); });
        setMsg("…");
        try {
          await dispatch([{ op: "redraft", id, style: b.dataset.style }]);
          store(SENT(id), String(Date.now()));
          markSent(S.styles.redraft);
        } catch (e) {
          $$(".pp-st", card).forEach((x) => { x.classList.toggle("on", x === prev); x.setAttribute("aria-checked", String(x === prev)); });
          setMsg(e.message, true);
        }
      }));
      tabs.forEach((tb) => tb.addEventListener("click", () => {
        tabs.forEach((x) => x.classList.toggle("on", x === tb));
        panes.forEach((pn) => (pn.hidden = pn.dataset.pf !== tb.dataset.pf));
      }));
      const countAll = () => {
        let n = 0;
        panes.forEach((pn) => {
          const pf = pn.dataset.pf, ta = $(".pp-text", pn), cnt = $(".pp-count", pn), lim = Number(cnt.dataset.limit);
          const L = plen(pf, ta.value);
          cnt.textContent = `${L} / ${lim} ${SP.chars}`;
          cnt.classList.toggle("bad", L > lim);
          const inc = $(".pp-inc", pn), done = $(".pp-done", pn);
          if ((inc && inc.checked) || (done && done.checked)) n++;
        });
        approve.textContent = `${SP.approve}${n ? ` (${n})` : ""}`;
      };
      panes.forEach((pn) => {
        const pf = pn.dataset.pf, ta = $(".pp-text", pn), ti = $(".pp-title", pn);
        const saved = load(DRAFT(id, pf));
        if (saved != null && saved !== ta.value) ta.value = saved;
        ta.addEventListener("input", () => { store(DRAFT(id, pf), ta.value === ta.defaultValue ? null : ta.value); countAll(); });
        $$("input[type=checkbox]", pn).forEach((c) => c.addEventListener("change", countAll));
        const full = () => (ti ? `${ti.value}\n\n${ta.value}` : ta.value);
        const cp = $(".pp-copy", pn);
        if (cp) cp.addEventListener("click", () => copy(full()));
        const sh = $(".pp-share", pn);
        if (sh) sh.addEventListener("click", () => {
          if (pf === "devto" || pf === "linkedin" || pf === "facebook") copy(full());
          const u = shareUrl(pf, ta.value, url, title);
          if (u) open(u, "_blank", "noopener");
          const done = $(".pp-done", pn); if (done) { done.checked = true; countAll(); }
        });
      });
      countAll();
      approve.addEventListener("click", async () => {
        const req = { op: "approve", id, platforms: [], manual: [], edits: {} };
        for (const pn of panes) {
          const pf = pn.dataset.pf, ta = $(".pp-text", pn), ti = $(".pp-title", pn), inc = $(".pp-inc", pn), done = $(".pp-done", pn);
          if (inc && inc.checked) req.platforms.push(pf);
          if (done && done.checked) req.manual.push(pf);
          if (ta.value !== ta.defaultValue || (ti && ti.value !== ti.defaultValue)) {
            if (plen(pf, ta.value) > Number($(".pp-count", pn).dataset.limit)) { setMsg(`${PR.platforms[pf].label}: ${$(".pp-count", pn).textContent}`, true); return; }
            req.edits[pf] = ti ? { text: ta.value, title: ti.value } : { text: ta.value };
          }
        }
        if (!req.platforms.length && !req.manual.length) { setMsg("—", true); return; }
        approve.disabled = true; setMsg("…");
        try {
          await dispatch([req]);
          store(SENT(id), String(Date.now()));
          panes.forEach((pn) => store(DRAFT(id, pn.dataset.pf), null));
          markSent();
        } catch (e) { approve.disabled = false; setMsg(e.message, true); }
      });
      skip.addEventListener("click", async () => {
        skip.disabled = true; setMsg("…");
        try { await dispatch([{ op: "skip", id }]); store(SENT(id), String(Date.now())); markSent(SP.status.skipped); }
        catch (e) { skip.disabled = false; setMsg(e.message, true); }
      });
    });
    $$(".pp-retry").forEach((b) => b.addEventListener("click", async () => {
      const id = b.closest("[data-post]").dataset.post;
      b.disabled = true;
      try { await dispatch([{ op: "approve", id, platforms: b.dataset.pfs.split(","), manual: [], edits: {} }]); b.textContent = SP.sent; }
      catch (e) { b.disabled = false; toast(e.message); }
    }));
    // "Write a post about this" in the project modal (rendered after this runs, so delegate).
    document.addEventListener("click", async (e) => {
      const b = e.target.closest("[data-spotlight]");
      if (!b) return;
      b.disabled = true;
      try { await dispatch([{ op: "draft", repo: b.dataset.spotlight }]); b.textContent = "✓ " + SP.sentDraft; }
      catch (err) { b.disabled = false; toast(err.message); }
    });
  }

  applyTheme();
}
