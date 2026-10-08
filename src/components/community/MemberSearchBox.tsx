"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function MemberSearchBox({ initial = "" }: { initial?: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [value, setValue] = useState(initial);

  useEffect(() => {
    const t = setTimeout(() => {
      const currentQ = params.get("q") ?? "";
      const nextQ = value.trim();
      if (currentQ === nextQ) return;
      const next = new URLSearchParams(params.toString());
      if (nextQ) next.set("q", nextQ);
      else next.delete("q");
      router.replace(next.toString() ? `/connect/community?${next}` : "/connect/community", {
        scroll: false,
      });
    }, 300);
    return () => clearTimeout(t);
  }, [value, params, router]);

  return (
    <div className="relative">
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search members by name, title or company"
        aria-label="Search members"
        className="w-full rounded-brand border border-line bg-white px-4 py-2.5 text-[14px] outline-none placeholder:text-ink-2/70 focus:border-magenta/60"
      />
    </div>
  );
}
