import { supabase } from "@/integrations/supabase/client";

const VISITOR_KEY = "sifobooks.visitor_id";

function visitorId() {
  if (typeof window === "undefined") return "";
  let id = window.localStorage.getItem(VISITOR_KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(VISITOR_KEY, id);
  }
  return id;
}

function attribution() {
  if (typeof window === "undefined") return {};
  const u = new URL(window.location.href);
  return {
    landing_path: u.pathname,
    referrer: document.referrer || null,
    utm_source: u.searchParams.get("utm_source"),
    utm_medium: u.searchParams.get("utm_medium"),
    utm_campaign: u.searchParams.get("utm_campaign"),
    utm_term: u.searchParams.get("utm_term"),
    utm_content: u.searchParams.get("utm_content"),
  };
}

export async function trackMarketingVisit() {
  if (typeof window === "undefined") return;
  const id = visitorId();
  const a = attribution();
  const ua = navigator.userAgent;
  const device_type = /Mobi|Android|iPhone|iPad/i.test(ua) ? "mobile" : "desktop";

  await supabase.from("site_visitors").upsert({
    visitor_id: id,
    ...a,
    device_type,
    user_agent: ua.slice(0, 500),
    language: navigator.language || null,
    last_seen: new Date().toISOString(),
  }, { onConflict: "visitor_id" });

  await supabase.from("site_events").insert({
    visitor_id: id,
    event_name: "page_view",
    page_path: window.location.pathname,
    target: null,
    metadata: { title: document.title },
  });
}

export async function trackMarketingEvent(event_name: string, target?: string, metadata: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  await supabase.from("site_events").insert({
    visitor_id: visitorId(),
    event_name,
    page_path: window.location.pathname,
    target: target || null,
    metadata,
  });
}

export async function submitSalesLead(input: {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  industry?: string;
  interest?: string;
}) {
  const a = attribution();
  const { error } = await supabase.from("sales_leads").insert({
    ...input,
    source: a.utm_source || (a.referrer ? "referral" : "direct"),
    ...a,
  });
  if (!error) {
    await trackMarketingEvent("lead_submitted", input.interest || "general");
    if (input.interest === "Demo request") await trackMarketingEvent("demo_requested", input.industry || "general");
  }
  return { error };
}
