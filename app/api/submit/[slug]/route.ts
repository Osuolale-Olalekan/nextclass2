import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { SLUG_RE } from "@/lib/utils";
import { childKey, issuesToErrors, submissionSchema } from "@/lib/validation";
import { School } from "@/models/School";
import { Submission } from "@/models/Submission";

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 64 * 1024;

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!SLUG_RE.test(slug)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Generous on purpose: many parents share one mobile-network or school Wi-Fi address.
  const limit = rateLimit(`submit:${clientIp(req)}`, 40, 60 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many submissions" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  // Honeypot: only bots fill the hidden field. Pretend it worked so they don't adapt.
  const trap = (body as { website?: unknown }).website;
  if (typeof trap === "string" && trap.trim() !== "") {
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  try {
    await connectDB();

    const school = await School.findOne({ slug }).lean();
    if (!school) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!school.isOpen) return NextResponse.json({ error: "closed" }, { status: 403 });

    const parsed = submissionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ errors: issuesToErrors(parsed.error.issues) }, { status: 422 });
    }
    const data = parsed.data;

    // Classes are chosen from a list the school controls, so reject anything else.
    const allowed = new Set(school.classes);
    const classErrors: Record<string, string> = {};
    data.children.forEach((c, i) => {
      if (!allowed.has(c.className)) classErrors[`children.${i}.className`] = "Select a class from the list";
    });
    if (Object.keys(classErrors).length > 0) {
      return NextResponse.json({ errors: classErrors }, { status: 422 });
    }

    const primary = data.guardians[0];
    const keys = data.children.map(childKey);

    // Flag possible duplicates for the admin to review. Never block or tell the parent:
    // a second parent may legitimately submit, and telling strangers "this number is
    // already registered" would leak who is on file.
    const matchers: Record<string, unknown>[] = [
      { primaryPhone: primary.phone },
      { childKeys: { $in: keys } },
    ];
    if (primary.email) matchers.push({ primaryEmail: primary.email });

    const earlier = await Submission.findOne({ school: school._id, $or: matchers })
      .sort({ createdAt: 1 })
      .select("primaryPhone primaryEmail childKeys")
      .lean();

    let duplicateOf: typeof school._id | undefined;
    let duplicateReason: string | undefined;
    if (earlier) {
      const reasons: string[] = [];
      if (earlier.primaryPhone === primary.phone) reasons.push("same phone number");
      if (primary.email && earlier.primaryEmail === primary.email) reasons.push("same email address");
      if (earlier.childKeys.some((k) => keys.includes(k))) reasons.push("same child (name and date of birth)");
      duplicateOf = earlier._id;
      duplicateReason = reasons.join(", ").replace(/^./, (ch) => ch.toUpperCase());
    }

    await Submission.create({
      school: school._id,
      guardians: data.guardians,
      address: data.address,
      children: data.children,
      childKeys: keys,
      primaryPhone: primary.phone,
      primaryEmail: primary.email,
      consentAt: new Date(),
      duplicateOf,
      duplicateReason,
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    // Log the failure without the submitted personal details.
    console.error("Submission failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
