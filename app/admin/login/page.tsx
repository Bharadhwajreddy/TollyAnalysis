import type { Metadata } from "next";
import { AdminLogin } from "@/components/admin/admin-login";
import { serverEnv } from "@/lib/env";

export const metadata: Metadata = { title: "Admin sign in" };
// Reads ADMIN_TOKEN at request time, not build time.
export const dynamic = "force-dynamic";

export default function AdminLoginPage() {
  const configured = !!serverEnv().ADMIN_TOKEN;
  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="font-serif text-3xl font-bold text-ink">Editorial admin</h1>
      <p className="mt-1.5 text-sm text-ink-2">Sign in with the admin token configured on the server.</p>
      {configured ? (
        <AdminLogin />
      ) : (
        <p className="card mt-5 p-4 text-sm text-bad">ADMIN_TOKEN is not set. Add it to your environment (see README) to enable the admin area.</p>
      )}
    </div>
  );
}
