import Link from "next/link";
import Image from "next/image";

const COLS: { title: string; links: string[] }[] = [
  { title: "Hire", links: ["Hire Talent", "Post a Work Request", "ERP Punchout"] },
  { title: "Work", links: ["Find Work", "Become a Provider", "Coordinators"] },
  { title: "Learn", links: ["Learning Paths", "Courses", "Categories"] },
  { title: "Company", links: ["Why Panameer", "Enterprise", "Pricing"] },
];

export function MarketingFooter() {
  return (
    <footer className="mt-10 bg-ink py-12 text-[#cfc7da]">
      <div className="mx-auto max-w-[1180px] px-6">
        <div className="flex flex-wrap gap-x-[60px] gap-y-10">
          <div className="min-w-[200px]">
            <Image
              src="/brand/panameer-logo-on-dark.png"
              alt="Panameer"
              width={796}
              height={122}
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
                  key={l}
                  href="#"
                  className="my-1.5 block text-[14.5px] text-[#cfc7da] hover:text-white"
                >
                  {l}
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
