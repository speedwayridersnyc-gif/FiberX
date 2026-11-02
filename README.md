# Silicon Hall — A Museum of Retro Computers (prototype)

Next.js 15 (App Router) + React 19 + TypeScript. No external services, no ads, original art and software only. Machine names are used descriptively; see the disclaimer in the site footer.

- `/` museum shelf (11 machines named after the real computers they recreate; six playable). Exhibit ids stay `silicon-*`; `LEGACY_SLUGS` keeps old links working.
- `/machine/macintosh` 1-bit compact Mac: Finder-like desktop, Terminal, Paint, Minefield, floppy, Palace Escape
- `/machine/amiga-500` Benchtop (Workbench-style) desktop, Shell, Checker Ball demo, Pixel Parade paint, Brickwork, boot-ROM disk prompt
- `/play/palace-escape` standalone cinematic platformer (colour or 1-bit)

Secrets: `lib/secrets/*` — data-driven catalogs (`SecretDef { id, title, hint, implemented }`) per machine,
`SecretsProvider` handles unlock/toasts/localStorage (`silicon-hall:secrets:<machineId>`). New machines add a catalog + call `unlock(id)`.
Input: `lib/keybus.ts` — physical keyboard (`KeyBridge`), on-screen keyboard and touch pad all emit the same events.

```
npm install && npm run build && npm start   # http://localhost:3000
```
