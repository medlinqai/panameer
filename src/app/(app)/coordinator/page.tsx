import { guardPage } from "@/lib/guard";
import { CoordinatorConsole } from "@/components/coordinator/CoordinatorConsole";

export default async function CoordinatorPage() {
  await guardPage("canCoordinate");

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-1 text-[26px] font-extrabold tracking-[-0.5px]">
        Coordinator
      </h1>
      <p className="mb-6 text-ink-2">Build your team of service providers.</p>
      <CoordinatorConsole />
    </div>
  );
}
