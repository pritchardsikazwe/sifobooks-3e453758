/* ------------------------------------------------------------------ *
 * Channel manager — integration-ready adapters.
 *
 * SifoBooks does NOT hold certified OTA credentials. Each adapter below
 * describes what a live connection needs; until a tenant supplies real
 * credentials through a certified provider, a channel stays
 * "not_connected" and no availability or rate is ever transmitted.
 * Nothing here fakes a sync.
 * ------------------------------------------------------------------ */

import { supabase } from "@/integrations/supabase/client";

const db: any = supabase;

export type ChannelKey =
  | "booking_com" | "expedia" | "agoda" | "airbnb" | "google_hotels"
  | "direct_web" | "walk_in" | "travel_agent" | "corporate" | "other";

export type ChannelAdapter = {
  key: ChannelKey;
  name: string;
  kind: "ota" | "direct" | "offline";
  /** What a certified live connection requires from the tenant. */
  requires: string[];
  /** Whether SifoBooks can push availability/rates once connected. */
  supportsPush: boolean;
  /** Whether SifoBooks can pull reservations once connected. */
  supportsPull: boolean;
  note: string;
};

export const CHANNEL_CATALOG: ChannelAdapter[] = [
  {
    key: "booking_com", name: "Booking.com", kind: "ota", supportsPush: true, supportsPull: true,
    requires: ["Connectivity provider contract", "Hotel ID", "Provider API credentials"],
    note: "Requires an accredited connectivity partner account. Not connected until credentials are supplied.",
  },
  {
    key: "expedia", name: "Expedia Group", kind: "ota", supportsPush: true, supportsPull: true,
    requires: ["Expedia Partner Central account", "EQC credentials"],
    note: "Rate and availability push plus booking retrieval once certified credentials exist.",
  },
  {
    key: "agoda", name: "Agoda", kind: "ota", supportsPush: true, supportsPull: true,
    requires: ["Agoda YCS account", "Channel partner credentials"],
    note: "Requires a channel manager partnership.",
  },
  {
    key: "airbnb", name: "Airbnb", kind: "ota", supportsPush: true, supportsPull: true,
    requires: ["Airbnb software partner access", "Listing IDs"],
    note: "Airbnb only connects through approved software partners.",
  },
  {
    key: "google_hotels", name: "Google Hotels", kind: "ota", supportsPush: true, supportsPull: false,
    requires: ["Hotel Center account", "Feed endpoint"],
    note: "Rate and availability feed only; bookings land on the direct booking engine.",
  },
  {
    key: "direct_web", name: "Direct booking engine", kind: "direct", supportsPush: false, supportsPull: true,
    requires: [],
    note: "Built into SifoBooks. Bookings are created directly against your rooms and rates.",
  },
  { key: "travel_agent", name: "Travel agent", kind: "offline", supportsPush: false, supportsPull: false, requires: [], note: "Manually captured bookings, tracked for commission and source reporting." },
  { key: "corporate", name: "Corporate contract", kind: "offline", supportsPush: false, supportsPull: false, requires: [], note: "Contract rates negotiated with a company account." },
  { key: "walk_in", name: "Walk-in", kind: "offline", supportsPush: false, supportsPull: false, requires: [], note: "Front desk sales." },
  { key: "other", name: "Other channel", kind: "offline", supportsPush: false, supportsPull: false, requires: [], note: "Any other source you want to report on." },
];

export const adapterFor = (key: string) =>
  CHANNEL_CATALOG.find((c) => c.key === key) ?? CHANNEL_CATALOG[CHANNEL_CATALOG.length - 1]!;

export type ChannelRow = {
  id: string;
  channel_key: string;
  name: string;
  status: string;
  credentials_present: boolean;
  sync_mode: string;
  commission_rate: number;
  last_sync_at: string | null;
  last_sync_status: string | null;
  active: boolean;
};

export type SyncOutcome = { ok: boolean; outcome: string; message: string };

/**
 * A sync attempt. Without credentials this refuses honestly instead of
 * simulating a transfer, and the refusal is written to the audit log so
 * reconciliation shows exactly why nothing moved.
 */
export async function attemptChannelSync(
  uid: string,
  channel: ChannelRow,
  direction: "push_availability" | "push_rates" | "pull_reservations",
): Promise<SyncOutcome> {
  const adapter = adapterFor(channel.channel_key);
  let result: SyncOutcome;

  if (adapter.kind !== "ota") {
    result = { ok: false, outcome: "not_applicable", message: `${adapter.name} does not synchronise — bookings are captured directly in SifoBooks.` };
  } else if (!channel.credentials_present || channel.status !== "connected") {
    result = { ok: false, outcome: "blocked", message: `No live connection to ${adapter.name}. Required: ${adapter.requires.join(", ")}.` };
  } else if (direction === "pull_reservations" && !adapter.supportsPull) {
    result = { ok: false, outcome: "unsupported", message: `${adapter.name} does not return bookings to the property system.` };
  } else if (direction !== "pull_reservations" && !adapter.supportsPush) {
    result = { ok: false, outcome: "unsupported", message: `${adapter.name} does not accept rate or availability updates from the property system.` };
  } else {
    result = { ok: false, outcome: "adapter_pending", message: `Credentials recorded, but the certified ${adapter.name} transport is not enabled on this deployment. Nothing was sent.` };
  }

  await db.from("hotel_channel_sync_log").insert({
    user_id: uid,
    channel_id: channel.id,
    direction,
    outcome: result.outcome,
    message: result.message,
  });
  await db.from("hotel_channels").update({
    last_sync_at: new Date().toISOString(),
    last_sync_status: result.outcome,
  }).eq("id", channel.id);

  return result;
}

export const channelTone = (status: string) =>
  status === "connected" ? ("good" as const)
  : status === "error" ? ("bad" as const)
  : status === "pending" ? ("warn" as const)
  : ("muted" as const);
