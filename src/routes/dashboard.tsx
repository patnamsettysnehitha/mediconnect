import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CalendarDays, FileHeart, Loader2, Paperclip, Pill, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { EmergencyCard } from "@/components/EmergencyCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { specialtyLabel } from "@/lib/triage";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "My Health Dashboard — Appointments, Records & Medicines" },
      {
        name: "description",
        content:
          "See upcoming appointments, upload prescriptions and reports, and track your daily medicine schedule in one place.",
      },
      { property: "og:title", content: "My Health Dashboard — Aarogya Care" },
      { property: "og:description", content: "Appointments, medical records and medicine reminders for patients." },
    ],
  }),
  component: DashboardPage,
});

const today = () => new Date().toISOString().slice(0, 10);

function DashboardPage() {
  const { t } = useI18n();
  const { user, profile, role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", replace: true });
    if (!loading && user && role === "doctor") navigate({ to: "/doctor", replace: true });
  }, [loading, user, role, navigate]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <p className="mx-auto max-w-6xl px-4 py-16 text-muted-foreground">{t("common.loading")}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-3xl font-extrabold">{t("dash.title")}</h1>
        <p className="mt-1 text-muted-foreground">
          {t("dash.hello")}, {profile?.full_name || user.email}
        </p>

        <Tabs defaultValue="appointments" className="mt-8">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="appointments" className="gap-1.5">
              <CalendarDays className="size-4" />
              <span className="hidden sm:inline">{t("dash.tab.appointments")}</span>
            </TabsTrigger>
            <TabsTrigger value="records" className="gap-1.5">
              <FileHeart className="size-4" />
              <span className="hidden sm:inline">{t("dash.tab.records")}</span>
            </TabsTrigger>
            <TabsTrigger value="medicines" className="gap-1.5">
              <Pill className="size-4" />
              <span className="hidden sm:inline">{t("dash.tab.medicines")}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="appointments" className="mt-6">
            <AppointmentsTab userId={user.id} />
          </TabsContent>
          <TabsContent value="records" className="mt-6">
            <RecordsTab userId={user.id} />
          </TabsContent>
          <TabsContent value="medicines" className="mt-6">
            <MedicinesTab userId={user.id} />
          </TabsContent>
        </Tabs>

        <div className="mt-10">
          <EmergencyCard />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function statusKey(status: string) {
  return `common.status.${status}`;
}

function AppointmentsTab({ userId }: { userId: string }) {
  const { t, lang } = useI18n();
  const queryClient = useQueryClient();

  const { data = [], isLoading } = useQuery({
    queryKey: ["my-appointments", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("id, slot_date, slot_time, reason, status, doctor_notes, doctors(full_name, specialization)")
        .eq("patient_id", userId)
        .order("slot_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const cancel = async (id: string) => {
    const { error } = await supabase.from("appointments").update({ status: "cancelled" }).eq("id", id);
    if (error) {
      toast.error(t("common.error"));
      return;
    }
    toast.success(t("dash.cancelled"));
    void queryClient.invalidateQueries({ queryKey: ["my-appointments"] });
  };

  if (isLoading) return <p className="text-muted-foreground">{t("common.loading")}</p>;
  if (data.length === 0) return <p className="text-muted-foreground">{t("dash.noAppointments")}</p>;

  const upcoming = data.filter((a) => a.slot_date >= today() && a.status === "booked");
  const past = data.filter((a) => !(a.slot_date >= today() && a.status === "booked"));

  const Card = ({ a, canCancel }: { a: (typeof data)[number]; canCancel: boolean }) => (
    <li className="card-elevated flex flex-wrap items-center gap-4 p-5">
      <div className="flex size-14 flex-col items-center justify-center rounded-xl bg-accent text-accent-foreground">
        <span className="text-lg font-bold leading-none">{a.slot_date.slice(8, 10)}</span>
        <span className="text-[10px] uppercase">{a.slot_date.slice(5, 7)}/{a.slot_date.slice(2, 4)}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{a.doctors?.full_name}</p>
        <p className="text-sm text-primary">{specialtyLabel(lang, a.doctors?.specialization ?? "")}</p>
        <p className="text-xs text-muted-foreground">
          {a.slot_time} · {a.reason || "—"}
        </p>
        {a.doctor_notes && <p className="mt-2 rounded-lg bg-secondary p-2 text-xs">{a.doctor_notes}</p>}
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={a.status === "cancelled" ? "destructive" : "secondary"}>{t(statusKey(a.status))}</Badge>
        {canCancel && (
          <Button variant="ghost" size="sm" onClick={() => cancel(a.id)}>
            {t("dash.cancel")}
          </Button>
        )}
      </div>
    </li>
  );

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 text-lg font-bold">{t("dash.upcoming")}</h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("dash.noAppointments")}</p>
        ) : (
          <ul className="space-y-3">
            {upcoming.map((a) => (
              <Card key={a.id} a={a} canCancel />
            ))}
          </ul>
        )}
      </section>
      {past.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold">{t("dash.past")}</h2>
          <ul className="space-y-3">
            {past.map((a) => (
              <Card key={a.id} a={a} canCancel={false} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

const RECORD_TYPES = ["prescription", "lab report", "scan", "discharge summary", "other"];

function RecordsTab({ userId }: { userId: string }) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState(RECORD_TYPES[0]!);
  const [date, setDate] = useState(today());
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ["records", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("medical_records")
        .select("id, title, record_type, record_date, notes, file_path")
        .eq("patient_id", userId)
        .order("record_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const save = async () => {
    if (!title.trim()) {
      toast.error(t("common.required"));
      return;
    }
    setBusy(true);
    let filePath: string | null = null;
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setBusy(false);
        toast.error("Max file size is 10 MB.");
        return;
      }
      const ext = file.name.split(".").pop() ?? "bin";
      filePath = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("medical-records").upload(filePath, file);
      if (upErr) {
        setBusy(false);
        toast.error(t("common.error"));
        return;
      }
    }
    const { error } = await supabase.from("medical_records").insert({
      patient_id: userId,
      title: title.trim().slice(0, 120),
      record_type: type,
      record_date: date,
      notes: notes.trim().slice(0, 1000) || null,
      file_path: filePath,
    });
    setBusy(false);
    if (error) {
      toast.error(t("common.error"));
      return;
    }
    toast.success(t("dash.saved"));
    setTitle("");
    setNotes("");
    setFile(null);
    setOpen(false);
    void queryClient.invalidateQueries({ queryKey: ["records", userId] });
  };

  const view = async (path: string) => {
    const { data, error } = await supabase.storage.from("medical-records").createSignedUrl(path, 300);
    if (error || !data) {
      toast.error(t("common.error"));
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener");
  };

  const remove = async (id: string, path: string | null) => {
    if (path) await supabase.storage.from("medical-records").remove([path]);
    const { error } = await supabase.from("medical_records").delete().eq("id", id);
    if (error) {
      toast.error(t("common.error"));
      return;
    }
    void queryClient.invalidateQueries({ queryKey: ["records", userId] });
  };

  return (
    <div>
      <Button onClick={() => setOpen((o) => !o)}>
        <Plus className="size-4" /> {t("dash.addRecord")}
      </Button>

      {open && (
        <div className="card-elevated mt-4 space-y-4 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="rec-title">{t("dash.recordTitle")}</Label>
              <Input id="rec-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
            </div>
            <div className="space-y-2">
              <Label>{t("dash.recordType")}</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RECORD_TYPES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rec-date">{t("dash.recordDate")}</Label>
              <Input id="rec-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rec-file">{t("dash.file")}</Label>
              <Input
                id="rec-file"
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="rec-notes">{t("dash.notes")}</Label>
            <Textarea id="rec-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} />
          </div>
          <Button onClick={save} disabled={busy}>
            {busy && <Loader2 className="size-4 animate-spin" />} {t("dash.save")}
          </Button>
        </div>
      )}

      <div className="mt-6">
        {isLoading ? (
          <p className="text-muted-foreground">{t("common.loading")}</p>
        ) : data.length === 0 ? (
          <p className="text-muted-foreground">{t("dash.noRecords")}</p>
        ) : (
          <ul className="space-y-3">
            {data.map((r) => (
              <li key={r.id} className="card-elevated flex flex-wrap items-center gap-3 p-5">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{r.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.record_type} · {r.record_date}
                  </p>
                  {r.notes && <p className="mt-1 text-sm text-muted-foreground">{r.notes}</p>}
                </div>
                {r.file_path && (
                  <Button variant="outline" size="sm" onClick={() => view(r.file_path!)}>
                    <Paperclip className="size-4" /> {t("dash.view")}
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => remove(r.id, r.file_path)}>
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function MedicinesTab({ userId }: { userId: string }) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [times, setTimes] = useState("09:00, 21:00");
  const [start, setStart] = useState(today());
  const [end, setEnd] = useState("");

  const { data = [], isLoading } = useQuery({
    queryKey: ["medicines", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("medicines")
        .select("id, name, dosage, times, start_date, end_date, is_active")
        .eq("patient_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const save = async () => {
    if (!name.trim()) {
      toast.error(t("common.required"));
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("medicines").insert({
      patient_id: userId,
      name: name.trim().slice(0, 100),
      dosage: dosage.trim().slice(0, 120),
      times: times
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 6),
      start_date: start,
      end_date: end || null,
    });
    setBusy(false);
    if (error) {
      toast.error(t("common.error"));
      return;
    }
    toast.success(t("dash.saved"));
    setName("");
    setDosage("");
    setOpen(false);
    void queryClient.invalidateQueries({ queryKey: ["medicines", userId] });
  };

  const stop = async (id: string) => {
    await supabase.from("medicines").update({ is_active: false }).eq("id", id);
    void queryClient.invalidateQueries({ queryKey: ["medicines", userId] });
  };

  const now = today();
  const dueToday = data.filter(
    (m) => m.is_active && m.start_date <= now && (!m.end_date || m.end_date >= now),
  );

  return (
    <div>
      <Button onClick={() => setOpen((o) => !o)}>
        <Plus className="size-4" /> {t("dash.addMedicine")}
      </Button>

      {open && (
        <div className="card-elevated mt-4 space-y-4 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="med-name">{t("dash.medName")}</Label>
              <Input id="med-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="med-dose">{t("dash.dosage")}</Label>
              <Input id="med-dose" value={dosage} onChange={(e) => setDosage(e.target.value)} maxLength={120} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="med-times">{t("dash.times")}</Label>
              <Input id="med-times" value={times} onChange={(e) => setTimes(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="med-start">{t("dash.start")}</Label>
                <Input id="med-start" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="med-end">{t("dash.end")}</Label>
                <Input id="med-end" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
              </div>
            </div>
          </div>
          <Button onClick={save} disabled={busy}>
            {busy && <Loader2 className="size-4 animate-spin" />} {t("dash.save")}
          </Button>
        </div>
      )}

      {dueToday.length > 0 && (
        <section className="mt-6 rounded-2xl border-2 border-primary/30 bg-accent/40 p-5">
          <h2 className="text-lg font-bold text-primary">{t("dash.today")}</h2>
          <ul className="mt-3 space-y-2">
            {dueToday.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-2 text-sm">
                <Pill className="size-4 text-primary" />
                <span className="font-semibold">{m.name}</span>
                <span className="text-muted-foreground">{m.dosage}</span>
                {m.times.map((time) => (
                  <Badge key={time} variant="secondary">
                    {time}
                  </Badge>
                ))}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-6">
        {isLoading ? (
          <p className="text-muted-foreground">{t("common.loading")}</p>
        ) : data.length === 0 ? (
          <p className="text-muted-foreground">{t("dash.noMedicines")}</p>
        ) : (
          <ul className="space-y-3">
            {data.map((m) => (
              <li key={m.id} className="card-elevated flex flex-wrap items-center gap-3 p-5">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{m.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {m.dosage} · {m.times.join(", ")} · {m.start_date}
                    {m.end_date ? ` → ${m.end_date}` : ""}
                  </p>
                </div>
                <Badge variant={m.is_active ? "secondary" : "outline"}>
                  {m.is_active ? t("dash.active") : t("dash.finished")}
                </Badge>
                {m.is_active && (
                  <Button variant="ghost" size="sm" onClick={() => stop(m.id)}>
                    {t("dash.stop")}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
