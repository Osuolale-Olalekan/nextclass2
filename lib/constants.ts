export const RELATIONSHIPS = ["Father", "Mother", "Guardian", "Other"] as const;
export const GENDERS = ["Male", "Female"] as const;
export const RELIGIONS = ["Christianity", "Islam", "Other"] as const;
export const STATUSES = ["pending", "approved", "rejected"] as const;

export type Relationship = (typeof RELATIONSHIPS)[number];
export type Gender = (typeof GENDERS)[number];
export type Religion = (typeof RELIGIONS)[number];
export type Status = (typeof STATUSES)[number];

export const STATUS_LABELS: Record<Status, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

export const STATES = [
  "Abia",
  "Adamawa",
  "Akwa Ibom",
  "Anambra",
  "Bauchi",
  "Bayelsa",
  "Benue",
  "Borno",
  "Cross River",
  "Delta",
  "Ebonyi",
  "Edo",
  "Ekiti",
  "Enugu",
  "FCT (Abuja)",
  "Gombe",
  "Imo",
  "Jigawa",
  "Kaduna",
  "Kano",
  "Katsina",
  "Kebbi",
  "Kogi",
  "Kwara",
  "Lagos",
  "Nasarawa",
  "Niger",
  "Ogun",
  "Ondo",
  "Osun",
  "Oyo",
  "Plateau",
  "Rivers",
  "Sokoto",
  "Taraba",
  "Yobe",
  "Zamfara",
  "Outside Nigeria",
] as const;

export const DEFAULT_CLASSES = [
  "Creche",
  "Nursery 1",
  "Nursery 2",
  "Nursery 3",
  "Primary 1",
  "Primary 2",
  "Primary 3",
  "Primary 4",
  "Primary 5",
  "Primary 6",
  "JSS 1",
  "JSS 2",
  "JSS 3",
  "SS 1",
  "SS 2",
  "SS 3",
];

export const MAX_CHILDREN = 8;
export const DEFAULT_BRAND_COLOR = "#1d4ed8";
export const PAGE_SIZE = 50;
