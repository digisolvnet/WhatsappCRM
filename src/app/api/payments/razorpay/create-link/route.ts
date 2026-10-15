import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireRole, toErrorResponse } from "@/lib/auth/account";
import { createRazorpayPaymentLink } from "@/lib/razorpay/client";
import { sendMessageToConversation } from "@/lib/whatsapp/send-message";
import {
  MOCK_PAYMENT_GATEWAYS,
  MOCK_CRM_PAYMENT_LINKS,
  MOCK_PLATFORM_SETTINGS,
  MOCK_ACCOUNT_ID,
} from "@/lib/mock/data";

export async function POST(request: Request) {
  try {
    const isDemo = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
    const body = await request.json();
    const {
      conversation_id,
      contact_id,
      deal_id,
      amount,
      currency = "INR",
      description = "Order payment",
      send_to_chat = true,
    } = body;

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      return NextResponse.json({ error: "Valid payment amount is required" }, { status: 400 });
    }

    if (isDemo) {
      const mockShortUrl = `https://rzp.io/i/demo_${Date.now()}`;
      const mockPaymentLink = {
        id: `plink-${Date.now()}`,
        account_id: MOCK_ACCOUNT_ID,
        conversation_id: conversation_id || null,
        contact_id: contact_id || null,
        deal_id: deal_id || null,
        razorpay_payment_link_id: `plink_mock_${Date.now()}`,
        amount: numAmount,
        currency: currency.toUpperCase(),
        description,
        short_url: mockShortUrl,
        status: "created",
        created_at: new Date().toISOString(),
      };
      MOCK_CRM_PAYMENT_LINKS.unshift(mockPaymentLink);

      // In demo mode, if send_to_chat is requested, also format chat message
      const chatMessage = `💳 *Payment Request: ${currency.toUpperCase()} ${numAmount}*\n\n${description}\n\nPlease click the link below to pay securely via UPI, Card, or NetBanking:\n🔗 ${mockShortUrl}`;

      return NextResponse.json({
        success: true,
        paymentLink: mockPaymentLink,
        chatMessage,
        sentToChat: Boolean(send_to_chat && conversation_id),
      });
    }

    const { accountId, userId, supabase } = await requireRole("agent");

    // 1. Resolve workspace payment gateway or fallback to platform settings
    let keyId = "";
    let keySecret = "";

    const { data: workspaceGw } = await supabase
      .from("account_payment_gateways")
      .select("key_id, key_secret, is_active")
      .eq("account_id", accountId)
      .eq("provider", "razorpay")
      .maybeSingle();

    if (workspaceGw?.is_active && workspaceGw?.key_id && workspaceGw?.key_secret) {
      keyId = workspaceGw.key_id;
      keySecret = workspaceGw.key_secret;
    } else {
      // Fallback to platform settings if enabled
      const { data: platformSettings } = await supabase
        .from("platform_billing_settings")
        .select("razorpay_enabled, razorpay_key_id, razorpay_key_secret")
        .eq("id", "default")
        .maybeSingle();

      if (platformSettings?.razorpay_enabled && platformSettings?.razorpay_key_id && platformSettings?.razorpay_key_secret) {
        keyId = platformSettings.razorpay_key_id;
        keySecret = platformSettings.razorpay_key_secret;
      }
    }

    if (!keyId || !keySecret) {
      return NextResponse.json(
        {
          error:
            "Razorpay payment gateway is not configured for this workspace. Please enter your Razorpay Key ID and Secret in Settings -> Payment Gateway first.",
        },
        { status: 400 }
      );
    }

    // 2. Resolve contact details for Razorpay customer prefill
    let customerName = "Customer";
    let customerEmail: string | undefined;
    let customerPhone: string | undefined;

    if (contact_id) {
      const { data: contact } = await supabase
        .from("contacts")
        .select("name, email, phone")
        .eq("id", contact_id)
        .eq("account_id", accountId)
        .maybeSingle();

      if (contact) {
        customerName = contact.name || customerName;
        customerEmail = contact.email || undefined;
        customerPhone = contact.phone || undefined;
      }
    }

    // 3. Create payment link on Razorpay
    const rzpResult = await createRazorpayPaymentLink({
      keyId,
      keySecret,
      amount: numAmount,
      currency,
      description,
      customer: {
        name: customerName,
        email: customerEmail,
        contact: customerPhone,
      },
      notes: {
        account_id: accountId,
        conversation_id: conversation_id || "",
        contact_id: contact_id || "",
        deal_id: deal_id || "",
      },
    });

    // 4. Save to crm_payment_links table
    const { data: savedLink, error: dbErr } = await supabase
      .from("crm_payment_links")
      .insert({
        account_id: accountId,
        conversation_id: conversation_id || null,
        contact_id: contact_id || null,
        deal_id: deal_id || null,
        created_by_user_id: userId,
        razorpay_payment_link_id: rzpResult.id,
        amount: numAmount,
        currency: currency.toUpperCase(),
        description,
        short_url: rzpResult.short_url,
        status: "created",
      })
      .select()
      .single();

    if (dbErr) {
      console.warn("Failed to persist crm_payment_link record:", dbErr.message);
    }

    const paymentLinkRecord = savedLink || {
      id: rzpResult.id,
      amount: numAmount,
      currency: currency.toUpperCase(),
      description,
      short_url: rzpResult.short_url,
      status: "created",
    };

    // 5. Send directly to WhatsApp chat if conversation_id was provided
    let sentToChat = false;
    const chatMessage = `💳 *Payment Request: ${currency.toUpperCase()} ${numAmount}*\n\n${description}\n\nPlease click the link below to pay securely via UPI, Cards, or NetBanking:\n🔗 ${rzpResult.short_url}`;

    if (send_to_chat && conversation_id) {
      try {
        await sendMessageToConversation(supabase, accountId, {
          conversationId: conversation_id,
          messageType: "text",
          contentText: chatMessage,
        });
        sentToChat = true;
      } catch (sendErr: any) {
        console.warn("Failed to deliver payment link directly to chat:", sendErr?.message);
      }
    }

    return NextResponse.json({
      success: true,
      paymentLink: paymentLinkRecord,
      chatMessage,
      sentToChat,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
