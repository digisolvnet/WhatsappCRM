import type { Metadata } from "next";
import { MarketingNavbar } from "@/components/marketing/navbar";
import { MarketingFooter } from "@/components/marketing/footer";

export const metadata: Metadata = {
  title: "Support & Escalation Policy — DIGISOLVNET WaCRM",
  description: "Customer support service level agreements, ticket escalation, and complaints procedure.",
};

export default function SupportPolicyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground antialiased selection:bg-emerald-500/20 selection:text-emerald-500">
      <MarketingNavbar />
      <main className="flex-1 py-16 lg:py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-8 text-sm text-muted-foreground leading-relaxed">
          <div className="space-y-2 border-b border-border pb-6">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
              Support, Complaints & Escalation Policy
            </h1>
            <p className="text-xs text-muted-foreground">
              Last Updated: October 16, 2026 • DIGISOLVNET Solutions
            </p>
          </div>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">1. Support Channels & Operating Hours</h2>
            <p>
              DIGISOLVNET provides customer technical and billing support through the following verified channels:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Help Desk / Email:</strong> support@digisolvnet.com (Mon–Fri, 9:30 AM – 6:30 PM IST)</li>
              <li><strong>WhatsApp Support Desk:</strong> Official WhatsApp support helpline available for active subscribers.</li>
              <li><strong>Emergency Escalation:</strong> Automated 24/7 monitoring for infrastructure outages and gateway failures.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">2. Severity Levels & SLA Targets</h2>
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted text-foreground">
                  <tr>
                    <th className="px-4 py-2.5">Severity Level</th>
                    <th className="px-4 py-2.5">Description</th>
                    <th className="px-4 py-2.5">First Response SLA</th>
                    <th className="px-4 py-2.5">Target Resolution</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="px-4 py-2 font-bold text-destructive">P1 — Critical</td>
                    <td className="px-4 py-2">Platform outage, total messaging failure across tenant</td>
                    <td className="px-4 py-2">&lt; 30 minutes</td>
                    <td className="px-4 py-2">&lt; 4 hours</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 font-bold text-amber-400">P2 — Major</td>
                    <td className="px-4 py-2">Automation flows failing, webhook delay, checkout glitch</td>
                    <td className="px-4 py-2">&lt; 2 hours</td>
                    <td className="px-4 py-2">&lt; 12 hours</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 font-bold text-foreground">P3 — Standard</td>
                    <td className="px-4 py-2">Configuration guidance, template formatting, general queries</td>
                    <td className="px-4 py-2">&lt; 8 hours</td>
                    <td className="px-4 py-2">&lt; 48 hours</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">3. Grievance Officer (Indian IT Rules Compliance)</h2>
            <p>
              In accordance with the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules 2021, the designated Grievance Officer for DIGISOLVNET is:
            </p>
            <div className="rounded-xl border border-border bg-muted/40 p-4 font-mono text-xs text-foreground space-y-1">
              <div><strong>Name:</strong> Grievance Redressal Team</div>
              <div><strong>Email:</strong> grievance@digisolvnet.com</div>
              <div><strong>Address:</strong> DIGISOLVNET Solutions, India</div>
              <div><strong>Acknowledgment:</strong> Within 24 hours of ticket receipt</div>
            </div>
          </section>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
