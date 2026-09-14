import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { MobileNav } from "@/components/dashboard/MobileNav";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // NOTE: with DATABASE_URL unset (demo mode) this will throw on the DB
  // lookup inside authorize(); once Postgres is connected this redirects
  // any signed-out visitor straight to /login.
  const session = await getServerSession(authOptions).catch(() => null);
  if (!session) redirect("/login");

  return (
    <div className="flex min-h-screen bg-clarity-100">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <MobileNav />
        {children}
      </div>
    </div>
  );
}
