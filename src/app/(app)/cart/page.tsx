import { redirect } from "next/navigation";
import { guardPage } from "@/lib/guard";
import { addToCart, cartFor, CartError } from "@/lib/cart";
import { ShopTabs } from "@/components/shop/ShopTabs";
import { CartView } from "@/components/shop/CartView";

export const dynamic = "force-dynamic";
export const metadata = { title: "Work Request · Panameer" };

// SH-E002: the buyer's cart, grouped by provider. `?add=` is where a signed-out Buy Now lands after sign-in.
export default async function CartPage({ searchParams }: { searchParams: Promise<{ add?: string; error?: string }> }) {
  const viewer = await guardPage("authenticated");
  const sp = await searchParams;
  if (sp.add) {
    let error = "";
    try {
      await addToCart(viewer, sp.add);
    } catch (e) {
      if (!(e instanceof CartError)) throw e;
      error = e.message;
    }
    redirect(error ? `/cart?error=${encodeURIComponent(error)}` : "/cart");
  }
  const cart = await cartFor(viewer);
  return (
    <div className="pm-white-page mx-auto w-full max-w-5xl">
      <ShopTabs />
      <h1 className="text-[28px] font-bold">Work Request <span className="font-normal text-ink-2">(Incomplete)</span></h1>
      {cart.workRequest?.wrNumber && <p className="text-[13px] text-ink-2">{cart.workRequest.wrNumber}</p>}
      {sp.error && <p role="alert" className="mt-2 text-[14px] font-semibold text-magenta-dark">{sp.error}</p>}
      <CartView groups={cart.groups} totalCents={cart.totalCents} currency={cart.currency} hasCompany={cart.hasCompany} workRequest={cart.workRequest} />
    </div>
  );
}
