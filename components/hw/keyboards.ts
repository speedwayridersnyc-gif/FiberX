/** Era-inspired keyboard layouts. Each key: [label, busKey, widthUnits, kind]. kind: "" normal, "m" modifier/dark, "a" accent, "s" spacer */
export type KeyDef = [string, string, number?, string?];
export type Row = KeyDef[];
export interface Cluster { rows: Row[]; width: number }
export interface KeyboardLayout { id: string; clusters: Cluster[]; caps: "beige" | "c64" | "s800" | "modelm" | "s500" | "classic" }

const letters = (s: string): KeyDef[] => s.split("").map((c) => [c.toUpperCase(), c]);
const sp = (w: number): KeyDef => ["", "", w, "s"];
const arrowsT: Row[] = [[sp(1), ["↑", "ArrowUp"], sp(1)], [["←", "ArrowLeft"], ["↓", "ArrowDown"], ["→", "ArrowRight"]]];

export const LAYOUTS: Record<string, KeyboardLayout> = {
  classic: {
    id: "classic", caps: "classic", clusters: [
      { width: 13.5, rows: [
        [["`", "`"], ...letters("1234567890"), ["-", "-"], ["=", "="], ["⌫", "Backspace", 1.5, "m"]],
        [["Tab", "Tab", 1.5, "m"], ...letters("qwertyuiop"), ["[", "["], ["]", "]"], ["\\", "\\"]],
        [["Caps", "CapsLock", 1.75, "m"], ...letters("asdfghjkl"), [";", ";"], ["'", "'"], ["Return", "Enter", 1.75, "m"]],
        [["Shift", "Shift", 2.25, "m"], ...letters("zxcvbnm"), [",", ","], [".", "."], ["/", "/"], ["Shift", "Shift", 2.25, "m"]],
        [["Option", "Alt", 1.5, "m"], ["⌘", "Meta", 1.5, "m"], [" ", " ", 7.5], ["Enter", "Enter", 1.5, "m"], ["Option", "Alt", 1.5, "m"]],
      ] },
      { width: 4.2, rows: [
        [["Clear", "Escape", 1, "m"], ["=", "="], ["/", "/"], ["*", "*"]],
        [["7", "7"], ["8", "8"], ["9", "9"], ["-", "-"]],
        [["4", "4"], ["5", "5"], ["6", "6"], ["+", "+"]],
        [["1", "1"], ["↑", "ArrowUp", 1, "m"], ["3", "3"], ["\"", "\""]],
        [["←", "ArrowLeft", 1, "m"], ["↓", "ArrowDown", 1, "m"], ["→", "ArrowRight", 1, "m"], ["$", "$"]],
      ] },
    ],
  },
  s500: {
    id: "s500", caps: "s500", clusters: [
      { width: 15, rows: [
        [["Esc", "Escape", 1.25, "m"], sp(0.5), ["F1", "F1", 1.25, "m"], ["F2", "F2", 1.25, "m"], ["F3", "F3", 1.25, "m"], ["F4", "F4", 1.25, "m"], ["F5", "F5", 1.25, "m"], sp(0.5), ["F6", "F6", 1.25, "m"], ["F7", "F7", 1.25, "m"], ["F8", "F8", 1.25, "m"], ["F9", "F9", 1.25, "m"], ["F10", "F10", 1.25, "m"]],
        [["`", "`"], ...letters("1234567890"), ["-", "-"], ["=", "="], ["\\", "\\"], ["⌫", "Backspace", 1, "m"]],
        [["Tab", "Tab", 1.5, "m"], ...letters("qwertyuiop"), ["[", "["], ["]", "]"], ["Return", "Enter", 1.5, "m"]],
        [["Ctrl", "Control", 1, "m"], ["Caps", "CapsLock", 1, "m"], ...letters("asdfghjkl"), [";", ";"], ["'", "'"], ["\"", "\""], ["Del", "Backspace", 1, "m"]],
        [["Shift", "Shift", 2.25, "m"], ...letters("zxcvbnm"), [",", ","], [".", "."], ["/", "/"], ["Shift", "Shift", 2.75, "m"]],
        [sp(1.5), ["Alt", "Alt", 1, "m"], ["◆", "Meta", 1.25, "m"], [" ", " ", 9], ["◆", "Meta", 1.25, "m"], ["Alt", "Alt", 1, "m"]],
      ] },
      { width: 3, rows: [[["Del", "Delete", 1.5, "m"], ["Help", "F1", 1.5, "m"]], [sp(3)], [sp(3)], [sp(3)], ...arrowsT] },
    ],
  },
  c64: {
    id: "c64", caps: "c64", clusters: [
      { width: 17, rows: [
        [["←", "Escape"], ...letters("1234567890"), ["+", "+"], ["-", "-"], ["£", "$"], ["CLR\nHOME", "Home", 1, "m"], ["INST\nDEL", "Backspace", 1, "m"]],
        [["CTRL", "Control", 1.5, "m"], ...letters("qwertyuiop"), ["@", "@"], ["*", "*"], ["↑", "^"], ["RESTORE", "Escape", 1.5, "m"]],
        [["RUN\nSTOP", "Escape", 1, "m"], ["SHIFT\nLOCK", "CapsLock", 1, "m"], ...letters("asdfghjkl"), [":", ":"], [";", ";"], ["=", "="], ["RETURN", "Enter", 2, "m"]],
        [["◆", "Meta", 1, "m"], ["SHIFT", "Shift", 1.5, "m"], ...letters("zxcvbnm"), [",", ","], [".", "."], ["/", "/"], ["SHIFT", "Shift", 1.5, "m"], ["CRSR\n⇕", "ArrowDown", 1, "m"], ["CRSR\n⇔", "ArrowRight", 1, "m"]],
        [sp(3), [" ", " ", 9], sp(5)],
      ] },
      { width: 1.6, rows: [[["f1", "F1", 1.6, "a"]], [["f3", "F3", 1.6, "a"]], [["f5", "F5", 1.6, "a"]], [["f7", "F7", 1.6, "a"]], [sp(1.6)]] },
    ],
  },
  s800: {
    id: "s800", caps: "s800", clusters: [
      { width: 15.5, rows: [
        [["Esc", "Escape", 1, "m"], ...letters("1234567890"), ["<", "<"], [">", ">"], ["Back\nS", "Backspace", 1.5, "m"], ["Break", "Escape", 1, "m"]],
        [["Tab", "Tab", 1.5, "m"], ...letters("qwertyuiop"), ["-", "-"], ["=", "="], ["Return", "Enter", 2, "m"]],
        [["Ctrl", "Control", 1.75, "m"], ...letters("asdfghjkl"), [";", ";"], ["+", "+"], ["*", "*"], ["Caps", "CapsLock", 1.75, "m"]],
        [["Shift", "Shift", 2.25, "m"], ...letters("zxcvbnm"), [",", ","], [".", "."], ["/", "/"], ["Shift", "Shift", 1.5, "m"], ["◆", "Meta", 1, "m"]],
        [sp(3.5), [" ", " ", 9], sp(3)],
      ] },
      { width: 2.2, rows: [[["START", "F2", 2.2, "a"]], [["SELECT", "F3", 2.2, "a"]], [["OPTION", "F4", 2.2, "a"]], [["RESET", "F5", 2.2, "a"]], [sp(2.2)]] },
    ],
  },
  modelm: {
    id: "modelm", caps: "modelm", clusters: [
      { width: 15, rows: [
        [["Esc", "Escape", 1, "m"], sp(1), ["F1", "F1", 1, "m"], ["F2", "F2", 1, "m"], ["F3", "F3", 1, "m"], ["F4", "F4", 1, "m"], sp(0.5), ["F5", "F5", 1, "m"], ["F6", "F6", 1, "m"], ["F7", "F7", 1, "m"], ["F8", "F8", 1, "m"], sp(0.5), ["F9", "F9", 1, "m"], ["F10", "F10", 1, "m"], ["F11", "F11", 1, "m"], ["F12", "F12", 1, "m"]],
        [["`", "`"], ...letters("1234567890"), ["-", "-"], ["=", "="], ["⌫", "Backspace", 2, "m"]],
        [["Tab", "Tab", 1.5, "m"], ...letters("qwertyuiop"), ["[", "["], ["]", "]"], ["\\", "\\", 1.5]],
        [["Caps", "CapsLock", 1.75, "m"], ...letters("asdfghjkl"), [";", ";"], ["'", "'"], ["Enter", "Enter", 2.25, "m"]],
        [["Shift", "Shift", 2.25, "m"], ...letters("zxcvbnm"), [",", ","], [".", "."], ["/", "/"], ["Shift", "Shift", 2.75, "m"]],
        [["Ctrl", "Control", 1.5, "m"], sp(1), ["Alt", "Alt", 1.5, "m"], [" ", " ", 7], ["Alt", "Alt", 1.5, "m"], sp(1), ["Ctrl", "Control", 1.5, "m"]],
      ] },
      { width: 3, rows: [[["Prt", "PrintScreen", 1, "m"], ["Scr", "ScrollLock", 1, "m"], ["Pse", "Pause", 1, "m"]], [["Ins", "Insert", 1, "m"], ["Hm", "Home", 1, "m"], ["PU", "PageUp", 1, "m"]], [["Del", "Delete", 1, "m"], ["End", "End", 1, "m"], ["PD", "PageDown", 1, "m"]], [sp(3)], ...arrowsT] },
      { width: 4, rows: [[sp(4)], [["Num", "NumLock", 1, "m"], ["/", "/"], ["*", "*"], ["-", "-"]], [["7", "7"], ["8", "8"], ["9", "9"], ["+", "+"]], [["4", "4"], ["5", "5"], ["6", "6"], ["$", "$"]], [["1", "1"], ["2", "2"], ["3", "3"], ["\"", "\""]], [["0", "0", 2], [".", "."], [":", ":"]]] },
    ],
  },
};
LAYOUTS.win95 = { ...LAYOUTS.modelm, id: "win95", caps: "beige", clusters: [{ ...LAYOUTS.modelm.clusters[0], rows: [...LAYOUTS.modelm.clusters[0].rows.slice(0, 5), [["Ctrl", "Control", 1.25, "m"], ["▣", "Meta", 1.25, "m"], ["Alt", "Alt", 1.25, "m"], [" ", " ", 6.25], ["Alt", "Alt", 1.25, "m"], ["▣", "Meta", 1.25, "m"], ["☰", "ContextMenu", 1.25, "m"], ["Ctrl", "Control", 1.25, "m"]]] }, ...LAYOUTS.modelm.clusters.slice(1)] };
