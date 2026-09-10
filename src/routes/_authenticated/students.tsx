import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { GraduationCap, School, Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SimpleCrud } from "@/components/SimpleCrud";
import { supabase } from "@/integrations/supabase/client";
import { RequireModule } from "@/components/RequireModule";

export const Route = createFileRoute("/_authenticated/students")({
  head: () => ({
    meta: [
      { title: "Students & Classes — SifoBooks" },
      { name: "description", content: "Student register, guardians, classes and streams, and enrolment tracking for schools." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => <RequireModule moduleKey="school_erp"><StudentsPage /></RequireModule>,
});

const YEAR = new Date().getFullYear();

const STUDENT_STATUS = [
  { value: "active", label: "Active" },
  { value: "transferred", label: "Transferred" },
  { value: "graduated", label: "Graduated" },
  { value: "withdrawn", label: "Withdrawn" },
];

function StudentsPage() {
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const [c, s] = await Promise.all([
        supabase.from("school_classes").select("*").order("name"),
        supabase.from("students").select("id, class_id, status, gender").limit(5000),
      ]);
      setClasses(c.data ?? []); setStudents(s.data ?? []);
    })();
  }, []);

  const classOpts = classes.map(c => ({ value: c.id, label: `${c.name}${c.stream ? " " + c.stream : ""}` }));
  const className = (id: string) => classOpts.find(c => c.value === id)?.label ?? "—";

  const kpis = useMemo(() => ({
    total: students.length,
    active: students.filter(s => s.status === "active").length,
    boys: students.filter(s => (s.gender ?? "").toLowerCase().startsWith("m")).length,
    girls: students.filter(s => (s.gender ?? "").toLowerCase().startsWith("f")).length,
  }), [students]);

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <GraduationCap className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Students & Classes</h1>
          <p className="text-sm text-muted-foreground">Enrolment register, guardians, classes and streams.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Enrolled students", value: kpis.total },
          { label: "Active", value: kpis.active },
          { label: "Boys", value: kpis.boys },
          { label: "Girls", value: kpis.girls },
        ].map(k => (
          <Card key={k.label} className="p-4">
            <div className="text-xs text-muted-foreground">{k.label}</div>
            <div className="text-xl font-semibold tabular-nums">{k.value}</div>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="students">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="students"><Users className="h-4 w-4 mr-1.5" />Students</TabsTrigger>
          <TabsTrigger value="classes"><School className="h-4 w-4 mr-1.5" />Classes & Streams</TabsTrigger>
        </TabsList>

        <TabsContent value="students" className="mt-2">
          <SimpleCrud
            title="Student" icon={Users} table="students" orderBy={{ column: "last_name" }}
            searchKeys={["student_no", "first_name", "last_name", "guardian_name"]}
            statusField="status" dateField="enrolment_date"
            extraFilters={[
              { name: "class_id", label: "Class", options: classOpts },
              { name: "boarding", label: "Boarding", options: [{ value: "day", label: "Day" }, { value: "boarding", label: "Boarding" }] },
            ]}
            columns={[
              { key: "student_no", header: "Student #" },
              { key: "first_name", header: "First name" },
              { key: "last_name", header: "Surname" },
              { key: "gender", header: "Gender" },
              { key: "class_id", header: "Class", render: (r: any) => className(r.class_id) },
              { key: "guardian_name", header: "Guardian" },
              { key: "guardian_phone", header: "Guardian phone" },
              { key: "boarding", header: "Type" },
              { key: "sponsorship", header: "Sponsorship" },
              { key: "enrolment_date", header: "Enrolled" },
              { key: "status", header: "Status", render: (r: any) => <Badge>{r.status}</Badge> },
            ]}
            fields={[
              { name: "student_no", label: "Student #", required: true },
              { name: "class_id", label: "Class", type: "lookup", lookup: { table: "school_classes", labelColumn: "name", metaColumns: ["grade_level", "stream", "academic_year", "class_teacher"], orderBy: "name", emptyTitle: "No classes set up yet." } },
              { name: "first_name", label: "First name", required: true },
              { name: "last_name", label: "Surname", required: true },
              { name: "gender", label: "Gender", type: "select", options: [{ value: "Male", label: "Male" }, { value: "Female", label: "Female" }] },
              { name: "date_of_birth", label: "Date of birth", type: "date" },
              { name: "enrolment_date", label: "Enrolment date", type: "date", defaultValue: new Date().toISOString().slice(0, 10) },
              { name: "boarding", label: "Day / boarding", type: "select", options: [{ value: "day", label: "Day scholar" }, { value: "boarding", label: "Boarder" }], defaultValue: "day" },
              { name: "guardian_name", label: "Guardian name" },
              { name: "guardian_relationship", label: "Relationship" },
              { name: "guardian_phone", label: "Guardian phone" },
              { name: "guardian_email", label: "Guardian email" },
              { name: "sponsorship", label: "Sponsorship", type: "select", options: [{ value: "self", label: "Self / family" }, { value: "bursary", label: "Government bursary" }, { value: "ovc", label: "OVC" }, { value: "donor", label: "Donor sponsored" }], defaultValue: "self" },
              { name: "status", label: "Status", type: "select", options: STUDENT_STATUS, defaultValue: "active" },
              { name: "address", label: "Home address", type: "textarea" },
              { name: "notes", label: "Notes", type: "textarea" },
            ]}
          />
        </TabsContent>

        <TabsContent value="classes" className="mt-2">
          <SimpleCrud
            title="Class" icon={School} table="school_classes" orderBy={{ column: "name" }}
            searchKeys={["name", "stream", "class_teacher"]} statusField="status"
            columns={[
              { key: "name", header: "Class" },
              { key: "grade_level", header: "Grade" },
              { key: "stream", header: "Stream" },
              { key: "academic_year", header: "Year" },
              { key: "class_teacher", header: "Class teacher" },
              { key: "capacity", header: "Capacity", align: "right" },
              { key: "enrolled", header: "Enrolled", align: "right", render: (r: any) => students.filter(s => s.class_id === r.id).length },
              { key: "status", header: "Status" },
            ]}
            fields={[
              { name: "name", label: "Class name", required: true },
              { name: "grade_level", label: "Grade level" },
              { name: "stream", label: "Stream" },
              { name: "academic_year", label: "Academic year", type: "number", defaultValue: YEAR },
              { name: "class_teacher", label: "Class teacher" },
              { name: "capacity", label: "Capacity", type: "number" },
              { name: "status", label: "Status", type: "select", options: [{ value: "active", label: "Active" }, { value: "archived", label: "Archived" }], defaultValue: "active" },
            ]}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
