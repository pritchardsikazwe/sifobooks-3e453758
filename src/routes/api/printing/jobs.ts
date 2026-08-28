import { createFileRoute } from "@tanstack/react-router";

/**
 * Cloud print gateway endpoint.
 *
 * iOS / browser terminals with no local SifoPrint agent post jobs here; the
 * gateway is expected to relay them to a configured LAN/AirPrint bridge.
 * Until a network print target is configured for the tenant we reply 503 so
 * the client keeps the job in its local print queue (a sale is never blocked).
 */
export const Route = createFileRoute("/api/printing/jobs")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let job: any = null;
        try {
          job = await request.json();
        } catch {
          return Response.json({ error: "Invalid job payload" }, { status: 400 });
        }
        if (!job?.type || !job?.id) {
          return Response.json({ error: "Job requires id and type" }, { status: 400 });
        }
        console.log(`[print-gateway] job ${job.id} (${job.type}) from device ${job.deviceId ?? "unknown"}`);
        return Response.json(
          { status: "unavailable", message: "No network print target configured for this device" },
          { status: 503 },
        );
      },
    },
  },
});
