import { NextResponse } from "next/server";
import { guardAdmin, isDuplicateKeyError, readJsonObject } from "@/lib/admin-api";
import { schoolCreateSchema } from "@/lib/admin-validation";
import { connectDB } from "@/lib/db";
import { parseClassList, slugify } from "@/lib/utils";
import { issuesToErrors } from "@/lib/validation";
import { School } from "@/models/School";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const denied = await guardAdmin();
  if (denied) return denied;

  const body = await readJsonObject(req);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const input: Record<string, unknown> = { ...body };
  if (typeof input.classes === "string") input.classes = parseClassList(input.classes);
  if (typeof input.slug !== "string" || input.slug.trim() === "") {
    input.slug = typeof input.name === "string" ? slugify(input.name) : "";
  }

  const parsed = schoolCreateSchema.safeParse(input);
  if (!parsed.success) {
    return NextResponse.json({ errors: issuesToErrors(parsed.error.issues) }, { status: 422 });
  }

  try {
    await connectDB();
    const school = await School.create(parsed.data);
    return NextResponse.json({ id: String(school._id), slug: school.slug }, { status: 201 });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return NextResponse.json(
        { errors: { slug: "Another school already uses this link name" } },
        { status: 409 },
      );
    }
    console.error("Create school failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
