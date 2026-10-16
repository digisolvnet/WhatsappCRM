import type { Metadata } from "next";
import { MarketingNavbar } from "@/components/marketing/navbar";
import { MarketingFooter } from "@/components/marketing/footer";

export const metadata: Metadata = {
  title: "Security Incident & Breach Response — DIGISOLVNET WaCRM",
  description: "Incident disclosure, CERT-In reporting procedures, and data breach containment framework.",
};

export default function SecurityIncidentPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground antialiased selection:bg-emerald-500/20 selection:text-emerald-500">
      <MarketingNavbar />
      <main className="flex-1 py-16 lg:py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-8 text-sm text-muted-foreground leading-relaxed">
          <div className="space-y-2 border-b border-border pb-6">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
              Security Incident & Data Breach Response
            </h1>
            <p className="text-xs text-muted-foreground">
              Last Updated: October 16, 2026 • DIGISOLVNET Solutions
            </p>
          </div>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">1. Commitment to Security & Incident Management</h2>
            <p>
              DIGISOLVNET maintains an active Security Incident Response Team (SIRT) to detect, triage, contain, and remediate cybersecurity threats, unauthorized access, and software vulnerabilities.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">2. Four-Stage Incident Lifecycle</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                <h3 className="font-bold text-foreground text-sm">1. Detection & Triage</h3>
                <p className="text-xs text-muted-foreground">
                  Automated telemetry flags anomalous volumes, credential stuffing, or service degradation. Severity is classified within 15 minutes.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                <h3 className="font-bold text-foreground text-sm">2. Containment & Kill-Switch</h3>
                <p className="text-xs text-muted-foreground">
                  Compromised tokens are revoked immediately. Automated emergency kill switches isolate affected workflows to halt unauthorized egress.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                <h3 className="font-bold text-foreground text-sm">3. Remediation & Recovery</h3>
                <p className="text-xs text-muted-foreground">
                  Vulnerabilities patched, database snapshots restored to clean state, and tenant access keys securely re-generated.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                <h3 className="font-bold text-foreground text-sm">4. Post-Mortem & Disclosure</h3>
                <p className="text-xs text-muted-foreground">
                  Complete incident report compiled with root-cause analysis, preventative controls, and transparent customer disclosure.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">3. Statutory Indian Reporting (CERT-In Mandate)</h2>
            <p>
              In full compliance with CERT-In directions under Section 70B of the Information Technology Act 2000, cybersecurity incidents of specified categories are reported to the Indian Computer Emergency Response Team (CERT-In) within <strong className="text-foreground">6 hours</strong> of noticeable confirmation.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">4. Vulnerability Disclosure & Bug Bounty Contact</h2>
            <p>
              Security researchers and customers can report suspected vulnerabilities responsibly to <span className="font-mono text-foreground font-bold">security@digisolvnet.com</span>. We acknowledge reports within 24 hours.
            </p>
          </section>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
