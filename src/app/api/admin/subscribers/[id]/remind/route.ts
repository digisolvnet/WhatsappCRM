import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { MOCK_SUBSCRIBERS, MOCK_PLATFORM_SETTINGS } from "@/lib/mock/data";
import { sendTextMessage } from "@/lib/whatsapp/meta-api";
import { decrypt } from "@/lib/whatsapp/encryption";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const isDemo =
      process.env.NEXT_PUBLIC_DEMO_MODE === "true" &&
      process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("placeholder-project");

    let sub: any = null;
    let template = MOCK_PLATFORM_SETTINGS.reminder_message_template;
    let defaultPayLink = MOCK_PLATFORM_SETTINGS.default_payment_link;

    if (isDemo) {
      sub = MOCK_SUBSCRIBERS.find((s) => s.id === id);
    } else {
      const supabase = await createClient();
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      const dbClient = serviceKey
        ? createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
            auth: { autoRefreshToken: false, persistSession: false },
          })
        : supabase;

      const { data: account } = await dbClient
        .from("accounts")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (account) {
        const { data: profs } = await dbClient
          .from("profiles")
          .select("full_name, email, role, account_role")
          .eq("account_id", id);

        const owner = (profs || []).find((p: any) => p.account_role === "owner" || p.role === "owner") || profs?.[0];
        sub = {
          ...account,
          owner_name: owner?.full_name || "Customer",
          owner_email: account.billing_email || owner?.email || "No email",
        };
      }

      // Fetch global reminder settings
      const { data: settings } = await supabase
        .from("platform_billing_settings")
        .select("*")
        .eq("id", "default")
        .single();

      if (settings?.reminder_message_template) {
        template = settings.reminder_message_template;
      }
      if (settings?.default_payment_link) {
        defaultPayLink = settings.default_payment_link;
      }
    }

    if (!sub) {
      return NextResponse.json({ error: "Subscriber not found" }, { status: 404 });
    }

    const recipientPhone = (body.phone || sub.billing_phone || "").replace(/[^\d+]/g, "");
    if (!recipientPhone) {
      return NextResponse.json(
        { error: "No billing phone number specified for this subscriber. Please add a phone number first." },
        { status: 400 }
      );
    }

    const payLink = sub.payment_link || defaultPayLink || "https://example.com/pay";
    const dueDateStr = sub.current_period_ends_at
      ? new Date(sub.current_period_ends_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "Due Soon";

    // Format custom message from template or body
    let messageText = body.customMessage;
    if (!messageText) {
      messageText = template
        .replace(/{{name}}/g, sub.owner_name || "Customer")
        .replace(/{{account_name}}/g, sub.name || "WaCRM")
        .replace(/{{due_date}}/g, dueDateStr)
        .replace(/{{amount}}/g, `${sub.currency || "USD"} ${sub.monthly_price || 49}`)
        .replace(/{{payment_link}}/g, payLink);
    }

    // Direct WhatsApp web link for one-click manual sending
    const cleanPhoneNoPlus = recipientPhone.replace(/^\+/, "");
    const directWhatsAppUrl = `https://wa.me/${cleanPhoneNoPlus}?text=${encodeURIComponent(messageText)}`;

    let sentViaApi = false;
    let apiError: string | null = null;

    if (!isDemo) {
      const supabase = await createClient();
      // Look up super admin's whatsapp config to send automated API message
      const { data: whatsappConfigs } = await supabase
        .from("whatsapp_config")
        .select("*")
        .eq("status", "connected")
        .limit(1);

      if (whatsappConfigs && whatsappConfigs.length > 0) {
        const config = whatsappConfigs[0];
        try {
          const token = decrypt(config.access_token);
          await sendTextMessage({
            phoneNumberId: config.phone_number_id,
            accessToken: token,
            to: recipientPhone,
            text: messageText,
          });
          sentViaApi = true;
        } catch (err: any) {
          apiError = err.message || "Meta API send failed";
        }
      }

      // Update last_reminder_sent_at on account
      await dbClient
        .from("accounts")
        .update({
          last_reminder_sent_at: new Date().toISOString(),
          reminder_count: (sub.reminder_count || 0) + 1,
        })
        .eq("id", id);
    } else {
      // In demo mode
      sentViaApi = true;
      sub.last_reminder_sent_at = new Date().toISOString();
      sub.reminder_count = (sub.reminder_count || 0) + 1;
    }

    return NextResponse.json({
      success: true,
      sentViaApi,
      apiError,
      messageText,
      recipientPhone,
      directWhatsAppUrl,
      last_reminder_sent_at: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to send reminder" }, { status: 500 });
  }
}
