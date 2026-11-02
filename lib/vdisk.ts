/** Per-machine virtual disks persisted in localStorage. */
export interface VFile { name: string; text: string; styles?: number[]; font?: string; size?: number; mtime: number; kind?: string }
const key = (disk: string) => `silicon-hall:disk:${disk}`;
function load(disk: string): Record<string, VFile> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(key(disk)) || "{}"); } catch { return {}; }
}
export function listFiles(disk: string): VFile[] { return Object.values(load(disk)).sort((a, b) => b.mtime - a.mtime); }
export function readFile(disk: string, name: string): VFile | null { return load(disk)[name.toUpperCase()] ?? load(disk)[name] ?? null; }
export function writeFile(disk: string, f: Omit<VFile, "mtime">) {
  const all = load(disk); const name = f.name;
  all[name] = { ...f, name, mtime: Date.now() };
  try { localStorage.setItem(key(disk), JSON.stringify(all)); } catch { /* quota */ }
}
export function deleteFile(disk: string, name: string) { const all = load(disk); delete all[name]; localStorage.setItem(key(disk), JSON.stringify(all)); }
/** normalise a filename to the machine's convention */
export function fileName(raw: string, style: "dos" | "doc" | "c64" | "free"): string {
  const t = raw.trim();
  if (style === "doc") { const [b, e] = t.toUpperCase().replace(/[^A-Z0-9._-]/g, "").split("."); return `${(b || "DOCUMENT").slice(0, 8)}.${(e || "DOC").slice(0, 3)}`; }
  if (style === "dos") { const [b, e] = t.toUpperCase().replace(/[^A-Z0-9._-]/g, "").split("."); return `${(b || "UNTITLED").slice(0, 8)}.${(e || "TXT").slice(0, 3)}`; }
  if (style === "c64") return (t.toUpperCase().replace(/[^A-Z0-9 .-]/g, "") || "UNTITLED").slice(0, 16);
  return (t.replace(/[\\/:*?"<>|]/g, "") || "Untitled").slice(0, 31);
}
