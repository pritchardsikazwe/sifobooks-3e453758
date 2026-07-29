import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

export function SortableWidget({
  id, span = "col-span-12 lg:col-span-4", editMode, onHide, children,
}: {
  id: string;
  span?: string;
  editMode: boolean;
  onHide: () => void;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.55 : 1,
    zIndex: isDragging ? 30 : "auto",
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(span, "relative", editMode && "ring-1 ring-dashed ring-primary/40 rounded-lg")}
    >
      {editMode && (
        <div className="absolute -top-2 left-2 right-2 z-10 flex items-center justify-between pointer-events-none">
          <button
            {...attributes}
            {...listeners}
            className="pointer-events-auto inline-flex items-center gap-1 h-6 px-2 rounded-md bg-primary text-primary-foreground text-[10px] font-semibold shadow-sm cursor-grab active:cursor-grabbing"
            aria-label={`Drag ${id}`}
          >
            <GripVertical className="h-3 w-3" /> Drag
          </button>
          <button
            onClick={onHide}
            className="pointer-events-auto inline-flex items-center gap-1 h-6 px-2 rounded-md bg-card border border-border text-muted-foreground hover:text-foreground text-[10px] font-semibold shadow-sm"
            aria-label={`Hide ${id}`}
          >
            <EyeOff className="h-3 w-3" /> Hide
          </button>
        </div>
      )}
      {children}
    </div>
  );
}
