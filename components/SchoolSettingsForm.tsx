"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import ColorField from "@/components/ColorField";
import { TextAreaField, TextField } from "@/components/FormField";
import type { SchoolDTO } from "@/lib/serialize";

type Errors = Record<string, string>;

export default function SchoolSettingsForm({ school }: { school: SchoolDTO }) {
  const router = useRouter();
  const [name, setName] = useState(school.name);
  const [classesText, setClassesText] = useState(school.classes.join("\n"));
  const [welcomeMessage, setWelcomeMessage] = useState(school.welcomeMessage);
  const [brandColor, setBrandColor] = useState(school.brandColor);
  const [isOpen, setIsOpen] = useState(school.isOpen);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setErrors({});
    setFormError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/admin/schools/${school.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, classes: classesText, welcomeMessage, brandColor, isOpen }),
      });
      if (res.ok) {
        setSaved(true);
        router.refresh();
      } else {
        const data = (await res.json().catch(() => ({}))) as { errors?: Errors };
        if (data.errors) setErrors(data.errors);
        else setFormError("We couldn’t save your changes. Try again.");
      }
    } catch {
      setFormError("We couldn’t reach the server. Check your internet connection and try again.");
    }
    setBusy(false);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-xl space-y-5">
      <TextField
        id="settings-name"
        label="School name"
        value={name}
        onChange={setName}
        error={errors.name}
        autoComplete="off"
      />
      <TextAreaField
        id="settings-classes"
        label="Classes"
        hint="One per line. Changing this won’t affect forms parents have already sent."
        value={classesText}
        onChange={setClassesText}
        error={errors.classes}
        rows={8}
      />
      <ColorField
        id="settings-color"
        label="Brand colour"
        value={brandColor}
        onChange={setBrandColor}
        error={errors.brandColor}
      />
      <TextAreaField
        id="settings-welcome"
        label="Welcome message"
        optional
        value={welcomeMessage}
        onChange={setWelcomeMessage}
        error={errors.welcomeMessage}
        rows={3}
      />

      <div className="field">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={isOpen}
            onChange={(e) => setIsOpen(e.target.checked)}
            className="mt-1 h-5 w-5 flex-none"
            style={{ accentColor: "var(--brand)" }}
          />
          <span>
            <span className="field-label !mb-0">Accepting responses</span>
            <span className="field-hint !mb-0 block">
              Turn this off to close the form. Parents who open the link will see that it’s closed.
            </span>
          </span>
        </label>
      </div>

      {formError ? (
        <p role="alert" className="field-error">
          {formError}
        </p>
      ) : null}
      <div className="flex items-center gap-4">
        <button type="submit" className="btn btn-brand" disabled={busy}>
          {busy ? "Saving…" : "Save changes"}
        </button>
        {saved ? (
          <p role="status" className="font-medium text-emerald-800">
            Saved
          </p>
        ) : null}
      </div>
    </form>
  );
}
