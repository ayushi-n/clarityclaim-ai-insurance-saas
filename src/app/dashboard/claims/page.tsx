import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getClaimsForOrg } from "@/lib/queries";
import { mockClaims } from "@/lib/mock-data";
import { Topbar } from "@/components/dashboard/Topbar";
import { ClaimsFilterView } from "@/components/dashboard/ClaimsFilterView";

export const dynamic = "force-dynamic";

export default async function ClaimsPage() {
  const session = await getServerSession(authOptions).catch(() => null);
  let claims = mockClaims;
  let usingSampleData = true;

  if (session?.user?.organizationId) {
    try {
      const databaseClaims = await getClaimsForOrg(session.user.organizationId);
      claims = databaseClaims;
      usingSampleData = databaseClaims.length === 0;
    } catch {}
  }

  const rows = usingSampleData ? mockClaims : claims;

  return (
    <div className="flex-1">
      <Topbar title="Claims" subtitle={`${rows.length} claims across your workspace`} />
      <div className="p-6">
        <ClaimsFilterView claims={rows} usingSampleData={usingSampleData} />
      </div>
    </div>
  );
}
