"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
export function LegacyRedirect({ to }: { to: string }) {
  const router = useRouter();
  useEffect(() => { router.replace(to); }, [router, to]);
  return <main className="hall soon-page"><p>This exhibit has moved. <Link href={to}>Continue →</Link></p></main>;
}
