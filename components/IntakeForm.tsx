"use client";

import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { SelectField, TextAreaField, TextField } from "@/components/FormField";
import { GENDERS, MAX_CHILDREN, RELATIONSHIPS, RELIGIONS, STATES } from "@/lib/constants";
import { defaultLgaFor, lgasFor } from "@/lib/lgas";
import type { SchoolDTO } from "@/lib/serialize";
import { issuesToErrors, submissionSchema } from "@/lib/validation";

type Errors = Record<string, string>;

type GuardianForm = {
  relationship: string;
  lastName: string;
  firstName: string;
  middleName: string;
  phone: string;
  altPhone: string;
  email: string;
  occupation: string;
  residentialAddress: string;
};

type StudentForm = {
  key: number;
  lastName: string;
  firstName: string;
  middleName: string;
  gender: string;
  dateOfBirth: string;
  className: string;
  stateOfOrigin: string;
  lga: string;
  religion: string;
  email: string;
  phone: string;
};

const emptyGuardian = (): GuardianForm => ({
  relationship: "",
  lastName: "",
  firstName: "",
  middleName: "",
  phone: "",
  altPhone: "",
  email: "",
  occupation: "",
  residentialAddress: "",
});

const emptyStudent = (key: number): StudentForm => ({
  key,
  lastName: "",
  firstName: "",
  middleName: "",
  gender: "",
  dateOfBirth: "",
  className: "",
  stateOfOrigin: "",
  lga: "",
  religion: "",
  email: "",
  phone: "",
});

/** "children.0.firstName" -> "children-0-firstName" (the id of that field's input). */
const idFor = (path: string) => path.replace(/\./g, "-");

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-line py-8 first:border-t-0">
      <h2 className="font-serif text-2xl tracking-tight">{title}</h2>
      {description ? <p className="mt-1 leading-relaxed text-muted">{description}</p> : null}
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}

/** Focuses the invalid field that appears first on the page (not first in the validator's order). */
function focusFirstError(found: Errors) {
  const fields = Object.keys(found)
    .map((key) => document.getElementById(idFor(key)))
    .filter((el): el is HTMLElement => el !== null);
  if (fields.length === 0) return;
  fields.sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
  const el = fields[0];
  el.scrollIntoView({ block: "center", behavior: "smooth" });
  el.focus({ preventScroll: true });
}

export default function IntakeForm({ school }: { school: SchoolDTO }) {
  const router = useRouter();
  const nextKey = useRef(1);

  const [students, setStudents] = useState<StudentForm[]>([emptyStudent(0)]);
  const [address, setAddress] = useState("");
  const [guardians, setGuardians] = useState<GuardianForm[]>([emptyGuardian()]);
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState(""); // honeypot: real people never see or fill this
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function clearErrors(predicate: (key: string) => boolean) {
    setErrors((prev) => {
      const keys = Object.keys(prev).filter(predicate);
      if (keys.length === 0) return prev;
      const next = { ...prev };
      for (const k of keys) delete next[k];
      return next;
    });
  }

  function updateGuardian(index: number, field: keyof GuardianForm, value: string) {
    setGuardians((prev) => prev.map((g, i) => (i === index ? { ...g, [field]: value } : g)));
    clearErrors((k) => k === `guardians.${index}.${field}`);
  }

  function updateStudent(index: number, field: keyof Omit<StudentForm, "key">, value: string) {
    setStudents((prev) =>
      prev.map((s, i) => {
        if (i !== index) return s;
        const next = { ...s, [field]: value };
        // The LGA list depends on the state, so a previous LGA is no longer valid.
        if (field === "stateOfOrigin") next.lga = defaultLgaFor(value);
        return next;
      }),
    );
    clearErrors(
      (k) =>
        k === `children.${index}.${field}` ||
        (field === "stateOfOrigin" && k === `children.${index}.lga`),
    );
  }

  function addStudent() {
    setStudents((prev) => (prev.length >= MAX_CHILDREN ? prev : [...prev, emptyStudent(nextKey.current++)]));
  }

  function removeStudent(key: number) {
    setStudents((prev) => (prev.length > 1 ? prev.filter((s) => s.key !== key) : prev));
    // Removing a student shifts the positions the errors were recorded against.
    clearErrors((k) => k.startsWith("children"));
  }

  function addSecondGuardian() {
    setGuardians((prev) => (prev.length >= 2 ? prev : [...prev, emptyGuardian()]));
  }

  function removeSecondGuardian() {
    setGuardians((prev) => prev.slice(0, 1));
    clearErrors((k) => k.startsWith("guardians.1"));
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setFormError(null);

    const payload = {
      guardians,
      address,
      children: students.map(({ key: _key, ...rest }) => rest),
      consent,
    };

    const parsed = submissionSchema.safeParse(payload);
    if (!parsed.success) {
      const found = issuesToErrors(parsed.error.issues);
      setErrors(found);
      focusFirstError(found);
      return;
    }

    setErrors({});
    setSubmitting(true);
    let navigated = false;
    try {
      const res = await fetch(`/api/submit/${school.slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, website }),
      });

      if (res.ok) {
        navigated = true;
        router.push(`/apply/${school.slug}/thank-you`);
        return;
      }

      const data = (await res.json().catch(() => ({}))) as { errors?: Errors };
      if (res.status === 422 && data.errors) {
        setErrors(data.errors);
        focusFirstError(data.errors);
      } else if (res.status === 403) {
        setFormError("This form is no longer accepting responses. Please contact the school.");
      } else if (res.status === 429) {
        setFormError("Too many attempts. Please wait a few minutes and try again.");
      } else {
        setFormError("Something went wrong on our side. Please try again in a moment.");
      }
    } catch {
      setFormError("We couldn’t reach the server. Check your internet connection and try again.");
    } finally {
      if (!navigated) setSubmitting(false);
    }
  }

  function renderStudent(s: StudentForm, i: number) {
    const p = `children.${i}`;
    return (
      <div key={s.key} className="rounded-lg border border-line p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold">Student {i + 1}</h3>
          {students.length > 1 ? (
            <button type="button" className="btn btn-quiet btn-sm" onClick={() => removeStudent(s.key)}>
              Remove student
            </button>
          ) : null}
        </div>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              id={idFor(`${p}.lastName`)}
              label="Surname"
              value={s.lastName}
              onChange={(v) => updateStudent(i, "lastName", v)}
              error={errors[`${p}.lastName`]}
              autoComplete="off"
            />
            <TextField
              id={idFor(`${p}.firstName`)}
              label="First name"
              value={s.firstName}
              onChange={(v) => updateStudent(i, "firstName", v)}
              error={errors[`${p}.firstName`]}
              autoComplete="off"
            />
          </div>
          <TextField
            id={idFor(`${p}.middleName`)}
            label="Other name(s)"
            optional
            value={s.middleName}
            onChange={(v) => updateStudent(i, "middleName", v)}
            error={errors[`${p}.middleName`]}
            autoComplete="off"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              id={idFor(`${p}.gender`)}
              label="Gender"
              value={s.gender}
              onChange={(v) => updateStudent(i, "gender", v)}
              options={GENDERS}
              error={errors[`${p}.gender`]}
            />
            <TextField
              id={idFor(`${p}.dateOfBirth`)}
              label="Date of birth"
              value={s.dateOfBirth}
              onChange={(v) => updateStudent(i, "dateOfBirth", v)}
              error={errors[`${p}.dateOfBirth`]}
              type="date"
              autoComplete="off"
            />
          </div>
          <SelectField
            id={idFor(`${p}.className`)}
            label="Class on admission"
            value={s.className}
            onChange={(v) => updateStudent(i, "className", v)}
            options={school.classes}
            error={errors[`${p}.className`]}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              id={idFor(`${p}.stateOfOrigin`)}
              label="State of origin"
              value={s.stateOfOrigin}
              onChange={(v) => updateStudent(i, "stateOfOrigin", v)}
              options={STATES}
              error={errors[`${p}.stateOfOrigin`]}
            />
            <SelectField
              id={idFor(`${p}.lga`)}
              label="Local government area"
              hint={s.stateOfOrigin === "Outside Nigeria" ? "Doesn’t apply outside Nigeria." : undefined}
              placeholder={s.stateOfOrigin === "" ? "Select a state first" : "Select…"}
              value={s.lga}
              onChange={(v) => updateStudent(i, "lga", v)}
              options={lgasFor(s.stateOfOrigin)}
              disabled={s.stateOfOrigin === "" || s.stateOfOrigin === "Outside Nigeria"}
              error={errors[`${p}.lga`]}
            />
          </div>
          <SelectField
            id={idFor(`${p}.religion`)}
            label="Religion"
            value={s.religion}
            onChange={(v) => updateStudent(i, "religion", v)}
            options={RELIGIONS}
            error={errors[`${p}.religion`]}
          />
          <TextField
            id={idFor(`${p}.email`)}
            label="Student’s email address"
            optional
            value={s.email}
            onChange={(v) => updateStudent(i, "email", v)}
            error={errors[`${p}.email`]}
            type="email"
            inputMode="email"
            autoComplete="off"
          />
          <TextField
            id={idFor(`${p}.phone`)}
            label="Student’s phone number"
            optional
            value={s.phone}
            onChange={(v) => updateStudent(i, "phone", v)}
            error={errors[`${p}.phone`]}
            type="tel"
            inputMode="tel"
            autoComplete="off"
          />
        </div>
      </div>
    );
  }

  function renderGuardian(i: number) {
    const g = guardians[i];
    const p = `guardians.${i}`;
    const primary = i === 0;
    return (
      <div className="space-y-4">
        <SelectField
          id={idFor(`${p}.relationship`)}
          label="Relationship to student"
          value={g.relationship}
          onChange={(v) => updateGuardian(i, "relationship", v)}
          options={RELATIONSHIPS}
          error={errors[`${p}.relationship`]}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            id={idFor(`${p}.lastName`)}
            label="Surname"
            value={g.lastName}
            onChange={(v) => updateGuardian(i, "lastName", v)}
            error={errors[`${p}.lastName`]}
            autoComplete={primary ? "family-name" : "off"}
          />
          <TextField
            id={idFor(`${p}.firstName`)}
            label="First name"
            value={g.firstName}
            onChange={(v) => updateGuardian(i, "firstName", v)}
            error={errors[`${p}.firstName`]}
            autoComplete={primary ? "given-name" : "off"}
          />
        </div>
        <TextField
          id={idFor(`${p}.middleName`)}
          label="Other name(s)"
          optional
          value={g.middleName}
          onChange={(v) => updateGuardian(i, "middleName", v)}
          error={errors[`${p}.middleName`]}
          autoComplete={primary ? "additional-name" : "off"}
        />
        <TextField
          id={idFor(`${p}.phone`)}
          label="Phone number"
          hint="For example 0803 123 4567. The school will use this to reach you."
          value={g.phone}
          onChange={(v) => updateGuardian(i, "phone", v)}
          error={errors[`${p}.phone`]}
          type="tel"
          inputMode="tel"
          autoComplete={primary ? "tel" : "off"}
        />
        <TextField
          id={idFor(`${p}.altPhone`)}
          label="Alternative phone number"
          optional
          value={g.altPhone}
          onChange={(v) => updateGuardian(i, "altPhone", v)}
          error={errors[`${p}.altPhone`]}
          type="tel"
          inputMode="tel"
          autoComplete="off"
        />
        <TextField
          id={idFor(`${p}.email`)}
          label="Email address"
          value={g.email}
          onChange={(v) => updateGuardian(i, "email", v)}
          error={errors[`${p}.email`]}
          type="email"
          inputMode="email"
          autoComplete={primary ? "email" : "off"}
        />
        <TextField
          id={idFor(`${p}.occupation`)}
          label="Occupation"
          value={g.occupation}
          onChange={(v) => updateGuardian(i, "occupation", v)}
          error={errors[`${p}.occupation`]}
          autoComplete="off"
        />
        <TextAreaField
          id={idFor(`${p}.residentialAddress`)}
          label="Residential address"
          optional
          hint="Only fill this in if it’s different from the student’s home address."
          value={g.residentialAddress}
          onChange={(v) => updateGuardian(i, "residentialAddress", v)}
          error={errors[`${p}.residentialAddress`]}
          rows={2}
          autoComplete="off"
        />
      </div>
    );
  }

  const errorCount = Object.keys(errors).length;

  return (
    <form onSubmit={onSubmit} noValidate className="relative rounded-xl border border-line bg-white px-5 sm:px-8">
      <Section
        title="Student’s information"
        description="Add every student who attends, or is applying to, the school. Write names the way they appear on official documents."
      >
        {students.map((s, i) => renderStudent(s, i))}
        {errors.children ? (
          <p role="alert" className="field-error">
            {errors.children}
          </p>
        ) : null}
        {students.length < MAX_CHILDREN ? (
          <button type="button" className="btn btn-quiet" onClick={addStudent}>
            Add another student
          </button>
        ) : null}
      </Section>

      <Section title="Home address">
        <TextAreaField
          id={idFor("address")}
          label="Student’s home address"
          hint={
            students.length > 1
              ? "This is used for every student on this form."
              : "Include the street, town or city, and state."
          }
          value={address}
          onChange={(v) => {
            setAddress(v);
            clearErrors((k) => k === "address");
          }}
          error={errors.address}
          rows={3}
          autoComplete="street-address"
        />
      </Section>

      <Section
        title="Parent or guardian’s information"
        description="The school will use these details to contact you about the student."
      >
        {renderGuardian(0)}
        {guardians.length > 1 ? (
          <div className="rounded-lg border border-line p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold">Second parent or guardian</h3>
              <button type="button" className="btn btn-quiet btn-sm" onClick={removeSecondGuardian}>
                Remove
              </button>
            </div>
            {renderGuardian(1)}
          </div>
        ) : (
          <button type="button" className="btn btn-quiet" onClick={addSecondGuardian}>
            Add a second parent or guardian
          </button>
        )}
      </Section>

      <Section title="Consent">
        <div>
          <label className="flex cursor-pointer items-start gap-3">
            <input
              id="consent"
              type="checkbox"
              checked={consent}
              onChange={(e) => {
                setConsent(e.target.checked);
                clearErrors((k) => k === "consent");
              }}
              aria-invalid={errors.consent ? true : undefined}
              aria-describedby={errors.consent ? "consent-error" : undefined}
              className="mt-1 h-5 w-5 flex-none"
              style={{ accentColor: "var(--brand)" }}
            />
            <span className="leading-relaxed">
              I confirm these details are correct. I agree that {school.name} may store and use them
              for school records, student portal registration, and to contact me about the
              student’s education.
            </span>
          </label>
          {errors.consent ? (
            <p id="consent-error" role="alert" className="field-error">
              {errors.consent}
            </p>
          ) : null}
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Only the school’s administrators can see what you send here. You can ask the school to
            correct or delete your details at any time.
          </p>
        </div>
      </Section>

      <div className="border-t border-line py-8">
        {formError || errorCount > 0 ? (
          <p
            role="alert"
            className="mb-4 rounded-lg border border-[#e4b4af] bg-[#fff8f7] px-4 py-3 font-medium text-danger"
          >
            {formError ??
              `Please check the ${errorCount} highlighted ${errorCount === 1 ? "field" : "fields"} above.`}
          </p>
        ) : null}
        <button type="submit" className="btn btn-brand w-full sm:w-auto" disabled={submitting}>
          {submitting ? "Sending…" : "Send my details"}
        </button>
      </div>

      {/* Honeypot: hidden from people and screen readers, tempting to bots. */}
      <div aria-hidden="true" className="absolute -left-[9999px] top-0 h-0 w-0 overflow-hidden">
        <label>
          Website
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </label>
      </div>
    </form>
  );
}
