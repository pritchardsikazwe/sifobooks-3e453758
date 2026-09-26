// Build-time backend boundary.
// - Hosted (Lovable preview/published, default): Lovable Cloud auth + database.
// - Windows/offline standalone: local SQLite + local JWT auth. The desktop build
//   sets VITE_SIFOBOOKS_BACKEND=local (see scripts/build-desktop.ts).
export const SIFOBOOKS_BACKEND: "cloud" | "local" =
  import.meta.env.VITE_SIFOBOOKS_BACKEND === "local" ? "local" : "cloud";

export const IS_LOCAL_BACKEND = SIFOBOOKS_BACKEND === "local";
