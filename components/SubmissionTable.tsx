"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import StatusBadge from "@/components/StatusBadge";
import { STATUS_LABELS, type Status } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";

export type SubmissionRow = {
  id: string;
  parent: string;
  phone: string;
  otherGuardian: string | null;
  children: string[];
  submittedAt: string;
  status: Status;
  flagged: boolean;
};

export default function SubmissionTable({ rows }: { rows: SubmissionRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only act on rows that are on screen, even if the list changed after they were ticked.
  const ids = rows.filter((r) => selected.has(r.id)).map((r) => r.id);
  const allSelected = rows.length > 0 && ids.length === rows.length;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)));
  }

  async function apply(status: Status) {
    if (ids.length === 0 || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/submissions/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, status }),
      });
      if (!res.ok) throw new Error("bulk update failed");
      setSelected(new Set());
      router.refresh();
    } catch {
      setError("We couldn’t update those submissions. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {ids.length > 0 ? (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-white px-4 py-3">
          <p className="mr-2 font-medium">{ids.length} selected</p>
          <button type="button" className="btn btn-brand btn-sm" disabled={busy} onClick={() => apply("approved")}>
            Approve
          </button>
          <button type="button" className="btn btn-quiet btn-sm" disabled={busy} onClick={() => apply("rejected")}>
            Reject
          </button>
          <button type="button" className="btn btn-quiet btn-sm" disabled={busy} onClick={() => apply("pending")}>
            Move to {STATUS_LABELS.pending.toLowerCase()}
          </button>
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="field-error mb-3">
          {error}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full min-w-[44rem] text-left text-sm">
          <thead className="border-b border-line bg-slate-50 text-muted">
            <tr>
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  aria-label="Select all on this page"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="h-4 w-4"
                />
              </th>
              <th className="px-4 py-3 font-semibold">Parent or guardian</th>
              <th className="px-4 py-3 font-semibold">Children</th>
              <th className="px-4 py-3 font-semibold">Submitted</th>
              <th className="px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r.id} className={selected.has(r.id) ? "bg-slate-50" : undefined}>
                <td className="px-4 py-3 align-top">
                  <input
                    type="checkbox"
                    aria-label={`Select ${r.parent}`}
                    checked={selected.has(r.id)}
                    onChange={() => toggle(r.id)}
                    className="h-4 w-4"
                  />
                </td>
                <td className="px-4 py-3 align-top">
                  <Link
                    href={`/admin/submissions/${r.id}`}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {r.parent}
                  </Link>
                  <div className="text-muted">{r.phone}</div>
                  {r.otherGuardian ? <div className="text-muted">Also: {r.otherGuardian}</div> : null}
                </td>
                <td className="px-4 py-3 align-top">
                  <ul className="space-y-0.5">
                    {r.children.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </td>
                <td className="whitespace-nowrap px-4 py-3 align-top text-muted">
                  {formatDateTime(r.submittedAt)}
                </td>
                <td className="px-4 py-3 align-top">
                  <StatusBadge status={r.status} />
                  {r.flagged ? <div className="mt-1 font-medium text-amber-800">Possible duplicate</div> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
