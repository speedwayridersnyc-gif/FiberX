import Link from "next/link";
import { asset } from "@/lib/asset";
import { MACHINES } from "@/lib/machines";
import { MachineArt } from "@/components/MachineArt";
import { MuseumMark } from "@/components/MuseumMark";
import { ShelfProgress } from "@/components/ShelfProgress";

export default function Home() {
  const shelves = [MACHINES.slice(0, 4), MACHINES.slice(4, 7), MACHINES.slice(7)];
  return (
    <main className="hall">
      <header className="hall-header hall-hero">
        <img className="hall-hero-img" src={asset("/hero.webp")} alt="" aria-hidden width={1280} height={720} />
        <div className="brand">
          <MuseumMark size={44} />
          <div>
            <div className="brand-kicker">Silicon Hall</div>
            <h1 className="brand-title">A Museum of Retro Computers</h1>
          </div>
        </div>
        <p className="hall-lede">
          Eleven machines, one hall. Six are switched on and playable. Switch them on, poke around, and uncover the secrets each exhibit is hiding.
          No ads, no accounts — just old computers, lovingly re-imagined.
        </p>
      </header>

      {shelves.map((row, i) => (
        <section key={i} className="shelf" aria-label={`Shelf ${i + 1}`}>
          <div className="shelf-row">
            {row.map((m) => {
              const playable = m.status === "playable";
              const card = (
                <article className={`exhibit ${playable ? "is-playable" : "is-soon"}`}>
                  <div className="exhibit-stage"><MachineArt m={m} /></div>
                  <div className="exhibit-plaque">
                    <div className="plaque-year">{m.year} · {m.maker}</div>
                    <h2 className="plaque-name">{m.name}</h2>
                    <div className="plaque-sub">{m.subtitle}</div>
                    <p className="plaque-blurb">{m.blurb}</p>
                    <div className="plaque-foot">
                      {playable ? <span className="badge badge-jade">▶ Playable</span> : <span className="badge badge-muted">Coming soon</span>}
                      {playable && <ShelfProgress machineId={m.id} />}
                    </div>
                  </div>
                </article>
              );
              return playable ? (
                <Link key={m.id} href={`/machine/${m.id}`} className="exhibit-link" aria-label={`Open ${m.name}`}>{card}</Link>
              ) : (
                <div key={m.id} className="exhibit-link" aria-disabled="true">{card}</div>
              );
            })}
          </div>
          <div className="shelf-plank" />
        </section>
      ))}

      <section className="annex annex-grid">
        <div className="annex-card">
          <div className="annex-kicker">Software annex · on every machine</div>
          <h2>Palace Escape</h2>
          <p>An original cinematic platformer: run, leap, hang from ledges, dodge spikes and duel the palace guards before the hourglass runs dry. Launch it from any exhibit&apos;s disk, cartridge or C:\GAMES — or right here.</p>
          <Link className="btn btn-brass" href="/play/palace-escape">Play Palace Escape</Link>
        </div>
        <div className="annex-card">
          <div className="annex-kicker">Software annex · on every machine</div>
          <h2>Jungle Run</h2>
          <p>An original jungle adventure: swing on vines, jump rolling logs and tar pits, hop across crocodile heads and grab six treasures against the clock.</p>
          <Link className="btn btn-brass" href="/play/jungle-run">Play Jungle Run</Link>
        </div>
        <div className="annex-card">
          <div className="annex-kicker">Software annex · on every machine</div>
          <h2>Paddle</h2>
          <p>An original two-paddle tennis game with blip sounds: take on the CPU at three difficulties, or play a friend. On a dual-screen phone, each player drags on their own screen.</p>
          <Link className="btn btn-brass" href="/play/paddle">Play Paddle</Link>
        </div>
      </section>

      <footer className="hall-footer">
        <p>All artwork and software in Silicon Hall are original. Machine and product names are used only to identify the computers each exhibit recreates.</p>
        <p>Silicon Hall is not affiliated with, sponsored by or endorsed by Apple, Commodore, Atari, IBM, Lenovo or Microsoft. Macintosh, iMac, iBook, PowerBook, Commodore, Amiga, Atari, IBM, ThinkPad, Windows and all other product names are trademarks of their respective owners.</p>
      </footer>
    </main>
  );
}
