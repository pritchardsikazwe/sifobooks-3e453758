// Backend boundary: hosted builds use Lovable Cloud; the Windows standalone build
// (VITE_SIFOBOOKS_BACKEND=local) uses the local SQLite compatibility client.
import { IS_LOCAL_BACKEND } from "@/lib/platform/backend-mode";
import { cloudSupabase } from "./cloud-client";
import { supabase as localSupabase } from "./local-client";

export const supabase: any = IS_LOCAL_BACKEND ? localSupabase : cloudSupabase;
