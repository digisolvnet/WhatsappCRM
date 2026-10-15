import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
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
    let dbClient: any = null;
    let user: any = null;

    if (isDemo) {
      sub = MOCK_SUBSCRIBERS.find((s) => s.id === id);
    } else {
      const supabase = await createClient();
      const authRes = await supabase.auth.getUser();
      user = authRes.data.user;
      const authError = authRes.error;

      if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      // Verify Super Admin access
      let isDbSuperAdmin = false;
      try {
        const { data: pRole } = await supabase
          .from("profiles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle();
        if (pRole?.role === "super_admin") isDbSuperAdmin = true;

        const { data: pAdmin } = await supabase
          .from("profiles")
          .select("is_super_admin")
          .eq("user_id", user.id)
          .maybeSingle();
        if (pAdmin?.is_super_admin) isDbSuperAdmin = true;
      } catch {}

      const adminEmailsRaw = process.env.SUPER_ADMIN_EMAILS || process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAILS || "support@digisolvnet.com";
      const allowedEmails = adminEmailsRaw?.split(",").map((e) => e.trim().toLowerCase()) || [];
      const isSuperAdmin =
        isDbSuperAdmin ||
        (user.email && allowedEmails.includes(user.email.toLowerCase()));

      if (!isSuperAdmin) {
        return NextResponse.json({ error: "Forbidden: Super Admin access required" }, { status: 403 });
      }

      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      dbClient = serviceKey
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
      const { data: settings } = await dbClient
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
    let conversationId: string | null = null;

    if (!isDemo && dbClient) {
      // 1. Send automated WhatsApp API message if connected
      const { data: whatsappConfigs } = await dbClient
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

      // 2. Log & share message directly inside the CRM Inbox!
      try {
        // Resolve Super Admin's account
        let adminAccountId: string | null = null;
        const { data: adminProf } = await dbClient
          .from("profiles")
          .select("account_id")
          .eq("user_id", user.id)
          .maybeSingle();
        adminAccountId = adminProf?.account_id || null;

        if (!adminAccountId && whatsappConfigs?.[0]?.account_id) {
          adminAccountId = whatsappConfigs[0].account_id;
        }

        if (!adminAccountId) {
          const { data: adminAcc } = await dbClient
            .from("accounts")
            .select("id")
            .eq("owner_user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          adminAccountId = adminAcc?.id || null;
        }

        if (!adminAccountId) {
          adminAccountId = sub.id;
        }

        // Sync to both Super Admin workspace and customer's workspace
        const targetAccountIds = Array.from(new Set([adminAccountId, sub.id].filter(Boolean))) as string[];
        for (const targetAccId of targetAccountIds) {
          try {
            let contactId: string | null = null;
            let convId: string | null = null;

            // Find or create Contact in workspace
            const { data: existingContact } = await dbClient
              .from("contacts")
              .select("id")
              .eq("account_id", targetAccId)
              .eq("phone", recipientPhone)
              .maybeSingle();

            if (existingContact?.id) {
              contactId = existingContact.id;
            } else {
              const { data: newContact } = await dbClient
                .from("contacts")
                .insert({
                  account_id: targetAccId,
                  user_id: user.id,
                  phone: recipientPhone,
                  name: sub.owner_name || sub.name,
                  email: sub.owner_email && sub.owner_email !== "No email" ? sub.owner_email : null,
                  company: sub.name,
                })
                .select("id")
                .maybeSingle();
              if (newContact?.id) contactId = newContact.id;
            }

            if (contactId) {
              // Find or create Conversation
              const { data: existingConv } = await dbClient
                .from("conversations")
                .select("id")
                .eq("account_id", targetAccId)
                .eq("contact_id", contactId)
                .maybeSingle();

              if (existingConv?.id) {
                convId = existingConv.id;
              } else {
                const { data: newConv } = await dbClient
                  .from("conversations")
                  .insert({
                    account_id: targetAccId,
                    user_id: user.id,
                    contact_id: contactId,
                    status: "open",
                    last_message_text: messageText,
                    last_message_at: new Date().toISOString(),
                  })
                  .select("id")
                  .maybeSingle();
                if (newConv?.id) convId = newConv.id;
              }

              if (convId) {
                if (!conversationId) conversationId = convId;

                // Insert message row into CRM Inbox
                await dbClient
                  .from("messages")
                  .insert({
                    account_id: targetAccId,
                    conversation_id: convId,
                    sender_type: "agent",
                    sender_id: user.id,
                    content_type: "text",
                    content_text: messageText,
                    status: sentViaApi ? "delivered" : "sent",
                    created_at: new Date().toISOString(),
                  });

                // Update conversation preview and timestamp
                await dbClient
                  .from("conversations")
                  .update({
                    last_message_text: messageText,
                    last_message_at: new Date().toISOString(),
                    status: "open",
                    updated_at: new Date().toISOString(),
                  })
                  .eq("id", convId);
              }
            }
          } catch (accErr: any) {
            console.warn(`[Admin Remind] Error logging to account ${targetAccId}:`, accErr?.message);
          }
        }
      } catch (inboxErr: any) {
        console.warn("[Admin Remind] Could not sync message to CRM Inbox:", inboxErr?.message);
      }

      // 3. Update last_reminder_sent_at on account
      await dbClient
        .from("accounts")
        .update({
          last_reminder_sent_at: new Date().toISOString(),
          reminder_count: (sub.reminder_count || 0) + 1,
        })
        .eq("id", id);
    } else {
      // In demo mode: create/update contact, conversation, and message in mock state
      sentViaApi = true;
      sub.last_reminder_sent_at = new Date().toISOString();
      sub.reminder_count = (sub.reminder_count || 0) + 1;

      const convId = `conv-sub-${sub.id}`;
      const contactId = `contact-sub-${sub.id}`;

      // 1. Find or create mock contact
      let mockContact = MOCK_CONTACTS.find(
        (c) => c.id === contactId || c.phone === recipientPhone || (cleanPhoneNoPlus && c.phone_normalized === cleanPhoneNoPlus)
      );
      if (!mockContact) {
        mockContact = {
          id: contactId,
          user_id: MOCK_USER_ID,
          account_id: MOCK_ACCOUNT_ID,
          phone: recipientPhone,
          phone_normalized: cleanPhoneNoPlus,
          name: sub.owner_name || sub.name,
          email: sub.owner_email && sub.owner_email !== "No email" ? sub.owner_email : "",
          company: sub.name,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          tags: [],
        };
        MOCK_CONTACTS.unshift(mockContact);
      } else {
        mockContact.name = sub.owner_name || sub.name;
        mockContact.phone = recipientPhone;
        mockContact.company = sub.name;
      }

      // 2. Find or create mock conversation
      let mockConv = MOCK_CONVERSATIONS.find((c) => c.id === convId || c.contact_id === mockContact!.id);
      if (mockConv) {
        mockConv.last_message_text = messageText;
        mockConv.last_message_at = new Date().toISOString();
        mockConv.status = "open";
        mockConv.contact = mockContact;
        // Move to top of list so it is immediately visible
        const idx = MOCK_CONVERSATIONS.indexOf(mockConv);
        if (idx > 0) {
          MOCK_CONVERSATIONS.splice(idx, 1);
          MOCK_CONVERSATIONS.unshift(mockConv);
        }
      } else {
        mockConv = {
          id: convId,
          user_id: MOCK_USER_ID,
          contact_id: mockContact.id,
          status: "open",
          last_message_text: messageText,
          last_message_at: new Date().toISOString(),
          unread_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          contact: mockContact,
        };
        MOCK_CONVERSATIONS.unshift(mockConv);
      }
      conversationId = mockConv.id;

      // 3. Add outbound message to MOCK_MESSAGES
      if (!MOCK_MESSAGES[mockConv.id]) {
        MOCK_MESSAGES[mockConv.id] = [];
      }
      const newMsg = {
        id: `msg-${Date.now()}`,
        conversation_id: mockConv.id,
        sender_type: "agent",
        content_type: "text",
        content_text: messageText,
        created_at: new Date().toISOString(),
        status: "delivered",
      };
      MOCK_MESSAGES[mockConv.id].push(newMsg);
    }

    return NextResponse.json({
      success: true,
      sentViaApi,
      apiError,
      messageText,
      recipientPhone,
      conversationId,
      inboxUrl: conversationId ? `/inbox?c=${conversationId}` : "/inbox",
      directWhatsAppUrl,
      last_reminder_sent_at: new Date().toISOString(),
      mockData: isDemo && sub ? {
        contact: MOCK_CONTACTS.find((c) => c.phone === recipientPhone) || {
          id: `contact-sub-${sub.id}`,
          name: sub.owner_name || sub.name,
          phone: recipientPhone,
          company: sub.name,
        },
        conversation: MOCK_CONVERSATIONS.find((c) => c.id === conversationId),
        message: MOCK_MESSAGES[conversationId!]?.[MOCK_MESSAGES[conversationId!].length - 1],
      } : undefined,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to send reminder" }, { status: 500 });
  }
}
