import { createFileRoute, Link } from "@tanstack/react-router";
import { ExternalLink, Globe2, LockKeyhole, ShieldCheck, Users, ShoppingCart, BriefcaseBusiness, ReceiptText, Wrench } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PUBLIC_SERVICES } from "@/lib/public-services";

export const Route = createFileRoute("/_authenticated/public-services")({ component: PublicServicesPage });

const icons = { HR: BriefcaseBusiness, Procurement: ShoppingCart, Sales: ReceiptText, Customer: Users, Operations: Wrench };

function PublicServicesPage() {
  return (
    <div className="min-h-full bg-muted/20 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-primary"><Globe2 className="h-4 w-4" /> SifoBooks Public Services</div>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight">Connect your company to the outside world</h1>
              <p className="mt-1 max-w-3xl text-sm text-muted-foreground">Publish selected forms and secure links while keeping accounting, payroll, inventory and other private company data inside the workspace.</p>
            </div>
            <Badge variant="outline" className="gap-1"><LockKeyhole className="h-3 w-3" /> Private data protected</Badge>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PUBLIC_SERVICES.map(service => {
            const Icon = icons[service.category];
            return (
              <Card key={service.key} className="transition-shadow duration-200 hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary"><Icon className="h-5 w-5" /></div>
                    <Badge variant="secondary">{service.category}</Badge>
                  </div>
                  <CardTitle className="pt-1 text-base">{service.label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="min-h-10 text-sm text-muted-foreground">{service.description}</p>
                  <div className="mt-4 flex items-center justify-between gap-2 text-xs text-muted-foreground"><span>Audience: {service.audience}</span><span>Secure public link</span></div>
                  <div className="mt-4 flex gap-2"><Button size="sm" asChild><Link to={service.path}>Open tool</Link></Button><Button size="sm" variant="outline" asChild><Link to={service.path}><ExternalLink className="mr-2 h-3.5 w-3.5" /> Preview</Link></Button></div>
                </CardContent>
              </Card>
            );
          })}
        </section>

        <Card>
          <CardContent className="flex flex-wrap items-center gap-4 p-5">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            <div className="min-w-0 flex-1"><div className="text-sm font-medium">Public does not mean open access</div><div className="text-xs text-muted-foreground">Public forms should receive only the fields they need. Private records remain tenant-scoped and must never be exposed through a public route.</div></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
