/** GitHub-ish language colours, shared by the profile card and the site. */
export const LANG_COLORS: Record<string, string> = {
  TypeScript: "#3178c6", JavaScript: "#f1e05a", Python: "#3572A5", HTML: "#e34c26", CSS: "#663399", Kotlin: "#A97BFF",
  Java: "#b07219", Shell: "#89e051", Go: "#00ADD8", Rust: "#dea584", Vue: "#41b883", "C++": "#f34b7d", C: "#555555",
  "C#": "#178600", Swift: "#F05138", Dart: "#00B4AB", PHP: "#4F5D95", Ruby: "#701516", "Jupyter Notebook": "#DA5B0B",
  PowerShell: "#012456", Dockerfile: "#384d54", SCSS: "#c6538c", Svelte: "#ff3e00", Astro: "#ff5a03", Batchfile: "#C1F12E",
};
export const langColor = (n: string) => LANG_COLORS[n] ?? `hsl(${[...n].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7)} 65% 55%)`;
