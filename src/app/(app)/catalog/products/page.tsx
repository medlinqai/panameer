import { redirect } from "next/navigation";

// WK-E003: Service Products is a section of Catalog now (edit/type carry over).
export default async function Page({ searchParams }: { searchParams: Promise<{ edit?: string; type?: string }> }) {
  const { edit, type } = await searchParams;
  const q = new URLSearchParams({ ...(edit ? { edit } : {}), ...(type ? { type } : {}) }).toString();
  redirect(`/catalog${q ? `?${q}` : ""}#products`);
}
