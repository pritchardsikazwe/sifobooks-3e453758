import { createFileRoute } from "@tanstack/react-router";
import { SifoLandingWhiteboard } from "@/components/sifo/SifoLandingWhiteboard";

export const Route = createFileRoute("/landing-whiteboard")({
  head: () => ({
    meta: [
      { title: "SifoBooks — Interactive Business Platform" },
      { name: "description", content: "Interactive whiteboard presentation of SifoBooks modules, workflows and public business tools." },
    ],
  }),
  component: SifoLandingWhiteboard,
});
