function formatError(error: unknown): string {
  if (error instanceof Error) return error.message || error.name;
  if (typeof error === "string") return error;
  try { return JSON.stringify(error); } catch { return "Unknown server error"; }
}

export function renderErrorPage(error?: unknown, diagnosticId?: string): string {
  const detail = formatError(error).slice(0, 240).replace(/[<>&"]/g, (c) => ({ "<":"&lt;", ">":"&gt;", "&":"&amp;", '"':"&quot;" }[c] || c));
  const id = String(diagnosticId || "SERVER-ERROR").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 80);
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>This page didn't load — SifoBooks</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { font: 15px/1.5 system-ui, -apple-system, sans-serif; background: #f5f8f7; color: #10231d; display: grid; place-items: center; min-height: 100vh; margin: 0; padding: 1.5rem; }
      .card { max-width: 34rem; width: 100%; text-align: center; padding: 2rem; background: #fff; border: 1px solid #dcebe6; border-radius: 18px; box-shadow: 0 12px 40px rgba(0,0,0,.07); }
      .brand { font-weight: 800; letter-spacing: .02em; color: #087f5b; margin-bottom: 1rem; }
      h1 { font-size: 1.35rem; margin: 0 0 .5rem; }
      p { color: #52645e; margin: 0 0 1rem; }
      .detail { text-align:left; background:#f7faf9; border:1px solid #e2ece9; border-radius:12px; padding:.75rem; font:12px/1.5 ui-monospace,SFMono-Regular,Consolas,monospace; color:#44544f; word-break:break-word; margin:1rem 0; }
      .id { font-size:11px; color:#71807b; }
      .actions { display:flex; gap:.5rem; justify-content:center; flex-wrap:wrap; margin-top:1rem; }
      a, button { padding:.55rem 1rem; border-radius:.6rem; font:inherit; cursor:pointer; text-decoration:none; border:1px solid transparent; }
      .primary { background:#087f5b; color:#fff; }
      .secondary { background:#fff; color:#10231d; border-color:#ccd9d5; }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="brand">SifoBooks</div>
      <h1>This page didn't load</h1>
      <p>SifoBooks encountered a local server error while loading this page.</p>
      <div class="detail">${detail || "Unknown server error"}</div>
      <div class="id">Diagnostic ID: ${id}<br/>Check the SifoBooks <b>data\\desktop-startup.log</b> file for the full server error.</div>
      <div class="actions">
        <button class="primary" onclick="location.reload()">Try again</button>
        <a class="secondary" href="/">Go home</a>
        <a class="secondary" href="/api/desktop/diagnostics">Diagnostics</a>
      </div>
    </div>
  </body>
</html>`;
}
