import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Bot, Loader2, Mic, MicOff, Send, Trash2, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SiteHeader } from "@/components/SiteHeader";
import { EmergencyCard } from "@/components/EmergencyCard";
import { SPEECH_LOCALE, useI18n } from "@/lib/i18n";
import { speak, speechSupported, startListening } from "@/lib/speech";

export const Route = createFileRoute("/assistant")({
  head: () => ({
    meta: [
      { title: "AI Health Assistant with Voice Search — MediConnect" },
      {
        name: "description",
        content:
          "Ask general health questions by typing or speaking. The assistant answers in simple English, Hindi or Telugu and always shows what you asked.",
      },
      { property: "og:title", content: "AI Health Assistant with Voice Search" },
      { property: "og:description", content: "Voice or text health questions answered in plain language, with clear disclaimers." },
    ],
  }),
  component: AssistantPage,
});

type Msg = { role: "user" | "assistant"; content: string };

function AssistantPage() {
  const { t, lang } = useI18n();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [supported, setSupported] = useState(true);
  const stopRef = useRef<(() => void) | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => setSupported(speechSupported()), []);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

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
    setInterim("");
    const stop = startListening(
      SPEECH_LOCALE[lang],
      (transcript) => {
        setInterim(transcript);
        setInput(transcript);
      },
      () => setListening(false),
    );
    stopRef.current = stop;
    setListening(true);
  };

  const send = async (raw?: string) => {
    const question = (raw ?? input).trim();
    if (!question || busy) return;
    const next: Msg[] = [...messages, { role: "user", content: question }];
    setMessages(next);
    setInput("");
    setInterim("");
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "chat", messages: next, lang }),
      });
      if (res.status === 429) {
        toast.error("Too many requests. Please try again in a minute.");
      } else if (res.status === 402) {
        toast.error("AI usage limit reached. Please add credits to continue.");
      } else if (!res.ok) {
        toast.error(t("common.error"));
      } else {
        const json = (await res.json()) as { content?: string };
        setMessages([...next, { role: "assistant", content: json.content ?? "" }]);
      }
    } catch {
      toast.error(t("common.error"));
    }
    setBusy(false);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <h1 className="text-3xl font-extrabold">{t("chat.title")}</h1>
        <p className="mt-2 text-muted-foreground">{t("chat.sub")}</p>

        <div className="card-elevated mt-6 flex min-h-[55vh] flex-col p-4 sm:p-6">
          <div className="flex-1 space-y-4 overflow-y-auto">
            <div className="flex gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full gradient-hero text-primary-foreground">
                <Bot className="size-4" />
              </span>
              <p className="rounded-2xl rounded-tl-sm bg-secondary p-3 text-sm">{t("chat.welcome")}</p>
            </div>

            {messages.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-primary p-3 text-sm text-primary-foreground">
                    <p className="mb-1 text-[11px] font-semibold uppercase opacity-80">{t("chat.youAsked")}</p>
                    {m.content}
                  </div>
                </div>
              ) : (
                <div key={i} className="flex gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full gradient-hero text-primary-foreground">
                    <Bot className="size-4" />
                  </span>
                  <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-secondary p-3 text-sm">
                    <p className="whitespace-pre-wrap">{m.content}</p>
                    <button
                      type="button"
                      onClick={() => speak(m.content, SPEECH_LOCALE[lang])}
                      className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                    >
                      <Volume2 className="size-3.5" /> {t("chat.speak")}
                    </button>
                  </div>
                </div>
              ),
            )}

            {busy && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> {t("chat.thinking")}
              </div>
            )}
            <div ref={endRef} />
          </div>

          {listening && (
            <p className="mt-3 text-sm font-medium text-primary">
              {t("sym.listening")} {interim && `— "${interim}"`}
            </p>
          )}

          <div className="mt-4 flex items-end gap-2">
            <Textarea
              rows={2}
              maxLength={1000}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t("chat.placeholder")}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
            />
            {supported && (
              <Button
                type="button"
                size="icon"
                variant={listening ? "destructive" : "outline"}
                onClick={toggleMic}
                aria-label={listening ? t("chat.stop") : t("chat.mic")}
                title={listening ? t("chat.stop") : t("chat.mic")}
              >
                {listening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
              </Button>
            )}
            <Button type="button" size="icon" onClick={() => void send()} disabled={busy} aria-label={t("chat.send")}>
              <Send className="size-4" />
            </Button>
          </div>

          {messages.length > 0 && (
            <button
              type="button"
              onClick={() => setMessages([])}
              className="mt-3 inline-flex items-center gap-1 self-start text-xs text-muted-foreground hover:text-foreground"
            >
              <Trash2 className="size-3.5" /> {t("chat.clear")}
            </button>
          )}
        </div>

        <div className="mt-6">
          <EmergencyCard />
        </div>
        <p className="mt-4 text-xs text-muted-foreground">{t("home.disclaimer")}</p>
      </main>
    </div>
  );
}
