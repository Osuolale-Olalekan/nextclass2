"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import ColorField from "@/components/ColorField";
import { TextAreaField, TextField } from "@/components/FormField";
import { DEFAULT_BRAND_COLOR, DEFAULT_CLASSES } from "@/lib/constants";
import { slugify } from "@/lib/utils";

type Errors = Record<string, string>;

export default function CreateSchoolForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [classesText, setClassesText] = useState(DEFAULT_CLASSES.join("\n"));
  const [brandColor, setBrandColor] = useState(DEFAULT_BRAND_COLOR);
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function onNameChange(value: string) {
    setName(value);
    if (!slugEdited) setSlug(slugify(value));
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setErrors({});
    setFormError(null);
    try {
      const res = await fetch("/api/admin/schools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug, classes: classesText, brandColor, welcomeMessage }),
      });
      const data = (await res.json().catch(() => ({}))) as { id?: string; errors?: Errors };
      if (res.ok && data.id) {
        router.push(`/admin/schools/${data.id}`);
        return;
      }
      if (data.errors) setErrors(data.errors);
      else setFormError("We couldn’t create the school. Try again.");
    } catch {
      setFormError("We couldn’t reach the server. Check your internet connection and try again.");
    }
    setBusy(false);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5 rounded-xl border border-line bg-white p-5 sm:p-6">
      <TextField
        id="school-name"
        label="School name"
        value={name}
        onChange={onNameChange}
        error={errors.name}
        autoComplete="off"
      />
      <TextField
        id="school-slug"
        label="Link name"
        hint={`The form link will end in /apply/${slug || "link-name"}. You can’t change this after parents have the link.`}
        value={slug}
        onChange={(v) => {
          setSlugEdited(true);
          setSlug(v.toLowerCase());
        }}
        error={errors.slug}
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
      />
      <TextAreaField
        id="school-classes"
        label="Classes"
        hint="One per line. Parents choose from this list, so list every class, or class and arm, you need."
        value={classesText}
        onChange={setClassesText}
        error={errors.classes}
        rows={8}
      />
      <ColorField
        id="school-color"
        label="Brand colour"
        hint="Used for the header and buttons on the parent form."
        value={brandColor}
        onChange={setBrandColor}
        error={errors.brandColor}
      />
      <TextAreaField
        id="school-welcome"
        label="Welcome message"
        optional
        hint="Shown under the school name at the top of the form."
        value={welcomeMessage}
        onChange={setWelcomeMessage}
        error={errors.welcomeMessage}
        rows={3}
      />
      {formError ? (
        <p role="alert" className="field-error">
          {formError}
        </p>
      ) : null}
      <button type="submit" className="btn btn-brand" disabled={busy}>
        {busy ? "Creating…" : "Create school"}
      </button>
    </form>
  );
}
