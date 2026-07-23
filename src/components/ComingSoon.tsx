import { Card } from "@/components/Card";

/** Placeholder page body for nav destinations not built yet. */
export function ComingSoon({ title }: { title: string }) {
  return (
    <div className="mx-auto max-w-2xl">
      <Card className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-black/60 dark:text-white/60">
          This area is coming soon.
        </p>
      </Card>
    </div>
  );
}
