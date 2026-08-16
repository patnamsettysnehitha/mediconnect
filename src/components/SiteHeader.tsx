import { Link, useNavigate } from "@tanstack/react-router";
import { HeartPulse, Menu, Phone } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth";
import { LANGUAGES, useI18n } from "@/lib/i18n";
import { toast } from "sonner";

function LanguageSwitcher() {
  const { lang, setLang, t } = useI18n();
  const current = LANGUAGES.find((l) => l.code === lang);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" aria-label={t("nav.language")}>
          <span className="text-base leading-none">🌐</span>
          <span className="ml-1">{current?.native}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LANGUAGES.map((l) => (
          <DropdownMenuItem key={l.code} onClick={() => setLang(l.code)}>
            <span className={l.code === lang ? "font-semibold" : ""}>{l.native}</span>
            <span className="ml-2 text-xs text-muted-foreground">{l.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function SiteHeader() {
  const { t } = useI18n();
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const links = [
    { to: "/", label: t("nav.home") },
    { to: "/doctors", label: t("nav.doctors") },
    { to: "/symptoms", label: t("nav.symptoms") },
    { to: "/assistant", label: t("nav.assistant") },
  ] as const;

  const handleSignOut = async () => {
    await signOut();
    toast.success(t("auth.loggedOut"));
    navigate({ to: "/", replace: true });
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-xl gradient-hero">
            <HeartPulse className="size-5 text-primary-foreground" />
          </span>
          <span className="hidden flex-col leading-none sm:flex">
            <span className="font-display text-base font-bold">{t("brand.name")}</span>
            <span className="text-[11px] text-muted-foreground">{t("brand.tagline")}</span>
          </span>
        </Link>

        <nav className="ml-6 hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground [&.active]:bg-secondary [&.active]:text-foreground"
            >
              {l.label}
            </Link>
          ))}
          {user && (
            <Link
              to={role === "doctor" ? "/doctor" : "/dashboard"}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground [&.active]:bg-secondary [&.active]:text-foreground"
            >
              {role === "doctor" ? t("nav.doctorDash") : t("nav.dashboard")}
            </Link>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <a
            href="tel:108"
            className="hidden items-center gap-1.5 rounded-full bg-emergency px-3 py-1.5 text-xs font-semibold text-emergency-foreground sm:flex"
          >
            <Phone className="size-3.5" /> 108
          </a>
          <LanguageSwitcher />
          {user ? (
            <Button variant="ghost" size="sm" className="hidden md:inline-flex" onClick={handleSignOut}>
              {t("nav.logout")}
            </Button>
          ) : (
            <Button size="sm" className="hidden md:inline-flex" asChild>
              <Link to="/auth">{t("nav.login")}</Link>
            </Button>
          )}

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="md:hidden" aria-label="Menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <div className="mt-8 flex flex-col gap-1">
                {links.map((l) => (
                  <Link
                    key={l.to}
                    to={l.to}
                    onClick={() => setOpen(false)}
                    className="rounded-md px-3 py-3 text-base font-medium hover:bg-secondary"
                  >
                    {l.label}
                  </Link>
                ))}
                {user && (
                  <Link
                    to={role === "doctor" ? "/doctor" : "/dashboard"}
                    onClick={() => setOpen(false)}
                    className="rounded-md px-3 py-3 text-base font-medium hover:bg-secondary"
                  >
                    {role === "doctor" ? t("nav.doctorDash") : t("nav.dashboard")}
                  </Link>
                )}
                <div className="mt-4">
                  {user ? (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setOpen(false);
                        void handleSignOut();
                      }}
                    >
                      {t("nav.logout")}
                    </Button>
                  ) : (
                    <Button className="w-full" asChild onClick={() => setOpen(false)}>
                      <Link to="/auth">{t("nav.login")}</Link>
                    </Button>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
