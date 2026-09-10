/**
 * Demo (sample-data) layer.
 *
 * SAFETY CONTRACT — read before editing:
 *  - Everything in `src/lib/demo/**` is static, in-memory sample content.
 *  - It never reads from, writes to, or posts into Supabase, the posting
 *    engine, inventory, POS, payroll or any tenant/company record.
 *  - Demo routes live outside `_authenticated`, so no tenant session is used
 *    and RLS is never involved. Real customer data cannot leak into a demo,
 *    and demo figures can never reach a real ledger.
 *  - Every figure below is invented for illustration only.
 */

export type Tone = "neutral" | "good" | "warn" | "bad" | "info";

export type Kpi = {
  label: string;
  value: string;
  hint?: string;
  tone?: Tone;
};

export type TableBlock = {
  kind: "table";
  title: string;
  note?: string;
  columns: string[];
  /** Last column may be a tone marker via `toneColumn`. */
  rows: (string | number)[][];
  /** Index of the column rendered as a status pill. */
  statusColumn?: number;
  /** Indexes of columns aligned right (money / quantities). */
  numericColumns?: number[];
};

export type BoardBlock = {
  kind: "board";
  title: string;
  note?: string;
  columns: {
    label: string;
    tone?: Tone;
    cards: { title: string; meta?: string; badge?: string }[];
  }[];
};

export type PanelBlock = {
  kind: "panel";
  title: string;
  note?: string;
  items: { label: string; value: string; tone?: Tone }[];
};

export type NotesBlock = {
  kind: "notes";
  title: string;
  lines: string[];
};

export type GridBlock = {
  kind: "grid";
  title: string;
  note?: string;
  cells: { label: string; sub?: string; tone?: Tone; badge?: string }[];
};

/** Visual floor / room map. Each cell is one table or room. */
export type MapBlock = {
  kind: "map";
  title: string;
  note?: string;
  /** Optional legend override; defaults to the tones used by the cells. */
  legend?: { label: string; tone: Tone }[];
  areas: {
    label: string;
    cells: {
      label: string;
      state: string;
      tone: Tone;
      /** e.g. "4 guests" */
      meta?: string;
      /** e.g. "K 1,240" */
      amount?: string;
    }[];
  }[];
};

/** Kitchen-display style ticket lanes with timers and per-ticket actions. */
export type TicketsBlock = {
  kind: "tickets";
  title: string;
  note?: string;
  lanes: {
    label: string;
    tone: Tone;
    tickets: {
      ref: string;
      table: string;
      timer?: string;
      priority?: string;
      items: string[];
      action?: string;
    }[];
  }[];
};

/** Simple inline chart drawn with CSS/SVG — no chart library, no live data. */
export type ChartBlock = {
  kind: "chart";
  variant: "bars" | "line" | "donut";
  title: string;
  note?: string;
  unit?: string;
  series: { label: string; value: number; tone?: Tone }[];
};

/** Menu / product tiles as a POS operator would see them. */
export type MenuBlock = {
  kind: "menu";
  title: string;
  note?: string;
  categories?: string[];
  items: { name: string; price: string; category?: string; tags?: string[]; state?: string; tone?: Tone }[];
};

/** Left-to-right operational flow. */
export type FlowBlock = {
  kind: "flow";
  title: string;
  note?: string;
  steps: { label: string; detail?: string; state?: string; tone?: Tone }[];
};

export type Block =
  | TableBlock
  | BoardBlock
  | PanelBlock
  | NotesBlock
  | GridBlock
  | MapBlock
  | TicketsBlock
  | ChartBlock
  | MenuBlock
  | FlowBlock;

export type DemoAction = {
  label: string;
  /** "primary" renders as the single dominant action on the screen. */
  variant?: "primary" | "secondary" | "ghost";
  /** Optional demo section slug this action walks to. */
  section?: string;
};

export type DemoSection = {
  slug: string;
  name: string;
  group: string;
  blurb: string;
  /** lucide-react icon name. */
  iconName?: string;
  kpis?: Kpi[];
  /** Screen-level actions. The first "primary" one is the dominant button. */
  actions?: DemoAction[];
  blocks: Block[];
};

export type DemoIndustry = {
  slug: string;
  name: string;
  product: string;
  tagline: string;
  description: string;
  highlights: string[];
  /** Tasteful per-industry accent, expressed with existing utility tokens. */
  accent?: {
    /** Tailwind gradient classes for the workspace header. */
    gradient: string;
    /** Tailwind text colour class for the accent mark. */
    text: string;
    /** Tailwind ring/border colour class. */
    ring: string;
  };
  sections: DemoSection[];
};
