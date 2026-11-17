import { z } from "zod";
import { GENDERS, MAX_CHILDREN, RELATIONSHIPS, RELIGIONS, STATES } from "./constants";
import { lgasFor } from "./lgas";

/**
 * Normalises a phone number to E.164. Accepts the ways Nigerians actually write numbers:
 * 0803 123 4567, 803-123-4567, 2348031234567, +234 803 123 4567, +234 (0)803...
 * International numbers are accepted if they look like valid E.164.
 * Returns null when the number can't be made sense of.
 */
export function normalizePhone(input: string): string | null {
  let s = input.trim().replace(/[\s\-().]/g, "");
  if (!s) return null;
  if (s.startsWith("00")) s = "+" + s.slice(2);

  if (!s.startsWith("+")) {
    if (/^234\d{10,11}$/.test(s)) s = "+" + s;
    else if (/^0\d{10}$/.test(s)) s = "+234" + s.slice(1);
    else if (/^[789]\d{9}$/.test(s)) s = "+234" + s;
    else return null;
  }

  // "+234 0803..." is a common slip: drop the stray trunk zero.
  if (/^\+2340\d{10}$/.test(s)) s = "+234" + s.slice(5);

  if (s.startsWith("+234")) return /^\+234[789][01]\d{8}$/.test(s) ? s : null;
  return /^\+[1-9]\d{7,14}$/.test(s) ? s : null;
}

/** Lower-cased, punctuation-free key used to spot the same child submitted twice. */
export function childKey(c: { firstName: string; lastName: string; dateOfBirth: string }): string {
  const clean = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
  return `${clean(c.firstName)}|${clean(c.lastName)}|${c.dateOfBirth}`;
}

const NAME_RE = /^[\p{L}\p{M}][\p{L}\p{M}'’ .\-]*$/u;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const requiredName = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .max(60, `${label} is too long`)
    .regex(NAME_RE, `${label} contains characters that aren't allowed`);

const optionalName = z
  .string()
  .trim()
  .max(60, "Too long")
  .refine((v) => v === "" || NAME_RE.test(v), "Contains characters that aren't allowed");

const optionalText = (max: number) => z.string().trim().max(max, "Too long");

const phone = z
  .string()
  .trim()
  .min(1, "Phone number is required")
  .transform((v, ctx) => {
    const p = normalizePhone(v);
    if (!p) {
      ctx.addIssue({ code: "custom", message: "Enter a valid phone number, e.g. 0803 123 4567" });
      return z.NEVER;
    }
    return p;
  });

const optionalPhone = z
  .string()
  .trim()
  .transform((v, ctx) => {
    if (!v) return "";
    const p = normalizePhone(v);
    if (!p) {
      ctx.addIssue({ code: "custom", message: "Enter a valid phone number, e.g. 0803 123 4567" });
      return z.NEVER;
    }
    return p;
  });

const optionalEmail = z
  .string()
  .trim()
  .toLowerCase()
  .max(120, "Too long")
  .refine((v) => v === "" || EMAIL_RE.test(v), "Enter a valid email address");

const requiredEmail = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Email address is required")
  .max(120, "Too long")
  .refine((v) => v === "" || EMAIL_RE.test(v), "Enter a valid email address");

const requiredText = (label: string, max: number) =>
  z.string().trim().min(1, `${label} is required`).max(max, "Too long");

function parseISODate(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  const ok = dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
  return ok ? dt : null;
}

const dateOfBirth = z
  .string()
  .trim()
  .min(1, "Date of birth is required")
  .superRefine((v, ctx) => {
    const dt = parseISODate(v);
    if (!dt) {
      ctx.addIssue({ code: "custom", message: "Enter a valid date of birth" });
      return;
    }
    const now = new Date();
    const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const oldest = Date.UTC(now.getUTCFullYear() - 25, now.getUTCMonth(), now.getUTCDate());
    if (dt.getTime() > today) {
      ctx.addIssue({ code: "custom", message: "Date of birth can't be in the future" });
    } else if (dt.getTime() < oldest) {
      ctx.addIssue({ code: "custom", message: "Please check this date of birth" });
    }
  });

export const guardianSchema = z.object({
  relationship: z.enum(RELATIONSHIPS, { message: "Select a relationship" }),
  lastName: requiredName("Surname"),
  firstName: requiredName("First name"),
  middleName: optionalName,
  phone,
  altPhone: optionalPhone,
  email: requiredEmail,
  occupation: requiredText("Occupation", 80),
  /** Only filled in when the parent lives somewhere other than the student. */
  residentialAddress: optionalText(300),
});

export const childSchema = z.object({
  lastName: requiredName("Surname"),
  firstName: requiredName("First name"),
  middleName: optionalName,
  gender: z.enum(GENDERS, { message: "Select gender" }),
  dateOfBirth,
  className: z.string().trim().min(1, "Select a class"),
  stateOfOrigin: z.enum(STATES, { message: "Select a state of origin" }),
  lga: z.string().trim().min(1, "Select a local government area").max(80, "Too long"),
  religion: z.enum(RELIGIONS, { message: "Select a religion" }),
  email: optionalEmail,
  phone: optionalPhone,
}).superRefine((student, ctx) => {
  // A missing or unknown state, or a missing LGA, is already reported by the fields above.
  const options = lgasFor(student.stateOfOrigin);
  if (options.length === 0 || student.lga === "") return;
  if (!options.includes(student.lga)) {
    ctx.addIssue({
      code: "custom",
      path: ["lga"],
      message: "Select a local government area from the list",
    });
  }
});

export const submissionSchema = z.object({
  guardians: z.array(guardianSchema).min(1).max(2),
  address: z.string().trim().min(5, "Enter the student’s home address").max(300, "Too long"),
  children: z
    .array(childSchema)
    .min(1, "Add at least one child")
    .max(MAX_CHILDREN, `You can add up to ${MAX_CHILDREN} children per form`),
  consent: z.literal(true, { message: "Please tick the box to give your consent" }),
});

export type SubmissionInput = z.input<typeof submissionSchema>;
export type SubmissionData = z.output<typeof submissionSchema>;

/** Flattens zod issues into { "guardians.0.phone": "message" }, keeping the first message per field. */
export function issuesToErrors(
  issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join(".");
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}
