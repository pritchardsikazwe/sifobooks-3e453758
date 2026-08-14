import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen } from "lucide-react";
import { toast } from "sonner";
import { SifoFormPage, SifoFormSection, SifoField } from "@/components/sifo/SifoFormPage";
import { RequireModule } from "@/components/RequireModule";

export const Route = createFileRoute("/_authenticated/teaching-materials/new")({
  head: () => ({ meta: [{ title: "New Material Request — SifoBooks" }] }),
  component: () => <RequireModule moduleKey="school_erp"><NewMaterialRequestPage /></RequireModule>,
});

function NewMaterialRequestPage() {
  const navigate = useNavigate();
  const [f, setF] = useState<any>({
    request_no: `TM-${Date.now().toString().slice(-6)}`,
    category: "classroom", item_name: "", quantity: 1, estimated_cost: 0,
    requested_by: "", notes: "",
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!f.item_name.trim()) return toast.error("Item is required");
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    setSaving(true);
    const { error } = await supabase.from("teaching_material_requests").insert({
      user_id: u.user.id, ...f, quantity: Number(f.quantity), estimated_cost: Number(f.estimated_cost),
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Request created");
    navigate({ to: "/teaching-materials" });
  };

  return (
    <div className="p-4 sm:p-6">
      <SifoFormPage
        module="inventory"
        icon={BookOpen}
        title="Material Request"
        subtitle="Classroom materials & learning equipment"
        onCancel={() => navigate({ to: "/teaching-materials" })}
        onSave={save}
        saving={saving}
        saveLabel="Submit for approval"
      >
        <SifoFormSection title="Request details">
          <SifoField label="Request #"><Input value={f.request_no} onChange={e => setF({ ...f, request_no: e.target.value })} /></SifoField>
          <SifoField label="Category">
            <Select value={f.category} onValueChange={v => setF({ ...f, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="classroom">Classroom Materials</SelectItem>
                <SelectItem value="equipment">Teaching Equipment</SelectItem>
              </SelectContent>
            </Select>
          </SifoField>
          <SifoField label="Item" required wide><Input value={f.item_name} onChange={e => setF({ ...f, item_name: e.target.value })} placeholder="Exercise books, projector, ..." /></SifoField>
          <SifoField label="Quantity"><Input type="number" value={f.quantity} onChange={e => setF({ ...f, quantity: e.target.value })} /></SifoField>
          <SifoField label="Estimated cost (K)"><Input type="number" value={f.estimated_cost} onChange={e => setF({ ...f, estimated_cost: e.target.value })} /></SifoField>
          <SifoField label="Requested by" wide><Input value={f.requested_by} onChange={e => setF({ ...f, requested_by: e.target.value })} placeholder="HOD / Teacher name" /></SifoField>
          <SifoField label="Notes" wide><Textarea value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} /></SifoField>
        </SifoFormSection>
      </SifoFormPage>
    </div>
  );
}
