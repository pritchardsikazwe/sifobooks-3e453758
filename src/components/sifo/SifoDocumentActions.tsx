import { Eye, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SifoPrintTools } from "./SifoPrintTools";

export function SifoDocumentActions({
  onPreview,
  printTitle,
  children,
}: {
  onPreview?: () => void;
  printTitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {children}
      {onPreview && <Button type="button" variant="outline" size="sm" onClick={onPreview}><Eye className="mr-2 h-4 w-4" /> Preview</Button>}
      <SifoPrintTools title={printTitle} />
    </div>
  );
}

export function SifoPrintOnlyNotice() {
  return <div className="hidden print:flex items-center justify-between border-b pb-2 text-[10px] text-muted-foreground"><span>Official SifoBooks document</span><span><Printer className="mr-1 inline h-3 w-3" /> Print output</span></div>;
}
