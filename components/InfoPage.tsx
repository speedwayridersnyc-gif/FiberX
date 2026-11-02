import Link from "next/link";
import { BackToHall } from "./BackToHall";
import { MuseumMark } from "./MuseumMark";
import { SITE } from "@/lib/site";

/** Shared frame for the privacy, terms and support pages. */
export function InfoPage({ title, kicker, updated, children }: { title: string; kicker: string; updated?: string; children: React.ReactNode }) {
  return (
    <main className="hall info-page">
      <BackToHall />
      <header className="info-head">
        <MuseumMark size={36} />
        <div>
          <div className="brand-kicker">{kicker}</div>
          <h1 className="info-title">{title}</h1>
          {updated && <div className="info-updated">Last updated {updated}</div>}
        </div>
      </header>
      <article className="info-body">{children}</article>
      <footer className="hall-footer info-foot">
        <nav className="hall-links" aria-label="Site">
          <Link href="/">Museum</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/support">Support</Link>
        </nav>
        <p>{SITE.name} is published by {SITE.publisher}. Questions: <a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a></p>
      </footer>
    </main>
  );
}
