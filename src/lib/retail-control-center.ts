import { supabase } from "@/integrations/supabase/client";

export type RetailControlSummary = {
  openShifts: number;
  activeCashiers: number;
  todaySales: number;
  todayRefunds: number;
  todayVoids: number;
  todayDiscounts: number;
  offlinePending: number;
};

export async function loadRetailControlSummary(): Promise<RetailControlSummary> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const iso = start.toISOString();

  const [{ data: shifts }, { data: sales }] = await Promise.all([
    supabase.from("pos_shifts").select("id,created_by,status").eq("status", "open"),
    supabase
      .from("pos_sales")
      .select("id,status,total,discount,created_by")
      .gte("sold_at", iso),
  ]);

  const rows = sales ?? [];
  const completed = rows.filter((s) => s.status === "completed");
  const refunds = rows.filter((s) => s.status === "refunded");
  const voids = rows.filter((s) => s.status === "voided");

  return {
    openShifts: (shifts ?? []).length,
    activeCashiers: new Set((shifts ?? []).map((s) => s.created_by).filter(Boolean)).size,
    todaySales: completed.reduce((sum, s) => sum + Number(s.total ?? 0), 0),
    todayRefunds: Math.abs(refunds.reduce((sum, s) => sum + Number(s.total ?? 0), 0)),
    todayVoids: Math.abs(voids.reduce((sum, s) => sum + Number(s.total ?? 0), 0)),
    todayDiscounts: completed.reduce((sum, s) => sum + Number(s.discount ?? 0), 0),
    offlinePending: 0,
  };
}
