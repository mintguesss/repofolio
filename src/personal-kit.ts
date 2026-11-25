/**
 * Edits a personal website's TypeScript data file the way its owner writes it by hand: one more object in
 * `projects` / `builds` / `awards` / `certifications` / `experience`, plus a detail page for builds.
 *
 * Self-contained on purpose: the admin page runs it in the browser via `personalKit.toString()`,
 * and the action uses it to see what's already on the site. No imports, no outside names.
 */
export function personalKit() {
  type Dict = Record<string, unknown>;
  type Kind = "project" | "build" | "award" | "cert" | "experience";
  const COLORS = ["#2E6E93", "#7048e8", "#3F8869", "#e67700"];
  const IDENT = /^[A-Za-z_$][\w$]*$/;
  const WIDTH = 150;

  /** A value as TypeScript source. `{ __raw: "..." }` is written as-is (e.g. `"project" as const`). */
  const flat = (o: Dict) => Object.values(o).every((x) => x == null || typeof x !== "object" || "__raw" in (x as Dict));
  function lit(v: unknown, ind = "", multi = false, oneLine = false): string {
    if (v && typeof v === "object" && "__raw" in (v as Dict)) return String((v as Dict).__raw);
    if (typeof v === "string") return JSON.stringify(v);
    if (typeof v === "number" || typeof v === "boolean") return String(v);
    if (v == null) return '""';
    const inner = ind + "  ";
    if (Array.isArray(v)) {
      if (!v.length) return "[]";
      // A list of objects: one per line, each on a single line when it holds only plain values (like hand-written data).
      const objs = v.every((x) => x && typeof x === "object" && !Array.isArray(x) && !("__raw" in (x as Dict)));
      if (objs) return "[\n" + v.map((x) => inner + lit(x, inner, false, flat(x as Dict)) + ",").join("\n") + "\n" + ind + "]";
      const one = "[" + v.map((x) => lit(x, inner)).join(", ") + "]";
      if (!multi && !one.includes("\n") && one.length + ind.length <= WIDTH) return one;
      return "[\n" + v.map((x) => inner + lit(x, inner) + ",").join("\n") + "\n" + ind + "]";
    }
    const ents = Object.entries(v as Dict).filter(([, x]) => x !== undefined);
    const key = (k: string) => (IDENT.test(k) ? k : JSON.stringify(k));
    const one = "{ " + ents.map(([k, x]) => key(k) + ": " + lit(x, inner)).join(", ") + " }";
    if (oneLine) return one;
    if (!multi && !one.includes("\n") && one.length + ind.length <= WIDTH) return one;
    return "{\n" + ents.map(([k, x]) => inner + key(k) + ": " + lit(x, inner) + ",").join("\n") + "\n" + ind + "}";
  }

  /** Add one entry to an array property (`  builds: [`) at its start or end. */
  function insertEntry(src: string, section: string, entry: unknown, where: "start" | "end", multi: boolean): string {
    const empty = new RegExp("\\n([ \\t]*)" + section + ":\\s*\\[\\s*\\](\\s*as const)?").exec(src);
    if (empty) {
      const ind = empty[1] + "  ";
      return src.slice(0, empty.index) + "\n" + empty[1] + section + ": [\n" + ind + lit(entry, ind, multi) + ",\n" + empty[1] + "]" + (empty[2] ?? "") + src.slice(empty.index + empty[0].length);
    }
    const head = new RegExp("\\n([ \\t]*)" + section + ":\\s*\\[[ \\t]*\\r?\\n").exec(src);
    if (!head) throw new Error(`can't find "${section}: [" in the data file`);
    const ind = head[1] + "  ";
    const text = ind + lit(entry, ind, multi) + ",\n";
    let pos = head.index + head[0].length;
    if (where === "end") {
      const close = new RegExp("\\n" + head[1] + "\\]").exec(src.slice(pos));
      if (!close) throw new Error(`can't find the end of "${section}"`);
      pos += close.index + 1;
      // The last entry may lack a trailing comma.
      const before = src.slice(0, pos).replace(/\s+$/, "");
      if (!/[,[]$/.test(before)) return before + ",\n" + text + src.slice(pos);
    }
    return src.slice(0, pos) + text + src.slice(pos);
  }

  /** Add a detail page (`'id': { … },`) right after `export const xxx = {`. */
  function insertDetail(src: string, id: string, detail: unknown): string {
    const head = /export const \w+(\s*:[^=]+)?\s*=\s*\{[ \t]*\r?\n/.exec(src);
    if (!head) throw new Error("can't find the detail object");
    const pos = head.index + head[0].length;
    return src.slice(0, pos) + "\n  '" + id.replace(/'/g, "") + "': " + lit(detail, "  ", true) + ",\n" + src.slice(pos);
  }

  const norm = (s: string) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  /** Everything a repo could already be on the site as: ids, first word of titles, linked GitHub repos. */
  function known(src: string): Set<string> {
    const out = new Set<string>();
    for (const m of src.matchAll(/\bid:\s*["'`]([^"'`]+)["'`]/g)) out.add(norm(m[1]!));
    for (const m of src.matchAll(/\btitle:\s*["'`]([^"'`]+)["'`]/g)) out.add(norm(m[1]!.split(" ")[0]!));
    for (const m of src.matchAll(/github\.com\/[\w.-]+\/([\w.-]+)/g)) out.add(norm(m[1]!));
    for (const m of src.matchAll(/https?:\/\/([\w-]+)\./g)) out.add(norm(m[1]!));
    out.delete("");
    return out;
  }
  const groups = (src: string) => [...new Set([...src.matchAll(/\bgroup:\s*["'`]([^"'`]+)["'`]/g)].map((m) => m[1]!))];
  const count = (src: string, section: string) => {
    const head = new RegExp("\\n([ \\t]*)" + section + ":\\s*\\[").exec(src);
    if (!head) return 0;
    const rest = src.slice(head.index + head[0].length);
    const end = new RegExp("\\n" + head[1] + "\\]").exec(rest);
    const body = end ? rest.slice(0, end.index) : rest;
    return (body.match(new RegExp("\\n" + head[1] + "  \\{", "g")) ?? []).length;
  };

  const slugify = (s: string) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
  const fileSafe = (s: string) => String(s || "").replace(/[\\/:*?"<>|#%&{}$!'@+`=\s]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "image";
  const rows = (t: unknown, n: number) => String(t || "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((l) => {
    const c = l.split("|").map((x) => x.trim());
    while (c.length < n) c.push("");
    return n === 1 ? [l] : c.slice(0, n - 1).concat(c.slice(n - 1).join(" | "));
  });
  const list = (t: unknown) => String(t || "").split(/[,，、\n]/).map((x) => x.trim()).filter(Boolean);
  const paras = (t: unknown) => String(t || "").split(/\r?\n\s*\r?\n/).map((x) => x.replace(/\s*\r?\n\s*/g, " ").trim()).filter(Boolean);
  const s = (v: unknown) => String(v ?? "").trim();

  /** Where each kind goes, and its image folder / file name. */
  const PLACE: Record<Kind, { section: string; where: "start" | "end"; multi: boolean }> = {
    project: { section: "projects", where: "start", multi: true },
    build: { section: "builds", where: "start", multi: true },
    award: { section: "awards", where: "start", multi: false },
    cert: { section: "certifications", where: "end", multi: false },
    experience: { section: "experience", where: "end", multi: false },
  };
  function imagePath(kind: Kind, f: Dict, ext: string): string {
    const id = slugify(s(f.id) || s(f.title)) || "item";
    if (kind === "project") return `projects/${id}/cover.${ext}`;
    if (kind === "build") return `builds/${id}.${ext}`;
    if (kind === "award") return `awards/${fileSafe(s(f.title))}.${ext}`;
    if (kind === "cert") return `skills/${fileSafe(s(f.name))}.${ext}`;
    return `images/${id}.${ext}`;
  }

  /** The object(s) to write for a filled-in form. */
  function build(kind: Kind, f: Dict): { section: string; where: "start" | "end"; multi: boolean; entry: Dict; detail?: Dict; id?: string } {
    const P = PLACE[kind];
    if (kind === "project" || kind === "build") {
      const id = slugify(s(f.id) || s(f.title));
      if (!id) throw new Error("id");
      if (!s(f.title)) throw new Error("title");
      const tags = list(f.tags);
      if (kind === "project") {
        return { ...P, id, entry: { id, title: s(f.title), subtitle: s(f.subtitle), period: s(f.period), type: { __raw: JSON.stringify(s(f.ptype) === "research" ? "research" : "project") + " as const" }, tags, description: s(f.description), highlights: rows(f.highlights, 1).map((r) => r[0]), image: s(f.image), link: s(f.link) } };
      }
      const decisions = rows(f.decisions, 4).map(([tab, title, body, tradeoff]) => ({ tab, title: title || tab, body: [body || title || tab], tradeoff: tradeoff || undefined }));
      return {
        ...P,
        id,
        entry: { id, title: s(f.title), subtitle: s(f.subtitle), group: s(f.group), period: s(f.period), tags, description: s(f.description), image: s(f.image) },
        detail: {
          oneLiner: s(f.oneLiner) || s(f.description),
          metadata: rows(f.metadata, 2).map(([label, value]) => ({ label, value })),
          links: { github: s(f.github), demo: s(f.demo) },
          highlights: rows(f.highlights, 3).map(([title, desc, detail], i) => ({ title, desc, detail, color: COLORS[i % COLORS.length] })),
          problem: paras(f.problem).length ? paras(f.problem) : [s(f.description)],
          features: rows(f.features, 3).map(([title, summary, detail]) => ({ title, summary, detail: detail || summary })),
          decisions: decisions.length ? decisions : [{ tab: "設計", title: s(f.subtitle) || s(f.title), body: [s(f.oneLiner) || s(f.description)] }],
          architecture: String(f.architecture || "").split(/\r?\n/).filter((l) => l.trim()),
          techStack: list(f.techStack).length ? list(f.techStack) : tags,
        },
      };
    }
    if (kind === "award") {
      if (!s(f.title)) throw new Error("title");
      return { ...P, entry: { year: s(f.year), title: s(f.title), org: s(f.org), category: s(f.category) === "school" ? "school" : "competition", image: s(f.image), link: s(f.link) } };
    }
    if (kind === "cert") {
      if (!s(f.name)) throw new Error("name");
      return { ...P, entry: { name: s(f.name), issuer: s(f.issuer), date: s(f.date), image: s(f.image), objectPosition: s(f.objectPosition) || undefined } };
    }
    if (!s(f.role)) throw new Error("role");
    return { ...P, entry: { role: s(f.role), company: s(f.company), period: s(f.period), desc: s(f.desc), tags: list(f.tags) } };
  }

  /** Apply a form to the data file (and detail file). Returns the new sources. */
  function apply(kind: Kind, f: Dict, data: string, details?: string): { data: string; details?: string; id?: string } {
    const b = build(kind, f);
    if (b.id && known(data).has(norm(b.id)) && new RegExp(`\\bid:\\s*["'\`]${b.id}["'\`]`).test(data)) throw new Error(`"${b.id}" is already on the site`);
    const out: { data: string; details?: string; id?: string } = { data: insertEntry(data, b.section, b.entry, b.where, b.multi), id: b.id };
    if (b.detail) {
      if (details == null) throw new Error("detail file missing");
      out.details = insertDetail(details, b.id!, b.detail);
    }
    return out;
  }

  return { lit, insertEntry, insertDetail, known, norm, groups, count, slugify, fileSafe, imagePath, build, apply, PLACE };
}

export type PersonalKit = ReturnType<typeof personalKit>;
