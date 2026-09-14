import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";

const schema = z.object({
  organizationName: z.string().min(2),
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
});

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
}

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Check the highlighted fields." }, { status: 400 });
  }
  const { organizationName, name, email, password } = parsed.data;

  const existing = await db.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) {
    return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const baseSlug = slugify(organizationName) || "workspace";
  let slug = baseSlug;
  let suffix = 1;
  while (await db.organization.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${suffix++}`;
  }

  const org = await db.organization.create({
    data: { name: organizationName, slug },
  });

  await db.user.create({
    data: {
      organizationId: org.id,
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: "ADMIN",
    },
  });

  return NextResponse.json({ ok: true });
}
