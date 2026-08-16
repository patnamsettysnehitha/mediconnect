import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { HeartPulse, Loader2, Stethoscope, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SiteHeader } from "@/components/SiteHeader";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { SPECIALTIES } from "@/lib/triage";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Login or Sign up — Aarogya Care Hospital" },
      {
        name: "description",
        content: "Patient and doctor accounts for booking appointments, medical records and medicine reminders.",
      },
      { property: "og:title", content: "Login or Sign up — Aarogya Care Hospital" },
      { property: "og:description", content: "Separate patient and doctor logins for Aarogya Care Hospital." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { t, lang } = useI18n();
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();

  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [accountType, setAccountType] = useState<"patient" | "doctor">("patient");
  const [specialization, setSpecialization] = useState(SPECIALTIES[0]!);

  useEffect(() => {
    if (!loading && user) {
      navigate({ to: role === "doctor" ? "/doctor" : "/dashboard", replace: true });
    }
  }, [user, role, loading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) toast.error(error.message);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || password.length < 6) {
      toast.error(t("common.required"));
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: fullName.trim(),
          phone: phone.trim(),
          role: accountType,
          preferred_language: lang,
          specialization: accountType === "doctor" ? specialization : undefined,
        },
      },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (!data.session) toast.success(t("auth.checkEmail"));
  };

  const handleGoogle = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setBusy(false);
      toast.error(t("common.error"));
      return;
    }
    if (result.redirected) return;
    setBusy(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto grid max-w-6xl gap-10 px-4 py-12 lg:grid-cols-2">
        <div className="hidden lg:block">
          <span className="flex size-12 items-center justify-center rounded-2xl gradient-hero">
            <HeartPulse className="size-6 text-primary-foreground" />
          </span>
          <h1 className="mt-6 text-4xl font-extrabold leading-tight">{t("auth.title")}</h1>
          <p className="mt-4 max-w-md text-muted-foreground">{t("auth.sub")}</p>
          <ul className="mt-8 space-y-4 text-sm">
            <li className="flex items-start gap-3">
              <User className="mt-0.5 size-5 text-primary" />
              <span>{t("home.f1.d")}</span>
            </li>
            <li className="flex items-start gap-3">
              <Stethoscope className="mt-0.5 size-5 text-primary" />
              <span>{t("doc.title")}: {t("home.f2.d")}</span>
            </li>
          </ul>
        </div>

        <div className="card-elevated p-6 sm:p-8">
          <h2 className="text-2xl font-bold lg:hidden">{t("auth.title")}</h2>
          <Tabs defaultValue="login" className="mt-2">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">{t("auth.login")}</TabsTrigger>
              <TabsTrigger value="signup">{t("auth.signup")}</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form className="mt-6 space-y-4" onSubmit={handleLogin}>
                <div className="space-y-2">
                  <Label htmlFor="login-email">{t("auth.email")}</Label>
                  <Input id="login-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">{t("auth.password")}</Label>
                  <Input
                    id="login-password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" size="lg" disabled={busy}>
                  {busy && <Loader2 className="size-4 animate-spin" />} {t("auth.login")}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form className="mt-6 space-y-4" onSubmit={handleSignup}>
                <div className="space-y-2">
                  <Label>{t("auth.role")}</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {(["patient", "doctor"] as const).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setAccountType(r)}
                        className={`rounded-xl border-2 p-3 text-sm font-semibold transition-colors ${
                          accountType === r
                            ? "border-primary bg-accent text-accent-foreground"
                            : "border-border hover:bg-secondary"
                        }`}
                      >
                        {r === "patient" ? t("auth.patient") : t("auth.doctor")}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="su-name">{t("auth.name")}</Label>
                  <Input id="su-name" required value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={80} />
                </div>
                {accountType === "doctor" && (
                  <div className="space-y-2">
                    <Label>{t("auth.specialization")}</Label>
                    <Select value={specialization} onValueChange={setSpecialization}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SPECIALTIES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="su-phone">{t("auth.phone")}</Label>
                  <Input id="su-phone" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="su-email">{t("auth.email")}</Label>
                  <Input id="su-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="su-password">{t("auth.password")}</Label>
                  <Input
                    id="su-password"
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" size="lg" disabled={busy}>
                  {busy && <Loader2 className="size-4 animate-spin" />} {t("auth.signup")}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="my-6 flex items-center gap-3 text-xs uppercase text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            {t("auth.or")}
            <span className="h-px flex-1 bg-border" />
          </div>
          <Button variant="outline" className="w-full" size="lg" onClick={handleGoogle} disabled={busy}>
            {t("auth.google")}
          </Button>
        </div>
      </main>
    </div>
  );
}
