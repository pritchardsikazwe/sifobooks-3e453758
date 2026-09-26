// Server-only admin client boundary: Lovable Cloud (hosted) or local SQLite (Windows).
import { IS_LOCAL_BACKEND } from "@/lib/platform/backend-mode";
import { cloudSupabaseAdmin } from "./cloud-client.server";
import { supabaseAdmin as localSupabaseAdmin } from "./local-client.server";

export const supabaseAdmin: any = IS_LOCAL_BACKEND ? localSupabaseAdmin : cloudSupabaseAdmin;
