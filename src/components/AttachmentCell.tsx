import { useRef, useState } from "react";
import { Paperclip, Loader2, ExternalLink, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Props = {
  table: string;
  row: any;
  bucket?: string;
  onChanged?: () => void;
};

/**
 * Inline "attach source document" control for any table row that has
 * attachment_url / attachment_name / attachment_mime columns.
 * Files land in a private bucket under <user_id>/<row_id>-<filename>.
 */
export function AttachmentCell({ table, row, bucket = "source-documents", onChanged }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [signing, setSigning] = useState(false);
  const url: string | null = row.attachment_url ?? null;
  const name: string | null = row.attachment_name ?? null;

  const upload = async (file: File) => {
    setBusy(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      if (!uid) throw new Error("Not signed in");
      const safe = file.name.replace(/[^\w.\-]+/g, "_");
      const path = `${uid}/${row.id}-${Date.now()}-${safe}`;
      const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, {
        upsert: true, contentType: file.type || "application/octet-stream",
      });
      if (upErr) throw upErr;
      const { error: updErr } = await supabase.from(table as any).update({
        attachment_url: path,
        attachment_name: file.name,
        attachment_mime: file.type || null,
      }).eq("id", row.id);
      if (updErr) throw updErr;
      toast.success("Source document attached");
      onChanged?.();
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const openSigned = async () => {
    if (!url) return;
    setSigning(true);
    try {
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(url, 300);
      if (error || !data) throw error ?? new Error("Sign failed");
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      toast.error(e.message ?? "Cannot open file");
    } finally {
      setSigning(false);
    }
  };

  const remove = async () => {
    if (!url) return;
    if (!confirm("Remove attached document?")) return;
    setBusy(true);
    try {
      await supabase.storage.from(bucket).remove([url]);
      await supabase.from(table as any).update({
        attachment_url: null, attachment_name: null, attachment_mime: null,
      }).eq("id", row.id);
      toast.success("Attachment removed");
      onChanged?.();
    } catch (e: any) {
      toast.error(e.message ?? "Remove failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <input
        ref={inputRef} type="file" className="hidden"
        accept="application/pdf,image/*,.doc,.docx,.xls,.xlsx,.csv,.txt"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }}
      />
      {url ? (
        <>
          <Button size="sm" variant="ghost" onClick={openSigned} disabled={signing} title={name ?? "Open"}>
            {signing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />}
            <span className="ml-1 max-w-[120px] truncate text-xs">{name ?? "View"}</span>
          </Button>
          <Button size="sm" variant="ghost" onClick={remove} disabled={busy} title="Remove">
            <X className="h-3.5 w-3.5 text-red-500" />
          </Button>
        </>
      ) : (
        <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()} disabled={busy}>
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Paperclip className="h-3.5 w-3.5" />}
          <span className="ml-1 text-xs">Attach</span>
        </Button>
      )}
    </div>
  );
}
