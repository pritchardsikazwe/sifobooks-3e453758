import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { LayoutGrid, Check } from "lucide-react";
import { toast } from "sonner";
import { WORKSPACE_MODES, getModeMeta, getWorkspaceMode, setWorkspaceMode, type WorkspaceMode } from "@/lib/workspace";

/**
 * Switches the company between its front-of-house experiences (Restaurant,
 * General POS, Accounting). Same company, branch, user and session — only the
 * landing experience changes.
 */
export function WorkspaceSwitch() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<WorkspaceMode>("accounting");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getWorkspaceMode().then(({ mode }) => setMode(mode)).catch(() => {});
  }, []);

  const choose = async (next: WorkspaceMode) => {
    const meta = getModeMeta(next);
    setBusy(true);
    try {
      if (next !== mode) {
        await setWorkspaceMode(next);
        setMode(next);
        toast.success(`Workspace set to ${meta.label}`);
      }
      navigate({ to: meta.landing as never });
    } catch (e: any) {
      toast.error(e?.message ?? "Could not switch workspace");
    } finally {
      setBusy(false);
    }
  };

  const current = getModeMeta(mode);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={busy}
          className="h-9 gap-2 px-2 sm:px-3 border border-border bg-card hover:bg-muted text-foreground"
          title="Switch workspace"
        >
          <LayoutGrid className="h-4 w-4 text-muted-foreground" />
          <span className="hidden lg:inline text-xs font-medium">{current.label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel>Workspace</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {WORKSPACE_MODES.map((m) => (
          <DropdownMenuItem key={m.id} onClick={() => choose(m.id)} className="items-start gap-2 py-2">
            <span className="mt-0.5">{m.emoji}</span>
            <span className="flex-1 min-w-0">
              <span className="flex items-center gap-2 text-sm font-medium">
                {m.label}
                {m.id === mode && <Check className="h-3.5 w-3.5 text-primary" />}
              </span>
              <span className="block text-xs text-muted-foreground leading-snug">{m.description}</span>
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
