import type { Gender, Religion, Status } from "@/lib/constants";
import type { ISchool } from "@/models/School";
import type { IGuardian, ISubmission } from "@/models/Submission";

/** Plain, JSON-safe shapes that can be passed from server components to client components. */

export interface SchoolDTO {
  id: string;
  name: string;
  slug: string;
  classes: string[];
  isOpen: boolean;
  welcomeMessage: string;
  brandColor: string;
}

export interface ChildDTO {
  id: string;
  lastName: string;
  firstName: string;
  middleName: string;
  gender: Gender;
  dateOfBirth: string;
  className: string;
  stateOfOrigin: string;
  lga: string;
  religion: Religion;
  email: string;
  phone: string;
}

export interface SubmissionDTO {
  id: string;
  schoolId: string;
  guardians: IGuardian[];
  address: string;
  children: ChildDTO[];
  status: Status;
  adminNote: string;
  duplicateOf: string | null;
  duplicateReason: string | null;
  consentAt: string;
  createdAt: string;
}

export function toSchoolDTO(s: ISchool): SchoolDTO {
  return {
    id: String(s._id),
    name: s.name,
    slug: s.slug,
    classes: s.classes ?? [],
    isOpen: s.isOpen,
    welcomeMessage: s.welcomeMessage ?? "",
    brandColor: s.brandColor,
  };
}

export function toSubmissionDTO(s: ISubmission): SubmissionDTO {
  return {
    id: String(s._id),
    schoolId: String(s.school),
    guardians: s.guardians.map((g) => ({
      relationship: g.relationship,
      lastName: g.lastName,
      firstName: g.firstName,
      middleName: g.middleName ?? "",
      phone: g.phone,
      altPhone: g.altPhone ?? "",
      email: g.email ?? "",
      occupation: g.occupation ?? "",
      residentialAddress: g.residentialAddress ?? "",
    })),
    address: s.address,
    children: s.children.map((c) => ({
      id: String(c._id),
      lastName: c.lastName,
      firstName: c.firstName,
      middleName: c.middleName ?? "",
      gender: c.gender,
      dateOfBirth: c.dateOfBirth,
      className: c.className,
      stateOfOrigin: c.stateOfOrigin,
      lga: c.lga,
      religion: c.religion,
      email: c.email ?? "",
      phone: c.phone ?? "",
    })),
    status: s.status,
    adminNote: s.adminNote ?? "",
    duplicateOf: s.duplicateOf ? String(s.duplicateOf) : null,
    duplicateReason: s.duplicateReason ?? null,
    consentAt: new Date(s.consentAt).toISOString(),
    createdAt: new Date(s.createdAt).toISOString(),
  };
}
