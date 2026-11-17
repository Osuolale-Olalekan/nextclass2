import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SchoolBand, { brandStyle } from "@/components/SchoolBand";
import { getSchoolBySlug } from "@/lib/schools";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Details received" };

export default async function ThankYouPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const school = await getSchoolBySlug(slug);
  if (!school) notFound();

  return (
    <main style={brandStyle(school.brandColor)}>
      <SchoolBand name={school.name} />
      <div className="mx-auto max-w-xl px-4 py-6 sm:py-10">
        <div className="rounded-xl border border-line bg-white p-6 sm:p-8">
          <h2 className="font-serif text-2xl">Thank you, we’ve received your details</h2>
          <p className="mt-3 leading-relaxed text-muted">
            The school will check what you sent and use it when your children’s records are set up.
            You don’t need to do anything else.
          </p>
          <p className="mt-6 text-sm text-muted">
            Registering a child from a different family?{" "}
            <Link href={`/apply/${slug}`} className="link">
              Fill in another form
            </Link>
            .
          </p>
        </div>
      </div>
    </main>
  );
}
