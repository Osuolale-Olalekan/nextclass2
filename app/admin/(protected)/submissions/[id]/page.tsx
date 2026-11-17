import type { Metadata } from "next";
import { isValidObjectId } from "mongoose";
import Link from "next/link";
import { notFound } from "next/navigation";
import StatusBadge from "@/components/StatusBadge";
import SubmissionActions from "@/components/SubmissionActions";
import { requireAdmin } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { toSubmissionDTO } from "@/lib/serialize";
import { formatDateTime, formatDob, fullName } from "@/lib/utils";
import { School } from "@/models/School";
import { Submission } from "@/models/Submission";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Submission" };

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  if (children === null || children === undefined || children === "") return null;
  return (
    <>
      <dt className="text-muted">{label}</dt>
      <dd className="break-words">{children}</dd>
    </>
  );
}

export default async function SubmissionPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();

  const { id } = await params;
  if (!isValidObjectId(id)) notFound();

  await connectDB();
  const doc = await Submission.findById(id).lean();
  if (!doc) notFound();
  const sub = toSubmissionDTO(doc);

  const [school, earlier] = await Promise.all([
    School.findById(doc.school).select("name").lean(),
    sub.duplicateOf ? Submission.exists({ _id: sub.duplicateOf }) : Promise.resolve(null),
  ]);

  const primary = sub.guardians[0];

  return (
    <div className="space-y-10">
      <div>
        <Link
          href={`/admin/schools/${sub.schoolId}`}
          className="text-sm text-muted underline-offset-4 hover:underline"
        >
          Back to {school?.name ?? "submissions"}
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="font-serif text-3xl tracking-tight">{fullName(primary)}</h1>
          <StatusBadge status={sub.status} />
        </div>
        <p className="mt-1 text-muted">Submitted {formatDateTime(sub.createdAt)}</p>
      </div>

      {sub.duplicateOf ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950 sm:p-5">
          <p className="font-semibold">Possible duplicate</p>
          <p className="mt-1 leading-relaxed">
            {sub.duplicateReason ? `${sub.duplicateReason}. ` : ""}
            {earlier ? (
              <>
                Compare it with the{" "}
                <Link href={`/admin/submissions/${sub.duplicateOf}`} className="link font-medium">
                  earlier submission
                </Link>{" "}
                before approving.
              </>
            ) : (
              "The earlier submission has since been deleted."
            )}
          </p>
        </div>
      ) : null}

      <section>
        <h2 className="font-serif text-2xl tracking-tight">Parents and guardians</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {sub.guardians.map((g, i) => (
            <div key={i} className="rounded-xl border border-line bg-white p-5">
              <h3 className="mb-3 text-lg font-semibold">
                {fullName(g)} <span className="font-normal text-muted">({g.relationship})</span>
              </h3>
              <dl className="grid grid-cols-[7.5rem_1fr] gap-x-4 gap-y-2 text-sm">
                <Row label="Phone">
                  <a href={`tel:${g.phone}`} className="link">
                    {g.phone}
                  </a>
                </Row>
                <Row label="Other phone">
                  {g.altPhone ? (
                    <a href={`tel:${g.altPhone}`} className="link">
                      {g.altPhone}
                    </a>
                  ) : null}
                </Row>
                <Row label="Email">
                  {g.email ? (
                    <a href={`mailto:${g.email}`} className="link">
                      {g.email}
                    </a>
                  ) : null}
                </Row>
                <Row label="Occupation">{g.occupation}</Row>
                <Row label="Lives at">{g.residentialAddress}</Row>
              </dl>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-serif text-2xl tracking-tight">Student’s home address</h2>
        <p className="mt-3 whitespace-pre-line leading-relaxed">{sub.address}</p>
      </section>

      <section>
        <h2 className="font-serif text-2xl tracking-tight">Students</h2>
        <div className="mt-4 overflow-x-auto rounded-xl border border-line bg-white">
          <table className="w-full min-w-[52rem] text-left text-sm">
            <thead className="border-b border-line bg-slate-50 text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Gender</th>
                <th className="px-4 py-3 font-semibold">Date of birth</th>
                <th className="px-4 py-3 font-semibold">Class on admission</th>
                <th className="px-4 py-3 font-semibold">State and LGA of origin</th>
                <th className="px-4 py-3 font-semibold">Religion</th>
                <th className="px-4 py-3 font-semibold">Student’s email and phone</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {sub.children.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3 font-medium">{fullName(c)}</td>
                  <td className="px-4 py-3">{c.gender}</td>
                  <td className="whitespace-nowrap px-4 py-3">{formatDob(c.dateOfBirth)}</td>
                  <td className="px-4 py-3">{c.className}</td>
                  <td className="px-4 py-3">
                    {c.stateOfOrigin}, {c.lga}
                  </td>
                  <td className="px-4 py-3">{c.religion}</td>
                  <td className="px-4 py-3">
                    {c.email || c.phone ? (
                      <>
                        {c.email ? <div className="break-all">{c.email}</div> : null}
                        {c.phone ? <div>{c.phone}</div> : null}
                      </>
                    ) : (
                      "Not given"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="font-serif text-2xl tracking-tight">Review</h2>
        <div className="mt-4">
          <SubmissionActions id={sub.id} schoolId={sub.schoolId} status={sub.status} adminNote={sub.adminNote} />
        </div>
      </section>

      <p className="text-sm text-muted">Consent given {formatDateTime(sub.consentAt)}.</p>
    </div>
  );
}
