import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// In-memory fallback cache for remote subscribers (supports Demo Mode or before table migration)
const IN_MEMORY_REMOTE_SUBSCRIBERS: Map<string, any> = new Map();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      instance_id,
      instance_url,
      name,
      owner_name,
      owner_email,
      billing_phone,
      plan_name,
      monthly_price,
      currency,
      subscription_status,
      current_period_ends_at,
      sync_secret,
      notes,
    } = body;

    if (!instance_id || !instance_url) {
      return NextResponse.json(
        { error: "instance_id and instance_url are required for sync" },
        { status: 400 }
      );
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const isPlaceholder = !supabaseUrl || supabaseUrl.includes("placeholder-project");

    let currentMasterStatus = subscription_status || "active";
    let currentMasterExpiry = current_period_ends_at || new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();

    if (!isPlaceholder && serviceKey && supabaseUrl) {
      const adminClient = createSupabaseClient(supabaseUrl, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      // Check if this instance already exists in remote_subscribers
      const { data: existing } = await adminClient
        .from("remote_subscribers")
        .select("*")
        .eq("instance_id", instance_id)
        .maybeSingle();

      if (existing) {
        // Retain the master admin's enforced status if master suspended them!
        currentMasterStatus = existing.subscription_status || currentMasterStatus;
        currentMasterExpiry = existing.current_period_ends_at || currentMasterExpiry;

        await adminClient
          .from("remote_subscribers")
          .update({
            instance_url,
            name: name || existing.name,
            owner_name: owner_name || existing.owner_name,
            owner_email: owner_email || existing.owner_email,
            billing_phone: billing_phone || existing.billing_phone,
            plan_name: plan_name || existing.plan_name,
            monthly_price: monthly_price !== undefined ? monthly_price : existing.monthly_price,
            currency: currency || existing.currency,
            sync_secret: sync_secret || existing.sync_secret,
            last_synced_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("instance_id", instance_id);
      } else {
        // Insert new remote subscriber
        await adminClient.from("remote_subscribers").insert({
          instance_id,
          instance_url,
          name: name || "Remote CRM Instance",
          owner_name: owner_name || "Admin",
          owner_email: owner_email || "",
          billing_phone: billing_phone || "",
          plan_name: plan_name || "Monthly Pro",
          monthly_price: Number(monthly_price || 999),
          currency: currency || "INR",
          subscription_status: currentMasterStatus,
          current_period_ends_at: currentMasterExpiry,
          sync_secret: sync_secret || "",
          notes: notes || "Auto-registered from remote deployment",
          last_synced_at: new Date().toISOString(),
        });
      }
    } else {
      // Memory fallback
      const existing = IN_MEMORY_REMOTE_SUBSCRIBERS.get(instance_id);
      if (existing) {
        currentMasterStatus = existing.subscription_status || currentMasterStatus;
        currentMasterExpiry = existing.current_period_ends_at || currentMasterExpiry;
      }
      IN_MEMORY_REMOTE_SUBSCRIBERS.set(instance_id, {
        instance_id,
        instance_url,
        name: name || existing?.name || "Remote CRM Instance",
        owner_name: owner_name || existing?.owner_name || "Admin",
        owner_email: owner_email || existing?.owner_email || "",
        billing_phone: billing_phone || existing?.billing_phone || "",
        plan_name: plan_name || existing?.plan_name || "Monthly Pro",
        monthly_price: Number(monthly_price || 999),
        currency: currency || "INR",
        subscription_status: currentMasterStatus,
        current_period_ends_at: currentMasterExpiry,
        sync_secret: sync_secret || "",
        last_synced_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      instance_id,
      master_status: currentMasterStatus,
      allowed: currentMasterStatus !== "suspended",
      current_period_ends_at: currentMasterExpiry,
      message:
        currentMasterStatus === "suspended"
          ? "Account is marked as SUSPENDED by DigiSolvNet Central CRM."
          : "Sync successful with Central CRM.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to process remote sync" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Verify Super Admin
    const adminEmailsRaw =
      process.env.SUPER_ADMIN_EMAILS ||
      process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAILS ||
      "support@digisolvnet.com";
    const allowedEmails = adminEmailsRaw
      .split(",")
      .map((e) => e.trim().toLowerCase());
    const isSuperAdmin = user?.email && allowedEmails.includes(user.email.toLowerCase());

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const isPlaceholder = !supabaseUrl || supabaseUrl.includes("placeholder-project");

    let list: any[] = [];

    if (!isPlaceholder && serviceKey && supabaseUrl) {
      const adminClient = createSupabaseClient(supabaseUrl, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data, error } = await adminClient
        .from("remote_subscribers")
        .select("*")
        .order("last_synced_at", { ascending: false });

      if (!error && data) {
        list = data;
      }
    }

    if (list.length === 0) {
      list = Array.from(IN_MEMORY_REMOTE_SUBSCRIBERS.values());
    }

    return NextResponse.json({
      success: true,
      count: list.length,
      remote_subscribers: list,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch remote subscribers" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { instance_id, subscription_status, current_period_ends_at, notes } = body;

    if (!instance_id || !subscription_status) {
      return NextResponse.json(
        { error: "instance_id and subscription_status are required" },
        { status: 400 }
      );
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const isPlaceholder = !supabaseUrl || supabaseUrl.includes("placeholder-project");

    let targetInstance: any = null;

    if (!isPlaceholder && serviceKey && supabaseUrl) {
      const adminClient = createSupabaseClient(supabaseUrl, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      const { data: updated, error } = await adminClient
        .from("remote_subscribers")
        .update({
          subscription_status,
          ...(current_period_ends_at ? { current_period_ends_at } : {}),
          ...(notes !== undefined ? { notes } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq("instance_id", instance_id)
        .select()
        .single();

      if (!error && updated) {
        targetInstance = updated;
      }
    }

    // Also update in-memory
    const mem = IN_MEMORY_REMOTE_SUBSCRIBERS.get(instance_id);
    if (mem) {
      mem.subscription_status = subscription_status;
      if (current_period_ends_at) mem.current_period_ends_at = current_period_ends_at;
      if (notes !== undefined) mem.notes = notes;
      targetInstance = targetInstance || mem;
    }

    // Forward remote command to the client instance if instance_url is accessible!
    let remotePushResult = null;
    if (targetInstance?.instance_url) {
      try {
        const clientControlUrl = `${targetInstance.instance_url.replace(/\/+$/, "")}/api/admin/remote-control`;
        const pushRes = await fetch(clientControlUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-master-admin-token": process.env.REMOTE_SYNC_SECRET || "digisolvnet_master_sync_2026",
          },
          body: JSON.stringify({
            action: subscription_status === "active" ? "activate" : "suspend",
            subscription_status,
            current_period_ends_at: targetInstance.current_period_ends_at,
            notes: notes || "Remotely updated by DigiSolvNet Central CRM",
          }),
        });
        remotePushResult = await pushRes.json();
      } catch (pushErr: any) {
        remotePushResult = { error: pushErr.message || "Could not reach remote instance" };
      }
    }

    return NextResponse.json({
      success: true,
      message: `Status updated to ${subscription_status}`,
      subscriber: targetInstance,
      remotePushResult,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update remote subscriber" },
      { status: 500 }
    );
  }
}
