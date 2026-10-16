"use client";

import { Check, X, Sparkles, HelpCircle } from "lucide-react";
import { FEATURE_COMPARISON_CATEGORIES } from "@/lib/plans/config";

export function ComparisonTable() {
  const renderCellContent = (value: boolean | string | undefined, comingSoon?: boolean) => {
    if (comingSoon) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
          <Sparkles className="w-3 h-3" />
          Coming Soon
        </span>
      );
    }
    if (typeof value === "string") {
      return <span className="font-semibold text-foreground text-xs">{value}</span>;
    }
    if (value === true) {
      return <Check className="w-4 h-4 text-emerald-500 mx-auto" />;
    }
    return <X className="w-4 h-4 text-muted-foreground/40 mx-auto" />;
  };

  return (
    <section id="compare" className="py-16 lg:py-24 bg-card/10 border-t border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            Detailed Feature Entitlement Comparison
          </h2>
          <p className="text-sm text-muted-foreground">
            Compare capabilities, limits, and technical entitlements side-by-side.
          </p>
        </div>

        {/* Table Container */}
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
          <table className="w-full text-left border-collapse">
            {/* Header Row */}
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="py-4 px-6 text-sm font-bold text-foreground w-2/5">
                  Plan Entitlements
                </th>
                <th className="py-4 px-6 text-center text-sm font-bold text-foreground w-1/5">
                  Starter Growth
                </th>
                <th className="py-4 px-6 text-center text-sm font-bold text-emerald-500 w-1/5 bg-emerald-500/5">
                  Professional (Popular)
                </th>
                <th className="py-4 px-6 text-center text-sm font-bold text-foreground w-1/5">
                  Business Scale
                </th>
              </tr>
            </thead>

            {/* Categories */}
            <tbody>
              {FEATURE_COMPARISON_CATEGORIES.map((cat, cIdx) => (
                <tr key={cIdx} className="contents">
                  {/* Category Header */}
                  <tr className="bg-muted/50 border-b border-border">
                    <td
                      colSpan={4}
                      className="py-3 px-6 text-xs font-bold uppercase tracking-wider text-muted-foreground"
                    >
                      {cat.category}
                    </td>
                  </tr>

                  {/* Feature Rows */}
                  {cat.features.map((feat, fIdx) => (
                    <tr
                      key={fIdx}
                      className="border-b border-border/60 hover:bg-muted/20 transition-colors"
                    >
                      <td className="py-3.5 px-6 text-xs font-medium text-foreground">
                        <div className="flex flex-col">
                          <span>{feat.name}</span>
                          {feat.note && (
                            <span className="text-[10px] text-muted-foreground font-normal">
                              {feat.note}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-6 text-center text-xs">
                        {renderCellContent(feat.starter, feat.comingSoon)}
                      </td>
                      <td className="py-3.5 px-6 text-center text-xs bg-emerald-500/5">
                        {renderCellContent(feat.pro, feat.comingSoon)}
                      </td>
                      <td className="py-3.5 px-6 text-center text-xs">
                        {renderCellContent(feat.enterprise, feat.comingSoon)}
                      </td>
                    </tr>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
