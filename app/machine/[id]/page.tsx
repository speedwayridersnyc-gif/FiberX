import { BackToHall } from "@/components/BackToHall";
import { notFound } from "next/navigation";
import { MACHINES, getMachine, LEGACY_SLUGS } from "@/lib/machines";
import { LegacyRedirect } from "@/components/legacy/LegacyRedirect";
import { MachineArt } from "@/components/MachineArt";
import { ClassicExhibit } from "@/components/classic/ClassicExhibit";
import { S500Exhibit } from "@/components/s500/S500Exhibit";
import { C64Exhibit } from "@/components/machines/C64Exhibit";
import { S800Exhibit } from "@/components/machines/S800Exhibit";
import { PCExhibit } from "@/components/machines/PCExhibit";
import { W95Exhibit } from "@/components/win95/W95Exhibit";

export function generateStaticParams() { return [...MACHINES.map((m) => ({ id: m.id })), ...Object.keys(LEGACY_SLUGS).map((id) => ({ id }))]; }
export const dynamicParams = false;

export default async function MachinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (LEGACY_SLUGS[id]) return <LegacyRedirect to={`/machine/${LEGACY_SLUGS[id]}`} />;
  const m = getMachine(id);
  if (!m) notFound();
  if (m.id === "silicon-classic") return <ClassicExhibit />;
  if (m.id === "silicon-500") return <S500Exhibit />;
  if (m.id === "silicon-64") return <C64Exhibit />;
  if (m.id === "silicon-800") return <S800Exhibit />;
  if (m.id === "silicon-pc") return <PCExhibit />;
  if (m.id === "silicon-95") return <W95Exhibit />;
  return (
    <main className="hall soon-page">
      <BackToHall />
      <div className="soon-card">
        <div className="exhibit-stage big"><MachineArt m={m} /></div>
        <div className="plaque-year">{m.year} · {m.maker}</div>
        <h1 className="plaque-name">{m.name}</h1>
        <p className="plaque-blurb">{m.blurb}</p>
        <span className="badge badge-muted">Exhibit under restoration — coming soon</span>
      </div>
    </main>
  );
}
