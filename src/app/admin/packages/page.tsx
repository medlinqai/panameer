import { StubConsolePage } from "@/components/console/StubConsolePage";

/** Admin → Packages (E012). Footer breaks down by ERP pillar, per the mockup. */
export default function Page() {
  return (
    <StubConsolePage
      tiles={[
        { label: "Packages to Review" },
        { label: "Awaiting Pricing" },
        { label: "Reported" },
        { label: "Newly Published" },
        { label: "Retired" },
      ]}
      listingTitle="Packages"
      columns={["Provider - Company", "Package", "Status", "Posted Date", "Message"]}
      what="packages"
      why="Providers can build packages, but there is no ordering or settlement behind them yet, so there is nothing for this console to moderate."
      volume={[
        { label: "F&A" },
        { label: "HCM" },
        { label: "SCM" },
        { label: "CRM" },
        { label: "EPM" },
      ]}
    />
  );
}
