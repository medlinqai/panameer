import { permanentRedirect } from "next/navigation";

// The Course Overview page folded into the path page (2026-10-08): it forwards (308) and opens that course in place.
export default async function CoursePage({ params }: { params: Promise<{ slug: string; courseSlug: string }> }) {
  const { slug, courseSlug } = await params;
  permanentRedirect(`/learn/${slug}#course-${encodeURIComponent(courseSlug)}`);
}
