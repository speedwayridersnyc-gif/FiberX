import { asset } from "@/lib/asset";
import type { MachineInfo } from "@/lib/machines";

/** Stylised, original illustrations — silhouettes only, no logos or trademarks. */
/** Pre-rendered photographic studio shots of original, logo-free reconstructions (public/art). */
export function MachineArt({ m }: { m: MachineInfo }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="machine-photo" src={asset(`/art/${m.id}.webp`)} alt={`${m.name}: museum studio photograph of a logo-free reconstruction`} loading="lazy" width={1152} height={864} />;
}

/** Legacy vector silhouettes (kept as a fallback). */
export function MachineSilhouette({ m }: { m: MachineInfo }) {
  const { body, accent, screen } = m.palette;
  const shade = "rgba(0,0,0,.18)";
  const glass = "rgba(255,255,255,.12)";
  switch (m.art) {
    case "compact":
      return (
        <svg viewBox="0 0 120 120" className="machine-art">
          <rect x="30" y="10" width="60" height="84" rx="6" fill={body} />
          <rect x="30" y="86" width="60" height="8" rx="2" fill={shade} />
          <rect x="37" y="17" width="46" height="38" rx="4" fill="#cfc3a6" />
          <rect x="41" y="21" width="38" height="29" rx="2" fill={screen} />
          <rect x="44" y="24" width="32" height="3" fill="#111" />
          <rect x="47" y="31" width="14" height="10" fill="none" stroke="#111" strokeWidth="1.2" />
          <rect x="58" y="36" width="15" height="10" fill="#fff" stroke="#111" strokeWidth="1.2" />
          <rect x="60" y="66" width="20" height="3" rx="1" fill="#6d634f" />
          <rect x="38" y="64" width="7" height="7" fill="none" stroke={accent} strokeWidth="1.4" />
          <rect x="34" y="98" width="52" height="12" rx="2" fill={body} stroke={shade} />
        </svg>
      );
    case "breadbox":
      return (
        <svg viewBox="0 0 120 120" className="machine-art">
          <rect x="22" y="14" width="76" height="46" rx="4" fill="#3a3a3a" />
          <rect x="28" y="19" width="64" height="36" fill={screen} />
          <rect x="34" y="25" width="52" height="24" fill="#7b7be0" />
          <rect x="38" y="29" width="26" height="3" fill={screen} />
          <path d="M10 78 L110 78 L104 104 L16 104 Z" fill={body} />
          {Array.from({ length: 4 }).map((_, r) => Array.from({ length: 12 }).map((_, c) => (
            <rect key={`${r}-${c}`} x={20 + c * 6.8 + r * 1.2} y={82 + r * 5} width="5" height="3.6" rx=".6" fill="#4a443b" />
          )))}
          <rect x="84" y="82" width="12" height="3" fill={accent} />
        </svg>
      );
    case "pc":
      return (
        <svg viewBox="0 0 120 120" className="machine-art">
          <rect x="30" y="8" width="60" height="50" rx="3" fill={body} />
          <rect x="36" y="13" width="48" height="38" rx="2" fill={screen} />
          <text x="40" y="26" fontFamily="monospace" fontSize="7" fill={accent}>C:\&gt;_</text>
          <rect x="14" y="60" width="92" height="26" rx="2" fill={body} stroke={shade} />
          <rect x="22" y="66" width="30" height="6" fill="#222" /><rect x="22" y="76" width="30" height="6" fill="#222" />
          <rect x="16" y="92" width="88" height="18" rx="2" fill="#bdb6a3" />
        </svg>
      );
    case "wedge":
      return (
        <svg viewBox="0 0 120 120" className="machine-art">
          <rect x="32" y="8" width="56" height="44" rx="3" fill={body} />
          <rect x="37" y="13" width="46" height="34" fill={screen} />
          <circle cx="60" cy="30" r="10" fill="#fff" /><path d="M50 30 h20 M60 20 v20 M53 23 l14 14 M67 23 l-14 14" stroke={accent} strokeWidth="2.4" />
          <path d="M8 70 L112 70 L112 98 L8 98 Z" fill={body} /><path d="M8 70 L112 70 L106 62 L14 62 Z" fill="#f3efe4" />
          {Array.from({ length: 3 }).map((_, r) => Array.from({ length: 13 }).map((_, c) => (
            <rect key={`${r}-${c}`} x={14 + c * 7} y={74 + r * 7} width="5.5" height="5" rx=".8" fill="#cfc8b6" />
          )))}
          <rect x="102" y="88" width="6" height="3" fill={accent} />
        </svg>
      );
    case "win95":
      return (
        <svg viewBox="0 0 120 120" className="machine-art">
          <rect x="20" y="8" width="80" height="62" rx="3" fill={body} />
          <rect x="27" y="14" width="66" height="48" fill={screen} />
          <rect x="27" y="56" width="66" height="6" fill="#c0c0c0" /><rect x="29" y="57" width="14" height="4" fill="#dcdcdc" stroke="#555" strokeWidth=".5" />
          <rect x="40" y="22" width="30" height="20" fill="#c0c0c0" /><rect x="40" y="22" width="30" height="4" fill="#000080" />
          <rect x="50" y="70" width="20" height="10" fill={body} /><rect x="30" y="80" width="60" height="6" rx="2" fill={body} />
          <rect x="12" y="92" width="96" height="18" rx="2" fill="#d6d1c4" />
        </svg>
      );
    case "winxp":
      return (
        <svg viewBox="0 0 120 120" className="machine-art">
          <rect x="16" y="10" width="88" height="62" rx="4" fill={body} />
          <rect x="21" y="15" width="78" height="52" fill={screen} />
          <path d="M21 52 Q50 36 99 46 L99 67 L21 67 Z" fill="#4caa3a" />
          <rect x="21" y="62" width="78" height="5" fill="#245edb" /><rect x="21" y="62" width="14" height="5" rx="2" fill="#3c9a3c" />
          <rect x="54" y="72" width="12" height="14" fill="#3a3f47" /><rect x="36" y="86" width="48" height="5" rx="2" fill="#3a3f47" />
        </svg>
      );
    case "laptop-black":
      return (
        <svg viewBox="0 0 120 120" className="machine-art">
          <path d="M22 16 h76 v56 h-76 Z" fill={body} /><rect x="27" y="21" width="66" height="46" fill={screen} />
          <path d="M10 76 L110 76 L116 100 L4 100 Z" fill="#232428" />
          {Array.from({ length: 3 }).map((_, r) => Array.from({ length: 12 }).map((_, c) => (
            <rect key={`${r}-${c}`} x={16 + c * 7.4} y={80 + r * 5.5} width="6" height="4.4" rx=".6" fill="#0d0d0f" />
          )))}
          <circle cx="60" cy="88" r="1.8" fill={accent} />
        </svg>
      );
    case "gumdrop":
      return (
        <svg viewBox="0 0 120 120" className="machine-art">
          <path d="M18 18 Q18 8 30 8 H90 Q102 8 102 18 L106 82 Q106 96 92 96 H28 Q14 96 14 82 Z" fill={body} opacity=".9" />
          <path d="M18 18 Q18 8 30 8 H90 Q102 8 102 18 L104 50 H16 Z" fill={glass} />
          <rect x="28" y="16" width="64" height="48" rx="3" fill={screen} />
          <rect x="34" y="72" width="52" height="16" rx="8" fill={accent} opacity=".7" />
          <ellipse cx="60" cy="108" rx="30" ry="5" fill={body} opacity=".6" />
        </svg>
      );
    case "clamshell":
      return (
        <svg viewBox="0 0 120 120" className="machine-art">
          <path d="M20 12 Q20 6 28 6 H92 Q100 6 100 12 V64 H20 Z" fill={accent} /><path d="M24 12 H96 V60 H24 Z" fill={body} opacity=".25" />
          <rect x="30" y="14" width="60" height="42" fill={screen} />
          <path d="M8 66 H112 Q114 100 96 104 H24 Q6 100 8 66 Z" fill={body} /><path d="M14 70 H106 V86 H14 Z" fill={accent} />
          <path d="M40 104 Q60 118 80 104" fill="none" stroke={body} strokeWidth="5" />
        </svg>
      );
    case "laptop-metal":
      return (
        <svg viewBox="0 0 120 120" className="machine-art">
          <defs><linearGradient id="brush" x1="0" x2="1"><stop offset="0" stopColor="#d6d9de" /><stop offset=".5" stopColor={body} /><stop offset="1" stopColor="#e3e5e8" /></linearGradient></defs>
          <rect x="14" y="14" width="92" height="60" rx="3" fill="url(#brush)" /><rect x="19" y="19" width="82" height="50" fill={screen} />
          <path d="M6 78 H114 L110 92 H10 Z" fill="url(#brush)" /><rect x="48" y="84" width="24" height="5" rx="1" fill={accent} opacity=".5" />
        </svg>
      );
  }
}
