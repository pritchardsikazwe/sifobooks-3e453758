import { useState } from "react";
import { BookmarkPlus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { saveView } from "@/lib/reports/favorites";
import { toast } from "sonner";

/**
 * Saves the report exactly as it is on screen (route + period + options) so the
 * user can re-run it later, then change the period from the saved view.
 * Stored per browser; nothing is written to the company's records.
 */
export function SaveViewButton({ defaultName }: { defaultName: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(defaultName);

  const commit = () => {
    const path = typeof window === "undefined" ? "" : window.location.pathname + window.location.search;
    if (!path) return;
    saveView({ name: name.trim() || defaultName, path });
    setOpen(false);
    toast.success("Saved to your reports", { description: "Find it under Saved views in the Reports Centre." });
  };

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) setName(defaultName); }}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <BookmarkPlus className="mr-1 h-4 w-4" /> Save view
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 space-y-2">
        <p className="text-xs text-muted-foreground">
          Save this report with its current period and options. You can re-run it for another month later.
        </p>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") commit(); }}
          placeholder="Name this view"
          autoFocus
        />
        <Button size="sm" className="w-full" onClick={commit}>
          <Check className="mr-1 h-4 w-4" /> Save
        </Button>
      </PopoverContent>
    </Popover>
  );
}
