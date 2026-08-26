import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Award, BadgeIndianRupee, CalendarDays, Loader2, Search, Stethoscope } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { SPECIALTIES, TIME_SLOTS, specialtyLabel } from "@/lib/triage";

const searchSchema = z.object({ specialty: z.string().optional() });

export const Route = createFileRoute("/doctors")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Find a Doctor & Book an Appointment — MediConnect" },
      {
        name: "description",
        content:
          "Browse specialists by department, compare experience and fees, and book an available appointment slot in seconds.",
      },
      { property: "og:title", content: "Find a Doctor & Book an Appointment — MediConnect" },
      { property: "og:description", content: "Cardiology, paediatrics, orthopaedics and more. Book a free slot today." },
    ],
  }),
  component: DoctorsPage,
});

type Doctor = {
  id: string;
  full_name: string;
  specialization: string;
  qualification: string;
  experience_years: number;
  bio: string;
  fee: number;
  languages: string[];
  available_days: number[];
};

function initials(name: string) {
  return name
    .replace(/^Dr\.?\s*/i, "")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function DoctorsPage() {
  const { t, lang } = useI18n();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [booking, setBooking] = useState<Doctor | null>(null);
  const specialty = search.specialty ?? "all";

  const { data: doctors = [], isLoading } = useQuery({
    queryKey: ["doctors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("doctors")
        .select("id, full_name, specialization, qualification, experience_years, bio, fee, languages, available_days")
        .eq("is_active", true)
        .order("experience_years", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Doctor[];
    },
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return doctors.filter(
      (d) =>
        (specialty === "all" || d.specialization === specialty) &&
        (!q || d.full_name.toLowerCase().includes(q) || d.specialization.toLowerCase().includes(q)),
    );
  }, [doctors, specialty, query]);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-3xl font-extrabold sm:text-4xl">{t("doctors.title")}</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">{t("doctors.sub")}</p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder={t("doctors.search")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Select
            value={specialty}
            onValueChange={(v) => navigate({ to: "/doctors", search: v === "all" ? {} : { specialty: v } })}
          >
            <SelectTrigger className="sm:w-72">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("doctors.all")}</SelectItem>
              {SPECIALTIES.map((s) => (
                <SelectItem key={s} value={s}>
                  {specialtyLabel(lang, s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <p className="mt-10 text-muted-foreground">{t("common.loading")}</p>
        ) : filtered.length === 0 ? (
          <p className="mt-10 text-muted-foreground">{t("doctors.none")}</p>
        ) : (
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {filtered.map((d) => (
              <article key={d.id} className="card-elevated flex flex-col p-6">
                <div className="flex items-start gap-4">
                  <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl gradient-hero text-lg font-bold text-primary-foreground">
                    {initials(d.full_name)}
                  </span>
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-bold">{d.full_name}</h2>
                    <p className="text-sm font-medium text-primary">{specialtyLabel(lang, d.specialization)}</p>
                    <p className="text-xs text-muted-foreground">{d.qualification}</p>
                  </div>
                </div>
                <p className="mt-4 line-clamp-2 text-sm text-muted-foreground">{d.bio}</p>
                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                  <Badge variant="secondary" className="gap-1">
                    <Award className="size-3" /> {d.experience_years} {t("doctors.experience")}
                  </Badge>
                  <Badge variant="secondary" className="gap-1">
                    <BadgeIndianRupee className="size-3" /> {t("doctors.fee")}: ₹{Number(d.fee).toFixed(0)}
                  </Badge>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  {t("doctors.speaks")}: {d.languages.join(", ")}
                </p>
                <Button className="mt-5 w-full" onClick={() => setBooking(d)}>
                  <CalendarDays className="size-4" /> {t("doctors.book")}
                </Button>
              </article>
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
      <BookingDialog doctor={booking} onClose={() => setBooking(null)} />
    </div>
  );
}

function BookingDialog({ doctor, onClose }: { doctor: Doctor | null; onClose: () => void }) {
  const { t, lang } = useI18n();
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [slot, setSlot] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: taken = [] } = useQuery({
    queryKey: ["slots", doctor?.id, date],
    enabled: !!doctor,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("slot_time")
        .eq("doctor_id", doctor!.id)
        .eq("slot_date", date)
        .neq("status", "cancelled");
      if (error) throw error;
      return (data ?? []).map((r) => r.slot_time);
    },
  });

  if (!doctor) return null;

  const weekday = new Date(`${date}T00:00:00`).getDay();
  const dayAvailable = doctor.available_days.includes(weekday);

  const confirm = async () => {
    if (!user) {
      toast.error(t("book.loginFirst"));
      navigate({ to: "/auth" });
      return;
    }
    if (role === "doctor") {
      toast.error(t("book.loginFirst"));
      return;
    }
    if (!slot) {
      toast.error(t("common.required"));
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("appointments").insert({
      patient_id: user.id,
      doctor_id: doctor.id,
      slot_date: date,
      slot_time: slot,
      reason: reason.trim().slice(0, 500),
    });
    setBusy(false);
    if (error) {
      toast.error(error.code === "23505" ? t("book.taken") : t("common.error"));
      return;
    }
    toast.success(t("book.success"));
    void queryClient.invalidateQueries({ queryKey: ["slots"] });
    void queryClient.invalidateQueries({ queryKey: ["my-appointments"] });
    setSlot(null);
    setReason("");
    onClose();
    navigate({ to: "/dashboard" });
  };

  return (
    <Dialog open={!!doctor} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Stethoscope className="size-5 text-primary" />
            {t("book.title")} {doctor.full_name}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{specialtyLabel(lang, doctor.specialization)}</p>

        <div className="mt-2 space-y-2">
          <Label htmlFor="book-date">{t("book.date")}</Label>
          <Input
            id="book-date"
            type="date"
            min={today}
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setSlot(null);
            }}
          />
        </div>

        <div className="space-y-2">
          <Label>{t("book.slot")}</Label>
          {!dayAvailable ? (
            <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">{t("book.noSlots")}</p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {TIME_SLOTS.map((s) => {
                const isTaken = taken.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    disabled={isTaken}
                    onClick={() => setSlot(s)}
                    className={`rounded-lg border px-2 py-2 text-sm font-medium transition-colors ${
                      isTaken
                        ? "cursor-not-allowed border-border bg-muted text-muted-foreground line-through"
                        : slot === s
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border hover:bg-secondary"
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="book-reason">{t("book.reason")}</Label>
          <Textarea
            id="book-reason"
            rows={3}
            maxLength={500}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>

        <Button size="lg" onClick={confirm} disabled={busy || !dayAvailable}>
          {busy && <Loader2 className="size-4 animate-spin" />} {t("book.confirm")}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
