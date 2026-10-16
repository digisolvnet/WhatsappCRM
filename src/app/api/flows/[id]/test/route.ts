import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireRole, toErrorResponse } from "@/lib/auth/account";
import { supabaseAdmin } from "@/lib/flows/admin-client";
import { simulateFlowExecution } from "@/lib/flows/execution-guard";

/**
 * POST /api/flows/[id]/test
 *
 * Runs a safe test-mode simulation of the flow graph without dispatching
 * live WhatsApp messages or initiating live payments.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  try {
    await requireRole("agent");
  } catch (err) {
    return toErrorResponse(err);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const initialVars = body.initialVars || {};

  const admin = supabaseAdmin();
  const [{ data: flow }, { data: nodes }] = await Promise.all([
    admin
      .from("flows")
      .select("id, name, entry_node_id, account_id")
      .eq("id", id)
      .maybeSingle(),
    admin
      .from("flow_nodes")
      .select("node_key, node_type, config")
      .eq("flow_id", id),
  ]);

  if (!flow) {
    return NextResponse.json({ error: "Flow not found" }, { status: 404 });
  }

  if (!flow.entry_node_id) {
    return NextResponse.json(
      { error: "Flow has no entry node configured" },
      { status: 400 }
    );
  }

  const simulation = simulateFlowExecution(
    { entry_node_id: flow.entry_node_id },
    nodes || [],
    initialVars
  );

  return NextResponse.json({
    isTestMode: true,
    flowId: flow.id,
    flowName: flow.name,
    simulation,
  });
}
