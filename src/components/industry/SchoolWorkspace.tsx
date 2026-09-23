import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { fmtMoney } from "@/lib/format";
import {
  Avatar, Bars, Board, Donut, EmptyState, IndustryShell, MetricTile, NotConnected,
  RecordTable, SearchBox, StatusPill, Tile, TileGrid, Timeline, type NavItem,
} from "@/components/industry/IndustryKit";
import { cn } from "@/lib/utils";
import { SchoolOperationsPanel } from "@/components/industry/SchoolOperationsPanel";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart3, BookOpen, CalendarCheck, GraduationCap, LayoutDashboard, ReceiptText,
  Users, Wallet, WalletCards,
  ShieldCheck,
} from "lucide-react";

const db: any = supabase;

export const SCHOOL_NAV: NavItem[] = [
  { label: "Dashboard", to: "/school", icon: LayoutDashboard },
  { label: "Admissions & Enrolment", to: "/school/admissions", icon: Users },
  { label: "Students", to: "/school/students", icon: GraduationCap },
  { label: "Parents & Guardians", to: "/school/parents", icon: Users },
  { label: "Classes & Subjects", to: "/school/academics", icon: BookOpen },
  { label: "Timetable", to: "/school/timetable", icon: CalendarCheck },
  { label: "Attendance", to: "/school/attendance", icon: CalendarCheck },
  { label: "Examinations & Results", to: "/school/exams", icon: BookOpen },
  { label: "Report Cards", to: "/school/report-cards", icon: ReceiptText },
  { label: "Fees & Billing", to: "/school/fees-billing", icon: ReceiptText },
  { label: "Fee Collections", to: "/school/payments", icon: Wallet },
  { label: "Scholarships & Discounts", to: "/school/scholarships", icon: WalletCards },
  { label: "Hostel & Boarding", to: "/school/boarding", icon: BookOpen },
  { label: "Transport", to: "/school/transport", icon: Users },
  { label: "Staff & HR", to: "/school/staff", icon: Users },
  { label: "Parent Portal", to: "/school/parent-portal", icon: Users },
  { label: "Student Portal", to: "/school/student-portal", icon: GraduationCap },
  { label: "Reports", to: "/school/reports", icon: BarChart3 },
  { label: "Compliance", to: "/school/compliance", icon: ShieldCheck },
];

const TITLES: Record<string, [string, string]> = {
  "/school": ["School operations", "Learners, classes, fee balances and collections from your own records."],
  "/school/students": ["Students", "Your enrolled learners. Select a learner to see their fees and guardian."],
  "/school/academics": ["Classes", "Class register, streams, teachers and capacity."],
  "/school/parents": ["Guardians", "Guardians recorded on your learner records."],
  "/school/fees": ["Fees", "Fee accounts per learner: billed, paid and balance."],
  "/school/payments": ["Fee payments", "Money received from learners, linked to their fee accounts."],
  "/school/staff": ["Staff", "Teaching and support staff on your payroll."],
  "/school/reports": ["School reports", "Fee collection and financial reporting on real data."],
};

const UNAVAILABLE: Record<string, string> = {
  "/school/admissions": "Admissions applications",
  "/school/attendance": "Learner attendance",
  "/school/exams": "Examinations & marks",
  "/school/timetable": "Timetable",

  "/school/transport": "Transport",
  "/school/scholarships": "Scholarships",
  "/school/report-cards": "Report cards",
  "/school/parent-portal": "Parent portal",
  "/school/student-portal": "Student portal",
};

export function SchoolWorkspace({ screen }: { screen: string }) {
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [data, setData] = useState<Record<string, any[]>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) { setLoading(false); return; }
      const [st, cl, fees, pays, staff, structures, boardingHouses, boardingBeds, boardingAllocations, discipline, health, libraryLoans, transport] = await Promise.all([
        db.from("students").select("id,student_no,first_name,last_name,class_id,status,guardian_name,guardian_phone,guardian_email,boarding").eq("user_id", uid).order("last_name").limit(500),
        db.from("school_classes").select("id,name,grade_level,stream,class_teacher,capacity,academic_year,status").eq("user_id", uid).order("name").limit(200),
        db.from("student_fees").select("id,student_id,term,academic_year,amount_due,amount_paid,balance,status,due_date,description").eq("user_id", uid).order("due_date", { ascending: false }).limit(500),
        db.from("fee_payments").select("id,student_id,amount,payment_date,method,receipt_no,reference").eq("user_id", uid).order("payment_date", { ascending: false }).limit(300),
        db.from("employees").select("id,employee_code,first_name,last_name,status,email,phone").eq("user_id", uid).order("last_name").limit(300),
        db.from("fee_structures").select("id,fee_name,term,academic_year,amount,class_id,is_mandatory").eq("user_id", uid).limit(200),
        db.from("boarding_houses").select("*").eq("user_id", uid).limit(200),
        db.from("boarding_beds").select("*").eq("user_id", uid).limit(500),
        db.from("boarding_allocations").select("*").eq("user_id", uid).limit(500),
        db.from("student_discipline").select("*").eq("user_id", uid).limit(300),
        db.from("student_health").select("*").eq("user_id", uid).limit(300),
        db.from("library_loans").select("*").eq("user_id", uid).limit(500),
        db.from("school_transport").select("*").eq("user_id", uid).limit(300),
      ]);
      if (cancelled) return;
      setData({
        students: st.data ?? [], classes: cl.data ?? [], fees: fees.data ?? [],
        payments: pays.data ?? [], staff: staff.data ?? [], structures: structures.data ?? [],
        boardingHouses: boardingHouses.data ?? [], boardingBeds: boardingBeds.data ?? [], boardingAllocations: boardingAllocations.data ?? [],
        discipline: discipline.data ?? [], health: health.data ?? [], libraryLoans: libraryLoans.data ?? [], transport: transport.data ?? [],
      });
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [screen]);

  const students = data.students ?? [];
  const classes = data.classes ?? [];
  const fees = data.fees ?? [];
  const payments = data.payments ?? [];
  const staff = data.staff ?? [];
  const structures = data.structures ?? [];
  const boardingHouses = data.boardingHouses ?? [];
  const boardingBeds = data.boardingBeds ?? [];
  const boardingAllocations = data.boardingAllocations ?? [];
  const discipline = data.discipline ?? [];
  const health = data.health ?? [];
  const libraryLoans = data.libraryLoans ?? [];
  const transport = data.transport ?? [];

  const className = useMemo(() => new Map(classes.map((c: any) => [c.id, c.name])), [classes]);
  const studentName = useMemo(() => new Map(students.map((s: any) => [s.id, `${s.first_name} ${s.last_name}`])), [students]);
  const match = (s: string) => s.toLowerCase().includes(q.toLowerCase());

  const billed = fees.reduce((s: number, f: any) => s + Number(f.amount_due || 0), 0);
  const collected = fees.reduce((s: number, f: any) => s + Number(f.amount_paid || 0), 0);
  const arrears = fees.reduce((s: number, f: any) => s + Number(f.balance || 0), 0);

  const [title, subtitle] = TITLES[screen] ?? ["School", "School operations workspace."];

  const body = () => {
    if (["/school/admissions","/school/attendance","/school/exams","/school/report-cards","/school/scholarships","/school/boarding","/school/transport","/school/parent-portal","/school/student-portal"].includes(screen)) {
      return <SchoolOperationsPanel screen={screen} data={data} />;
    }
    if (UNAVAILABLE[screen]) {
      return (
        <NotConnected
          title={`${UNAVAILABLE[screen]} are not part of your account yet`}
          reason="There are no records of this kind in your SifoBooks data, so this screen shows nothing rather than sample learners. Learners, classes, fees and collections below all run on your live records."
          alternatives={[
            { label: "Students", to: "/school/students" },
            { label: "Classes", to: "/school/academics" },
            { label: "Fees", to: "/school/fees" },
            { label: "Payments", to: "/school/payments" },
          ]}
        />
      );
    }

    if (loading) return <div className="grid gap-3 md:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>;

    const feeTone = (f: any) => (Number(f.balance) <= 0 ? "good" : Number(f.amount_paid) > 0 ? "warn" : "bad");

    switch (screen) {
      case "/school": {
        const withArrears = fees.filter((f: any) => Number(f.balance) > 0);
        const collectionRate = billed ? (collected / billed) * 100 : 0;
        const byClass = classes
          .map((c: any) => ({ label: c.name, value: students.filter((s: any) => s.class_id === c.id).length }))
          .sort((a: any, b: any) => b.value - a.value)
          .slice(0, 8);
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <MetricTile label="Learners" value={String(students.length)} icon={GraduationCap} hint={`${students.filter((s: any) => (s.status ?? "").toLowerCase() === "active").length} active`} />
              <MetricTile label="Classes" value={String(classes.length)} icon={BookOpen} />
              <MetricTile label="Fees collected" value={fmtMoney(collected)} icon={Wallet} hint={`of ${fmtMoney(billed)} billed`} progress={collectionRate} tone="good" />
              <MetricTile label="Arrears" value={fmtMoney(arrears)} icon={WalletCards} hint={`${withArrears.length} fee accounts`} tone={arrears > 0 ? "warn" : "good"} />
              <MetricTile label="Boarding" value={`${boardingAllocations.length}/${boardingBeds.length}`} icon={GraduationCap} hint={`${boardingHouses.length} houses`} />
              <MetricTile label="Open discipline" value={String(discipline.filter((x:any)=>x.status !== "resolved").length)} icon={ShieldCheck} tone={discipline.length ? "warn" : "good"} />
              <MetricTile label="Library loans" value={String(libraryLoans.length)} icon={BookOpen} />
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <Donut value={collectionRate} label="Fee collection rate" caption="Share of everything billed to learners that has been received." accent="school" />
              <Board title="Enrolment by class" hint="Learner numbers from your live register."><Bars items={byClass} /></Board>
              <Board title="Recent fee payments" hint="Latest receipts from learners.">
                <Timeline
                  empty="No fee payments recorded."
                  items={payments.slice(0, 6).map((p: any) => ({
                    key: p.id, when: p.payment_date,
                    title: studentName.get(p.student_id) ?? "Learner",
                    detail: `${p.method ?? "—"} · ${p.receipt_no ?? "no receipt no."}`,
                    amount: fmtMoney(Number(p.amount)),
                  }))}
                />
              </Board>
            </div>

            <Board title="Largest fee balances" hint="Follow up the learners who owe the most — click through to their fee account.">
              {withArrears.length === 0 ? (
                <EmptyState title="No outstanding fees" message="Every fee account in your register is fully settled." action={{ label: "Bill fees", to: "/school/fees-billing" }} />
              ) : (
                <TileGrid>
                  {[...withArrears].sort((a, b) => Number(b.balance) - Number(a.balance)).slice(0, 8).map((f: any) => (
                    <Tile
                      key={f.id}
                      status={feeTone(f) as any}
                      title={studentName.get(f.student_id) ?? "Learner"}
                      subtitle={`${f.term} ${f.academic_year}`}
                      meta={<>Owes {fmtMoney(Number(f.balance))} of {fmtMoney(Number(f.amount_due))}</>}
                      badge={<StatusPill status={f.status} />}
                    />
                  ))}
                </TileGrid>
              )}
            </Board>
          </div>
        );
      }
      case "/school/boarding": {
        return <div className="space-y-4"><div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><MetricTile label="Boarding houses" value={String(boardingHouses.length)} icon={GraduationCap}/><MetricTile label="Beds" value={String(boardingBeds.length)} icon={BookOpen}/><MetricTile label="Occupied" value={String(boardingAllocations.length)} icon={Users}/><MetricTile label="Available" value={String(Math.max(0, boardingBeds.length-boardingAllocations.length))} icon={Wallet}/></div><Board title="Boarding houses" hint="Residential allocation, capacity and bed occupancy.">{boardingHouses.length===0?<EmptyState title="No boarding houses" message="Create boarding houses and beds to manage hostel allocation.":<div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">{boardingHouses.map((h:any)=>{const beds=boardingBeds.filter((b:any)=>b.house_id===h.id);const used=boardingAllocations.filter((a:any)=>beds.some((b:any)=>b.id===a.bed_id)).length;return <div key={h.id} className="rounded-2xl border p-4"><div className="font-semibold">{h.name}</div><div className="text-xs text-muted-foreground">{h.code} · {h.gender??"Mixed"} · House parent {h.house_parent??"—"}</div><div className="mt-3 text-sm">{used} occupied / {beds.length} beds</div></div>})}</div>}</Board><div className="grid gap-4 lg:grid-cols-2"><Board title="Student welfare" hint="Recent discipline and health activity."><Timeline empty="No welfare records." items={[...discipline.slice(0,4).map((x:any)=>({key:"d"+x.id,when:x.incident_date,title:studentName.get(x.student_id)??"Student",detail:`Discipline · ${x.category} · ${x.severity}`})),...health.slice(0,4).map((x:any)=>({key:"h"+x.id,when:x.visit_date,title:studentName.get(x.student_id)??"Student",detail:`Health visit${x.referred?" · referred":""}`}))]}/></Board><Board title="Transport & library" hint="Operational load today."><div className="space-y-3 p-4 text-sm"><div className="flex justify-between"><span>Active transport allocations</span><b>{transport.length}</b></div><div className="flex justify-between"><span>Books currently on loan</span><b>{libraryLoans.length}</b></div></div></Board></div></div>;
      }
      case "/school/students": {
        const rows = students.filter((s: any) => match(`${s.first_name} ${s.last_name} ${s.student_no} ${s.guardian_name ?? ""}`)).slice(0, 60);
        const balanceOf = (id: string) => fees.filter((f: any) => f.student_id === id).reduce((s: number, f: any) => s + Number(f.balance || 0), 0);
        return (
          <Board title="Learner directory" hint="Existing learners first — click a learner card to open their record." right={<div className="flex gap-2"><SearchBox value={q} onChange={setQ} /><Link to="/students" className="rounded-xl border px-3 py-2 text-sm font-medium hover:bg-muted">+ New learner</Link></div>}>
            {rows.length === 0 ? (
              <EmptyState title="No learners match" message="Your learner register has no records matching this search yet." action={{ label: "Open students", to: "/students" }} />
            ) : (
              <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
                {rows.map((s: any) => {
                  const bal = balanceOf(s.id);
                  return (
                    <div key={s.id} className="flex items-center gap-3 rounded-2xl border p-4 transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md">
                      <Avatar name={`${s.first_name} ${s.last_name}`} accent="school" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-semibold">{s.first_name} {s.last_name}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {s.student_no} · {className.get(s.class_id) ?? "no class"}{s.boarding ? ` · ${s.boarding}` : ""}
                        </div>
                        <div className="mt-1"><StatusPill status={s.status} /></div>
                      </div>
                      <div className="text-right">
                        <div className={cn("text-sm font-semibold tabular-nums", bal > 0 ? "text-amber-600" : "text-emerald-600")}>{fmtMoney(bal)}</div>
                        <div className="text-[10px] uppercase text-muted-foreground">{bal > 0 ? "owing" : "clear"}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Board>
        );
      }
      case "/school/academics": {
        const rows = classes.filter((c: any) => match(`${c.name} ${c.grade_level ?? ""} ${c.class_teacher ?? ""}`));
        return (
          <Board title="Classes" hint="Learner counts and capacity come from your live register." right={<SearchBox value={q} onChange={setQ} />}>
            {rows.length === 0 ? (
              <EmptyState title="No classes yet" message="Classes you set up appear here with their teacher, learner count and capacity." action={{ label: "Open students", to: "/students" }} />
            ) : (
              <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
                {rows.map((c: any) => {
                  const count = students.filter((s: any) => s.class_id === c.id).length;
                  const cap = Number(c.capacity ?? 0);
                  const fill = cap ? Math.min(100, (count / cap) * 100) : 0;
                  return (
                    <div key={c.id} className="rounded-2xl border p-4 transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-base font-semibold">{c.name}</div>
                          <div className="truncate text-xs text-muted-foreground">
                            {c.grade_level ?? "—"}{c.stream ? ` · ${c.stream}` : ""} · {c.academic_year ?? "—"}
                          </div>
                        </div>
                        <StatusPill status={c.status} />
                      </div>
                      <div className="mt-3 flex items-baseline justify-between text-sm">
                        <span className="font-semibold tabular-nums">{count} learners</span>
                        <span className="text-muted-foreground">{cap ? `of ${cap} places` : "no capacity set"}</span>
                      </div>
                      {cap ? (
                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <div className={cn("h-full rounded-full", fill > 95 ? "bg-rose-500" : fill > 80 ? "bg-amber-500" : "bg-emerald-500")} style={{ width: `${fill}%` }} />
                        </div>
                      ) : null}
                      <div className="mt-3 text-xs text-muted-foreground">Class teacher: {c.class_teacher ?? "—"}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </Board>
        );
      }
      case "/school/parents": {
        const guardians = new Map<string, { name: string; phone: string; email: string; learners: string[] }>();
        students.forEach((s: any) => {
          if (!s.guardian_name) return;
          const key = `${s.guardian_name}|${s.guardian_phone ?? ""}`;
          const e = guardians.get(key) ?? { name: s.guardian_name as string, phone: (s.guardian_phone ?? "—") as string, email: (s.guardian_email ?? "—") as string, learners: [] as string[] };
          e.learners.push(`${s.first_name} ${s.last_name}`);
          guardians.set(key, e);
        });
        const rows = Array.from(guardians.entries()).filter(([, g]) => match(`${g.name} ${g.phone}`));
        return (
          <Board title="Guardians" hint="Built from the guardian details on your learner records." right={<SearchBox value={q} onChange={setQ} />}>
            {rows.length === 0 ? (
              <EmptyState title="No guardian details yet" message="Guardian name, phone and email captured on learner records appear here." action={{ label: "Open students", to: "/students" }} />
            ) : (
              <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
                {rows.map(([key, g]) => (
                  <div key={key} className="flex items-start gap-3 rounded-2xl border p-4">
                    <Avatar name={g.name} accent="school" />
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{g.name}</div>
                      <div className="truncate text-xs text-muted-foreground">{g.phone} · {g.email}</div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {g.learners.map((l) => (
                          <span key={l} className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium">{l}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Board>
        );
      }
      case "/school/fees": {
        const filtered = fees.filter((f: any) => match(`${studentName.get(f.student_id) ?? ""} ${f.term} ${f.description ?? ""}`));
        const rows = filtered.slice(0, 200);
        const overdue = fees.filter((f: any) => Number(f.balance) > 0 && f.due_date && new Date(f.due_date) < new Date());
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <MetricTile label="Billed" value={fmtMoney(billed)} icon={ReceiptText} />
              <MetricTile label="Collected" value={fmtMoney(collected)} icon={Wallet} tone="good" progress={billed ? (collected / billed) * 100 : 0} />
              <MetricTile label="Arrears" value={fmtMoney(arrears)} icon={WalletCards} tone={arrears > 0 ? "warn" : "good"} />
              <MetricTile label="Past due" value={String(overdue.length)} icon={CalendarCheck} tone={overdue.length ? "bad" : "good"} hint="Fee accounts past their due date" />
            </div>
            <Board title="Fee accounts" hint="Colour shows how much of each account is still owing. Fee receipts stay separate from general cash." right={<div className="flex gap-2"><SearchBox value={q} onChange={setQ} /><Link to="/school/fees-billing" className="rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">Bill fees</Link></div>}>
              {rows.length === 0 ? (
                <EmptyState title="No fee accounts" message="Fee accounts raised against learners appear here with billed, paid and outstanding amounts." action={{ label: "Bill fees", to: "/school/fees-billing" }} />
              ) : (
                <>
                  <TileGrid>
                    {rows.slice(0, 8).map((f: any) => (
                      <Tile
                        key={f.id}
                        status={feeTone(f) as any}
                        title={studentName.get(f.student_id) ?? "Learner"}
                        subtitle={`${f.term} ${f.academic_year} · due ${f.due_date ?? "—"}`}
                        meta={<>{fmtMoney(Number(f.amount_paid))} paid of {fmtMoney(Number(f.amount_due))}</>}
                        badge={<StatusPill status={f.status} />}
                      />
                    ))}
                  </TileGrid>
                  <div className="border-t">
                    <RecordTable
                      columns={["Learner", "Term", "Description", "Billed", "Paid", "Balance", "Status"]}
                      rows={rows.map((f: any) => ({
                        key: f.id,
                        cells: [studentName.get(f.student_id) ?? "—", `${f.term} ${f.academic_year}`, f.description ?? "—", fmtMoney(Number(f.amount_due)), fmtMoney(Number(f.amount_paid)), fmtMoney(Number(f.balance)), <StatusPill status={f.status} />],
                      }))}
                    />
                  </div>
                </>
              )}
            </Board>
          </div>
        );
      }
      case "/school/payments": {
        const rows = payments.filter((p: any) => match(`${studentName.get(p.student_id) ?? ""} ${p.receipt_no ?? ""}`)).slice(0, 200);
        const received = rows.reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
        const methodMix = Object.entries(
          payments.reduce((m: Record<string, number>, p: any) => { m[p.method ?? "other"] = (m[p.method ?? "other"] ?? 0) + Number(p.amount || 0); return m; }, {}),
        ).map(([label, value]) => ({ label, value: value as number }));
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <MetricTile label="Payments" value={String(payments.length)} icon={Wallet} />
              <MetricTile label="Value shown" value={fmtMoney(received)} icon={ReceiptText} tone="good" />
              <MetricTile label="Still owing" value={fmtMoney(arrears)} icon={WalletCards} tone={arrears > 0 ? "warn" : "good"} />
              <MetricTile label="Collection rate" value={`${Math.round(billed ? (collected / billed) * 100 : 0)}%`} icon={BarChart3} />
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              <Board title="How families pay" hint="Fee payment methods."><Bars items={methodMix} format={fmtMoney} /></Board>
              <div className="lg:col-span-2">
                <Board title="Fee payment history" hint="Student fee receipts, recorded against the learner's fee account." right={<SearchBox value={q} onChange={setQ} />}>
                  <Timeline
                    empty="No fee payments recorded."
                    items={rows.slice(0, 15).map((p: any) => ({
                      key: p.id, when: p.payment_date,
                      title: studentName.get(p.student_id) ?? "Learner",
                      detail: `${p.method ?? "—"} · ${p.receipt_no ?? "—"}${p.reference ? ` · ${p.reference}` : ""}`,
                      amount: fmtMoney(Number(p.amount)),
                    }))}
                  />
                </Board>
              </div>
            </div>
          </div>
        );
      }
      case "/school/staff": {
        const rows = staff.filter((s: any) => match(`${s.first_name} ${s.last_name} ${s.employee_code ?? ""}`)).slice(0, 60);
        return (
          <Board title="Staff" hint="Your payroll employee records." right={<div className="flex gap-2"><SearchBox value={q} onChange={setQ} /><Link to="/employees" className="rounded-xl border px-3 py-2 text-sm font-medium hover:bg-muted">Manage staff</Link></div>}>
            {rows.length === 0 ? (
              <EmptyState title="No staff match" message="Teaching and support staff on your payroll appear here." action={{ label: "Open employees", to: "/employees" }} />
            ) : (
              <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
                {rows.map((s: any) => (
                  <div key={s.id} className="flex items-center gap-3 rounded-2xl border p-4">
                    <Avatar name={`${s.first_name} ${s.last_name}`} accent="school" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold">{s.first_name} {s.last_name}</div>
                      <div className="truncate text-xs text-muted-foreground">{s.employee_code ?? "—"} · {s.email ?? s.phone ?? "—"}</div>
                    </div>
                    <StatusPill status={s.status ?? "active"} />
                  </div>
                ))}
              </div>
            )}
          </Board>
        );
      }

      default:
        return (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["Trial balance", "/reports/trial-balance"], ["Profit & loss", "/reports/pnl"],
              ["Aged receivables", "/reports/aged-receivables"], ["Cashbook", "/cashbook"],
              ["Payroll summary", "/reports/payroll-summary"], ["Management pack", "/reports/management-pack"],
            ].map(([label, to]) => (
              <Link key={to} to={to as never} className="rounded-2xl border bg-card p-4 font-medium transition hover:-translate-y-0.5 hover:border-primary/50">
                {label}
              </Link>
            ))}
          </div>
        );
    }
  };

  return (
    <IndustryShell accent="school" product="SifoBooks School" title={title} subtitle={subtitle} nav={SCHOOL_NAV} active={screen}>
      {body()}
    </IndustryShell>
  );
}
