import { supabase } from "@/integrations/supabase/client";

export type ApprovalModule =
  | "purchase_order" | "bill" | "expense" | "payment"
  | "leave" | "sales_discount" | "budget" | "credit_note";

export async function submitForApproval(opts: {
  module: ApprovalModule;
  referenceType: string;
  referenceId?: string;
  referenceNumber?: string;
  amount: number;
  currency?: string;
  description?: string;
}) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Not signed in");

  const { data: comp } = await supabase.from("companies")
    .select("id").eq("user_id", u.user.id).maybeSingle();

  // Discover the required approval levels for this module + amount range
  const { data: hier } = await supabase.from("approval_hierarchies")
    .select("level,min_amount,max_amount")
    .eq("module", opts.module)
    .lte("min_amount", opts.amount);

  const applicable = (hier ?? []).filter(
    (h: any) => opts.amount <= (Number(h.max_amount) || Number.POSITIVE_INFINITY)
  );
  const maxLevel = applicable.length ? Math.max(...applicable.map((h: any) => h.level)) : 1;

  const { data, error } = await supabase.from("approval_requests").insert({
    user_id: u.user.id,
    company_id: comp?.id ?? null,
    module: opts.module,
    reference_type: opts.referenceType,
    reference_id: opts.referenceId ?? null,
    reference_number: opts.referenceNumber ?? null,
    amount: opts.amount,
    currency: opts.currency ?? "ZMW",
    description: opts.description ?? null,
    requested_by: u.user.id,
    status: "pending",
    current_level: 1,
    max_level: maxLevel,
  }).select().single();

  if (error) throw error;
  return data;
}

export async function actOnRequest(requestId: string, action: "approve" | "reject", notes?: string) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Not signed in");

  const { data: canAct } = await supabase.rpc("can_act_on_request", { _req: requestId, _user: u.user.id });
  if (!canAct) throw new Error("You are not authorised to act on this request at its current level.");

  const { data: req, error: rErr } = await supabase.from("approval_requests")
    .select("current_level,max_level,status").eq("id", requestId).single();
  if (rErr) throw rErr;
  if (req.status !== "pending") throw new Error(`Request already ${req.status}.`);

  await supabase.from("approval_actions").insert({
    request_id: requestId, level: req.current_level, action, actor_id: u.user.id, notes: notes ?? null,
  });

  if (action === "reject") {
    await supabase.from("approval_requests").update({
      status: "rejected", decided_by: u.user.id, decided_at: new Date().toISOString(), decision_notes: notes ?? null,
    }).eq("id", requestId);
    return "rejected";
  }

  // approve
  if (req.current_level >= req.max_level) {
    await supabase.from("approval_requests").update({
      status: "approved", decided_by: u.user.id, decided_at: new Date().toISOString(), decision_notes: notes ?? null,
    }).eq("id", requestId);
    return "approved";
  }
  await supabase.from("approval_requests").update({
    current_level: req.current_level + 1,
  }).eq("id", requestId);
  return "advanced";
}

export async function cancelRequest(requestId: string) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Not signed in");
  const { error } = await supabase.from("approval_requests").update({
    status: "cancelled", decided_by: u.user.id, decided_at: new Date().toISOString(),
  }).eq("id", requestId).eq("requested_by", u.user.id).eq("status", "pending");
  if (error) throw error;
}
