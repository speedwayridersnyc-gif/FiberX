/** "Prints" a document: renders a paper printout to a PNG (dot-matrix tractor-feed or laser page) and downloads it. */
export interface PrintJob { title: string; text: string; styles?: number[]; font?: string; machine: string; paper?: "tractor" | "laser" }
const FONTS: Record<string, string> = { serif: "Georgia, 'Times New Roman', serif", sans: "Helvetica, Arial, sans-serif", mono: "'Courier New', monospace", script: "'Brush Script MT', 'Comic Sans MS', cursive" };
export function cssFont(font?: string) { return FONTS[font ?? "mono"] ?? FONTS.mono; }

export function renderPrintout(job: PrintJob): HTMLCanvasElement {
  const W = 850, margin = 70, tractor = (job.paper ?? "tractor") === "tractor";
  const size = tractor ? 15 : 16, lh = size * 1.45;
  const c = document.createElement("canvas"); const g = c.getContext("2d")!;
  const family = tractor ? "'Courier New', monospace" : cssFont(job.font);
  // layout: wrap words to width, keep per-char styles
  const maxW = W - margin * 2;
  type Run = { t: string; st: number };
  const lines: Run[][] = []; let line: Run[] = []; let lineW = 0;
  const fontFor = (st: number) => `${st & 2 ? "italic " : ""}${st & 1 ? "bold " : ""}${size}px ${family}`;
  const words: { t: string; st: number[] }[] = [];
  let cur = { t: "", st: [] as number[] };
  for (let i = 0; i < job.text.length; i++) {
    const ch = job.text[i]; const st = job.styles?.[i] ?? 0;
    if (ch === "\n") { if (cur.t) words.push(cur); words.push({ t: "\n", st: [0] }); cur = { t: "", st: [] }; continue; }
    cur.t += ch; cur.st.push(st);
    if (ch === " ") { words.push(cur); cur = { t: "", st: [] }; }
  }
  if (cur.t) words.push(cur);
  const measure = (w: { t: string; st: number[] }) => { let x = 0; for (let i = 0; i < w.t.length; i++) { g.font = fontFor(w.st[i]); x += g.measureText(w.t[i]).width; } return x; };
  for (const w of words) {
    if (w.t === "\n") { lines.push(line); line = []; lineW = 0; continue; }
    const ww = measure(w);
    if (lineW + ww > maxW && line.length) { lines.push(line); line = []; lineW = 0; }
    for (let i = 0; i < w.t.length; i++) line.push({ t: w.t[i], st: w.st[i] });
    lineW += ww;
  }
  lines.push(line);
  const H = Math.max(1100, margin * 2 + 90 + lines.length * lh);
  c.width = W; c.height = H;
  g.fillStyle = tractor ? "#f6f3e8" : "#ffffff"; g.fillRect(0, 0, W, H);
  if (tractor) {
    for (let y = 0; y < H; y += lh * 2) { g.fillStyle = "rgba(170,210,170,.25)"; g.fillRect(36, y, W - 72, lh); }
    g.fillStyle = "#d8d2c0"; for (let y = 18; y < H; y += 36) { g.beginPath(); g.arc(16, y, 6, 0, 7); g.arc(W - 16, y, 6, 0, 7); g.fill(); }
    g.strokeStyle = "rgba(0,0,0,.12)"; g.setLineDash([4, 4]); g.beginPath(); g.moveTo(32, 0); g.lineTo(32, H); g.moveTo(W - 32, 0); g.lineTo(W - 32, H); g.stroke(); g.setLineDash([]);
  }
  g.fillStyle = "#555"; g.font = `11px ${family}`; g.fillText(`${job.machine} · ${job.title} · printed ${new Date().toLocaleString()}`, margin, margin - 30);
  let y = margin + 20;
  for (const ln of lines) {
    let x = margin;
    for (const r of ln) {
      g.font = fontFor(r.st); g.fillStyle = tractor ? "rgba(25,25,30,.88)" : "#111";
      g.fillText(r.t, x, y);
      const w = g.measureText(r.t).width;
      if (r.st & 4) g.fillRect(x, y + 3, w, 1.2);
      if (tractor && r.st & 1) g.fillText(r.t, x + 0.8, y);
      x += w;
    }
    y += lh;
  }
  return c;
}
export function download(name: string, href: string) { const a = document.createElement("a"); a.href = href; a.download = name; document.body.appendChild(a); a.click(); a.remove(); }
export function printDocument(job: PrintJob) {
  const c = renderPrintout(job);
  download(`${job.title.replace(/[^\w.-]+/g, "_")}-printout.png`, c.toDataURL("image/png"));
}
export function exportText(title: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
  download(`${title.replace(/[^\w.-]+/g, "_").replace(/\.txt$/i, "")}.txt`, url); setTimeout(() => URL.revokeObjectURL(url), 2000);
}
