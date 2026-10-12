import { redirect } from "next/navigation";

// MC-E006: creating and editing a Service Product happens in the Create card on My Catalog › Service Products.
export default async function Page({ searchParams }: { searchParams: Promise<{ id?: string; type?: string }> }) {
  const { id, type } = await searchParams;
  const q = id ? `?edit=${encodeURIComponent(id)}` : type ? `?type=${encodeURIComponent(type)}` : "";
  redirect(`/catalog/products${q}#create`);
}
