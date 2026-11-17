import { isValidObjectId } from "mongoose";
import { NextResponse } from "next/server";
import { guardAdmin } from "@/lib/admin-api";
import { STATUSES } from "@/lib/constants";
import { connectDB } from "@/lib/db";
import { buildGuardiansCsv, buildJson, buildStudentsCsv } from "@/lib/export";
import { toSchoolDTO, toSubmissionDTO } from "@/lib/serialize";
import { School } from "@/models/School";
import { Submission } from "@/models/Submission";

export const dynamic = "force-dynamic";

const FORMATS = ["json", "students", "guardians"] as const;
const SCOPES = [...STATUSES, "all"] as const;

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin();
  if (denied) return denied;

  const { id } = await params;
  if (!isValidObjectId(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const url = new URL(req.url);
  const format = url.searchParams.get("format") ?? "json";
  const scope = url.searchParams.get("status") ?? "approved";
  if (!(FORMATS as readonly string[]).includes(format) || !(SCOPES as readonly string[]).includes(scope)) {
    return NextResponse.json({ error: "Invalid format or status" }, { status: 400 });
  }

  try {
    await connectDB();
    const schoolDoc = await School.findById(id).lean();
    if (!schoolDoc) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const filter: Record<string, unknown> = { school: schoolDoc._id };
    if (scope !== "all") filter.status = scope;

    const docs = await Submission.find(filter).sort({ createdAt: 1 }).lean();
    const school = toSchoolDTO(schoolDoc);
    const submissions = docs.map(toSubmissionDTO);

    const stamp = new Date().toISOString().slice(0, 10);
    const headers = (type: string, filename: string) => ({
      "Content-Type": type,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    });

    if (format === "json") {
      const body = JSON.stringify(buildJson(school, submissions), null, 2);
      return new Response(body, {
        headers: headers("application/json; charset=utf-8", `${school.slug}-families-${scope}-${stamp}.json`),
      });
    }

    if (format === "students") {
      return new Response(buildStudentsCsv(submissions), {
        headers: headers("text/csv; charset=utf-8", `${school.slug}-students-${scope}-${stamp}.csv`),
      });
    }

    return new Response(buildGuardiansCsv(submissions), {
      headers: headers("text/csv; charset=utf-8", `${school.slug}-parents-${scope}-${stamp}.csv`),
    });
  } catch (error) {
    console.error("Export failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
