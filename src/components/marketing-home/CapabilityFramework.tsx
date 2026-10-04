import { CapabilityExplorer } from "@/components/marketing-home/CapabilityExplorer";
import { OTHER_PROCESSES } from "@/lib/capability-domains";

export function CapabilityFramework() {
  return (
    <>
      {/* FRAMEWORK */}
      <section className="block fw">
        <div className="wrap fw-head">
          <div className="fw-top">
            <div>
              {}
              <div className="eyebrow">The Framework</div>
              <h2>Optimize by Capability Domain</h2>
            </div>
            <p>We optimize using a capability domain framework for the business processes your organization uses.</p>
          </div>
          {}
          <div className="tabs">
            <div className="tab on"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>Procure-to-Pay</div>
            {OTHER_PROCESSES.map((name) => (
              <div className="tab off" key={name} aria-disabled="true">
                {name}
                <span className="soon">Coming soon</span>
              </div>
            ))}
          </div>
          <CapabilityExplorer />
        </div>
      </section>
    </>
  );
}
