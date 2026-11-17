import type { Metadata } from "next";
import Link from "next/link";
import CopyButton from "@/components/CopyButton";
import CreateSchoolForm from "@/components/CreateSchoolForm";
import { requireAdmin } from "@/lib/auth";
import type { Status } from "@/lib/constants";
import { connectDB } from "@/lib/db";
import { cn } from "@/lib/utils";
import { School } from "@/models/School";
import { Submission } from "@/models/Submission";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Schools" };

type Tally = Record<Status, number>;

export default async function AdminHome() {
  await requireAdmin();
  await connectDB();

  const [schools, grouped] = await Promise.all([
    School.find().sort({ createdAt: -1 }).lean(),
    Submission.aggregate<{ _id: { school: unknown; status: Status }; n: number }>([
      { $group: { _id: { school: "$school", status: "$status" }, n: { $sum: 1 } } },
    ]),
  ]);

  const tallies = new Map<string, Tally>();
  for (const row of grouped) {
    const key = String(row._id.school);
    const tally = tallies.get(key) ?? { pending: 0, approved: 0, rejected: 0 };
    tally[row._id.status] = row.n;
    tallies.set(key, tally);
  }

  return (
    <div className="space-y-12">
      <section>
        <h1 className="font-serif text-3xl tracking-tight">Schools</h1>

        {schools.length === 0 ? (
          <p className="mt-3 max-w-prose leading-relaxed text-muted">
            No schools yet. Add one below to get a registration link you can send to parents.
          </p>
        ) : (
          <ul className="mt-6 divide-y divide-line rounded-xl border border-line bg-white">
            {schools.map((s) => {
              const id = String(s._id);
              const tally = tallies.get(id) ?? { pending: 0, approved: 0, rejected: 0 };
              return (
                <li
                  key={id}
                  className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/admin/schools/${id}`}
                      className="font-serif text-xl tracking-tight underline-offset-4 hover:underline"
                    >
                      {s.name}
                    </Link>
                    <p className="mt-1 text-sm text-muted">
                      {tally.pending} pending, {tally.approved} approved, {tally.rejected} rejected
                    </p>
                    <p className="mt-1 break-all text-sm text-muted">/apply/{s.slug}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "inline-block rounded-full px-2.5 py-0.5 text-sm font-medium",
                        s.isOpen ? "bg-emerald-100 text-emerald-900" : "bg-slate-200 text-slate-800",
                      )}
                    >
                      {s.isOpen ? "Accepting responses" : "Closed"}
                    </span>
                    <CopyButton path={`/apply/${s.slug}`} />
                    <Link href={`/admin/schools/${id}`} className="btn btn-brand btn-sm">
                      Open
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="font-serif text-2xl tracking-tight">Add a school</h2>
        <p className="mt-1 text-muted">Each school gets its own link, class list and colour.</p>
        <div className="mt-5 max-w-xl">
          <CreateSchoolForm />
        </div>
      </section>
    </div>
  );
}
