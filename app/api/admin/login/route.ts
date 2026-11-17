import { NextResponse } from "next/server";
import { readJsonObject } from "@/lib/admin-api";
import { checkAdminPassword, startAdminSession } from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const limit = rateLimit(`login:${clientIp(req)}`, 8, 15 * 60 * 1000);
  if (!limit.ok) {
    const minutes = Math.max(1, Math.ceil(limit.retryAfter / 60));
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${minutes} ${minutes === 1 ? "minute" : "minutes"}.` },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  const body = await readJsonObject(req);
  const password = typeof body?.password === "string" ? body.password : "";

  try {
    if (!password || !checkAdminPassword(password)) {
      return NextResponse.json({ error: "That password isn’t right." }, { status: 401 });
    }
    await startAdminSession();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Admin login failed:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: "The server isn’t set up yet. Check that ADMIN_PASSWORD and AUTH_SECRET are set." },
      { status: 500 },
    );
  }
}
