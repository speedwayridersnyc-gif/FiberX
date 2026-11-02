export type MachineStatus = "playable" | "coming-soon";

export interface MachineInfo {
  id: string;
  name: string;
  subtitle: string;
  year: string;
  maker: string;
  status: MachineStatus;
  blurb: string;
  /** visual archetype used by the card illustration */
  art: "compact" | "breadbox" | "s800" | "pc" | "wedge" | "win95" | "winxp" | "laptop-black" | "gumdrop" | "clamshell" | "laptop-metal";
  palette: { body: string; accent: string; screen: string };
}

export const MACHINES: MachineInfo[] = [
  { id: "silicon-classic", name: "Silicon Classic", subtitle: "128K-style compact", year: "1984", maker: "Compact all-in-one", status: "playable", art: "compact",
    blurb: "A beige all-in-one with a crisp 512×342 one-bit screen, a floppy drive and a desktop full of windows.",
    palette: { body: "#e8dcc0", accent: "#b8893b", screen: "#f4f1e6" } },
  { id: "silicon-64", name: "Silicon 64", subtitle: "8-bit breadbox", year: "1982", maker: "Home computer", status: "playable", art: "breadbox",
    blurb: "The breadbox that taught a generation to type LOAD and wait.", palette: { body: "#8a7f6e", accent: "#5b6fb5", screen: "#4b4ba8" } },
  { id: "silicon-800", name: "Silicon 800", subtitle: "Cartridge home computer", year: "1979", maker: "Home computer & console", status: "playable", art: "s800",
    blurb: "A walnut-trimmed 8-bit with a cartridge door on top: plug in BASIC, or a jungle adventure.", palette: { body: "#d8ccb0", accent: "#7a4a22", screen: "#1b5aa0" } },
  { id: "silicon-pc", name: "Silicon PC", subtitle: "Classic business desktop", year: "1981", maker: "Business desktop", status: "playable", art: "pc",
    blurb: "A steel-cased system unit, twin floppy drives, a buckling-spring keyboard and a blinking C:\\> prompt.", palette: { body: "#d9d3c3", accent: "#3fa37a", screen: "#0d2a1a" } },
  { id: "silicon-500", name: "Silicon 500", subtitle: "16-bit wedge", year: "1987", maker: "Home computer", status: "playable", art: "wedge",
    blurb: "A keyboard-shaped computer with chiptune soul and a bouncing checkered ball.", palette: { body: "#e6e1d3", accent: "#c0472f", screen: "#2b4c9b" } },
  { id: "silicon-95", name: "Silicon 95", subtitle: "Beige tower era", year: "1995", maker: "Desktop OS", status: "playable", art: "win95",
    blurb: "Start buttons, teal wallpapers and the sound of a dial-up modem.", palette: { body: "#cfcabb", accent: "#008080", screen: "#008080" } },
  { id: "silicon-meadow", name: "Silicon Meadow", subtitle: "Rolling hills era", year: "2001", maker: "Desktop OS", status: "coming-soon", art: "winxp",
    blurb: "Glossy blue taskbars over a green, green hill.", palette: { body: "#2b2f36", accent: "#2f6fd6", screen: "#5aa0e6" } },
  { id: "silicon-blackbook", name: "Silicon Blackbook", subtitle: "Black business laptop", year: "1992", maker: "Laptop", status: "coming-soon", art: "laptop-black",
    blurb: "A matte black slab with a little red pointing stick.", palette: { body: "#1c1d20", accent: "#d0342c", screen: "#20324a" } },
  { id: "silicon-gumdrop", name: "Silicon Gumdrop", subtitle: "Translucent gumdrop", year: "1998", maker: "All-in-one", status: "coming-soon", art: "gumdrop",
    blurb: "Candy-colored translucent plastic and a famously round mouse.", palette: { body: "#2aa3a8", accent: "#bfe8ea", screen: "#1d3a5c" } },
  { id: "silicon-clamshell", name: "Silicon Clamshell", subtitle: "Clamshell portable", year: "1999", maker: "Laptop", status: "coming-soon", art: "clamshell",
    blurb: "A rubbery clamshell with a carrying handle built in.", palette: { body: "#f08a24", accent: "#f3efe6", screen: "#2a4a7a" } },
  { id: "silicon-alloy", name: "Silicon Alloy", subtitle: "Metal pro laptop", year: "2001", maker: "Laptop", status: "coming-soon", art: "laptop-metal",
    blurb: "A thin sheet of brushed metal that made laptops feel premium.", palette: { body: "#b9bcc2", accent: "#7f8691", screen: "#34465f" } },
];

export function getMachine(id: string) {
  return MACHINES.find((m) => m.id === id);
}

/** Old exhibit slugs (pre-rename) → current slugs; kept only so old links and saved progress keep working. */
export const LEGACY_SLUGS: Record<string, string> = {
  "macintosh": "silicon-classic", "commodore-64": "silicon-64", "atari-800": "silicon-800", "ibm-pc": "silicon-pc", "amiga-500": "silicon-500",
  "windows-95": "silicon-95", "windows-xp": "silicon-meadow", "thinkpad": "silicon-blackbook", "imac-g3": "silicon-gumdrop", "ibook-g3": "silicon-clamshell", "powerbook-g4": "silicon-alloy",
};
