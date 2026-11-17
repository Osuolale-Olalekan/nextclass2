import { isValidObjectId } from "mongoose";
import { NextResponse } from "next/server";
import { guardAdmin, readJsonObject } from "@/lib/admin-api";
import { schoolUpdateSchema } from "@/lib/admin-validation";
import { connectDB } from "@/lib/db";
import { parseClassList } from "@/lib/utils";
import { issuesToErrors } from "@/lib/validation";
import { School } from "@/models/School";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin();
  if (denied) return denied;

  const { id } = await params;
  if (!isValidObjectId(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await readJsonObject(req);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const input: Record<string, unknown> = { ...body };
  if (typeof input.classes === "string") input.classes = parseClassList(input.classes);

  const parsed = schoolUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return NextResponse.json({ errors: issuesToErrors(parsed.error.issues) }, { status: 422 });
  }
  if (Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  try {
    await connectDB();
    const updated = await School.findByIdAndUpdate(id, { $set: parsed.data }, { new: true }).lean();
    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Update school failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
