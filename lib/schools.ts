import { cache } from "react";
import { connectDB } from "@/lib/db";
import { toSchoolDTO, type SchoolDTO } from "@/lib/serialize";
import { SLUG_RE } from "@/lib/utils";
import { School } from "@/models/School";

/** Looks up a school by its public slug. Cached per request so metadata and page share one query. */
export const getSchoolBySlug = cache(async (slug: string): Promise<SchoolDTO | null> => {
  if (!SLUG_RE.test(slug)) return null;
  await connectDB();
  const doc = await School.findOne({ slug }).lean();
  return doc ? toSchoolDTO(doc) : null;
});
