import Link from "next/link";
import { MuseumMark } from "./MuseumMark";

/** The way back to the museum's front page from any exhibit or game. Rendered as a real button so it can't be missed. */
export function BackToHall({ label = "Back to the Museum" }: { label?: string }) {
  return (
    <Link href="/" className="back-link" aria-label="Back to the museum front page">
      <span className="back-link-arrow" aria-hidden>←</span>
      <MuseumMark size={16} mono />
      <span className="back-link-text">{label}</span>
      <span className="back-link-short" aria-hidden>Museum</span>
    </Link>
  );
}
