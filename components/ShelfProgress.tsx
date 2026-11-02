"use client";
import { useEffect, useState } from "react";
import { readFound } from "@/lib/secrets/SecretsProvider";
import { CLASSIC_SECRETS } from "@/lib/secrets/classic";
import { S500_SECRETS } from "@/lib/secrets/s500";
import { C64_SECRETS } from "@/lib/secrets/c64";
import { S800_SECRETS } from "@/lib/secrets/s800";
import { PC_SECRETS } from "@/lib/secrets/spc";
import { W95_SECRETS } from "@/lib/secrets/win95";

const CATALOGS: Record<string, number> = Object.fromEntries([CLASSIC_SECRETS, S500_SECRETS, C64_SECRETS, S800_SECRETS, PC_SECRETS, W95_SECRETS].map((c) => [c.machineId, c.secrets.length]));

export function ShelfProgress({ machineId }: { machineId: string }) {
  const [n, setN] = useState<number | null>(null);
  useEffect(() => { setN(Object.keys(readFound(machineId)).length); }, [machineId]);
  if (n === null) return null;
  return <span className="badge badge-brass">★ {n}/{CATALOGS[machineId] ?? "?"} secrets</span>;
}
