import Link from "next/link";
import Image from "next/image";

const COLS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Hire",
    links: [
      { label: "Hire Talent", href: "/join/buyer" },
      { label: "Post a Work Request", href: "/join/buyer" },
      { label: "ERP Punchout", href: "#punchout" },
    ],
  },
  {
    title: "Work",
    links: [
      { label: "Find Work", href: "/join/provider" },
      { label: "Become a Provider", href: "/join/provider" },
      { label: "Coordinators", href: "#" },
    ],
  },
  {
    title: "Learn",
    links: [
      { label: "Learning Paths", href: "#learn" },
      { label: "Courses", href: "#learn" },
      { label: "Categories", href: "#learn" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Why Panameer", href: "#punchout" },
      { label: "Enterprise", href: "#punchout" },
      { label: "Pricing", href: "#pricing" },
    ],
  },
];

export function MarketingFooter() {
  return (
    <footer className="mt-10 bg-ink py-12 text-[#cfc7da]">
      <div className="mx-auto max-w-[1180px] px-6">
        <div className="flex flex-wrap gap-x-[60px] gap-y-10">
          <div className="min-w-[200px]">
            <Image
              src="/brand/panameer-new-on-dark.png"
              alt="Panameer"
              width={529}
              height={134}
              className="h-8 w-auto"
            />
            <p className="mt-4 max-w-[240px] text-[14px] text-[#a89fb8]">
              The services-procurement marketplace with ERP integration.
            </p>
          </div>
          {COLS.map((col) => (
            <div key={col.title}>
              <b className="mb-2.5 block text-white">{col.title}</b>
              {col.links.map((l) => (
                <Link
                  key={l.label}
                  href={l.href}
                  className="my-1.5 block text-[14.5px] text-[#cfc7da] hover:text-white"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          ))}
        </div>
        <div className="mt-[26px] text-[13px] text-[#8a8199]">
          © 2026 Panameer · The services-procurement marketplace with ERP
          integration.
        </div>
      </div>
    </footer>
  );
}
