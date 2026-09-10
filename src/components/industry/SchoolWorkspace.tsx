import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { fmtMoney } from "@/lib/format";
import {
  Board, IndustryShell, NotConnected, RecordTable, SearchBox, StatGrid, StatusPill, type NavItem,
} from "@/components/industry/IndustryKit";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart3, BookOpen, CalendarCheck, GraduationCap, LayoutDashboard, ReceiptText,
  Users, Wallet, WalletCards,
} from "lucide-react";

const db: any = supabase;

export const SCHOOL_NAV: NavItem[] = [
  { label: "Dashboard", to: "/school", icon: LayoutDashboard },
  { label: "Students", to: "/school/students", icon: GraduationCap },
  { label: "Classes", to: "/school/academics", icon: BookOpen },
  { label: "Guardians", to: "/school/parents", icon: Users },
  { label: "Fees", to: "/school/fees", icon: WalletCards },
  { label: "Fee billing", to: "/school/fees-billing", icon: ReceiptText },
  { label: "Payments", to: "/school/payments", icon: Wallet },
  { label: "Staff", to: "/school/staff", icon: Users },
  { label: "Reports", to: "/school/reports", icon: BarChart3 },
  { label: "Attendance", to: "/school/attendance", icon: CalendarCheck, supported: false },
  { label: "Exams", to: "/school/exams", icon: BookOpen, supported: false },
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
  "/school/boarding": "Boarding",
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
      const [st, cl, fees, pays, staff, structures] = await Promise.all([
        db.from("students").select("id,student_no,first_name,last_name,class_id,status,guardian_name,guardian_phone,guardian_email,boarding").eq("user_id", uid).order("last_name").limit(500),
        db.from("school_classes").select("id,name,grade_level,stream,class_teacher,capacity,academic_year,status").eq("user_id", uid).order("name").limit(200),
        db.from("student_fees").select("id,student_id,term,academic_year,amount_due,amount_paid,balance,status,due_date,description").eq("user_id", uid).order("due_date", { ascending: false }).limit(500),
        db.from("fee_payments").select("id,student_id,amount,payment_date,method,receipt_no,reference").eq("user_id", uid).order("payment_date", { ascending: false }).limit(300),
        db.from("employees").select("id,employee_code,first_name,last_name,status,email,phone").eq("user_id", uid).order("last_name").limit(300),
        db.from("fee_structures").select("id,fee_name,term,academic_year,amount,class_id,is_mandatory").eq("user_id", uid).limit(200),
      ]);
      if (cancelled) return;
      setData({
        students: st.data ?? [], classes: cl.data ?? [], fees: fees.data ?? [],
        payments: pays.data ?? [], staff: staff.data ?? [], structures: structures.data ?? [],
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

  const className = useMemo(() => new Map(classes.map((c: any) => [c.id, c.name])), [classes]);
  const studentName = useMemo(() => new Map(students.map((s: any) => [s.id, `${s.first_name} ${s.last_name}`])), [students]);
  const match = (s: string) => s.toLowerCase().includes(q.toLowerCase());

  const billed = fees.reduce((s: number, f: any) => s + Number(f.amount_due || 0), 0);
  const collected = fees.reduce((s: number, f: any) => s + Number(f.amount_paid || 0), 0);
  const arrears = fees.reduce((s: number, f: any) => s + Number(f.balance || 0), 0);

  const [title, subtitle] = TITLES[screen] ?? ["School", "School operations workspace."];

  const body = () => {
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

    switch (screen) {
      case "/school": {
        const withArrears = fees.filter((f: any) => Number(f.balance) > 0);
        return (
          <div className="space-y-4">
            <StatGrid items={[
              { label: "Learners", value: String(students.length), hint: `${students.filter((s: any) => (s.status ?? "").toLowerCase() === "active").length} active` },
              { label: "Classes", value: String(classes.length) },
              { label: "Fees collected", value: fmtMoney(collected), hint: `of ${fmtMoney(billed)} billed` },
              { label: "Arrears", value: fmtMoney(arrears), hint: `${withArrears.length} fee accounts` },
            ]} />
            <div className="grid gap-4 lg:grid-cols-2">
              <Board title="Largest fee balances" hint="Follow up the learners who owe the most.">
                <RecordTable
                  columns={["Learner", "Term", "Billed", "Paid", "Balance"]}
                  empty="No outstanding fee balances."
                  rows={[...withArrears].sort((a, b) => Number(b.balance) - Number(a.balance)).slice(0, 10).map((f: any) => ({
                    key: f.id,
                    cells: [studentName.get(f.student_id) ?? "—", `${f.term} ${f.academic_year}`, fmtMoney(Number(f.amount_due)), fmtMoney(Number(f.amount_paid)), <span className="font-semibold tabular-nums">{fmtMoney(Number(f.balance))}</span>],
                  }))}
                />
              </Board>
              <Board title="Recent fee payments" hint="Latest receipts from learners.">
                <RecordTable
                  columns={["Receipt", "Learner", "Date", "Amount"]}
                  empty="No fee payments recorded."
                  rows={payments.slice(0, 10).map((p: any) => ({
                    key: p.id,
                    cells: [p.receipt_no ?? "—", studentName.get(p.student_id) ?? "—", p.payment_date, fmtMoney(Number(p.amount))],
                  }))}
                />
              </Board>
            </div>
          </div>
        );
      }
      case "/school/students": {
        const rows = students.filter((s: any) => match(`${s.first_name} ${s.last_name} ${s.student_no} ${s.guardian_name ?? ""}`)).slice(0, 200);
        return (
          <Board title="Learner register" hint="Existing learners first — creation happens in Students." right={<div className="flex gap-2"><SearchBox value={q} onChange={setQ} /><Link to="/students" className="rounded-xl border px-3 py-2 text-sm font-medium hover:bg-muted">Manage learners</Link></div>}>
            <RecordTable
              columns={["Learner", "Student no.", "Class", "Guardian", "Boarding", "Status"]}
              rows={rows.map((s: any) => ({
                key: s.id,
                cells: [`${s.first_name} ${s.last_name}`, s.student_no, className.get(s.class_id) ?? "—", s.guardian_name ?? "—", s.boarding ?? "—", <StatusPill status={s.status} />],
              }))}
            />
          </Board>
        );
      }
      case "/school/academics": {
        const rows = classes.filter((c: any) => match(`${c.name} ${c.grade_level ?? ""} ${c.class_teacher ?? ""}`));
        return (
          <Board title="Classes" hint="Learner counts come from your live learner register." right={<SearchBox value={q} onChange={setQ} />}>
            <RecordTable
              columns={["Class", "Grade", "Stream", "Class teacher", "Learners", "Capacity", "Status"]}
              rows={rows.map((c: any) => ({
                key: c.id,
                cells: [c.name, c.grade_level ?? "—", c.stream ?? "—", c.class_teacher ?? "—", students.filter((s: any) => s.class_id === c.id).length, c.capacity ?? "—", <StatusPill status={c.status} />],
              }))}
            />
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
            <RecordTable
              columns={["Guardian", "Phone", "Email", "Learners"]}
              empty="No guardian details captured on learner records yet."
              rows={rows.map(([key, g]) => ({ key, cells: [g.name, g.phone, g.email, g.learners.join(", ")] }))}
            />
          </Board>
        );
      }
      case "/school/fees": {
        const rows = fees.filter((f: any) => match(`${studentName.get(f.student_id) ?? ""} ${f.term} ${f.description ?? ""}`)).slice(0, 200);
        return (
          <div className="space-y-4">
            <StatGrid items={[
              { label: "Billed", value: fmtMoney(billed) },
              { label: "Collected", value: fmtMoney(collected) },
              { label: "Arrears", value: fmtMoney(arrears) },
              { label: "Fee structures", value: String(structures.length) },
            ]} />
            <Board title="Learner fee accounts" hint="Each row is a real fee account. Fee receipts are separate from other cash receipts." right={<div className="flex gap-2"><SearchBox value={q} onChange={setQ} /><Link to="/school/fees-billing" className="rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">Bill fees</Link></div>}>
              <RecordTable
                columns={["Learner", "Term", "Description", "Billed", "Paid", "Balance", "Status"]}
                rows={rows.map((f: any) => ({
                  key: f.id,
                  cells: [studentName.get(f.student_id) ?? "—", `${f.term} ${f.academic_year}`, f.description ?? "—", fmtMoney(Number(f.amount_due)), fmtMoney(Number(f.amount_paid)), fmtMoney(Number(f.balance)), <StatusPill status={f.status} />],
                }))}
              />
            </Board>
          </div>
        );
      }
      case "/school/payments": {
        const rows = payments.filter((p: any) => match(`${studentName.get(p.student_id) ?? ""} ${p.receipt_no ?? ""}`)).slice(0, 200);
        return (
          <Board title="Fee payments" hint="Student fee receipts — recorded against the learner's fee account, not as general cash." right={<SearchBox value={q} onChange={setQ} />}>
            <RecordTable
              columns={["Receipt", "Learner", "Date", "Method", "Reference", "Amount"]}
              rows={rows.map((p: any) => ({
                key: p.id,
                cells: [p.receipt_no ?? "—", studentName.get(p.student_id) ?? "—", p.payment_date, p.method ?? "—", p.reference ?? "—", fmtMoney(Number(p.amount))],
              }))}
            />
          </Board>
        );
      }
      case "/school/staff": {
        const rows = staff.filter((s: any) => match(`${s.first_name} ${s.last_name} ${s.employee_code ?? ""}`)).slice(0, 200);
        return (
          <Board title="Staff" hint="Your payroll employee records." right={<div className="flex gap-2"><SearchBox value={q} onChange={setQ} /><Link to="/employees" className="rounded-xl border px-3 py-2 text-sm font-medium hover:bg-muted">Manage staff</Link></div>}>
            <RecordTable
              columns={["Staff member", "Code", "Email", "Phone", "Status"]}
              rows={rows.map((s: any) => ({
                key: s.id,
                cells: [`${s.first_name} ${s.last_name}`, s.employee_code ?? "—", s.email ?? "—", s.phone ?? "—", <StatusPill status={s.status ?? "active"} />],
              }))}
            />
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
