import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CalendarCheck,
  FileHeart,
  MessageCircleHeart,
  Pill,
  Stethoscope,
  ArrowRight,
  ShieldCheck,
  Languages,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { EmergencyCard } from "@/components/EmergencyCard";
import { useI18n } from "@/lib/i18n";
import heroImage from "@/assets/hero-hospital.jpg";
import careImage from "@/assets/care-consult.jpg";
import medicineImage from "@/assets/medicines.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Aarogya Care Hospital — Doctors, Records & Reminders" },
      {
        name: "description",
        content:
          "Describe your symptoms, find the right specialist, book an appointment, store reports and never miss a medicine. Available in English, Hindi and Telugu.",
      },
      { property: "og:title", content: "Aarogya Care Hospital — Doctors, Records & Reminders" },
      {
        property: "og:description",
        content:
          "Symptom guidance, doctor appointments, medical records, medicine reminders and an AI health assistant.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { t } = useI18n();

  const steps = [
    { icon: MessageCircleHeart, title: t("home.step1"), desc: t("home.step1.d") },
    { icon: Stethoscope, title: t("home.step2"), desc: t("home.step2.d") },
    { icon: CalendarCheck, title: t("home.step3"), desc: t("home.step3.d") },
    { icon: FileHeart, title: t("home.step4"), desc: t("home.step4.d") },
  ];

  const features = [
    { icon: CalendarCheck, title: t("home.f1"), desc: t("home.f1.d"), to: "/doctors" as const },
    { icon: FileHeart, title: t("home.f2"), desc: t("home.f2.d"), to: "/dashboard" as const },
    { icon: Pill, title: t("home.f3"), desc: t("home.f3.d"), to: "/dashboard" as const },
    { icon: MessageCircleHeart, title: t("home.f4"), desc: t("home.f4.d"), to: "/assistant" as const },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main>
        <section className="relative overflow-hidden gradient-soft">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 lg:grid-cols-2 lg:py-20">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-accent-foreground">
                <ShieldCheck className="size-3.5" />
                {t("home.badge")}
              </span>
              <h1 className="mt-5 text-4xl font-extrabold leading-tight sm:text-5xl">
                {t("home.title")}
              </h1>
              <p className="mt-5 max-w-xl text-lg text-muted-foreground">{t("home.subtitle")}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button size="lg" asChild>
                  <Link to="/symptoms">
                    {t("home.cta.symptoms")} <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link to="/doctors">{t("home.cta.book")}</Link>
                </Button>
              </div>

              <dl className="mt-10 grid max-w-md grid-cols-3 gap-4">
                <div>
                  <dt className="text-2xl font-bold text-primary">10+</dt>
                  <dd className="text-xs text-muted-foreground">{t("home.stat.doctors")}</dd>
                </div>
                <div>
                  <dt className="flex items-center gap-1 text-2xl font-bold text-primary">
                    <Clock className="size-5" />
                    24/7
                  </dt>
                  <dd className="text-xs text-muted-foreground">{t("home.stat.support")}</dd>
                </div>
                <div>
                  <dt className="flex items-center gap-1 text-2xl font-bold text-primary">
                    <Languages className="size-5" />3
                  </dt>
                  <dd className="text-xs text-muted-foreground">{t("home.stat.languages")}</dd>
                </div>
              </dl>
            </div>

            <div className="relative">
              <img
                src={heroImage}
                alt="Doctor welcoming a family at the hospital reception"
                width={1600}
                height={1104}
                className="w-full rounded-3xl object-cover shadow-[var(--shadow-lift)]"
              />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-6">
          <EmergencyCard />
        </section>

        <section className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="text-3xl font-bold">{t("home.how")}</h2>
          <p className="mt-2 text-muted-foreground">{t("home.how.sub")}</p>
          <ol className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <li key={s.title} className="card-elevated p-6">
                <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <s.icon className="size-5" />
                </span>
                <p className="mt-4 text-xs font-bold uppercase tracking-wide text-primary">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-1 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="bg-surface py-14">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-3xl font-bold">{t("home.features")}</h2>
            <div className="mt-8 grid gap-5 md:grid-cols-2">
              {features.map((f) => (
                <Link key={f.title} to={f.to} className="card-elevated group flex gap-4 p-6 transition-shadow hover:shadow-[var(--shadow-lift)]">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-xl gradient-hero text-primary-foreground">
                    <f.icon className="size-6" />
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold group-hover:text-primary">{f.title}</h3>
                    <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
                  </div>
                </Link>
              ))}
            </div>

            <div className="mt-10 grid gap-5 sm:grid-cols-2">
              <img
                src={careImage}
                alt="Doctors reviewing a patient's reports on a tablet"
                width={1200}
                height={900}
                loading="lazy"
                className="h-64 w-full rounded-2xl object-cover"
              />
              <img
                src={medicineImage}
                alt="Person organising medicines and prescriptions"
                width={1200}
                height={900}
                loading="lazy"
                className="h-64 w-full rounded-2xl object-cover"
              />
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
