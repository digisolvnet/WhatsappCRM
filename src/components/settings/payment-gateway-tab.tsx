'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { CreditCard, Eye, EyeOff, Key, Copy, Check, ShieldCheck, Zap } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { SettingsPanelHead } from './settings-panel-head';

export function PaymentGatewayTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [keyId, setKeyId] = useState('');
  const [keySecret, setKeySecret] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  const webhookUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/api/payments/razorpay/webhook`
      : '/api/payments/razorpay/webhook';

  useEffect(() => {
    async function loadConfig() {
      try {
        setLoading(true);
        const res = await fetch('/api/payments/config');
        const data = await res.json();
        if (res.ok && data.gateway) {
          setIsActive(data.gateway.is_active ?? true);
          setKeyId(data.gateway.key_id || '');
          setKeySecret(data.gateway.key_secret_masked || data.gateway.key_secret || '');
          setWebhookSecret(data.gateway.webhook_secret || '');
        }
      } catch (err: any) {
        console.error('Failed to load gateway config:', err);
      } finally {
        setLoading(false);
      }
    }
    loadConfig();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyId.trim()) {
      toast.error('Please enter your Razorpay Key ID');
      return;
    }

    try {
      setSaving(true);
      const res = await fetch('/api/payments/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_active: isActive,
          key_id: keyId.trim(),
          key_secret: keySecret.trim(),
          webhook_secret: webhookSecret.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success('Razorpay gateway settings saved successfully!');
      } else {
        toast.error(data.error || 'Failed to save gateway settings');
      }
    } catch (err: any) {
      toast.error(err.message || 'An error occurred while saving');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    toast.success('Webhook URL copied to clipboard');
    setTimeout(() => setCopiedWebhook(false), 2500);
  };

  return (
    <div className="space-y-6">
      <SettingsPanelHead
        title="Payment Gateway (Razorpay)"
        description="Connect your Razorpay account to generate payment links and collect payments from customers directly in WhatsApp chat."
      />

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base">Razorpay Integration</CardTitle>
                  <CardDescription className="text-xs">
                    Accept UPI, Credit/Debit Cards, NetBanking, and Wallets
                  </CardDescription>
                </div>
              </div>
              <div>
                {keyId ? (
                  <Badge variant={isActive ? 'default' : 'secondary'} className={isActive ? 'bg-emerald-600 hover:bg-emerald-600' : ''}>
                    {isActive ? 'Active' : 'Disabled'}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    Not Configured
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                Loading payment gateway configuration...
              </div>
            ) : (
              <form onSubmit={handleSave} className="space-y-5">
                <div className="flex items-center justify-between rounded-lg border border-border p-4 bg-muted/20">
                  <div className="space-y-0.5">
                    <Label htmlFor="active-toggle" className="text-sm font-medium">
                      Enable In-Chat Payments
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      When enabled, agents can create and send Razorpay payment links directly to WhatsApp conversations.
                    </p>
                  </div>
                  <Switch
                    id="active-toggle"
                    checked={isActive}
                    onCheckedChange={setIsActive}
                  />
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="key-id" className="text-xs font-medium">
                      Razorpay Key ID <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="key-id"
                      placeholder="rzp_live_... or rzp_test_..."
                      value={keyId}
                      onChange={(e) => setKeyId(e.target.value)}
                      className="font-mono text-xs"
                      required
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Found in Razorpay Dashboard → Settings → API Keys.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="key-secret" className="text-xs font-medium">
                      Razorpay Key Secret <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="key-secret"
                        type={showSecret ? 'text' : 'password'}
                        placeholder="Key secret generated from Razorpay Dashboard"
                        value={keySecret}
                        onChange={(e) => setKeySecret(e.target.value)}
                        className="font-mono text-xs pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSecret(!showSecret)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Kept securely encrypted. Never exposed to customers or unauthorized members.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="webhook-secret" className="text-xs font-medium">
                      Webhook Secret (Optional)
                    </Label>
                    <Input
                      id="webhook-secret"
                      placeholder="Secret key configured in Razorpay Webhooks"
                      value={webhookSecret}
                      onChange={(e) => setWebhookSecret(e.target.value)}
                      className="font-mono text-xs"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Used to cryptographically verify instant payment callbacks from Razorpay.
                    </p>
                  </div>

                  <div className="rounded-lg border border-border bg-muted/40 p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-emerald-400" />
                        <span className="text-xs font-semibold">Your Razorpay Webhook URL</span>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleCopyWebhook}
                        className="h-7 text-xs gap-1"
                      >
                        {copiedWebhook ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                        {copiedWebhook ? 'Copied' : 'Copy URL'}
                      </Button>
                    </div>
                    <code className="block rounded bg-background/80 px-2.5 py-1.5 text-[11px] font-mono break-all border border-border text-foreground">
                      {webhookUrl}
                    </code>
                    <p className="text-[11px] text-muted-foreground">
                      Add this URL in Razorpay Dashboard → Settings → Webhooks. Enable the <code className="text-foreground">payment_link.paid</code> event so CRM chats update instantly when customers pay.
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button type="submit" disabled={saving} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs">
                    {saving ? 'Saving...' : 'Save Razorpay Credentials'}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-start gap-3">
              <ShieldCheck className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs">
                <span className="font-semibold text-foreground">
                  Direct Merchant Settlement
                </span>
                <p className="text-muted-foreground leading-relaxed">
                  All customer payments collected through in-chat payment links are settled directly into your linked bank account by Razorpay. WaCRM does not hold or deduct transaction fees from your payments.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
