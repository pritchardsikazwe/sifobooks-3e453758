import { createFileRoute, Link, Navigate, redirect } from "@tanstack/react-router";
import { Building2, LogIn } from "lucide-react";
import { IS_LOCAL_BACKEND } from "@/lib/platform/backend-mode";

/**
 * Windows first-run screen. Hosted (cloud) builds send visitors to the home page.
 * Both choices reuse the existing sign-up/sign-in, onboarding and launch flows;
 * installing on another PC never creates a new company.
 */
export const Route = createFileRoute("/welcome")({
  beforeLoad: () => {
    if (!IS_LOCAL_BACKEND) throw redirect({ to: "/" });
  },
  head: () => ({
    meta: [
      { title: "Welcome to SifoBooks — Set up this device" },
      { name: "description", content: "Create a new SifoBooks company or sign in to an existing company on this device." },
      { property: "og:title", content: "Welcome to SifoBooks" },
      { property: "og:description", content: "Create a new company or sign in to an existing one." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Welcome,
});

function Welcome() {
  // Belt-and-braces: never render the Windows first-run screen in the web app.
  if (!IS_LOCAL_BACKEND) return <Navigate to="/" replace />;
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">WELCOME TO SIFOBOOKS</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          An Internet connection is needed once to set up this device. After that, SifoBooks keeps working offline.
        </p>
        <div className="mt-8 grid gap-3">
          <Link
            to="/auth"
            search={{ tab: "signup", next: "/device-activation" }}
            className="flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Building2 className="h-4 w-4" /> Create New Company
          </Link>
          <Link
            to="/auth"
            search={{ tab: "signin", next: "/device-activation" }}
            className="flex items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-3 text-sm font-medium text-foreground hover:bg-accent"
          >
            <LogIn className="h-4 w-4" /> Sign In to Existing Company
          </Link>
        </div>
      </div>
    </div>
  );
}
