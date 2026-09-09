import { supabase } from "@/integrations/supabase/client";

export async function capturePostingFailure(opts: {
  userId: string;
  sourceModule: string;
  sourceType?: string;
  sourceId?: string;
  sourceReference?: string;
  operation?: string;
  error?: unknown;
  payload?: Record<string, unknown> | null;
}) {
  const message = opts.error instanceof Error ? opts.error.message : String(opts.error ?? "Unknown posting error");
  const { data: company } = await supabase.from("companies").select("id").eq("user_id", opts.userId).maybeSingle();
  if (!company?.id) return null;
  const { data, error } = await (supabase as any).rpc("log_posting_failure", {
    _company_id: company.id,
    _source_module: opts.sourceModule,
    _source_type: opts.sourceType ?? null,
    _source_id: opts.sourceId ?? null,
    _source_reference: opts.sourceReference ?? null,
    _operation: opts.operation ?? "post",
    _error_code: "POSTING_FAILED",
    _error_message: message,
    _payload: opts.payload ?? null,
  });
  return error ? null : (data as string | null);
}
