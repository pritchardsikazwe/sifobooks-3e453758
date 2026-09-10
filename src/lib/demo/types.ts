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

export type Block = TableBlock | BoardBlock | PanelBlock | NotesBlock | GridBlock;

export type DemoSection = {
  slug: string;
  name: string;
  group: string;
  blurb: string;
  kpis?: Kpi[];
  blocks: Block[];
};

export type DemoIndustry = {
  slug: string;
  name: string;
  product: string;
  tagline: string;
  description: string;
  highlights: string[];
  sections: DemoSection[];
};
