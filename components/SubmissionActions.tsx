"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TextAreaField } from "@/components/FormField";
import { STATUS_LABELS, type Status } from "@/lib/constants";

type Props = {
  id: string;
  schoolId: string;
  status: Status;
  adminNote: string;
};

export default function SubmissionActions({ id, schoolId, status, adminNote }: Props) {
  const router = useRouter();
  const [note, setNote] = useState(adminNote);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function update(body: { status?: Status; adminNote?: string }, done: string) {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch(`/api/admin/submissions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("update failed");
      setMessage(done);
      router.refresh();
    } catch {
      setError("We couldn’t save that. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (busy) return;
    if (!window.confirm("Delete this submission? This can’t be undone.")) return;
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch(`/api/admin/submissions/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
      router.push(`/admin/schools/${schoolId}`);
      router.refresh();
    } catch {
      setError("We couldn’t delete this submission. Try again.");
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        {status !== "approved" ? (
          <button
            type="button"
            className="btn btn-brand"
            disabled={busy}
            onClick={() => update({ status: "approved" }, "Marked as approved")}
          >
            Approve
          </button>
        ) : null}
        {status !== "rejected" ? (
          <button
            type="button"
            className="btn btn-quiet"
            disabled={busy}
            onClick={() => update({ status: "rejected" }, "Marked as rejected")}
          >
            Reject
          </button>
        ) : null}
        {status !== "pending" ? (
          <button
            type="button"
            className="btn btn-quiet"
            disabled={busy}
            onClick={() => update({ status: "pending" }, "Moved back to pending")}
          >
            Move to {STATUS_LABELS.pending.toLowerCase()}
          </button>
        ) : null}
      </div>

      <div className="max-w-xl space-y-3">
        <TextAreaField
          id="admin-note"
          label="Note for staff"
          optional
          hint="Only staff can see this. It isn’t included in exports."
          value={note}
          onChange={setNote}
          rows={3}
          maxLength={1000}
        />
        <button
          type="button"
          className="btn btn-quiet"
          disabled={busy || note.trim() === adminNote.trim()}
          onClick={() => update({ adminNote: note }, "Note saved")}
        >
          Save note
        </button>
      </div>

      {message ? (
        <p role="status" className="font-medium text-emerald-800">
          {message}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="field-error">
          {error}
        </p>
      ) : null}

      <div className="border-t border-line pt-6">
        <button type="button" className="btn btn-danger" disabled={busy} onClick={remove}>
          Delete submission
        </button>
      </div>
    </div>
  );
}
