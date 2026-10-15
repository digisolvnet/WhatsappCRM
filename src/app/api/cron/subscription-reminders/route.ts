import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  MOCK_SUBSCRIBERS,
  MOCK_PLATFORM_SETTINGS,
  MOCK_CONTACTS,
  MOCK_CONVERSATIONS,
  MOCK_MESSAGES,
  MOCK_USER_ID,
  MOCK_ACCOUNT_ID,
} from "@/lib/mock/data";
import { sendTextMessage } from "@/lib/whatsapp/meta-api";
import { decrypt } from "@/lib/whatsapp/encryption";

export const maxDuration = 60;

export async function GET(request: Request) {
  return handleCronReminders(request);
}

export async function POST(request: Request) {
  return handleCronReminders(request);
}

async function handleCronReminders(request: Request) {
  try {
    const isDemo = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
    const now = new Date();
    const results: Array<{
      accountId: string;
      accountName: string;
      daysRemaining: number;
      action: string;
      phone?: string;
      status: string;
    }> = [];

    if (isDemo) {
      // Process mock subscribers for demo
      for (const sub of MOCK_SUBSCRIBERS) {
        if (!sub.auto_reminder_enabled) continue;

        const expiry = new Date(sub.current_period_ends_at);
        const diffMs = expiry.getTime() - now.getTime();
        const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        // Skip if already sent reminder in the last 24 hours
        if (sub.last_reminder_sent_at) {
          const lastSent = new Date(sub.last_reminder_sent_at);
          if (now.getTime() - lastSent.getTime() < 24 * 3600 * 1000) {
            continue;
          }
        }

        if (daysRemaining <= 3 && daysRemaining >= 0) {
          sub.last_reminder_sent_at = now.toISOString();
          sub.reminder_count = (sub.reminder_count || 0) + 1;
          results.push({
            accountId: sub.id,
            accountName: sub.name,
            daysRemaining,
            action: `Sent ${daysRemaining}-day payment reminder`,
            phone: sub.billing_phone,
            status: "sent_demo",
          });

          // Sync into mock CRM Inbox
          const template = MOCK_PLATFORM_SETTINGS.reminder_message_template;
          const dueDateStr = expiry.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
          const payLink = sub.payment_link || MOCK_PLATFORM_SETTINGS.default_payment_link || "https://example.com/pay";
          const msgText = template
            .replace(/{{name}}/g, sub.owner_name || sub.name)
            .replace(/{{account_name}}/g, sub.name)
            .replace(/{{due_date}}/g, dueDateStr)
            .replace(/{{amount}}/g, `$${sub.monthly_price || 49}`)
            .replace(/{{payment_link}}/g, payLink);

          const convId = `conv-sub-${sub.id}`;
          const contactId = `contact-sub-${sub.id}`;
          let contact = MOCK_CONTACTS.find((c) => c.id === contactId || c.phone === sub.billing_phone);
          if (!contact) {
            contact = {
              id: contactId,
              user_id: MOCK_USER_ID,
              account_id: MOCK_ACCOUNT_ID,
              phone: sub.billing_phone || "+10000000000",
              name: sub.owner_name || sub.name,
              email: sub.owner_email || "",
              company: sub.name,
              created_at: now.toISOString(),
              updated_at: now.toISOString(),
              tags: [],
            };
            MOCK_CONTACTS.unshift(contact);
          }

          let conv = MOCK_CONVERSATIONS.find((c) => c.id === convId);
          if (!conv) {
            conv = {
              id: convId,
              account_id: MOCK_ACCOUNT_ID,
              user_id: MOCK_USER_ID,
              contact_id: contact.id,
              status: "open",
              last_message_text: msgText,
              last_message_at: now.toISOString(),
              unread_count: 0,
              created_at: now.toISOString(),
              updated_at: now.toISOString(),
              contact,
            };
            MOCK_CONVERSATIONS.unshift(conv);
          } else {
            conv.last_message_text = msgText;
            conv.last_message_at = now.toISOString();
            const idx = MOCK_CONVERSATIONS.indexOf(conv);
            if (idx > 0) {
              MOCK_CONVERSATIONS.splice(idx, 1);
              MOCK_CONVERSATIONS.unshift(conv);
            }
          }

          if (!MOCK_MESSAGES[convId]) MOCK_MESSAGES[convId] = [];
          MOCK_MESSAGES[convId].push({
            id: `msg-${Date.now()}-${sub.id}`,
            conversation_id: convId,
            sender_type: "agent",
            content_type: "text",
            content_text: msgText,
            created_at: now.toISOString(),
            status: "delivered",
          });
        } else if (daysRemaining < 0 && sub.subscription_status !== "suspended") {
          sub.subscription_status = "past_due";
          sub.last_reminder_sent_at = now.toISOString();
          sub.reminder_count = (sub.reminder_count || 0) + 1;
          results.push({
            accountId: sub.id,
            accountName: sub.name,
            daysRemaining,
            action: "Marked past_due and sent expiry alert",
            phone: sub.billing_phone,
            status: "past_due_demo",
          });
        }
      }

      return NextResponse.json({
        success: true,
        mode: "demo",
        timestamp: now.toISOString(),
        totalProcessed: results.length,
        reminders: results,
      });
    }

    // Production logic with Supabase
    const supabase = await createClient();

    // 1. Fetch platform settings
    const { data: settings } = await supabase
      .from("platform_billing_settings")
      .select("*")
      .eq("id", "default")
      .single();

    const template = settings?.reminder_message_template || MOCK_PLATFORM_SETTINGS.reminder_message_template;
    const defaultPayLink = settings?.default_payment_link || "";

    // 2. Fetch connected Super Admin WhatsApp config
    const { data: whatsappConfigs } = await supabase
      .from("whatsapp_config")
      .select("*")
      .eq("status", "connected")
      .limit(1);

    const senderConfig = whatsappConfigs?.[0] || null;

    // 3. Fetch accounts needing reminders
    const { data: accounts, error: accError } = await supabase
      .from("accounts")
      .select("*, profiles!profiles_account_id_fkey(full_name, email, role)")
      .in("subscription_status", ["active", "trial", "past_due"])
      .eq("auto_reminder_enabled", true);

    if (accError) {
      return NextResponse.json({ error: accError.message }, { status: 500 });
    }

    for (const acc of accounts || []) {
      const expiry = new Date(acc.current_period_ends_at);
      const diffMs = expiry.getTime() - now.getTime();
      const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      // Skip if reminded within last 24 hours
      if (acc.last_reminder_sent_at) {
        const lastSent = new Date(acc.last_reminder_sent_at);
        if (now.getTime() - lastSent.getTime() < 24 * 3600 * 1000) {
          continue;
        }
      }

      // Check if due within 3 days or expired
      const shouldRemind = daysRemaining <= 3;
      if (!shouldRemind) continue;

      const owner = Array.isArray(acc.profiles)
        ? acc.profiles.find((p: any) => p.role === "owner") || acc.profiles[0]
        : null;

      const recipientPhone = (acc.billing_phone || "").replace(/[^\d+]/g, "");
      const payLink = acc.payment_link || defaultPayLink;
      const dueDateStr = expiry.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

      const messageText = template
        .replace(/{{name}}/g, owner?.full_name || "Customer")
        .replace(/{{account_name}}/g, acc.name)
        .replace(/{{due_date}}/g, dueDateStr)
        .replace(/{{amount}}/g, `${acc.currency || "USD"} ${acc.monthly_price || 49}`)
        .replace(/{{payment_link}}/g, payLink);

      let sendStatus = "skipped_no_phone";

      if (recipientPhone && senderConfig) {
        try {
          const token = decrypt(senderConfig.access_token);
          await sendTextMessage({
            phoneNumberId: senderConfig.phone_number_id,
            accessToken: token,
            to: recipientPhone,
            text: messageText,
          });
          sendStatus = "delivered";
        } catch (err: any) {
          sendStatus = `failed: ${err.message}`;
        }

        // Record automated reminder directly into CRM Inbox
        if (senderConfig.account_id) {
          try {
            let contactId: string | null = null;
            let conversationId: string | null = null;

            const { data: existingContact } = await supabase
              .from("contacts")
              .select("id")
              .eq("account_id", senderConfig.account_id)
              .eq("phone", recipientPhone)
              .maybeSingle();

            if (existingContact?.id) {
              contactId = existingContact.id;
            } else {
              const { data: newContact } = await supabase
                .from("contacts")
                .insert({
                  account_id: senderConfig.account_id,
                  user_id: senderConfig.user_id,
                  phone: recipientPhone,
                  name: owner?.full_name || acc.name,
                  email: acc.billing_email || owner?.email || null,
                  company: acc.name,
                })
                .select("id")
                .maybeSingle();
              if (newContact?.id) contactId = newContact.id;
            }

            if (contactId) {
              const { data: existingConv } = await supabase
                .from("conversations")
                .select("id")
                .eq("account_id", senderConfig.account_id)
                .eq("contact_id", contactId)
                .maybeSingle();

              if (existingConv?.id) {
                conversationId = existingConv.id;
              } else {
                const { data: newConv } = await supabase
                  .from("conversations")
                  .insert({
                    account_id: senderConfig.account_id,
                    user_id: senderConfig.user_id,
                    contact_id: contactId,
                    status: "open",
                    last_message_text: messageText,
                    last_message_at: now.toISOString(),
                  })
                  .select("id")
                  .maybeSingle();
                if (newConv?.id) conversationId = newConv.id;
              }

              if (conversationId) {
                await supabase
                  .from("messages")
                  .insert({
                    account_id: senderConfig.account_id,
                    conversation_id: conversationId,
                    sender_type: "agent",
                    sender_id: senderConfig.user_id,
                    content_type: "text",
                    content_text: messageText,
                    status: sendStatus === "delivered" ? "delivered" : "sent",
                    created_at: now.toISOString(),
                  });

                await supabase
                  .from("conversations")
                  .update({
                    last_message_text: messageText,
                    last_message_at: now.toISOString(),
                    status: "open",
                    updated_at: now.toISOString(),
                  })
                  .eq("id", conversationId);
              }
            }
          } catch (inboxErr) {
            console.warn("[Cron Reminders] Could not log message to inbox:", inboxErr);
          }
        }
      }

      // If expired beyond 2 days grace period, mark past_due
      let newStatus = acc.subscription_status;
      if (daysRemaining < 0 && acc.subscription_status === "active") {
        newStatus = "past_due";
      }

      await supabase
        .from("accounts")
        .update({
          subscription_status: newStatus,
          last_reminder_sent_at: now.toISOString(),
          reminder_count: (acc.reminder_count || 0) + 1,
        })
        .eq("id", acc.id);

      results.push({
        accountId: acc.id,
        accountName: acc.name,
        daysRemaining,
        action: daysRemaining >= 0 ? `Sent reminder (${daysRemaining}d left)` : "Sent past-due notice",
        phone: recipientPhone,
        status: sendStatus,
      });
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      totalProcessed: results.length,
      reminders: results,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Cron job failed" }, { status: 500 });
  }
}
