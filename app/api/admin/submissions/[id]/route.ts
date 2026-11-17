import { isValidObjectId } from "mongoose";
import { NextResponse } from "next/server";
import { guardAdmin, readJsonObject } from "@/lib/admin-api";
import { submissionUpdateSchema } from "@/lib/admin-validation";
import { connectDB } from "@/lib/db";
import { issuesToErrors } from "@/lib/validation";
import { Submission } from "@/models/Submission";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin();
  if (denied) return denied;

  const { id } = await params;
  if (!isValidObjectId(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await readJsonObject(req);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const parsed = submissionUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ errors: issuesToErrors(parsed.error.issues) }, { status: 422 });
  }

  try {
    await connectDB();
    const updated = await Submission.findByIdAndUpdate(id, { $set: parsed.data }, { new: true })
      .select("_id")
      .lean();
    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Update submission failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin();
  if (denied) return denied;

  const { id } = await params;
  if (!isValidObjectId(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    await connectDB();
    const deleted = await Submission.findByIdAndDelete(id).select("_id").lean();
    if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delete submission failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
