import { isValidObjectId } from "mongoose";
import { NextResponse } from "next/server";
import { guardAdmin, readJsonObject } from "@/lib/admin-api";
import { bulkStatusSchema } from "@/lib/admin-validation";
import { connectDB } from "@/lib/db";
import { Submission } from "@/models/Submission";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const denied = await guardAdmin();
  if (denied) return denied;

  const body = await readJsonObject(req);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const parsed = bulkStatusSchema.safeParse(body);
  if (!parsed.success || !parsed.data.ids.every((id) => isValidObjectId(id))) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    await connectDB();
    const result = await Submission.updateMany(
      { _id: { $in: parsed.data.ids } },
      { $set: { status: parsed.data.status } },
    );
    return NextResponse.json({ ok: true, updated: result.modifiedCount });
  } catch (error) {
    console.error("Bulk update failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
