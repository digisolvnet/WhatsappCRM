"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  CheckCircle2,
  HelpCircle,
  X,
  ChevronRight,
  ChevronLeft,
  Key,
  Webhook,
  Settings,
  Send,
  ShieldCheck,
  Smartphone,
  Layers,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

interface SetupGuideModalProps {
  forceOpen?: boolean;
  onClose?: () => void;
}

export function SetupGuideModal({ forceOpen, onClose }: SetupGuideModalProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Auto-compute webhook callback URL based on current browser window domain
  const [webhookUrl, setWebhookUrl] = useState("https://your-domain.com/api/whatsapp/webhook");
  const verifyToken = "wacrm_verify_token_2026";

  useEffect(() => {
    if (typeof window !== "undefined") {
      setWebhookUrl(`${window.location.origin}/api/whatsapp/webhook`);

      // Check if user already dismissed the guide on first visit
      const isDismissed = localStorage.getItem("wacrm:setup-guide-dismissed");
      if (!isDismissed && forceOpen === undefined) {
        // Automatically pop up for new users / first-time setup
        setIsOpen(true);
      } else if (forceOpen !== undefined) {
        setIsOpen(forceOpen);
      }

      // Listen for custom event to trigger guide from Header or Settings anytime
      const handleOpenEvent = () => {
        setIsOpen(true);
      };
      window.addEventListener("wacrm:open-setup-guide", handleOpenEvent);
      return () => {
        window.removeEventListener("wacrm:open-setup-guide", handleOpenEvent);
      };
    }
  }, [forceOpen]);

  const handleCopy = (text: string, key: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  const handleClose = () => {
    if (dontShowAgain && typeof window !== "undefined") {
      localStorage.setItem("wacrm:setup-guide-dismissed", "true");
    }
    setIsOpen(false);
    if (onClose) onClose();
  };

  if (!isOpen) return null;

  const totalSteps = 4;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-2xl border border-border bg-card text-card-foreground shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/80 px-6 py-4 bg-gradient-to-r from-emerald-500/10 via-primary/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
                WhatsApp CRM Setup Guide
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">
                  Getting Started
                </span>
              </h2>
              <p className="text-xs text-muted-foreground">
                Step-by-step instructions to configure Meta Cloud API & start messaging
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step Progress Bar */}
        <div className="grid grid-cols-4 border-b border-border/60 bg-muted/30 text-xs">
          {[
            { step: 1, title: "1. Meta Credentials", icon: Key },
            { step: 2, title: "2. Webhook Setup", icon: Webhook },
            { step: 3, title: "3. Connect in CRM", icon: Settings },
            { step: 4, title: "4. Send Message", icon: Send },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = currentStep === item.step;
            const isCompleted = currentStep > item.step;
            return (
              <button
                key={item.step}
                onClick={() => setCurrentStep(item.step)}
                className={`flex items-center justify-center gap-2 py-2.5 px-2 transition-all font-medium border-b-2 text-center ${
                  isActive
                    ? "border-emerald-500 text-emerald-400 bg-emerald-500/10"
                    : isCompleted
                    ? "border-emerald-500/40 text-muted-foreground hover:text-foreground"
                    : "border-transparent text-muted-foreground/60 hover:text-muted-foreground"
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                )}
                <span className="truncate">{item.title}</span>
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-sm leading-relaxed">
          {/* STEP 1: Meta Cloud API Setup */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-4">
                <h3 className="font-semibold text-blue-300 flex items-center gap-2 text-sm">
                  <Smartphone className="h-4 w-4" />
                  क्या-क्या चाहिए और कहाँ से मिलेगा? (Required Credentials)
                </h3>
                <p className="mt-1 text-xs text-blue-200/80">
                  WhatsApp Cloud API का इस्तेमाल करने के लिए आपको Meta (Facebook) Developers से 3 चीज़ें चाहिए होंगी:
                </p>
              </div>

              <div className="grid gap-3">
                <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="inline-flex items-center rounded-md bg-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-400">
                        Step 1.1
                      </span>
                      <h4 className="font-semibold text-foreground mt-1">
                        Meta Developer Account बनाएं या लॉगिन करें
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Meta Developers Portal पर जाकर अपना अकाउंट लॉगिन करें और एक नया App बनाएं (Type: Other → Business → Add WhatsApp).
                      </p>
                    </div>
                    <a
                      href="https://developers.facebook.com/apps/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 border border-primary/20 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-all shrink-0"
                    >
                      Open Portal <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                  <span className="inline-flex items-center rounded-md bg-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-400">
                    Step 1.2
                  </span>
                  <h4 className="font-semibold text-foreground">
                    Meta App से ये 3 चीज़ें Copy करें:
                  </h4>
                  <ul className="space-y-2 text-xs">
                    <li className="flex items-start gap-2">
                      <span className="font-semibold text-foreground shrink-0">1. Phone Number ID:</span>
                      <span className="text-muted-foreground">
                        Meta App Dashboard में WhatsApp → <b>API Setup</b> में आपका Phone Number ID दिखेगा।
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-semibold text-foreground shrink-0">2. WABA ID:</span>
                      <span className="text-muted-foreground">
                        API Setup पेज पर ही WhatsApp Business Account ID दिखेगा।
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-semibold text-foreground shrink-0">3. Permanent Access Token:</span>
                      <span className="text-muted-foreground">
                        Temporary token 24 घंटे में expire हो जाता है। Permanent token के लिए Meta Business Suite में <b>System User</b> बनाएं और उसे <code>whatsapp_business_messaging</code> की permission देकर Token generate करें।
                      </span>
                    </li>
                  </ul>
                  <a
                    href="https://business.facebook.com/settings/system-users"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:underline font-medium"
                  >
                    Generate Permanent Token in Business Settings <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Webhook Setup */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                <h3 className="font-semibold text-emerald-300 flex items-center gap-2 text-sm">
                  <Webhook className="h-4 w-4" />
                  Meta Dashboard में Webhook सेट करें (Receive Incoming Messages)
                </h3>
                <p className="mt-1 text-xs text-emerald-200/80">
                  जब भी ग्राहक WhatsApp पर मैसेज भेजेगा, Meta इस Webhook URL पर डाटा भेजेगा।
                </p>
              </div>

              <div className="space-y-3">
                <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                  <label className="text-xs font-semibold text-foreground">
                    1. Callback URL (Meta Webhook में पेस्ट करें):
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={webhookUrl}
                      className="flex-1 rounded-lg border border-border bg-muted/50 px-3 py-2 font-mono text-xs text-foreground select-all focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopy(webhookUrl, "webhookUrl")}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-600 transition-colors shrink-0"
                    >
                      {copiedKey === "webhookUrl" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      Copy URL
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                  <label className="text-xs font-semibold text-foreground">
                    2. Verify Token (Meta Webhook में पेस्ट करें):
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={verifyToken}
                      className="flex-1 rounded-lg border border-border bg-muted/50 px-3 py-2 font-mono text-xs text-foreground select-all focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopy(verifyToken, "verifyToken")}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-600 transition-colors shrink-0"
                    >
                      {copiedKey === "verifyToken" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      Copy Token
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-border/80 bg-muted/20 p-3 text-xs space-y-1.5">
                  <p className="font-semibold text-foreground">Meta Dashboard में ये स्टेप्स करें:</p>
                  <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                    <li>Meta App में जाएँ → WhatsApp → <b>Configuration</b> खोलें।</li>
                    <li>Webhook सेक्शन में <b>Edit</b> पर क्लिक करें।</li>
                    <li>ऊपर दिया गया <b>Callback URL</b> और <b>Verify Token</b> पेस्ट करें और <b>Verify and Save</b> दबाएँ।</li>
                    <li>Webhook Fields में जाकर <b>messages</b> फील्ड को <b>Subscribe</b> करें।</li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Connect in CRM */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="rounded-xl border border-purple-500/20 bg-purple-500/10 p-4">
                <h3 className="font-semibold text-purple-300 flex items-center gap-2 text-sm">
                  <Settings className="h-4 w-4" />
                  CRM Settings में Meta Credentials सेव करें
                </h3>
                <p className="mt-1 text-xs text-purple-200/80">
                  Meta से लिए गए Credentials को अपने CRM Settings में सेव करके कनेक्शन टेस्ट करें।
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-5 space-y-4 text-xs">
                <ol className="space-y-3">
                  <li className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary font-bold text-[11px]">
                      1
                    </span>
                    <div>
                      <p className="font-semibold text-foreground">WhatsApp Settings खोलें</p>
                      <p className="text-muted-foreground mt-0.5">
                        नीचे दिए गए बटन पर क्लिक करके सीधे Settings → WhatsApp टैब पर जाएँ।
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary font-bold text-[11px]">
                      2
                    </span>
                    <div>
                      <p className="font-semibold text-foreground">Credentials पेस्ट करें</p>
                      <p className="text-muted-foreground mt-0.5">
                        Phone Number ID, WhatsApp Business Account ID और Permanent Access Token को पेस्ट करें।
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary font-bold text-[11px]">
                      3
                    </span>
                    <div>
                      <p className="font-semibold text-foreground">Test Connection & Save</p>
                      <p className="text-muted-foreground mt-0.5">
                        <b>Test Connection</b> पर क्लिक करें। हरा टिक आते ही <b>Save Changes</b> दबाएँ।
                      </p>
                    </div>
                  </li>
                </ol>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      handleClose();
                      router.push("/settings?tab=whatsapp");
                    }}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 py-2.5 text-xs font-bold text-white hover:bg-emerald-600 shadow-md shadow-emerald-500/20 transition-all"
                  >
                    Go to WhatsApp Settings Page <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: First Template & Start Messaging */}
          {currentStep === 4 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                <h3 className="font-semibold text-emerald-300 flex items-center gap-2 text-sm">
                  <Send className="h-4 w-4" />
                  सब सेट हो गया! अब पहला मैसेज भेजें (Start Messaging)
                </h3>
                <p className="mt-1 text-xs text-emerald-200/80">
                  आपका WhatsApp CRM तैयार है। नए कस्टमर को मैसेज भेजने के लिए Meta Approved Template की आवश्यकता होती है।
                </p>
              </div>

              <div className="grid gap-3 text-xs">
                <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                  <h4 className="font-semibold text-foreground flex items-center gap-2">
                    <Layers className="h-4 w-4 text-emerald-400" />
                    Templates Sync करें
                  </h4>
                  <p className="text-muted-foreground">
                    Meta WhatsApp Manager में बने approved templates को CRM में लाने के लिए Settings → Templates में जाकर <b>Sync Templates</b> बटन दबाएँ।
                  </p>
                </div>

                <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                  <h4 className="font-semibold text-foreground flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-emerald-400" />
                    Contacts Add करें और मैसेज भेजें
                  </h4>
                  <p className="text-muted-foreground">
                    Contacts सेक्शन में जाकर नया नंबर जोड़ें (+91 के साथ) या CSV फाइल इंपोर्ट करें। फिर Inbox में जाकर सीधे चैट करें।
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-border/80 bg-muted/20 p-4 text-center space-y-2">
                <p className="text-xs text-foreground font-semibold">
                  🎉 Ready to Grow Your Business!
                </p>
                <p className="text-[11px] text-muted-foreground">
                  किसी भी समय इस गाइड को दोबारा खोलने के लिए ऊपर हेडर में दिए गए <b>Setup Guide</b> बटन पर क्लिक करें।
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between border-t border-border/80 px-6 py-3.5 bg-muted/30">
          <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-muted-foreground hover:text-foreground">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="rounded border-border text-emerald-500 focus:ring-emerald-500 h-3.5 w-3.5"
            />
            Don't show this popup on startup
          </label>

          <div className="flex items-center gap-2">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => prev - 1)}
                className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Back
              </button>
            )}

            {currentStep < totalSteps ? (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => prev + 1)}
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-600 transition-colors shadow-sm"
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleClose}
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-600 transition-colors shadow-sm"
              >
                Done / Finish <Check className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
