import type { Metadata } from "next";
import Link from "next/link";
import { DataConsole } from "@/components/admin/data-console";
import { requireAdminPage } from "@/lib/auth/admin";

export const metadata: Metadata = { title: "Admin · Data console" };
export const dynamic = "force-dynamic";

export default async function DataConsolePage() {
  await requireAdminPage();
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6">
      <p className="pt-8 text-xs text-muted"><Link href="/admin" className="hover:text-wine">Admin</Link> / Data console</p>
      <h1 className="font-serif text-3xl font-bold text-ink">Data console</h1>
      <p className="mb-5 mt-1.5 text-sm text-ink-2">Create and update registry records with validated JSON. Requires DATABASE_URL.</p>
      <DataConsole />
    </div>
  );
}
