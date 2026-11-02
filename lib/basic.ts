/** A tiny line-numbered BASIC interpreter shared by the 8-bit exhibits (C64- and S800-style dialects). */
export type Val = number | string;

export interface BasicHost {
  print: (s: string, newline?: boolean) => void;
  clear: () => void;
  poke?: (addr: number, val: number) => void;
  sys?: (addr: number) => void;
  setcolor?: (reg: number, hue: number, lum: number) => void;
  graphics?: (mode: number) => void;
  chr?: (code: number) => string;
}
export interface Dialect { name: "c64" | "s800"; error: (msg: string, line?: number) => string; ready: string }

export const C64_DIALECT: Dialect = { name: "c64", ready: "READY.", error: (m, l) => `?${m.toUpperCase()}  ERROR${l !== undefined ? ` IN ${l}` : ""}` };
const S800_CODES: Record<string, number> = { "syntax": 17, "undef'd statement": 12, "next without for": 13, "return without gosub": 16, "type mismatch": 8, "division by zero": 11, "out of data": 6 };
export const S800_DIALECT: Dialect = { name: "s800", ready: "READY", error: (m, l) => `ERROR-  ${S800_CODES[m.toLowerCase()] ?? 17}${l !== undefined ? ` AT LINE ${l}` : ""}` };

class BasicError extends Error {}

type Tok = { t: "num"; v: number } | { t: "str"; v: string } | { t: "id"; v: string } | { t: "op"; v: string };
function lex(src: string): Tok[] {
  const out: Tok[] = []; let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === " ") { i++; continue; }
    if (c === '"') { let j = i + 1; while (j < src.length && src[j] !== '"') j++; out.push({ t: "str", v: src.slice(i + 1, j) }); i = j + 1; continue; }
    if (/[0-9.]/.test(c)) { let j = i; while (j < src.length && /[0-9.]/.test(src[j])) j++; out.push({ t: "num", v: parseFloat(src.slice(i, j)) }); i = j; continue; }
    if (/[A-Z]/i.test(c)) { let j = i; while (j < src.length && /[A-Z0-9]/i.test(src[j])) j++; if (src[j] === "$") j++; out.push({ t: "id", v: src.slice(i, j).toUpperCase() }); i = j; continue; }
    const two = src.slice(i, i + 2);
    if (["<>", "<=", ">="].includes(two)) { out.push({ t: "op", v: two }); i += 2; continue; }
    out.push({ t: "op", v: c }); i++;
  }
  return out;
}

/** split statements on ':' outside quotes */
function splitStatements(line: string): string[] {
  const out: string[] = []; let cur = "", q = false;
  for (const ch of line) { if (ch === '"') q = !q; if (ch === ":" && !q) { out.push(cur); cur = ""; } else cur += ch; }
  out.push(cur);
  return out.map((s) => s.trim()).filter((s, i, a) => s.length || a.length === 1);
}

export class Basic {
  program = new Map<number, string>();
  vars = new Map<string, Val>();
  private lines: number[] = [];
  private pc = { li: 0, si: 0 };
  private stmts: string[][] = [];
  private gosub: { li: number; si: number }[] = [];
  private fors: { v: string; to: number; step: number; li: number; si: number }[] = [];
  running = false;
  direct = false;
  lastLine?: number;
  /** characters printed since RUN — used for secrets */
  printed = "";
  constructor(public host: BasicHost, public dialect: Dialect) {}

  enter(line: string): "stored" | "exec" {
    const m = line.match(/^\s*(\d+)\s*(.*)$/);
    if (m) { const n = parseInt(m[1]); if (m[2].trim()) this.program.set(n, m[2].trim()); else this.program.delete(n); return "stored"; }
    return "exec";
  }
  list() { [...this.program.keys()].sort((a, b) => a - b).forEach((n) => this.host.print(`${n} ${this.program.get(n)}`)); }
  newProgram() { this.program.clear(); this.vars.clear(); }

  start(fromLine?: number) {
    this.lines = [...this.program.keys()].sort((a, b) => a - b);
    this.stmts = this.lines.map((n) => splitStatements(this.program.get(n)!));
    this.vars.clear(); this.gosub = []; this.fors = []; this.printed = "";
    this.pc = { li: fromLine !== undefined ? this.lines.indexOf(fromLine) : 0, si: 0 };
    if (this.pc.li < 0) { this.host.print(this.dialect.error("undef'd statement")); return false; }
    this.running = this.lines.length > 0; this.direct = false;
    return this.running;
  }
  /** run a direct-mode line (may jump into the program via GOTO/RUN) */
  execDirect(line: string): boolean {
    this.lines = [...this.program.keys()].sort((a, b) => a - b);
    this.stmts = this.lines.map((n) => splitStatements(this.program.get(n)!));
    const parts = splitStatements(line);
    this.direct = true; this.running = true;
    try {
      for (const s of parts) {
        const r = this.exec(s);
        if (r === "jump") { this.direct = false; return true; }
        if (!this.running) break;
      }
    } catch (e) { this.host.print(this.dialect.error(e instanceof BasicError ? e.message : "syntax")); }
    this.running = false; this.direct = false;
    return false;
  }
  /** execute up to n statements; returns false when the program ended */
  step(n = 40): boolean {
    for (let k = 0; k < n && this.running; k++) {
      if (this.pc.li >= this.lines.length) { this.running = false; break; }
      const line = this.stmts[this.pc.li];
      if (this.pc.si >= line.length) { this.pc.li++; this.pc.si = 0; continue; }
      const s = line[this.pc.si];
      this.lastLine = this.lines[this.pc.li];
      this.pc.si++;
      try { this.exec(s); } catch (e) { this.host.print(this.dialect.error(e instanceof BasicError ? e.message : "syntax", this.lastLine)); this.running = false; }
    }
    return this.running;
  }
  stop() { this.running = false; }

  private jump(n: number): "jump" {
    const li = this.lines.indexOf(n);
    if (li < 0) throw new BasicError("undef'd statement");
    this.pc = { li, si: 0 }; this.running = true; return "jump";
  }

  private exec(s: string): "jump" | void {
    const kw = (s.match(/^([A-Z?]+)/i)?.[1] ?? "").toUpperCase();
    const rest = (k: string) => s.slice(k.length).trim();
    if (s === "") return;
    if (s.startsWith("?")) return this.doPrint(s.slice(1));
    if (kw.startsWith("PRINT")) return this.doPrint(s.slice(5));
    if (kw.startsWith("REM")) { this.pc.si = 1e9; return; }
    if (kw === "END" || kw === "STOP") { this.running = false; return; }
    if (kw.startsWith("GOTO")) return this.jump(this.num(rest("GOTO")));
    if (kw.startsWith("GOSUB")) { this.gosub.push({ ...this.pc }); return this.jump(this.num(rest("GOSUB"))); }
    if (kw === "RETURN") { const r = this.gosub.pop(); if (!r) throw new BasicError("return without gosub"); this.pc = r; return; }
    if (kw === "RUN") { this.start(); return "jump"; }
    if (kw === "CLR") { this.vars.clear(); return; }
    if (kw === "CLS" || kw === "HOME") { this.host.clear(); return; }
    if (kw.startsWith("IF")) {
      const m = s.match(/^IF\s*(.*?)\s*THEN\s*(.*)$/i); if (!m) throw new BasicError("syntax");
      if (this.truthy(this.eval(m[1]))) {
        if (/^\d+$/.test(m[2].trim())) return this.jump(parseInt(m[2]));
        const sub = splitStatements(m[2]); for (const x of sub) { const r = this.exec(x); if (r) return r; }
      } else { this.pc.si = 1e9; }
      return;
    }
    if (kw.startsWith("FOR")) {
      const m = s.match(/^FOR\s*([A-Z][A-Z0-9]*)\s*=\s*(.*?)\s*TO\s*(.*?)(?:\s*STEP\s*(.*))?$/i); if (!m) throw new BasicError("syntax");
      const v = m[1].toUpperCase(); this.vars.set(v, this.num(m[2]));
      this.fors = this.fors.filter((f) => f.v !== v);
      this.fors.push({ v, to: this.num(m[3]), step: m[4] ? this.num(m[4]) : 1, li: this.pc.li, si: this.pc.si });
      return;
    }
    if (kw.startsWith("NEXT")) {
      const name = rest("NEXT").toUpperCase();
      const f = name ? [...this.fors].reverse().find((x) => x.v === name) : this.fors[this.fors.length - 1];
      if (!f) throw new BasicError("next without for");
      const v = (this.vars.get(f.v) as number) + f.step; this.vars.set(f.v, v);
      if ((f.step > 0 && v <= f.to) || (f.step < 0 && v >= f.to)) { if (this.direct) throw new BasicError("syntax"); this.pc = { li: f.li, si: f.si }; }
      else this.fors.splice(this.fors.indexOf(f), 1);
      return;
    }
    if (kw === "POKE") { const [a, b] = rest("POKE").split(","); this.host.poke?.(this.num(a), this.num(b)); return; }
    if (kw === "SYS") { this.host.sys?.(this.num(rest("SYS"))); return; }
    if (kw === "SETCOLOR") { const [a, b, c] = rest("SETCOLOR").split(","); this.host.setcolor?.(this.num(a), this.num(b), this.num(c ?? "0")); return; }
    if (kw === "GRAPHICS" || kw === "GR") { this.host.graphics?.(this.num(rest(kw))); return; }
    if (kw === "DATA") return;
    const assign = s.replace(/^LET\s+/i, "").match(/^([A-Z][A-Z0-9]*\$?)\s*=\s*(.+)$/i);
    if (assign) { const name = assign[1].toUpperCase(); const v = this.eval(assign[2]); if (name.endsWith("$") !== (typeof v === "string")) throw new BasicError("type mismatch"); this.vars.set(name, v); return; }
    throw new BasicError("syntax");
  }

  private doPrint(args: string) {
    const toks = lex(args);
    let out = "", trailing = false, depth = 0, start = 0;
    const pieces: { expr: Tok[]; sep: string }[] = [];
    for (let i = 0; i <= toks.length; i++) {
      const t = toks[i];
      if (t && t.t === "op" && t.v === "(") depth++;
      if (t && t.t === "op" && t.v === ")") depth--;
      if (!t || (depth === 0 && t.t === "op" && (t.v === ";" || t.v === ","))) { pieces.push({ expr: toks.slice(start, i), sep: t ? t.v : "" }); start = i + 1; }
    }
    for (const p of pieces) {
      if (!p.expr.length && p.sep === "" && pieces.length > 1) continue;
      if (p.expr.length) { const v = this.evalToks(p.expr); out += typeof v === "number" ? (this.dialect.name === "c64" ? (v >= 0 ? " " : "") + fmt(v) + " " : fmt(v)) : v; }
      if (p.sep === ",") out += " ".repeat(10 - (out.length % 10));
      trailing = p.sep === ";" || p.sep === ",";
    }
    this.printed = (this.printed + out).slice(-400);
    this.host.print(out, !trailing);
  }

  private truthy(v: Val) { return typeof v === "string" ? v.length > 0 : v !== 0; }
  num(src: string): number { const v = this.eval(src); if (typeof v !== "number") throw new BasicError("type mismatch"); return v; }
  eval(src: string): Val { return this.evalToks(lex(src)); }

  private evalToks(toks: Tok[]): Val {
    let i = 0;
    const peek = () => toks[i];
    const isOp = (v: string) => { const t = toks[i]; return !!t && (t.t === "op" || t.t === "id") && t.v === v; };
    const expect = (v: string) => { if (!isOp(v)) throw new BasicError("syntax"); i++; };
    const orE = (): Val => { let a = andE(); while (isOp("OR")) { i++; const b = andE(); a = (this.truthy(a) || this.truthy(b)) ? -1 : 0; } return a; };
    const andE = (): Val => { let a = cmp(); while (isOp("AND")) { i++; const b = cmp(); a = (this.truthy(a) && this.truthy(b)) ? -1 : 0; } return a; };
    const cmp = (): Val => {
      let a = add();
      for (;;) {
        const t = peek(); if (!t || t.t !== "op" || !["=", "<>", "<", ">", "<=", ">="].includes(t.v)) return a;
        i++; const b = add();
        const r = t.v === "=" ? a === b : t.v === "<>" ? a !== b : t.v === "<" ? a < b : t.v === ">" ? a > b : t.v === "<=" ? a <= b : a >= b;
        a = r ? (this.dialect.name === "c64" ? -1 : 1) : 0;
      }
    };
    const add = (): Val => {
      let a = mul();
      while (isOp("+") || isOp("-")) {
        const op = toks[i++].v; const b = mul();
        if (op === "+") { if (typeof a === "string" || typeof b === "string") { if (typeof a !== typeof b) throw new BasicError("type mismatch"); a = (a as string) + (b as string); } else a = a + b; }
        else { if (typeof a !== "number" || typeof b !== "number") throw new BasicError("type mismatch"); a = a - b; }
      }
      return a;
    };
    const mul = (): Val => {
      let a = pow();
      while (isOp("*") || isOp("/")) { const op = toks[i++].v; const b = pow(); if (typeof a !== "number" || typeof b !== "number") throw new BasicError("type mismatch"); if (op === "/" && b === 0) throw new BasicError("division by zero"); a = op === "*" ? a * b : a / b; }
      return a;
    };
    const pow = (): Val => { let a = unary(); while (isOp("^")) { i++; const b = unary(); a = Math.pow(a as number, b as number); } return a; };
    const unary = (): Val => { if (isOp("-")) { i++; return -(unary() as number); } if (isOp("+")) { i++; return unary(); } if (isOp("NOT")) { i++; return this.truthy(unary()) ? 0 : -1; } return atom(); };
    const fns: Record<string, (a: Val[]) => Val> = {
      RND: () => Math.random(), INT: ([x]) => Math.floor(x as number), ABS: ([x]) => Math.abs(x as number), SQR: ([x]) => Math.sqrt(x as number),
      SIN: ([x]) => Math.sin(x as number), COS: ([x]) => Math.cos(x as number), SGN: ([x]) => Math.sign(x as number),
      LEN: ([s]) => String(s).length, ASC: ([s]) => String(s).charCodeAt(0) || 0, VAL: ([s]) => parseFloat(String(s)) || 0,
      "CHR$": ([x]) => (this.host.chr ? this.host.chr(Math.floor(x as number)) : String.fromCharCode(Math.floor(x as number))),
      "STR$": ([x]) => (typeof x === "number" && x >= 0 && this.dialect.name === "c64" ? " " : "") + fmt(x as number),
      "LEFT$": ([s, n]) => String(s).slice(0, n as number), "RIGHT$": ([s, n]) => String(s).slice(-(n as number)), "MID$": ([s, a, n]) => String(s).substr((a as number) - 1, n === undefined ? undefined : (n as number)),
      PEEK: () => 0, FRE: () => 38911,
    };
    const atom = (): Val => {
      const t = toks[i++];
      if (!t) throw new BasicError("syntax");
      if (t.t === "num" || t.t === "str") return t.v;
      if (t.t === "op" && t.v === "(") { const v = orE(); expect(")"); return v; }
      if (t.t === "id") {
        if (fns[t.v]) { const args: Val[] = []; if (isOp("(")) { i++; if (!isOp(")")) { args.push(orE()); while (isOp(",")) { i++; args.push(orE()); } } expect(")"); } return fns[t.v](args); }
        if (t.v === "TI" ) return Math.floor(performance.now() / 16.67);
        return this.vars.get(t.v) ?? (t.v.endsWith("$") ? "" : 0);
      }
      throw new BasicError("syntax");
    };
    const v = orE();
    if (i < toks.length) throw new BasicError("syntax");
    return v;
  }
}
function fmt(v: number) { return Number.isInteger(v) ? String(v) : String(Math.round(v * 1e8) / 1e8).replace(/^0\./, ".").replace(/^-0\./, "-."); }
