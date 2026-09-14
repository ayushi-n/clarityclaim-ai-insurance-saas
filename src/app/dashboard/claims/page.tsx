import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getClaimsForOrg } from "@/lib/queries";
import { mockClaims } from "@/lib/mock-data";
import { Topbar } from "@/components/dashboard/Topbar";
import { ClaimsFilterView } from "@/components/dashboard/ClaimsFilterView";

export default async function ClaimsPage() {
  const session = await getServerSession(authOptions);
  const claims = await getClaimsForOrg(session!.user.organizationId);
  const usingSampleData = claims.length === 0;
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
