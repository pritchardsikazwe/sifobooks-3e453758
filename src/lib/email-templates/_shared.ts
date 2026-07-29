// Shared brand styles for SifoBooks auth emails.
// Email Body background must stay #ffffff per platform rules; brand color
// lives in the header band, button, and accents.

export const brand = {
  primary: "#4f46e5", // indigo-600
  primaryDark: "#1e1b4b", // indigo-950
  ink: "#0a0a1a",
  text: "#334155",
  muted: "#64748b",
  border: "#e2e8f0",
  softBg: "#f8fafc",
};

export const main = {
  backgroundColor: "#ffffff",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  margin: 0,
  padding: 0,
};

export const wrapper = {
  backgroundColor: brand.softBg,
  padding: "32px 12px",
};

export const container = {
  backgroundColor: "#ffffff",
  maxWidth: "560px",
  margin: "0 auto",
  borderRadius: "14px",
  border: `1px solid ${brand.border}`,
  overflow: "hidden" as const,
};

export const headerBand = {
  background: `linear-gradient(135deg, ${brand.primaryDark} 0%, ${brand.primary} 100%)`,
  padding: "28px 32px",
};

export const brandName = {
  color: "#ffffff",
  fontSize: "20px",
  fontWeight: 700 as const,
  letterSpacing: "-0.01em",
  margin: 0,
};

export const brandTag = {
  color: "#c7d2fe",
  fontSize: "12px",
  margin: "4px 0 0",
  letterSpacing: "0.02em",
};

export const body = {
  padding: "32px",
};

export const h1 = {
  fontSize: "22px",
  fontWeight: 700 as const,
  color: brand.ink,
  margin: "0 0 16px",
  letterSpacing: "-0.01em",
};

export const text = {
  fontSize: "15px",
  color: brand.text,
  lineHeight: "1.6",
  margin: "0 0 20px",
};

export const button = {
  backgroundColor: brand.primary,
  color: "#ffffff",
  fontSize: "15px",
  fontWeight: 600 as const,
  borderRadius: "10px",
  padding: "14px 28px",
  textDecoration: "none",
  display: "inline-block" as const,
};

export const codeStyle = {
  display: "inline-block" as const,
  fontFamily: "'SF Mono', Menlo, Consolas, monospace",
  fontSize: "26px",
  fontWeight: 700 as const,
  color: brand.primaryDark,
  backgroundColor: brand.softBg,
  border: `1px solid ${brand.border}`,
  borderRadius: "10px",
  padding: "14px 22px",
  letterSpacing: "0.35em",
  margin: "0 0 24px",
};

export const link = { color: brand.primary, textDecoration: "underline" };

export const divider = {
  border: "none",
  borderTop: `1px solid ${brand.border}`,
  margin: "28px 0 20px",
};

export const footer = {
  fontSize: "12px",
  color: brand.muted,
  lineHeight: "1.6",
  margin: 0,
};

export const footerStrong = {
  fontSize: "12px",
  color: brand.text,
  fontWeight: 600 as const,
  margin: "0 0 4px",
};
