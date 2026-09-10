import { cn } from "@/lib/utils";

/**
 * SifoBooks mark — three stacked ledger leaves cut by a rising column.
 * Deliberately geometric so it reads at 20px in the header and at 64px in the footer.
 */
export function SifoMark({ className, tone = "brand" }: { className?: string; tone?: "brand" | "mono" }) {
  const a = tone === "mono" ? "currentColor" : "#12A557";
  const b = tone === "mono" ? "currentColor" : "#0A6B37";
  const c = tone === "mono" ? "currentColor" : "#C87A3C";
  return (
    <svg viewBox="0 0 40 40" className={cn("h-9 w-9", className)} role="img" aria-label="SifoBooks">
      <rect x="1.25" y="1.25" width="37.5" height="37.5" rx="10" fill="#05100C" />
      <rect x="1.25" y="1.25" width="37.5" height="37.5" rx="10" fill="none" stroke={a} strokeOpacity=".35" strokeWidth="1.5" />
      <path d="M9 12.5h13.5a4 4 0 0 1 0 8H9z" fill={a} />
      <path d="M9 20.5h11a4.25 4.25 0 0 1 0 8.5H9z" fill={b} />
      <rect x="25.5" y="9" width="4" height="22" rx="1.4" fill={c} />
      <rect x="25.5" y="9" width="4" height="8" rx="1.4" fill={a} />
    </svg>
  );
}

export function SifoWordmark({ className, sub }: { className?: string; sub?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <SifoMark className="h-8 w-8 shrink-0" />
      <span className="leading-none">
        <span className="block font-display text-[1.15rem] font-bold tracking-[-0.02em] text-white">
          Sifo<span className="text-sifo-mint">Books</span>
        </span>
        {sub ? (
          <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.22em] text-sifo-haze">{sub}</span>
        ) : null}
      </span>
    </span>
  );
}

export function Eyebrow({ children, tone = "mint" }: { children: React.ReactNode; tone?: "mint" | "copper" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em]",
        tone === "mint"
          ? "border-sifo-mint/25 bg-sifo-mint/8 text-sifo-mint"
          : "border-sifo-copper/30 bg-sifo-copper/10 text-sifo-copper",
      )}
    >
      {children}
    </span>
  );
}

/** Section heading with a ruled margin line, echoing accounting paper. */
export function SectionHead({
  eyebrow,
  title,
  lede,
  align = "left",
}: {
  eyebrow?: string;
  title: React.ReactNode;
  lede?: string;
  align?: "left" | "center";
}) {
  return (
    <div className={cn("max-w-3xl", align === "center" && "mx-auto text-center")}>
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <h2 className="mt-5 font-display text-[2rem] font-bold leading-[1.08] tracking-[-0.03em] text-white sm:text-4xl md:text-[2.75rem]">
        {title}
      </h2>
      {lede ? <p className="mt-4 text-base leading-7 text-sifo-haze md:text-lg md:leading-8">{lede}</p> : null}
    </div>
  );
}
