import { z } from "zod";
import { STATUSES } from "@/lib/constants";
import { HEX_RE, SLUG_RE } from "@/lib/utils";

export const schoolFieldsSchema = z.object({
  name: z.string().trim().min(2, "Enter the school’s name").max(120, "Keep the name under 120 characters"),
  classes: z.array(z.string()).min(1, "Add at least one class").max(60, "That’s too many classes"),
  welcomeMessage: z.string().trim().max(600, "Keep this under 600 characters"),
  brandColor: z.string().regex(HEX_RE, "Pick a colour"),
});

export const schoolCreateSchema = schoolFieldsSchema.extend({
  // A new school may omit the welcome message. Defaulting here (not on the shared fields)
  // keeps partial updates from blanking an existing message.
  welcomeMessage: z.string().trim().max(600, "Keep this under 600 characters").default(""),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, "Enter at least 2 characters")
    .max(60, "Keep this under 60 characters")
    .regex(SLUG_RE, "Use lowercase letters, numbers and single hyphens only"),
});

export const schoolUpdateSchema = schoolFieldsSchema.partial().extend({
  isOpen: z.boolean().optional(),
});

export const submissionUpdateSchema = z
  .object({
    status: z.enum(STATUSES).optional(),
    adminNote: z.string().trim().max(1000, "Keep notes under 1000 characters").optional(),
  })
  .refine((v) => v.status !== undefined || v.adminNote !== undefined, "Nothing to update");

export const bulkStatusSchema = z.object({
  ids: z.array(z.string()).min(1).max(200),
  status: z.enum(STATUSES),
});
