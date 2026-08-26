import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CalendarClock, ClipboardList, Loader2, Save, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { specialtyLabel } from "@/lib/triage";

export const Route = createFileRoute("/doctor")({
  head: () => ({
    meta: [
      { title: "Doctor Desk — Appointments & Patient History | MediConnect" },
      {
        name: "description",
        content:
          "Doctors can review today's schedule, upcoming appointments, patient details, visit history and add consultation notes.",
      },
      { property: "og:title", content: "Doctor Desk — MediConnect" },
      { property: "og:description", content: "Schedule, patient information and visit history for hospital doctors." },
    ],
  }),
  component: DoctorPage,
});

const today = () => new Date().toISOString().slice(0, 10);

type Appt = {
  id: string;
  patient_id: string;
  slot_date: string;
  slot_time: string;
  reason: string;
  status: string;
  doctor_notes: string | null;
};

function DoctorPage() {
  const { t, lang } = useI18n();
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", replace: true });
  }, [loading, user, navigate]);

  const { data: doctor, isLoading: loadingDoctor } = useQuery({
    queryKey: ["me-doctor", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("doctors")
        .select("id, full_name, specialization, qualification, experience_years, bio, fee")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ["doctor-appointments", doctor?.id],
    enabled: !!doctor,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("id, patient_id, slot_date, slot_time, reason, status, doctor_notes")
        .eq("doctor_id", doctor!.id)
        .order("slot_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Appt[];
    },
  });

  const patientIds = [...new Set(appointments.map((a) => a.patient_id))];
  const { data: patients = [] } = useQuery({
    queryKey: ["doctor-patients", patientIds.join(",")],
    enabled: patientIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, phone, preferred_language")
        .in("id", patientIds);
      if (error) throw error;
      return data ?? [];
    },
  });

  const patientName = (id: string) => patients.find((p) => p.id === id)?.full_name || t("doc.patient");
  const patientPhone = (id: string) => patients.find((p) => p.id === id)?.phone ?? "";

  if (loading || loadingDoctor) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <p className="mx-auto max-w-6xl px-4 py-16 text-muted-foreground">{t("common.loading")}</p>
      </div>
    );
  }

  if (!doctor || role !== "doctor") {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="mx-auto max-w-2xl px-4 py-20 text-center">
          <h1 className="text-2xl font-bold">{t("doc.notDoctor")}</h1>
          <Button className="mt-6" onClick={() => navigate({ to: "/dashboard" })}>
            {t("nav.dashboard")}
          </Button>
        </div>
      </div>
    );
  }

  const now = today();
  const todays = appointments.filter((a) => a.slot_date === now && a.status !== "cancelled");
  const upcoming = appointments.filter((a) => a.slot_date > now && a.status !== "cancelled");
  const history = appointments.filter((a) => a.slot_date < now || a.status !== "booked");

  const AppointmentRow = ({ a }: { a: Appt }) => {
    const [note, setNote] = useState(a.doctor_notes ?? "");
    const [busy, setBusy] = useState(false);

    const saveNote = async (markDone: boolean) => {
      setBusy(true);
      const { error } = await supabase
        .from("appointments")
        .update({ doctor_notes: note.trim().slice(0, 1000), ...(markDone ? { status: "completed" } : {}) })
        .eq("id", a.id);
      setBusy(false);
      if (error) {
        toast.error(t("common.error"));
        return;
      }
      toast.success(t("dash.saved"));
      void queryClient.invalidateQueries({ queryKey: ["doctor-appointments"] });
    };

    return (
      <li className="card-elevated p-5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <UserRound className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{patientName(a.patient_id)}</p>
            <p className="text-xs text-muted-foreground">
              {a.slot_date} · {a.slot_time}
              {patientPhone(a.patient_id) ? ` · ${patientPhone(a.patient_id)}` : ""}
            </p>
          </div>
          <Badge variant={a.status === "completed" ? "secondary" : "outline"}>
            {t(`common.status.${a.status}`)}
          </Badge>
        </div>
        {a.reason && (
          <p className="mt-3 text-sm">
            <span className="font-semibold">{t("doc.reason")}:</span> {a.reason}
          </p>
        )}
        <div className="mt-3 space-y-2">
          <Label htmlFor={`note-${a.id}`} className="text-xs">
            {t("doc.noteAdd")}
          </Label>
          <Textarea id={`note-${a.id}`} rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => saveNote(false)} disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} {t("dash.save")}
            </Button>
            {a.status === "booked" && (
              <Button size="sm" onClick={() => saveNote(true)} disabled={busy}>
                {t("doc.markDone")}
              </Button>
            )}
          </div>
        </div>
      </li>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-3xl font-extrabold">{t("doc.title")}</h1>
        <p className="mt-1 text-muted-foreground">
          {doctor.full_name} · {specialtyLabel(lang, doctor.specialization)}
        </p>

        <Tabs defaultValue="today" className="mt-8">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="today" className="gap-1.5">
              <CalendarClock className="size-4" />
              <span className="hidden sm:inline">{t("doc.today")}</span>
            </TabsTrigger>
            <TabsTrigger value="upcoming">
              <span className="hidden sm:inline">{t("doc.upcoming")}</span>
              <span className="sm:hidden">→</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5">
              <ClipboardList className="size-4" />
              <span className="hidden sm:inline">{t("doc.history")}</span>
            </TabsTrigger>
            <TabsTrigger value="profile">
              <span className="hidden sm:inline">{t("doc.profile")}</span>
              <span className="sm:hidden">👤</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="today" className="mt-6">
            {todays.length === 0 ? (
              <p className="text-muted-foreground">{t("doc.none")}</p>
            ) : (
              <ul className="space-y-3">
                {todays.map((a) => (
                  <AppointmentRow key={a.id} a={a} />
                ))}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="upcoming" className="mt-6">
            {upcoming.length === 0 ? (
              <p className="text-muted-foreground">{t("doc.none")}</p>
            ) : (
              <ul className="space-y-3">
                {upcoming.map((a) => (
                  <AppointmentRow key={a.id} a={a} />
                ))}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            {history.length === 0 ? (
              <p className="text-muted-foreground">{t("doc.none")}</p>
            ) : (
              <ul className="space-y-3">
                {history.map((a) => (
                  <AppointmentRow key={a.id} a={a} />
                ))}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="profile" className="mt-6">
            <DoctorProfileForm
              doctor={doctor}
              onSaved={() => queryClient.invalidateQueries({ queryKey: ["me-doctor"] })}
            />
          </TabsContent>
        </Tabs>
      </main>
      <SiteFooter />
    </div>
  );
}

type DoctorRow = {
  id: string;
  full_name: string;
  specialization: string;
  qualification: string;
  experience_years: number;
  bio: string;
  fee: number;
};

function DoctorProfileForm({ doctor, onSaved }: { doctor: DoctorRow; onSaved: () => void }) {
  const { t } = useI18n();
  const [form, setForm] = useState(doctor);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    const { error } = await supabase
      .from("doctors")
      .update({
        full_name: form.full_name.slice(0, 80),
        specialization: form.specialization,
        qualification: form.qualification.slice(0, 120),
        experience_years: Number(form.experience_years) || 0,
        bio: form.bio.slice(0, 600),
        fee: Number(form.fee) || 0,
      })
      .eq("id", doctor.id);
    setBusy(false);
    if (error) {
      toast.error(t("common.error"));
      return;
    }
    toast.success(t("dash.saved"));
    onSaved();
  };

  return (
    <div className="card-elevated space-y-4 p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>{t("auth.name")}</Label>
          <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>{t("auth.specialization")}</Label>
          <Input value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>{t("common.qualification")}</Label>
          <Input value={form.qualification} onChange={(e) => setForm({ ...form, qualification: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>{t("doctors.experience")}</Label>
          <Input
            type="number"
            min={0}
            max={70}
            value={form.experience_years}
            onChange={(e) => setForm({ ...form, experience_years: Number(e.target.value) })}
          />
        </div>
        <div className="space-y-2">
          <Label>{t("doctors.fee")} (₹)</Label>
          <Input
            type="number"
            min={0}
            value={form.fee}
            onChange={(e) => setForm({ ...form, fee: Number(e.target.value) })}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Bio</Label>
        <Textarea rows={3} maxLength={600} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
      </div>
      <Button onClick={save} disabled={busy}>
        {busy && <Loader2 className="size-4 animate-spin" />} {t("dash.save")}
      </Button>
    </div>
  );
}
