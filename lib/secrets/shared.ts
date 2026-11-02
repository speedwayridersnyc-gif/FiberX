import type { MachineSecretCatalog, SecretDef } from "./types";
export const s = (id: string, title: string, hint: string, category: string, implemented = true): SecretDef => ({ id, title, hint, category, implemented });

/** Secrets for the cross-machine games; every machine catalog includes these so they count everywhere. */
export const GAME_SECRETS: SecretDef[] = [
  s("pe-level1", "Out of the Dungeon", "Escape the first level of Palace Escape.", "Palace Escape"),
  s("pe-escape", "Palace Escapee", "Escape all three levels of Palace Escape.", "Palace Escape"),
  s("pe-swift", "Swift as Sand", "Escape the palace with at least 2:30 left on the hourglass.", "Palace Escape"),
  s("pe-parry", "Wall of Steel", "Parry five guard strikes in a single run.", "Palace Escape"),
  s("jr-treasure", "Finders Keepers", "Pick up your first treasure in Jungle Run.", "Jungle Run"),
  s("jr-all", "Treasure Hunter", "Collect every treasure in Jungle Run.", "Jungle Run"),
  s("jr-vine", "Swinger", "Swing on five vines in Jungle Run.", "Jungle Run"),
  s("jr-croc", "Croc Hopper", "Cross a crocodile pond on their heads.", "Jungle Run"),
  s("pd-rally", "Long Rally", "Keep a Paddle rally going for 20 hits.", "Paddle"),
  s("pd-hard", "Giant Killer", "Beat the Hard CPU at Paddle, first to 11.", "Paddle"),
];
export const KONAMI_SECRET = s("konami", "Old Habits", "Up, up, down, down… on either keyboard.", "System");

const GENERIC_FUTURE: [string, string, string][] = [
  ["uptime", "Night at the Museum", "Leave the machine running for a full hour."],
  ["dual-screen", "Two Halves", "Finish a game in tabletop mode."],
  ["collector", "Curator Emeritus", "Discover every other secret on this machine."],
  ["clock-year", "Time Traveller", "Set the clock back to the year this machine was born."],
  ["caps", "INDOOR VOICE", "Type a whole command in capitals… on a machine that has lowercase."],
  ["mash", "Cat on the Keys", "Press ten different keys within one second."],
  ["long-name", "Verbose", "Type a 60-character command."],
  ["jr-speed", "Jungle Sprinter", "Finish Jungle Run with two minutes left.", ],
  ["jr-nolog", "Light Feet", "Finish Jungle Run without touching a log."],
  ["jr-lives", "Nine Lives", "Finish Jungle Run without losing a life."],
  ["pe-pacifist", "Silent Blade", "Finish a Palace Escape level without defeating a guard."],
  ["pe-nohit", "Untouched", "Finish Palace Escape without losing a life flask."],
  ["pe-loose", "Floor Plan", "Drop ten loose floor tiles in one run."],
  ["hidden-file", "Behind the Shelf", "Find the file that isn't listed anywhere."],
  ["easter-credits", "Roll Credits", "Find the hidden credits screen."],
  ["sound-test", "Sound Check", "Make the machine play every sound it knows."],
  ["brightness", "Lights Out", "Turn the screen brightness all the way down."],
  ["degauss", "Wobble", "Degauss the monitor."],
  ["typewriter", "Typewriter", "Type 500 characters in one session."],
  ["night-owl", "Night Owl", "Play this machine after midnight."],
  ["early-bird", "Early Bird", "Play this machine before 6 a.m."],
  ["visitor-100", "Regular Visitor", "Visit this exhibit on ten different days."],
  ["share", "Docent", "Show this exhibit to a friend in tabletop mode."],
  ["power-flick", "Flicker", "Toggle the power five times in ten seconds."],
  ["boot-skip", "Impatient", "Press a key during the boot sequence."],
  ["guestbook", "Guestbook", "Leave your name somewhere on the machine."],
  ["cheat", "Cheater", "Find a cheat code in one of the games."],
  ["crash", "Blue Moment", "Crash the machine in an unusual way."],
  ["marathon", "Marathon", "Play games on this machine for 30 minutes."],
  ["all-games", "Arcade Tour", "Play every game available on this machine."],
  ["glitch", "Glitch Art", "Make the screen glitch."],
  ["mirror", "Mirror World", "See the screen in reverse."],
  ["secret-sound", "Startup Tune", "Hear the hidden startup tune."],
  ["blank", "Zen", "Do nothing at the prompt for five minutes."],
  ["help-all", "RTFM", "Read every help page."],
];

export function makeCatalog(machineId: string, implemented: SecretDef[], future: SecretDef[] = []): MachineSecretCatalog {
  const seen = new Set<string>();
  const list: SecretDef[] = [];
  for (const d of [...implemented, ...GAME_SECRETS, KONAMI_SECRET]) if (!seen.has(d.id)) { seen.add(d.id); list.push(d); }
  for (const d of future) if (!seen.has(d.id) && list.length < 50) { seen.add(d.id); list.push({ ...d, implemented: false }); }
  for (const [id, title, hint] of GENERIC_FUTURE) { if (list.length >= 50) break; const fid = `${machineId}-${id}`; if (!seen.has(id) && !seen.has(fid)) { seen.add(fid); list.push(s(fid, title, hint, "Future", false)); } }
  return { machineId, secrets: list.slice(0, 50) };
}
