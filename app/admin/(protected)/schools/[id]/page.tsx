import type { Metadata } from "next";
import { isValidObjectId } from "mongoose";
import Link from "next/link";
import { notFound } from "next/navigation";
import CopyButton from "@/components/CopyButton";
import ExportPanel from "@/components/ExportPanel";
import SchoolSettingsForm from "@/components/SchoolSettingsForm";
import SubmissionTable, { type SubmissionRow } from "@/components/SubmissionTable";
import { requireAdmin } from "@/lib/auth";
import { PAGE_SIZE, STATUSES, type Status } from "@/lib/constants";
import { connectDB } from "@/lib/db";
import { toSchoolDTO, toSubmissionDTO } from "@/lib/serialize";
import { cn } from "@/lib/utils";
import { normalizePhone } from "@/lib/validation";
import { School } from "@/models/School";
import { Submission } from "@/models/Submission";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Submissions" };

type SearchParams = Record<string, string | string[] | undefined>;

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const first = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");

export default async function SchoolPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  await requireAdmin();

  const { id } = await params;
  if (!isValidObjectId(id)) notFound();

  const sp = await searchParams;
  const view = first(sp.status);
  const q = first(sp.q).trim().slice(0, 80);
  const page = Math.max(1, Number.parseInt(first(sp.page) || "1", 10) || 1);

  await connectDB();
  const schoolDoc = await School.findById(id).lean();
  if (!schoolDoc) notFound();
  const school = toSchoolDTO(schoolDoc);

  const filter: Record<string, unknown> = { school: schoolDoc._id };
  if ((STATUSES as readonly string[]).includes(view)) filter.status = view;
  else if (view === "flagged") filter.duplicateOf = { $exists: true };

  if (q) {
    const rx = new RegExp(escapeRegex(q), "i");
    const or: Record<string, unknown>[] = [
      { "guardians.firstName": rx },
      { "guardians.lastName": rx },
      { "guardians.email": rx },
      { "children.firstName": rx },
      { "children.lastName": rx },
    ];
    const exactPhone = normalizePhone(q);
    if (exactPhone) or.push({ "guardians.phone": exactPhone });
    const digits = q.replace(/\D/g, "").replace(/^0/, "");
    if (digits.length >= 4) or.push({ "guardians.phone": new RegExp(escapeRegex(digits)) });
    filter.$or = or;
  }

  const [docs, total, grouped, flagged] = await Promise.all([
    Submission.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .lean(),
    Submission.countDocuments(filter),
    Submission.aggregate<{ _id: Status; n: number }>([
      { $match: { school: schoolDoc._id } },
      { $group: { _id: "$status", n: { $sum: 1 } } },
    ]),
    Submission.countDocuments({ school: schoolDoc._id, duplicateOf: { $exists: true } }),
  ]);

  const counts = { pending: 0, approved: 0, rejected: 0, all: 0 };
  for (const row of grouped) {
    counts[row._id] = row.n;
    counts.all += row.n;
  }

  const rows: SubmissionRow[] = docs.map(toSubmissionDTO).map((s) => {
    const [g1, g2] = s.guardians;
    return {
      id: s.id,
      parent: `${g1.firstName} ${g1.lastName}`,
      phone: g1.phone,
      otherGuardian: g2 ? `${g2.firstName} ${g2.lastName}` : null,
      children: s.children.map((c) => `${c.firstName} ${c.lastName}, ${c.className}`),
      submittedAt: s.createdAt,
      status: s.status,
      flagged: s.duplicateOf !== null,
    };
  });

  const base = `/admin/schools/${school.id}`;
  const href = (query: Record<string, string | undefined>) => {
    const search = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) if (v) search.set(k, v);
    const qs = search.toString();
    return qs ? `${base}?${qs}` : base;
  };

  const tabs = [
    { key: "all", label: "All", n: counts.all },
    { key: "pending", label: "Pending", n: counts.pending },
    { key: "approved", label: "Approved", n: counts.approved },
    { key: "rejected", label: "Rejected", n: counts.rejected },
    { key: "flagged", label: "Possible duplicates", n: flagged },
  ];
  const activeTab = tabs.some((t) => t.key === view) ? view : "all";

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);
  const pageQuery = { status: activeTab === "all" ? undefined : activeTab, q: q || undefined };

  return (
    <div className="space-y-10">
      <div>
        <Link href="/admin" className="text-sm text-muted underline-offset-4 hover:underline">
          All schools
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="font-serif text-3xl tracking-tight">{school.name}</h1>
          <span
            className={cn(
              "inline-block rounded-full px-2.5 py-0.5 text-sm font-medium",
              school.isOpen ? "bg-emerald-100 text-emerald-900" : "bg-slate-200 text-slate-800",
            )}
          >
            {school.isOpen ? "Accepting responses" : "Closed"}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <code className="rounded-md border border-line bg-white px-2 py-1 text-sm">/apply/{school.slug}</code>
          <CopyButton path={`/apply/${school.slug}`} />
          <Link href={`/apply/${school.slug}`} target="_blank" className="btn btn-quiet btn-sm">
            Preview form
          </Link>
        </div>
      </div>

      <ExportPanel schoolId={school.id} counts={counts} />

      <section>
        <h2 className="font-serif text-2xl tracking-tight">Submissions</h2>

        <nav aria-label="Filter submissions" className="mt-4 flex flex-wrap gap-x-6 gap-y-1 border-b border-line">
          {tabs.map((t) => (
            <Link
              key={t.key}
              href={href({ status: t.key === "all" ? undefined : t.key, q: q || undefined })}
              aria-current={t.key === activeTab ? "page" : undefined}
              className={cn(
                "-mb-px border-b-2 py-2 text-sm",
                t.key === activeTab
                  ? "border-ink font-semibold"
                  : "border-transparent text-muted hover:text-ink",
              )}
            >
              {t.label} ({t.n})
            </Link>
          ))}
        </nav>

        <form method="get" action={base} className="mt-4 flex max-w-lg gap-2" role="search">
          {activeTab !== "all" ? <input type="hidden" name="status" value={activeTab} /> : null}
          <label htmlFor="search" className="sr-only">
            Search by parent, child, phone or email
          </label>
          <input
            id="search"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Search by name, phone or email"
            className="input"
          />
          <button type="submit" className="btn btn-quiet">
            Search
          </button>
          {q ? (
            <Link href={href({ status: pageQuery.status })} className="btn btn-quiet">
              Clear
            </Link>
          ) : null}
        </form>

        <div className="mt-5">
          {rows.length === 0 ? (
            <div className="rounded-xl border border-line bg-white p-6 text-muted sm:p-8">
              {counts.all === 0
                ? "No one has submitted the form yet. Copy the link above and send it to parents."
                : "No submissions match this view."}
            </div>
          ) : (
            <SubmissionTable rows={rows} />
          )}
        </div>

        {total > PAGE_SIZE ? (
          <div className="mt-4 flex items-center justify-between gap-3 text-sm">
            <p className="text-muted">
              Showing {from} to {to} of {total}
            </p>
            <div className="flex gap-2">
              {page > 1 ? (
                <Link href={href({ ...pageQuery, page: String(page - 1) })} className="btn btn-quiet btn-sm">
                  Previous
                </Link>
              ) : null}
              {page < pages ? (
                <Link href={href({ ...pageQuery, page: String(page + 1) })} className="btn btn-quiet btn-sm">
                  Next
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>

      <details className="rounded-xl border border-line bg-white">
        <summary className="cursor-pointer px-5 py-4 font-serif text-xl tracking-tight sm:px-6">
          Form settings
        </summary>
        <div className="border-t border-line px-5 py-6 sm:px-6">
          <SchoolSettingsForm school={school} />
        </div>
      </details>
    </div>
  );
}
