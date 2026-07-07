import { useState } from "react";
import { Share2, Download, Mail, MessageCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { buildDocPdf, downloadPdf as saveAs, type PdfDoc, type PdfLine } from "@/lib/pdf";
import { fmtMoney } from "@/lib/format";

export type ShareDocKind = "invoice" | "quote" | "credit_note" | "receipt";

const KIND_LABEL: Record<ShareDocKind, PdfDoc["kind"]> = {
  invoice: "Invoice", quote: "Quote", credit_note: "Credit Note", receipt: "Receipt",
};

async function loadDoc(kind: ShareDocKind, id: string): Promise<PdfDoc | null> {
  const [{ data: co }] = await Promise.all([
    supabase.from("companies").select("*").maybeSingle(),
  ]);

  if (kind === "invoice") {
    const { data: inv } = await supabase.from("invoices").select("*, customers(*)").eq("id", id).maybeSingle();
    if (!inv) return null;
    const { data: items } = await supabase.from("invoice_items").select("*").eq("invoice_id", id);
    return {
      kind: "Invoice", number: inv.number, issueDate: inv.issue_date, dueDate: inv.due_date,
      currency: inv.currency, taxInclusive: true, company: co, customer: inv.customers,
      buyerTpin: inv.buyer_tpin, notes: inv.notes ?? undefined,
      items: (items ?? []).map(mapLine),
      subtotal: Number(inv.subtotal ?? 0), tax: Number(inv.vat_amount ?? 0), total: Number(inv.total ?? 0),
    };
  }
  if (kind === "quote") {
    const { data: q } = await supabase.from("quotes").select("*, customers(*)").eq("id", id).maybeSingle();
    if (!q) return null;
    const { data: items } = await supabase.from("quote_items").select("*").eq("quote_id", id);
    return {
      kind: "Quote", number: q.number, issueDate: q.issue_date, validUntil: q.valid_until ?? undefined,
      currency: q.currency, taxInclusive: true, company: co, customer: q.customers,
      buyerTpin: (q as any).buyer_tpin, notes: q.notes ?? undefined,
      items: (items ?? []).map(mapLine),
      subtotal: Number(q.subtotal ?? 0), tax: Number(q.vat_amount ?? 0), total: Number(q.total ?? 0),
    };
  }
  if (kind === "credit_note") {
    const { data: cn } = await supabase.from("credit_notes").select("*, customers(*)").eq("id", id).maybeSingle();
    if (!cn) return null;
    const { data: items } = await supabase.from("credit_note_items").select("*").eq("credit_note_id", id);
    return {
      kind: "Credit Note", number: cn.number, issueDate: cn.issue_date,
      currency: cn.currency, taxInclusive: true, company: co, customer: cn.customers,
      notes: cn.reason ?? undefined,
      items: (items ?? []).map(mapLine),
      subtotal: Number(cn.subtotal ?? 0), tax: Number(cn.vat_amount ?? 0), total: Number(cn.total ?? 0),
    };
  }
  // receipt
  const { data: r } = await supabase.from("receipts").select("*, customers(*), invoices(number)").eq("id", id).maybeSingle();
  if (!r) return null;
  return {
    kind: "Receipt", number: (r as any).number ?? r.id.slice(0, 8),
    issueDate: (r as any).receipt_date ?? (r as any).payment_date ?? new Date().toISOString().slice(0, 10),
    currency: (r as any).currency ?? co?.base_currency ?? "ZMW", taxInclusive: true,
    company: co, customer: (r as any).customers,
    notes: (r as any).note ?? undefined,
    items: [{
      description: `Payment received${(r as any).invoices?.number ? ` — Invoice ${(r as any).invoices.number}` : ""}`,
      qty: 1, price: Number(r.amount ?? 0), vatRate: 0, lineTotal: Number(r.amount ?? 0),
    }],
    subtotal: Number(r.amount ?? 0), tax: 0, total: Number(r.amount ?? 0),
  };
}

function mapLine(i: any): PdfLine {
  return {
    description: i.description ?? "",
    qty: Number(i.quantity ?? i.qty ?? 1),
    price: Number(i.unit_price ?? i.price ?? 0),
    vatRate: Number(i.vat_rate ?? 0),
    lineTotal: Number(i.line_total ?? i.amount ?? 0),
  };
}

function buildMessage(doc: PdfDoc, company: string) {
  const dueLine = doc.kind === "Invoice" && doc.dueDate ? `Due: ${doc.dueDate}\n` : "";
  return (
`Hello ${doc.customer?.name ?? ""},

Please find ${doc.kind} ${doc.number} for ${fmtMoney(doc.total, doc.currency)}.

Issued: ${doc.issueDate}
${dueLine}Total: ${fmtMoney(doc.total, doc.currency)}

Thank you,
${company}`
  );
}

export function ShareDoc({
  kind, id, docNumber, size = "sm", variant = "ghost",
}: { kind: ShareDocKind; id: string; docNumber?: string; size?: "sm" | "icon"; variant?: "ghost" | "outline" }) {
  const [busy, setBusy] = useState<"" | "pdf" | "email" | "wa">("");

  const run = async (action: "pdf" | "email" | "wa") => {
    setBusy(action);
    try {
      const doc = await loadDoc(kind, id);
      if (!doc) { toast.error("Document not found"); return; }
      const companyName = doc.company?.name ?? "SifoBooks";

      if (action === "pdf") {
        await saveAs(doc);
        toast.success("PDF downloaded");
        return;
      }

      // Always download the PDF too so the user can attach it in email/WhatsApp
      await saveAs(doc);
      const msg = buildMessage(doc, companyName);

      if (action === "email") {
        const to = doc.customer?.email ?? "";
        const subject = `${doc.kind} ${doc.number} from ${companyName}`;
        const url = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(msg)}`;
        window.location.href = url;
        toast.success("PDF downloaded — attach it to the email");
      } else {
        const phone = (doc.customer?.phone ?? "").replace(/[^0-9]/g, "");
        const url = phone
          ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
          : `https://wa.me/?text=${encodeURIComponent(msg)}`;
        window.open(url, "_blank", "noopener");
        toast.success("PDF downloaded — attach it in WhatsApp");
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Share failed");
    } finally {
      setBusy("");
    }
  };

  const label = KIND_LABEL[kind] + (docNumber ? ` ${docNumber}` : "");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size={size === "icon" ? "icon" : "sm"} variant={variant} className="gap-1" disabled={!!busy}>
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Share2 className="h-3.5 w-3.5" />}
          {size !== "icon" && <span className="hidden sm:inline">Share</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs text-muted-foreground">{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => run("pdf")} className="gap-2">
          <Download className="h-4 w-4" /> Download PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => run("email")} className="gap-2">
          <Mail className="h-4 w-4" /> Send via Email
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => run("wa")} className="gap-2">
          <MessageCircle className="h-4 w-4 text-emerald-600" /> Share on WhatsApp
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
