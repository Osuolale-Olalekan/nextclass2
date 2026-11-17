"use client";

import { useState } from "react";
import { STATUS_LABELS, STATUSES, type Status } from "@/lib/constants";

type Scope = Status | "all";
type Counts = Record<Status, number> & { all: number };

export default function ExportPanel({ schoolId, counts }: { schoolId: string; counts: Counts }) {
  const [scope, setScope] = useState<Scope>("approved");
  const count = counts[scope];
  const base = `/api/admin/schools/${schoolId}/export?status=${scope}`;
  const empty = count === 0;

  const links = [
    { format: "json", label: "Download JSON", primary: true },
    { format: "students", label: "Students (CSV)", primary: false },
    { format: "guardians", label: "Parents (CSV)", primary: false },
  ];

  return (
    <section className="rounded-xl border border-line bg-white p-5 sm:p-6">
      <h2 className="font-serif text-2xl tracking-tight">Export for migration</h2>
      <p className="mt-1 max-w-prose leading-relaxed text-muted">
        JSON keeps each family together and is the best format for an import script. The two CSV
        files open in Excel: one row per child, and one row per parent, linked by familyId.
      </p>

      <div className="mt-5 max-w-xs">
        <label htmlFor="export-scope" className="field-label">
          Families to include
        </label>
        <select
          id="export-scope"
          className="input"
          value={scope}
          onChange={(e) => setScope(e.target.value as Scope)}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]} only ({counts[s]})
            </option>
          ))}
          <option value="all">Everything ({counts.all})</option>
        </select>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        {links.map((l) =>
          empty ? (
            <button key={l.format} type="button" className="btn btn-quiet" disabled>
              {l.label}
            </button>
          ) : (
            <a
              key={l.format}
              href={`${base}&format=${l.format}`}
              download
              className={l.primary ? "btn btn-brand" : "btn btn-quiet"}
            >
              {l.label}
            </a>
          ),
        )}
      </div>
      {empty ? <p className="mt-3 text-sm text-muted">There’s nothing to export for this selection yet.</p> : null}
    </section>
  );
}
