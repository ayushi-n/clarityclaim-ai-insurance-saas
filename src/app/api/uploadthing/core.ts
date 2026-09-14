import { createUploadthing, type FileRouter } from "uploadthing/next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

const f = createUploadthing();

export const ourFileRouter = {
  claimEvidence: f({
    pdf: { maxFileSize: "16MB", maxFileCount: 10 },
    image: { maxFileSize: "16MB", maxFileCount: 10 },
    audio: { maxFileSize: "32MB", maxFileCount: 5 },
    video: { maxFileSize: "64MB", maxFileCount: 3 },
  })
    .middleware(async ({ req }) => {
      const session = await getServerSession(authOptions);
      if (!session) throw new Error("Unauthorized");

      const claimId = req.headers.get("x-claim-id");
      if (!claimId) throw new Error("Missing claim id");

      const claim = await db.claim.findFirst({
        where: { id: claimId, organizationId: session.user.organizationId },
      });
      if (!claim) throw new Error("Claim not found in your organization");

      return { claimId: claim.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      const type = file.type.startsWith("image")
        ? "IMAGE"
        : file.type.startsWith("audio")
          ? "AUDIO"
          : file.type.startsWith("video")
            ? "VIDEO"
            : "DOCUMENT";

      await db.evidence.create({
        data: {
          claimId: metadata.claimId,
          type,
          fileName: file.name,
          fileUrl: file.url,
        },
      });

      return { claimId: metadata.claimId };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
