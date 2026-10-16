"use client";

import { useState } from "react";
import { Mail, Phone, MessageSquare, Clock, CheckCircle2, Send, ShieldCheck } from "lucide-react";
import { MarketingNavbar } from "@/components/marketing/navbar";
import { MarketingFooter } from "@/components/marketing/footer";

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    businessType: "retail",
    message: "",
  });

  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulate submission without collecting card info
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
    }, 700);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground antialiased selection:bg-emerald-500/20 selection:text-emerald-500">
      <MarketingNavbar />
      <main className="flex-1 py-16 lg:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 space-y-12">
          {/* Header */}
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-semibold uppercase tracking-wider">
              Get in Touch
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground">
              Contact Our Sales & Support Team
            </h1>
            <p className="text-base text-muted-foreground leading-relaxed">
              Have technical questions, need custom enterprise onboarding, or want to verify your Meta Business Manager setup? We are here to assist.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12 items-start">
            {/* Left Column: Direct Channels & Support SLA (5 cols) */}
            <div className="md:col-span-5 space-y-6">
              <div className="p-6 rounded-3xl border border-border bg-card space-y-6 shadow-sm">
                <h2 className="text-lg font-bold text-foreground">
                  Support Channels
                </h2>

                <div className="space-y-4 text-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center shrink-0">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">Email Support</div>
                      <div className="text-muted-foreground text-xs">support@digisolvnet.com</div>
                      <div className="text-[11px] text-muted-foreground/80 mt-0.5">Response SLA: Within 24-48 hours</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center shrink-0">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">Official WhatsApp Desk</div>
                      <a
                        href="https://wa.me/919876543210?text=Hello%20DIGISOLVNET%20Team%2C%20I%20have%20an%20inquiry%20regarding%20WaCRM."
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-emerald-500 hover:underline font-medium"
                      >
                        Click to chat on WhatsApp →
                      </a>
                      <div className="text-[11px] text-muted-foreground/80 mt-0.5">Business hours: 10 AM - 7 PM IST</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center shrink-0">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">Operating Days</div>
                      <div className="text-muted-foreground text-xs">Monday to Saturday</div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-border flex items-center gap-2 text-xs text-muted-foreground">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>No spam, guaranteed. Inquiries handled by technical specialists.</span>
                </div>
              </div>
            </div>

            {/* Right Column: Accessible Lead Inquiry Form (7 cols) */}
            <div className="md:col-span-7">
              <div className="p-8 rounded-3xl border border-border bg-card/80 backdrop-blur-sm shadow-xl">
                {submitted ? (
                  <div className="py-12 text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h3 className="text-2xl font-bold text-foreground">
                      Inquiry Received Successfully!
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                      Thank you, <strong className="text-foreground">{formData.name}</strong>. A DIGISOLVNET solutions specialist will review your details and reach out via WhatsApp/Email shortly.
                    </p>
                    <button
                      type="button"
                      onClick={() => setSubmitted(false)}
                      className="mt-4 px-4 py-2 rounded-xl border border-border bg-muted/60 text-xs font-semibold text-foreground hover:bg-muted"
                    >
                      Send Another Message
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <h2 className="text-xl font-bold text-foreground mb-2">
                      Send Us a Message
                    </h2>

                    <div>
                      <label htmlFor="name" className="block text-xs font-semibold text-foreground mb-1.5">
                        Your Full Name <span className="text-destructive">*</span>
                      </label>
                      <input
                        id="name"
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g. Ramesh Verma"
                        className="w-full text-sm bg-muted/40 border border-border rounded-xl px-4 py-2.5 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="email" className="block text-xs font-semibold text-foreground mb-1.5">
                          Work Email <span className="text-destructive">*</span>
                        </label>
                        <input
                          id="email"
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="name@business.com"
                          className="w-full text-sm bg-muted/40 border border-border rounded-xl px-4 py-2.5 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <div>
                        <label htmlFor="phone" className="block text-xs font-semibold text-foreground mb-1.5">
                          WhatsApp Phone <span className="text-destructive">*</span>
                        </label>
                        <input
                          id="phone"
                          type="tel"
                          required
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="+91 98765 43210"
                          className="w-full text-sm bg-muted/40 border border-border rounded-xl px-4 py-2.5 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="businessType" className="block text-xs font-semibold text-foreground mb-1.5">
                        Business Industry
                      </label>
                      <select
                        id="businessType"
                        value={formData.businessType}
                        onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                        className="w-full text-sm bg-muted/40 border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="retail">Retail Store / Local Shop</option>
                        <option value="ecommerce">E-Commerce / D2C Brand</option>
                        <option value="services">Healthcare / Clinic / Salon</option>
                        <option value="coaching">Coaching / Institute / Educator</option>
                        <option value="realestate">Real Estate / Agency / B2B</option>
                        <option value="other">Other Business</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="message" className="block text-xs font-semibold text-foreground mb-1.5">
                        How can we help your business? <span className="text-destructive">*</span>
                      </label>
                      <textarea
                        id="message"
                        required
                        rows={4}
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        placeholder="Tell us about your team size, WhatsApp message volume, or specific automation requirements..."
                        className="w-full text-sm bg-muted/40 border border-border rounded-xl px-4 py-2.5 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full inline-flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-500 shadow-md shadow-emerald-600/20 transition-all disabled:opacity-60"
                    >
                      {isSubmitting ? (
                        <span>Submitting...</span>
                      ) : (
                        <>
                          <span>Submit Inquiry</span>
                          <Send className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
