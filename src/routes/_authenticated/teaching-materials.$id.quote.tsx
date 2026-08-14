import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BookOpen } from "lucide-react";
import { toast } from "sonner";
import { SifoFormPage, SifoFormSection, SifoField } from "@/components/sifo/SifoFormPage";
import { RequireModule } from "@/components/RequireModule";

export const Route = createFileRoute("/_authenticated/teaching-materials/$id/quote")({
  head: () => ({ meta: [{ title: "Add Supplier Quote — SifoBooks" }] }),
  component: () => <RequireModule moduleKey="school_erp"><AddQuotePage /></RequireModule>,
});

function AddQuotePage() {
  const navigate = useNavigate();
  const { id } = useParams({ from: "/_authenticated/teaching-materials/$id/quote" });
  const [request, setRequest] = useState<any>(null);
  const [q, setQ] = useState({ supplier_name: "", quoted_amount: 0, notes: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("teaching_material_requests").select("*").eq("id", id).maybeSingle();
      setRequest(data);
    })();
  }, [id]);

  const addQuote = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    setSaving(true);
    const { error } = await supabase.from("supplier_quotations").insert({
      user_id: u.user.id, request_id: id, ...q, quoted_amount: Number(q.quoted_amount),
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Quote added");
    navigate({ to: "/teaching-materials" });
  };

  return (
    <div className="p-4 sm:p-6">
      <SifoFormPage
        module="inventory"
        icon={BookOpen}
        title="Add Supplier Quote"
        subtitle={request ? `For request ${request.request_no} — ${request.item_name}` : undefined}
        onCancel={() => navigate({ to: "/teaching-materials" })}
        onSave={addQuote}
        saving={saving}
        saveLabel="Save quote"
      >
        <SifoFormSection title="Quote details">
          <SifoField label="Supplier name" wide><Input value={q.supplier_name} onChange={e => setQ({ ...q, supplier_name: e.target.value })} /></SifoField>
          <SifoField label="Quoted amount (K)"><Input type="number" value={q.quoted_amount} onChange={e => setQ({ ...q, quoted_amount: Number(e.target.value) })} /></SifoField>
          <SifoField label="Notes" wide><Textarea value={q.notes} onChange={e => setQ({ ...q, notes: e.target.value })} /></SifoField>
        </SifoFormSection>
      </SifoFormPage>
    </div>
  );
}
