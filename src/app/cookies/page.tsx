import type { Metadata } from "next";
import { MarketingNavbar } from "@/components/marketing/navbar";
import { MarketingFooter } from "@/components/marketing/footer";

export const metadata: Metadata = {
  title: "Cookie Policy & Tracking Disclosures — DIGISOLVNET WaCRM",
  description: "Disclosures regarding session cookies, analytics, and authentication tokens.",
};

export default function CookiesPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground antialiased selection:bg-emerald-500/20 selection:text-emerald-500">
      <MarketingNavbar />
      <main className="flex-1 py-16 lg:py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-8 text-sm text-muted-foreground leading-relaxed">
          <div className="space-y-2 border-b border-border pb-6">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
              Cookie Policy & Tracking Disclosures
            </h1>
            <p className="text-xs text-muted-foreground">
              Last Updated: October 16, 2026 • DIGISOLVNET Solutions
            </p>
          </div>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">1. What Are Cookies?</h2>
            <p>
              Cookies are small data files placed on your device when you browse websites. WaCRM utilizes strictly necessary cookies to keep you securely authenticated and preserve your workspace settings.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">2. Categories of Cookies We Use</h2>
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted text-foreground">
                  <tr>
                    <th className="px-4 py-2.5">Category</th>
                    <th className="px-4 py-2.5">Purpose</th>
                    <th className="px-4 py-2.5">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="px-4 py-2 font-semibold text-foreground">Strictly Necessary</td>
                    <td className="px-4 py-2">Supabase auth tokens, session cookies, anti-CSRF tokens</td>
                    <td className="px-4 py-2">Session / 30 days</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 font-semibold text-foreground">Preferences</td>
                    <td className="px-4 py-2">Theme selection (light/dark mode), active tenant workspace selection</td>
                    <td className="px-4 py-2">1 year</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 font-semibold text-foreground">Analytics</td>
                    <td className="px-4 py-2">Aggregate page-load performance and error tracking (no message content)</td>
                    <td className="px-4 py-2">90 days</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">3. Managing Cookie Preferences</h2>
            <p>
              Most web browsers permit you to manage cookie settings via their preferences menus. Disabling strictly necessary authentication cookies will prevent you from signing in to your WaCRM workspace.
            </p>
          </section>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
