import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, Mic, MicOff, Sparkles, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { EmergencyCard } from "@/components/EmergencyCard";
import { SPEECH_LOCALE, useI18n } from "@/lib/i18n";
import { speechSupported, startListening } from "@/lib/speech";
import { isEmergency, matchSpecialty, specialtyLabel } from "@/lib/triage";

export const Route = createFileRoute("/symptoms")({
  head: () => ({
    meta: [
      { title: "Symptom Guidance — Which Doctor Should I See? | MediConnect" },
      {
        name: "description",
        content:
          "Describe symptoms such as fever, headache or cough by typing or speaking, and see which type of specialist usually helps. Not a diagnosis.",
      },
      { property: "og:title", content: "Symptom Guidance — Which Doctor Should I See?" },
      {
        property: "og:description",
        content: "Plain-language guidance towards the right hospital department, in English, Hindi and Telugu.",
      },
    ],
  }),
  component: SymptomsPage,
});

type Guidance = {
  specialty: string;
  summary: string;
  selfCare: string[];
  seeDoctorIf: string[];
  emergency: boolean;
};

function SymptomsPage() {
  const { t, lang } = useI18n();
  const [text, setText] = useState("");
  const [heard, setHeard] = useState("");
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Guidance | null>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const [supported, setSupported] = useState(true);

  useEffect(() => setSupported(speechSupported()), []);

  const toggleMic = () => {
    if (listening) {
      stopRef.current?.();
      setListening(false);
      return;
    }
    if (!speechSupported()) {
      toast.error(t("chat.unsupported"));
      return;
    }
    setHeard("");
    const stop = startListening(
      SPEECH_LOCALE[lang],
      (transcript) => {
        setHeard(transcript);
        setText(transcript);
      },
      () => setListening(false),
    );
    stopRef.current = stop;
    setListening(true);
  };

  const submit = async () => {
    const input = text.trim();
    if (!input) {
      toast.error(t("sym.empty"));
      return;
    }
    setBusy(true);
    const fallback: Guidance = {
      specialty: matchSpecialty(input),
      summary: "",
      selfCare: [],
      seeDoctorIf: [],
      emergency: isEmergency(input),
    };
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "triage", text: input, lang }),
      });
      if (res.ok) {
        const json = (await res.json()) as { result?: Guidance };
        if (json.result?.specialty) {
          setResult({ ...json.result, emergency: json.result.emergency || fallback.emergency });
        } else {
          setResult(fallback);
        }
      } else {
        setResult(fallback);
      }
    } catch {
      setResult(fallback);
    }
    setBusy(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-3xl font-extrabold sm:text-4xl">{t("sym.title")}</h1>
        <p className="mt-2 text-muted-foreground">{t("sym.sub")}</p>

        <div className="card-elevated mt-8 p-6">
          <Textarea
            rows={4}
            maxLength={1000}
            placeholder={t("sym.placeholder")}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="text-base"
          />
          {listening && <p className="mt-3 text-sm font-medium text-primary">{t("sym.listening")}</p>}
          {heard && !listening && (
            <p className="mt-3 rounded-lg bg-secondary p-3 text-sm">
              <span className="font-semibold">{t("sym.heard")}:</span> {heard}
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-3">
            <Button size="lg" onClick={submit} disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              {t("sym.button")}
            </Button>
            {supported && (
              <Button size="lg" variant={listening ? "destructive" : "outline"} onClick={toggleMic}>
                {listening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
                {listening ? t("chat.stop") : t("sym.speak")}
              </Button>
            )}
          </div>
        </div>

        {result && (
          <div className="mt-8 space-y-6">
            {result.emergency && <EmergencyCard />}
            {result.emergency && <p className="text-sm font-semibold text-emergency">{t("sym.urgent")}</p>}

            <div className="card-elevated p-6">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{t("sym.result")}</p>
              <h2 className="mt-2 flex items-center gap-2 text-2xl font-bold text-primary">
                <Stethoscope className="size-6" />
                {specialtyLabel(lang, result.specialty)}
              </h2>
              {result.summary && <p className="mt-3 text-sm text-foreground/80">{result.summary}</p>}

              {result.selfCare.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-bold">{t("sym.selfcare")}</h3>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    {result.selfCare.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}

              {result.seeDoctorIf.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-bold">{t("sym.seeDoctor")}</h3>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    {result.seeDoctorIf.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}

              <Button className="mt-6" asChild>
                <Link to="/doctors" search={{ specialty: result.specialty }}>
                  {t("sym.find")}
                </Link>
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">{t("home.disclaimer")}</p>
          </div>
        )}

        {!result && (
          <div className="mt-8">
            <EmergencyCard />
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
