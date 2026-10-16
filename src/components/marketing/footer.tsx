import Link from "next/link";
import Image from "next/image";
import { MessageSquare, ShieldCheck, Mail, Phone, ExternalLink } from "lucide-react";

export function MarketingFooter() {
  return (
    <footer className="border-t border-border bg-card/40 text-muted-foreground text-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand Info */}
          <div className="col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
                <Image
                  src="/brand-icon.png"
                  alt="DIGISOLVNET"
                  width={22}
                  height={22}
                  className="object-contain"
                />
              </div>
              <span className="text-base font-bold tracking-tight text-foreground">
                DIGISOLVNET WaCRM
              </span>
            </Link>
            <p className="text-sm leading-relaxed max-w-sm text-muted-foreground">
              Official WhatsApp Business Cloud API CRM platform. Multi-agent shared inbox, visual sales pipelines, no-code automation flows, and instant in-chat payment links.
            </p>
            <div className="flex flex-col gap-1.5 pt-2 text-xs">
              <div className="flex items-center gap-2 text-foreground/80">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Official Meta Cloud API • AES-256-GCM Encrypted</span>
              </div>
              <div className="flex items-center gap-2 text-foreground/80">
                <Mail className="w-4 h-4 text-emerald-500" />
                <span>support@digisolvnet.com</span>
              </div>
            </div>
          </div>

          {/* Product Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
              Product & Tools
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/features" className="hover:text-foreground transition-colors">
                  Shared Team Inbox
                </Link>
              </li>
              <li>
                <Link href="/features#pipelines" className="hover:text-foreground transition-colors">
                  Kanban Pipelines
                </Link>
              </li>
              <li>
                <Link href="/features#flows" className="hover:text-foreground transition-colors">
                  Visual Flow Builder
                </Link>
              </li>
              <li>
                <Link href="/features#broadcasts" className="hover:text-foreground transition-colors">
                  Broadcast Campaigns
                </Link>
              </li>
              <li>
                <Link href="/features#payments" className="hover:text-foreground transition-colors">
                  Razorpay In-Chat Links
                </Link>
              </li>
              <li>
                <Link href="/workflow" className="hover:text-foreground transition-colors">
                  Order & Sales Workflow
                </Link>
              </li>
            </ul>
          </div>

          {/* Solutions & Use Cases */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
              Industry Use Cases
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/use-cases#retail" className="hover:text-foreground transition-colors">
                  Retail & Local Shops
                </Link>
              </li>
              <li>
                <Link href="/use-cases#ecommerce" className="hover:text-foreground transition-colors">
                  D2C & E-Commerce
                </Link>
              </li>
              <li>
                <Link href="/use-cases#services" className="hover:text-foreground transition-colors">
                  Healthcare & Services
                </Link>
              </li>
              <li>
                <Link href="/use-cases#coaching" className="hover:text-foreground transition-colors">
                  Coaching & Edu-Tech
                </Link>
              </li>
              <li>
                <Link href="/use-cases#realestate" className="hover:text-foreground transition-colors">
                  Real Estate & Agencies
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Compliance */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
              Legal & Compliance
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/privacy" className="hover:text-foreground transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-foreground transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/subscription-policy" className="hover:text-foreground transition-colors">
                  Subscription & Cancellation
                </Link>
              </li>
              <li>
                <Link href="/refund-policy" className="hover:text-foreground transition-colors">
                  Refund Policy
                </Link>
              </li>
              <li>
                <Link href="/acceptable-use" className="hover:text-foreground transition-colors">
                  Acceptable Use Policy
                </Link>
              </li>
              <li>
                <Link href="/whatsapp-guide" className="hover:text-foreground transition-colors">
                  WhatsApp Cloud API Rules
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <p>© {new Date().getFullYear()} DIGISOLVNET. All rights reserved. Self-hostable & Hosted WhatsApp CRM.</p>
          <div className="flex items-center gap-6">
            <Link href="/about" className="hover:text-foreground transition-colors">
              About Us
            </Link>
            <Link href="/contact" className="hover:text-foreground transition-colors">
              Support & Contact
            </Link>
            <Link href="/docs" className="hover:text-foreground transition-colors">
              Documentation
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
