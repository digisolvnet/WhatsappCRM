"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";

export function MarketingNavbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md transition-all">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand / Logo */}
        <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 shadow-sm">
            <Image
              src="/brand-icon.png"
              alt="DIGISOLVNET"
              width={26}
              height={26}
              className="object-contain"
              priority
            />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-tight text-foreground flex items-center gap-1.5">
              DIGISOLVNET
              <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                WaCRM
              </span>
            </span>
            <span className="text-[11px] text-muted-foreground hidden sm:inline">
              WhatsApp Business CRM & Sales Engine
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
          <Link href="/features" className="transition-colors hover:text-foreground">
            Features
          </Link>
          <Link href="/use-cases" className="transition-colors hover:text-foreground">
            Use Cases
          </Link>
          <Link href="/workflow" className="transition-colors hover:text-foreground">
            Workflow
          </Link>
          <Link href="/pricing" className="transition-colors hover:text-foreground">
            Pricing
          </Link>
          <Link href="/docs" className="transition-colors hover:text-foreground">
            Docs & Setup
          </Link>
        </nav>

        {/* Action CTAs */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-medium text-foreground/80 hover:text-foreground px-3 py-2 rounded-lg transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-border bg-card text-foreground hover:bg-accent transition-colors shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Live Demo
          </Link>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 shadow-sm transition-all hover:shadow-emerald-500/20 hover:shadow-md"
          >
            Get Started
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex md:hidden items-center gap-2">
          <Link
            href="/login"
            className="text-xs font-medium text-foreground px-2.5 py-1.5 rounded-md border border-border"
          >
            Sign In
          </Link>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-border bg-background px-4 py-5 shadow-xl transition-all">
          <nav className="flex flex-col gap-3 text-base font-medium text-muted-foreground">
            <Link
              href="/features"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1.5 transition-colors hover:text-foreground"
            >
              Features
            </Link>
            <Link
              href="/use-cases"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1.5 transition-colors hover:text-foreground"
            >
              Use Cases
            </Link>
            <Link
              href="/workflow"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1.5 transition-colors hover:text-foreground"
            >
              Workflow & Order Cycle
            </Link>
            <Link
              href="/pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1.5 transition-colors hover:text-foreground"
            >
              Pricing & Plans
            </Link>
            <Link
              href="/docs"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1.5 transition-colors hover:text-foreground"
            >
              Docs & Setup
            </Link>
            <div className="h-px bg-border my-2" />
            <div className="flex flex-col gap-2 pt-1">
              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border bg-card text-foreground font-semibold text-sm shadow-sm"
              >
                <Sparkles className="w-4 h-4 text-amber-500" />
                Launch Interactive Demo
              </Link>
              <Link
                href="/pricing"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-sm shadow-md"
              >
                Get Started with Free Trial
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
