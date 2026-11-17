import type { Metadata } from "next";
import { notFound } from "next/navigation";
import IntakeForm from "@/components/IntakeForm";
import SchoolBand, { brandStyle } from "@/components/SchoolBand";
import { getSchoolBySlug } from "@/lib/schools";

export const dynamic = "force-dynamic";

const DEFAULT_WELCOME =
  "Fill this in once for your whole family. Add every child who attends, or is applying to, the school. It takes about five minutes.";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const school = await getSchoolBySlug(slug);
  return { title: school ? `${school.name} registration` : "Registration" };
}

export default async function ApplyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const school = await getSchoolBySlug(slug);
  if (!school) notFound();

  if (!school.isOpen) {
    return (
      <main style={brandStyle(school.brandColor)}>
        <SchoolBand name={school.name} />
        <div className="mx-auto max-w-xl px-4 py-6 sm:py-10">
          <div className="rounded-xl border border-line bg-white p-6 sm:p-8">
            <h2 className="font-serif text-2xl">This form is closed</h2>
            <p className="mt-3 leading-relaxed text-muted">
              {school.name} isn’t collecting new responses right now. If you think this is a mistake,
              please contact the school.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main style={brandStyle(school.brandColor)}>
      <SchoolBand name={school.name}>{school.welcomeMessage || DEFAULT_WELCOME}</SchoolBand>
      <div className="mx-auto max-w-xl px-4 py-6 sm:py-10">
        <IntakeForm school={school} />
      </div>
    </main>
  );
}
