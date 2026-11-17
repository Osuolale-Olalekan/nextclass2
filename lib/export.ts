import { toCSV } from "@/lib/csv";
import type { SchoolDTO, SubmissionDTO } from "@/lib/serialize";

export type ExportLayout = "json" | "students" | "guardians";

const GUARDIAN_FIELDS = [
  "relationship",
  "lastName",
  "firstName",
  "middleName",
  "phone",
  "altPhone",
  "email",
  "occupation",
  "residentialAddress",
] as const;

const STUDENT_COLUMNS = [
  "familyId",
  "studentId",
  "lastName",
  "firstName",
  "middleName",
  "gender",
  "dateOfBirth",
  "classOnAdmission",
  "stateOfOrigin",
  "lga",
  "religion",
  "email",
  "phone",
  "homeAddress",
  ...GUARDIAN_FIELDS.map((f) => `guardian1_${f}`),
  ...GUARDIAN_FIELDS.map((f) => `guardian2_${f}`),
  "status",
  "submittedAt",
] as const;

const GUARDIAN_COLUMNS = [
  "familyId",
  "role",
  ...GUARDIAN_FIELDS,
  "studentHomeAddress",
  "studentsCount",
  "students",
  "status",
  "submittedAt",
] as const;

/**
 * Nested JSON, one object per family. This is the format to feed an import script:
 * familyId and studentId are stable database ids, so re-running an import can upsert on them.
 */
export function buildJson(school: SchoolDTO, submissions: SubmissionDTO[]) {
  return {
    school: { name: school.name, slug: school.slug },
    exportedAt: new Date().toISOString(),
    count: submissions.length,
    families: submissions.map((s) => ({
      familyId: s.id,
      status: s.status,
      submittedAt: s.createdAt,
      homeAddress: s.address,
      guardians: s.guardians.map((g, i) => ({ isPrimary: i === 0, ...g })),
      students: s.children.map((c) => ({
        studentId: c.id,
        lastName: c.lastName,
        firstName: c.firstName,
        middleName: c.middleName,
        gender: c.gender,
        dateOfBirth: c.dateOfBirth,
        classOnAdmission: c.className,
        stateOfOrigin: c.stateOfOrigin,
        lga: c.lga,
        religion: c.religion,
        email: c.email,
        phone: c.phone,
      })),
    })),
  };
}

/** One row per student, with both guardians' details repeated on each row. Handy in Excel. */
export function buildStudentsCsv(submissions: SubmissionDTO[]): string {
  const rows: Array<Record<string, unknown>> = [];
  for (const s of submissions) {
    for (const c of s.children) {
      const row: Record<string, unknown> = {
        familyId: s.id,
        studentId: c.id,
        lastName: c.lastName,
        firstName: c.firstName,
        middleName: c.middleName,
        gender: c.gender,
        dateOfBirth: c.dateOfBirth,
        classOnAdmission: c.className,
        stateOfOrigin: c.stateOfOrigin,
        lga: c.lga,
        religion: c.religion,
        email: c.email,
        phone: c.phone,
        homeAddress: s.address,
        status: s.status,
        submittedAt: s.createdAt,
      };
      s.guardians.forEach((g, i) => {
        for (const f of GUARDIAN_FIELDS) row[`guardian${i + 1}_${f}`] = g[f];
      });
      rows.push(row);
    }
  }
  return toCSV(STUDENT_COLUMNS, rows);
}

/** One row per parent/guardian. Join to the students file on familyId. */
export function buildGuardiansCsv(submissions: SubmissionDTO[]): string {
  const rows: Array<Record<string, unknown>> = [];
  for (const s of submissions) {
    const names = s.children.map((c) => `${c.firstName} ${c.lastName} (${c.className})`).join("; ");
    s.guardians.forEach((g, i) => {
      rows.push({
        familyId: s.id,
        role: i === 0 ? "primary" : "secondary",
        ...g,
        studentHomeAddress: s.address,
        studentsCount: s.children.length,
        students: names,
        status: s.status,
        submittedAt: s.createdAt,
      });
    });
  }
  return toCSV(GUARDIAN_COLUMNS, rows);
}
