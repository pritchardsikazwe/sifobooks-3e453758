import { useMemo, useState } from "react";
import { FileUp, Sparkles, Trophy, CheckCircle2, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type Quote = { id: string; supplier: string; price: number; deliveryDays: number; warrantyMonths: number; compliant: boolean; notes: string };

const seed: Quote[] = [
  { id: "Q-001", supplier: "Supplier A", price: 125000, deliveryDays: 14, warrantyMonths: 12, compliant: true, notes: "Meets requested specification" },
  { id: "Q-002", supplier: "Supplier B", price: 118500, deliveryDays: 28, warrantyMonths: 6, compliant: true, notes: "Lower price, longer delivery" },
  { id: "Q-003", supplier: "Supplier C", price: 132000, deliveryDays: 10, warrantyMonths: 24, compliant: true, notes: "Fast delivery and strongest warranty" },
];

export function QuotationComparison() {
  const [quotes, setQuotes] = useState<Quote[]>(seed);
  const [weights, setWeights] = useState({ price: 45, delivery: 20, warranty: 15, compliance: 20 });
  const [files, setFiles] = useState<string[]>([]);

  const ranked = useMemo(() => {
    const maxPrice = Math.max(...quotes.map(q => q.price), 1);
    const maxDelivery = Math.max(...quotes.map(q => q.deliveryDays), 1);
    const maxWarranty = Math.max(...quotes.map(q => q.warrantyMonths), 1);
    return [...quotes].map(q => {
      const priceScore = (1 - q.price / maxPrice) * 100;
      const deliveryScore = (1 - q.deliveryDays / maxDelivery) * 100;
      const warrantyScore = (q.warrantyMonths / maxWarranty) * 100;
      const complianceScore = q.compliant ? 100 : 0;
      const score = priceScore * weights.price / 100 + deliveryScore * weights.delivery / 100 + warrantyScore * weights.warranty / 100 + complianceScore * weights.compliance / 100;
      return { ...q, score };
    }).sort((a, b) => b.score - a.score);
  }, [quotes, weights]);

  const best = ranked[0];

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    setFiles(prev => [...prev, ...Array.from(list).map(f => f.name)]);
  };

  return <div className="space-y-6">
    <div className="grid gap-4 lg:grid-cols-4">
      <Card className="lg:col-span-3"><CardHeader><CardTitle className="flex items-center gap-2"><FileUp className="h-5 w-5" /> Upload supplier quotations</CardTitle></CardHeader><CardContent>
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center hover:bg-muted/40">
          <FileUp className="mb-2 h-8 w-8 text-muted-foreground" /><span className="font-medium">Drop PDF, Excel, CSV or quotation documents here</span><span className="mt-1 text-xs text-muted-foreground">Documents are staged for comparison; connect document extraction/AI processing before production use.</span>
          <Input type="file" multiple accept=".pdf,.xlsx,.xls,.csv,.doc,.docx" className="mt-4 max-w-sm" onChange={e => addFiles(e.target.files)} />
        </label>
        {files.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{files.map((f, i) => <Badge key={`${f}-${i}`} variant="outline">{f}</Badge>)}</div>}
      </CardContent></Card>
      <Card><CardHeader><CardTitle className="text-base">Recommendation</CardTitle></CardHeader><CardContent>{best && <div><div className="flex items-center gap-2 text-emerald-700"><Trophy className="h-5 w-5" /><span className="font-semibold">{best.supplier}</span></div><div className="mt-2 text-3xl font-semibold">{best.score.toFixed(1)}%</div><p className="mt-2 text-xs text-muted-foreground">Best weighted result. Review the underlying quotations and procurement policy before award.</p></div>}</CardContent></Card>
    </div>

    <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Sparkles className="h-4 w-4" /> Evaluation criteria</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-4">
      {Object.entries(weights).map(([key, value]) => <label key={key} className="space-y-1 text-sm"><span className="capitalize">{key}</span><Input type="number" min="0" max="100" value={value} onChange={e => setWeights(w => ({ ...w, [key]: Number(e.target.value) }))} /></label>)}
    </CardContent></Card>

    <Card><CardHeader><CardTitle className="text-base">Supplier comparison</CardTitle></CardHeader><CardContent className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="p-3">Rank</th><th className="p-3">Supplier</th><th className="p-3 text-right">Price</th><th className="p-3 text-right">Delivery</th><th className="p-3 text-right">Warranty</th><th className="p-3">Compliance</th><th className="p-3 text-right">Score</th></tr></thead><tbody>{ranked.map((q, i) => <tr key={q.id} className="border-b"><td className="p-3">{i === 0 ? <Trophy className="h-4 w-4" /> : i + 1}</td><td className="p-3 font-medium">{q.supplier}<div className="text-xs text-muted-foreground">{q.notes}</div></td><td className="p-3 text-right">K {q.price.toLocaleString()}</td><td className="p-3 text-right">{q.deliveryDays} days</td><td className="p-3 text-right">{q.warrantyMonths} months</td><td className="p-3">{q.compliant ? <span className="inline-flex items-center gap-1 text-emerald-700"><CheckCircle2 className="h-4 w-4" /> Pass</span> : <span className="inline-flex items-center gap-1 text-red-700"><AlertTriangle className="h-4 w-4" /> Review</span>}</td><td className="p-3 text-right font-semibold">{q.score.toFixed(1)}%</td></tr>)}</tbody></table></CardContent></Card>

    <div className="flex justify-end"><Button onClick={() => setQuotes(prev => [...prev])}><Sparkles className="h-4 w-4" /> Recalculate recommendation</Button></div>
  </div>;
}
